/**
 * AI summaries of what each politician said (speeches, posts) and how it relates to how they voted.
 *
 *   ANTHROPIC_API_KEY=... npm run pipeline:ai
 *
 * Guarantees:
 *  - Every claim must cite at least one source id from the input (a speech/post or a roll-call vote).
 *    Claims whose citations do not resolve are dropped before saving.
 *  - Summaries are regenerated only when their inputs change (content hash).
 *  - Output is stored separately in data/ia/{id}.json and always labelled as AI-generated in the UI.
 */
import { createHash } from "node:crypto";
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import type { Citacao, Fala, FalasArquivo, IAArquivo, PoliticoDetalhe, ResumoIA, VotoItem } from "../src/lib/types";
import { log } from "./lib/log";
import { addDays, ymd } from "./lib/util";

const DATA = path.resolve(process.env.DATA_DIR ?? "data");
const KEY = process.env.ANTHROPIC_API_KEY;
const MODEL = process.env.AI_MODEL ?? "claude-haiku-4-5-20251001";
const MODEL_LONGO = process.env.AI_MODEL_LONG ?? "claude-sonnet-5-5";
const MAX_POLITICOS = Number(process.env.AI_MAX_POLITICOS ?? 80);

type Periodo = ResumoIA["periodo"];
const PERIODOS: { periodo: Periodo; dias: number; modelo: string; comparar: boolean }[] = [
  { periodo: "semana", dias: 7, modelo: MODEL, comparar: false },
  { periodo: "mes", dias: 30, modelo: MODEL, comparar: false },
  { periodo: "trimestre", dias: 90, modelo: MODEL_LONGO, comparar: true },
];

const SISTEMA = `Você é um analista legislativo apartidário. Resume o que um parlamentar brasileiro disse em público e como votou, para cidadãos comuns.
Regras inegociáveis:
- Use apenas as fontes fornecidas. Nunca use conhecimento externo sobre a pessoa.
- Toda afirmação precisa citar ids de fontes fornecidas no campo "citacoes" (tipo "fala" para falas, "voto" para votações).
- Linguagem simples, neutra e factual, em português do Brasil. Sem adjetivos de juízo, sem opinião, sem ironia.
- "contradicoes" só quando uma fala e um voto (ou duas falas) forem claramente incompatíveis sobre o mesmo tema. Na dúvida, não inclua.
- "mudancas" só quando a posição sobre um tema mudou entre o período anterior e o atual, com citações dos dois lados.
- Se as fontes forem poucas ou vagas, diga isso no resumo e devolva listas vazias.
Responda somente com JSON válido no formato:
{"resumo": string (até 600 caracteres),
 "temas": [{"tema": string, "posicao": string, "citacoes": [{"ref": string, "tipo": "fala"|"voto", "trecho"?: string}]}],
 "mudancas": [{"descricao": string, "antes": [cit], "depois": [cit]}],
 "contradicoes": [{"descricao": string, "citacoes": [cit]}]}`;

function hash(x: unknown) {
  return createHash("sha1").update(JSON.stringify(x)).digest("hex").slice(0, 16);
}

const fmtFala = (f: Fala) => `[${f.id}] ${f.data} (${f.tipo}${f.titulo ? `: ${f.titulo}` : ""}) ${f.texto.slice(0, 1800)}`;
const fmtVoto = (v: VotoItem) =>
  `[${v.votacaoId}] ${v.data} ${v.titulo}: votou "${v.voto}"${v.orientacaoPartido ? `, partido orientou "${v.orientacaoPartido}"` : ""}. ${v.descricao ?? ""}`.slice(0, 500);

async function chamar(modelo: string, prompt: string): Promise<any> {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "x-api-key": KEY!, "anthropic-version": "2023-06-01", "content-type": "application/json" },
    body: JSON.stringify({ model: modelo, max_tokens: 2500, system: SISTEMA, messages: [{ role: "user", content: prompt }] }),
  });
  if (!res.ok) throw new Error(`Anthropic API ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const j: any = await res.json();
  const text: string = j.content?.map((c: any) => c.text ?? "").join("") ?? "";
  const m = text.match(/\{[\s\S]*\}/);
  if (!m) throw new Error("resposta sem JSON");
  return JSON.parse(m[0]);
}

/** Keep only citations that point to inputs we actually sent. */
export function validarCitacoes(cs: unknown, falas: Set<string>, votos: Set<string>): Citacao[] {
  if (!Array.isArray(cs)) return [];
  return cs
    .filter((c): c is Citacao => !!c && typeof c.ref === "string")
    .filter((c) => (c.tipo === "voto" ? votos.has(c.ref) : falas.has(c.ref)))
    .map((c) => ({ ref: c.ref, tipo: c.tipo === "voto" ? "voto" : "fala", trecho: typeof c.trecho === "string" ? c.trecho.slice(0, 240) : undefined }));
}

export function sanitizar(raw: any, falas: Set<string>, votos: Set<string>): Pick<ResumoIA, "resumo" | "temas" | "mudancas" | "contradicoes"> {
  const temas: ResumoIA["temas"] = (Array.isArray(raw?.temas) ? raw.temas : [])
    .map((t: any) => ({ tema: String(t?.tema ?? "").slice(0, 80), posicao: String(t?.posicao ?? "").slice(0, 400), citacoes: validarCitacoes(t?.citacoes, falas, votos) }))
    .filter((t: any) => t.tema && t.citacoes.length);
  const mudancas: ResumoIA["mudancas"] = (Array.isArray(raw?.mudancas) ? raw.mudancas : [])
    .map((m: any) => ({ descricao: String(m?.descricao ?? "").slice(0, 400), antes: validarCitacoes(m?.antes, falas, votos), depois: validarCitacoes(m?.depois, falas, votos) }))
    .filter((m: any) => m.descricao && m.antes.length && m.depois.length);
  const contradicoes: ResumoIA["contradicoes"] = (Array.isArray(raw?.contradicoes) ? raw.contradicoes : [])
    .map((c: any) => ({ descricao: String(c?.descricao ?? "").slice(0, 400), citacoes: validarCitacoes(c?.citacoes, falas, votos) }))
    .filter((c: any) => c.descricao && c.citacoes.length >= 2);
  return { resumo: String(raw?.resumo ?? "").slice(0, 700), temas, mudancas, contradicoes };
}

async function lerJson<T>(p: string): Promise<T | undefined> {
  try {
    return JSON.parse(await readFile(p, "utf8")) as T;
  } catch {
    return undefined;
  }
}

async function main() {
  if (!KEY) {
    log.warn("ANTHROPIC_API_KEY não configurada: resumos de IA não serão gerados.");
    return;
  }
  const hoje = new Date();
  const arquivos = (await readdir(path.join(DATA, "falas")).catch(() => [])).filter((f) => f.endsWith(".json"));
  const candidatos: { pid: string; falas: Fala[]; recentes: number }[] = [];
  for (const f of arquivos) {
    const a = await lerJson<FalasArquivo>(path.join(DATA, "falas", f));
    if (!a?.falas.length) continue;
    const corte = ymd(addDays(hoje, -7));
    candidatos.push({ pid: a.pid, falas: a.falas, recentes: a.falas.filter((x) => x.data >= corte).length });
  }
  candidatos.sort((a, b) => b.recentes - a.recentes || b.falas.length - a.falas.length);
  await mkdir(path.join(DATA, "ia"), { recursive: true });

  let gerados = 0;
  let mantidos = 0;
  for (const c of candidatos.slice(0, MAX_POLITICOS)) {
    const det = await lerJson<PoliticoDetalhe>(path.join(DATA, "politicos", `${c.pid}.json`));
    if (!det) continue;
    const destino = path.join(DATA, "ia", `${c.pid}.json`);
    const atual = (await lerJson<IAArquivo>(destino)) ?? { pid: c.pid, resumos: [] };
    const novos: ResumoIA[] = [];

    for (const p of PERIODOS) {
      const ini = ymd(addDays(hoje, -p.dias));
      const iniAnt = ymd(addDays(hoje, -2 * p.dias));
      const falas = c.falas.filter((f) => f.data >= ini).slice(0, 60);
      if (falas.length < 2) continue;
      const anteriores = p.comparar ? c.falas.filter((f) => f.data >= iniAnt && f.data < ini).slice(0, 40) : [];
      const votos = det.votos.filter((v) => v.data >= (p.comparar ? iniAnt : ini)).slice(0, 80);
      const h = hash({ m: p.modelo, f: [...falas, ...anteriores].map((x) => x.id), v: votos.map((x) => x.votacaoId + x.voto) });
      const existente = atual.resumos.find((r) => r.periodo === p.periodo && r.hash === h);
      if (existente) {
        novos.push(existente);
        mantidos++;
        continue;
      }
      const prompt = [
        `Parlamentar: ${det.nome} (${det.cargo}, ${det.partido}-${det.uf}). Período: ${ini} a ${ymd(hoje)}.`,
        `FALAS DO PERÍODO:\n${falas.map(fmtFala).join("\n")}`,
        anteriores.length ? `FALAS DO PERÍODO ANTERIOR (${iniAnt} a ${ini}), para identificar mudanças:\n${anteriores.map(fmtFala).join("\n")}` : "",
        votos.length ? `VOTOS NOMINAIS:\n${votos.map(fmtVoto).join("\n")}` : "VOTOS NOMINAIS: nenhum no período.",
      ]
        .filter(Boolean)
        .join("\n\n");
      try {
        const raw = await chamar(p.modelo, prompt);
        const idsF = new Set([...falas, ...anteriores].map((f) => f.id));
        const idsV = new Set(votos.map((v) => v.votacaoId));
        novos.push({ pid: c.pid, periodo: p.periodo, inicio: ini, fim: ymd(hoje), geradoEm: hoje.toISOString(), modelo: p.modelo, hash: h, nFontes: falas.length + votos.length, ...sanitizar(raw, idsF, idsV) });
        gerados++;
      } catch (e) {
        log.warn(`IA ${c.pid}/${p.periodo}: ${(e as Error).message}`);
      }
    }
    // keep history: previous summaries of other windows stay, newest first, capped
    const historico = atual.resumos.filter((r) => !novos.some((n) => n.hash === r.hash)).slice(0, 24);
    await writeFile(destino, JSON.stringify({ pid: c.pid, resumos: [...novos, ...historico] } satisfies IAArquivo));
  }
  log.info(`IA: ${gerados} resumos gerados, ${mantidos} reaproveitados`);
}

if (process.argv[1]?.endsWith("ai.ts")) {
  main().catch((e) => {
    log.error(e);
    process.exit(1);
  });
}

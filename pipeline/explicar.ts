/**
 * Plain-language explanations of the bills voted, written by a language model from the official
 * texts only (summary, detailed summary, the Senado's explanation, keywords and themes).
 *
 *   ANTHROPIC_API_KEY=... npm run pipeline:explicar
 *   npm run pipeline:explicar -- --importar=arquivo.json --modelo="nome do modelo"
 *
 * Guarantees, enforced by validarExplicacao before anything is saved:
 *  - At least one supporting excerpt, copied verbatim from the official texts.
 *  - Every number in the explanation appears in the official texts.
 *  - No value judgements from a short list of opinion words, no em dashes.
 * Explanations are regenerated only when the official texts change (content hash), and the
 * interface always labels them as AI-generated next to the official text.
 */
import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { ExplicacaoIA, MateriaVotada, VotacaoResumo } from "../src/lib/types";
import { log } from "./lib/log";

const DATA = path.resolve(process.env.DATA_DIR ?? "data");
const KEY = process.env.ANTHROPIC_API_KEY;
const MODELO = process.env.AI_MODEL_EXPLICAR ?? "claude-sonnet-5-5";
const MAXIMO = Number(process.env.AI_MAX_MATERIAS ?? 200);

export const SISTEMA = `Você explica projetos votados no Congresso brasileiro para qualquer pessoa, inclusive quem lê pouco.
Regras inegociáveis:
- Use somente os textos oficiais fornecidos. Nunca use conhecimento externo sobre o projeto, autores ou contexto político.
- Não diga se o projeto é bom ou ruim, não use adjetivos de juízo e não especule sobre intenções.
- Linguagem simples (Lei 15.263/2025): frases curtas, ordem direta, voz ativa, palavras do dia a dia. Explique qualquer sigla ou termo técnico.
- Não escreva números, datas, valores ou nomes que não estejam nos textos oficiais.
- Não use travessão.
- Em "trechos", copie de 1 a 3 trechos dos textos oficiais, exatamente como estão, que sustentam a explicação.
- Se os textos oficiais não permitem entender o efeito prático, diga isso no resumo e deixe "mudancas" vazio.
Responda somente com JSON válido:
{"resumo": string (até 280 caracteres, começando pelo que o projeto faz),
 "mudancas": [string] (até 3 itens, cada um até 160 caracteres, o que muda na prática),
 "quemAfeta": string ou null (até 160 caracteres, só se os textos disserem),
 "trechos": [string]}`;

/** Official texts given to the model, in a fixed order so the hash is stable. */
export function fonteDaMateria(m: MateriaVotada): string {
  return [
    `Projeto: ${m.sigla}`,
    `Ementa: ${m.ementa}`,
    m.ementaDetalhada && `Ementa detalhada: ${m.ementaDetalhada}`,
    m.explicacao && `Explicação da ementa (Senado): ${m.explicacao}`,
    m.palavrasChave?.length && `Palavras-chave: ${m.palavrasChave.join(", ")}`,
    m.temas?.length && `Temas oficiais: ${m.temas.join(", ")}`,
  ]
    .filter(Boolean)
    .join("\n");
}

export const hashFonte = (fonte: string) => createHash("sha1").update(fonte).digest("hex").slice(0, 16);

const espacos = (s: string) => s.replace(/\s+/g, " ").trim();
/** Numbers written in a text, normalized ("1.000" and "1000" are the same number). */
const numeros = (s: string) => new Set((s.match(/\d+(?:[.,]\d+)*/g) ?? []).map((n) => n.replace(/\./g, "").replace(",", ".")));

const OPINIAO = /\b(infelizmente|felizmente|absurd[oa]|polêmic[oa]|controvers[oa]|important[ií]ssim[oa]|vergonh|excelente|péssim[oa]|benéfic[oa]|prejudicial)\b/i;

/**
 * Checks a model answer against the official texts. Returns the explanation to save, or the
 * reason it was discarded.
 */
export function validarExplicacao(raw: unknown, m: MateriaVotada, modelo: string, agora = new Date()): ExplicacaoIA | { erro: string } {
  const o = (raw ?? {}) as Record<string, unknown>;
  const fonte = fonteDaMateria(m);
  const limpar = (v: unknown, max: number) => (typeof v === "string" ? espacos(v.replace(/\s*[—–]\s*/g, ", ")).slice(0, max) : "");
  const resumo = limpar(o.resumo, 400);
  if (!resumo) return { erro: "sem resumo" };
  const mudancas = (Array.isArray(o.mudancas) ? o.mudancas : [])
    .map((x) => limpar(x, 220))
    .filter(Boolean)
    .slice(0, 3);
  const quemAfeta = limpar(o.quemAfeta, 220) || undefined;
  const fonteNormal = espacos(fonte);
  const trechos = (Array.isArray(o.trechos) ? o.trechos : [])
    .map((x) => (typeof x === "string" ? espacos(x) : ""))
    .filter((t) => t.length >= 12 && fonteNormal.includes(t))
    .slice(0, 3);
  if (!trechos.length) return { erro: "nenhum trecho copiado dos textos oficiais" };
  const escrito = [resumo, ...mudancas, quemAfeta ?? ""].join(" ");
  const permitidos = numeros(fonte);
  const inventados = [...numeros(escrito)].filter((n) => !permitidos.has(n));
  if (inventados.length) return { erro: `números ausentes dos textos oficiais: ${inventados.join(", ")}` };
  if (OPINIAO.test(escrito)) return { erro: "palavra de juízo de valor" };
  return { materia: m.id, resumo, mudancas, quemAfeta, trechos, modelo, geradoEm: agora.toISOString(), hashFonte: hashFonte(fonte) };
}

async function chamar(prompt: string): Promise<unknown> {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "x-api-key": KEY!, "anthropic-version": "2023-06-01", "content-type": "application/json" },
    body: JSON.stringify({ model: MODELO, max_tokens: 900, system: SISTEMA, messages: [{ role: "user", content: prompt }] }),
  });
  if (!res.ok) throw new Error(`Anthropic API ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const j: any = await res.json();
  const texto: string = j.content?.map((c: any) => c.text ?? "").join("") ?? "";
  const json = texto.match(/\{[\s\S]*\}/);
  if (!json) throw new Error("resposta sem JSON");
  return JSON.parse(json[0]);
}

async function lerJson<T>(arquivo: string, padrao: T): Promise<T> {
  try {
    return JSON.parse(await readFile(arquivo, "utf8")) as T;
  } catch {
    return padrao;
  }
}

async function main() {
  const args = Object.fromEntries(process.argv.slice(2).map((a) => a.replace(/^--/, "").split("=") as [string, string]));
  const materias = await lerJson<MateriaVotada[]>(path.join(DATA, "materias.json"), []);
  const votacoes = await lerJson<VotacaoResumo[]>(path.join(DATA, "votacoes.json"), []);
  const arquivo = path.join(DATA, "explicacoes.json");
  const salvas = await lerJson<Record<string, ExplicacaoIA>>(arquivo, {});
  const porId = new Map(materias.map((m) => [m.id, m]));

  // Most recently voted first
  const ultimaVotacao = new Map<string, string>();
  for (const v of votacoes) if (v.materia && !ultimaVotacao.has(v.materia)) ultimaVotacao.set(v.materia, v.data);
  const pendentes = materias
    .filter((m) => salvas[m.id]?.hashFonte !== hashFonte(fonteDaMateria(m)))
    .sort((a, b) => (ultimaVotacao.get(b.id) ?? "").localeCompare(ultimaVotacao.get(a.id) ?? ""));

  let novas = 0;
  let descartadas = 0;
  if (args.importar) {
    // Answers produced elsewhere go through exactly the same checks
    const respostas = await lerJson<Record<string, unknown>>(path.resolve(args.importar), {});
    for (const [id, raw] of Object.entries(respostas)) {
      const m = porId.get(id);
      if (!m) continue;
      const r = validarExplicacao(raw, m, args.modelo ?? "não informado");
      if ("erro" in r) {
        descartadas++;
        log.warn(`${id}: ${r.erro}`);
      } else {
        salvas[id] = r;
        novas++;
      }
    }
  } else {
    if (!KEY) {
      log.warn("ANTHROPIC_API_KEY não configurada; nada a fazer.");
      return;
    }
    for (const m of pendentes.slice(0, MAXIMO)) {
      try {
        const r = validarExplicacao(await chamar(fonteDaMateria(m)), m, MODELO);
        if ("erro" in r) {
          descartadas++;
          log.warn(`${m.id}: ${r.erro}`);
        } else {
          salvas[m.id] = r;
          novas++;
        }
      } catch (e) {
        log.warn(`${m.id}: ${(e as Error).message}`);
      }
    }
  }
  // Drop explanations of bills no longer published
  for (const id of Object.keys(salvas)) if (!porId.has(id)) delete salvas[id];
  await writeFile(arquivo, JSON.stringify(salvas));
  log.info(`Explicações: ${novas} novas, ${descartadas} descartadas, ${Object.keys(salvas).length} no total`);
}

if (process.argv[1]?.endsWith("explicar.ts")) {
  main().catch((e) => {
    log.error(e);
    process.exit(1);
  });
}

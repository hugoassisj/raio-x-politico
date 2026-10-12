/**
 * Official details of every bill that went to a roll call: longer summary, the Senado's plain
 * explanation, keywords, official themes, authors and links to the full text. Votes only carry a
 * one-line summary, which is rarely enough to understand what was at stake.
 *
 * Câmara: /proposicoes/{id}, /proposicoes/{id}/temas, /proposicoes/{id}/autores
 * Senado: /materia/{codigo}.json
 */
import type { MateriaVotada, VotacaoDetalhe } from "../../src/lib/types";
import { getJson, mapLimit } from "../lib/http";
import { log } from "../lib/log";
import { arr, get, isoDate } from "../lib/util";

const CAMARA = "https://dadosabertos.camara.leg.br/api/v2";
const SENADO = "https://legis.senado.leg.br/dadosabertos";
// Bill pages are small; the size cap protects memory if an endpoint ignores a filter and returns everything
const CACHE = { ttlHours: 24 * 7, retries: 2, timeoutMs: 60_000, maxBytes: 3_000_000 };

const texto = (v: unknown) => (typeof v === "string" ? v.replace(/\s+/g, " ").trim() : "");

/** First string value found under any of the given keys, searching nested objects and arrays. */
export function campo(o: unknown, chaves: string[], profundidade = 6): string {
  if (!o || typeof o !== "object" || profundidade < 0) return "";
  const alvo = new Set(chaves.map((c) => c.toLowerCase()));
  for (const [k, v] of Object.entries(o as Record<string, unknown>)) if (alvo.has(k.toLowerCase()) && texto(v)) return texto(v);
  for (const v of Object.values(o as Record<string, unknown>)) {
    const achado = campo(v, chaves, profundidade - 1);
    if (achado) return achado;
  }
  return "";
}

/** Keywords arrive as one comma-separated string; keep them short and unique. */
export function palavrasChave(raw: string): string[] | undefined {
  const l = [
    ...new Set(
      raw
        .split(/[,;]/)
        .map((s) => s.replace(/^_+|_+$/g, "").trim())
        .filter((s) => s.length > 2 && s.length < 60),
    ),
  ];
  return l.length ? l.slice(0, 12) : undefined;
}

export async function materiaCamara(id: string): Promise<MateriaVotada | undefined> {
  const det: any = await getJson(`${CAMARA}/proposicoes/${id}`, CACHE);
  const d = det?.dados;
  if (!d) return undefined;
  const [temas, autores] = await Promise.all([
    getJson(`${CAMARA}/proposicoes/${id}/temas`, CACHE).catch(() => null),
    getJson(`${CAMARA}/proposicoes/${id}/autores`, CACHE).catch(() => null),
  ]);
  const listaAutores = arr((autores as any)?.dados)
    .map((a: any) => {
      const dep = String(a?.uri ?? "").match(/\/deputados\/(\d+)/)?.[1];
      return { nome: texto(a?.nome), pid: dep ? `dep-${dep}` : undefined, tipo: texto(a?.tipo) || undefined, ordem: Number(a?.ordemAssinatura) || 99 };
    })
    .filter((a) => a.nome)
    .sort((a, b) => a.ordem - b.ordem);
  return {
    id: `cam-${id}`,
    casa: "camara",
    sigla: [d.siglaTipo, d.numero && d.ano ? `${d.numero}/${d.ano}` : ""].filter(Boolean).join(" "),
    ementa: texto(d.ementa),
    ementaDetalhada: texto(d.ementaDetalhada) || undefined,
    palavrasChave: palavrasChave(texto(d.keywords)),
    temas: [
      ...new Set(
        arr((temas as any)?.dados)
          .map((t: any) => texto(t?.tema))
          .filter(Boolean),
      ),
    ],
    autores: listaAutores.slice(0, 5).map(({ nome, pid, tipo }) => ({ nome, pid, tipo })),
    autoresTotal: listaAutores.length || undefined,
    apresentacao: isoDate(d.dataApresentacao),
    situacao: texto(d.statusProposicao?.descricaoSituacao) || undefined,
    url: `https://www.camara.leg.br/proposicoesWeb/fichadetramitacao?idProposicao=${id}`,
    inteiroTeor: texto(d.urlInteiroTeor) || undefined,
  };
}

export async function materiaSenado(codigo: string): Promise<MateriaVotada | undefined> {
  // Bill detail by code. (The newer /processo listing is not used: an unknown filter there returns
  // every process in the Senado, which flooded memory in the data workflow.)
  const fonte: unknown = await getJson(`${SENADO}/materia/${codigo}.json`, CACHE).catch(() => null);
  const ementa = campo(fonte, ["EmentaMateria", "ementa"]);
  if (!ementa) return undefined;
  const sigla =
    campo(fonte, ["identificacao", "DescricaoIdentificacaoMateria"]) ||
    [campo(fonte, ["sigla", "SiglaSubtipoMateria"]), campo(fonte, ["numero", "NumeroMateria"]), campo(fonte, ["ano", "AnoMateria"])].filter(Boolean).join(" ");
  const legado = get(fonte, "DetalheMateria.Materia.Assunto");
  const assuntos = [
    campo(fonte, ["assuntoEspecifico", "descricaoAssuntoEspecifico"]) || texto(legado?.AssuntoEspecifico?.Descricao),
    campo(fonte, ["assuntoGeral", "descricaoAssuntoGeral"]) || texto(legado?.AssuntoGeral?.Descricao),
  ].filter(Boolean);
  const autor = campo(fonte, ["autoria", "NomeAutor", "autor"]);
  return {
    id: `sen-${codigo}`,
    casa: "senado",
    sigla: sigla.replace(/\s+/g, " "),
    ementa,
    explicacao: campo(fonte, ["explicacaoEmenta", "ExplicacaoEmentaMateria"]) || undefined,
    palavrasChave: palavrasChave(campo(fonte, ["indexacao", "IndexacaoMateria"])),
    temas: assuntos.length ? [...new Set(assuntos)] : undefined,
    autores: autor ? [{ nome: autor }] : undefined,
    apresentacao: isoDate(campo(fonte, ["dataApresentacao", "DataApresentacao"])),
    situacao: campo(fonte, ["descricaoSituacao", "DescricaoSituacao"]) || undefined,
    url: `https://www25.senado.leg.br/web/atividade/materias/-/materia/${codigo}`,
  };
}

/** Details for every bill referenced by the votes; a failing bill is skipped, never fatal. */
export async function coletarMaterias(votacoes: VotacaoDetalhe[]): Promise<{ materias: MateriaVotada[]; avisos: string[] }> {
  const refs = [...new Set(votacoes.map((v) => v.materia).filter((m): m is string => !!m))];
  log.info(`Matérias votadas: ${refs.length}`);
  let falhas = 0;
  const out = await mapLimit(
    refs,
    4,
    async (ref) => {
      const [casa, id] = ref.split("-");
      try {
        return casa === "cam" ? await materiaCamara(id) : await materiaSenado(id);
      } catch {
        falhas++;
        return undefined;
      }
    },
    "Matérias",
  );
  const materias = out.filter((m): m is MateriaVotada => !!m);
  return { materias, avisos: falhas ? [`${falhas} matérias sem detalhes`] : [] };
}

/**
 * State flags shown next to a state name. The files live in public/bandeiras/{UF}.png (192 px wide
 * renders) so nothing is loaded from other sites at runtime.
 *
 * Source: the flag image (property P41) of each state item in Wikidata, rendered by Wikimedia
 * Commons from the official vector file. Retrieved on 2026-10-12. Flags of the states are official
 * symbols; each Commons file page (fontePagina) states its license (the files are tagged as public
 * domain, Brazilian government works). The national flag is not used here, so no state is confused
 * with the country.
 */
export const BANDEIRAS_CONSULTADAS_EM = "2026-10-12";

export const BANDEIRAS: Record<string, { arquivo: string; wikidata: string }> = {
  AC: { arquivo: "Bandeira do Acre.svg", wikidata: "Q40780" },
  AL: { arquivo: "Bandeira de Alagoas.svg", wikidata: "Q40885" },
  AM: { arquivo: "Bandeira do Amazonas.svg", wikidata: "Q40040" },
  AP: { arquivo: "Bandeira do Amapá.svg", wikidata: "Q40130" },
  BA: { arquivo: "Bandeira da Bahia.svg", wikidata: "Q40430" },
  CE: { arquivo: "Bandeira do Ceará.svg", wikidata: "Q40123" },
  DF: { arquivo: "Bandeira do Distrito Federal (Brasil).svg", wikidata: "Q119158" },
  ES: { arquivo: "Bandeira do Espírito Santo.svg", wikidata: "Q43233" },
  GO: { arquivo: "Flag of Goiás.svg", wikidata: "Q41587" },
  MA: { arquivo: "Bandeira do Maranhão.svg", wikidata: "Q42362" },
  MG: { arquivo: "Bandeira de Minas Gerais.svg", wikidata: "Q39109" },
  MS: { arquivo: "Bandeira de Mato Grosso do Sul.svg", wikidata: "Q43319" },
  MT: { arquivo: "Bandeira de Mato Grosso.svg", wikidata: "Q42824" },
  PA: { arquivo: "Bandeira do Pará.svg", wikidata: "Q39517" },
  PB: { arquivo: "Bandeira da Paraíba.svg", wikidata: "Q38088" },
  PE: { arquivo: "Bandeira de Pernambuco.svg", wikidata: "Q40942" },
  PI: { arquivo: "Bandeira do Piauí.svg", wikidata: "Q42722" },
  PR: { arquivo: "Bandeira do Paraná.svg", wikidata: "Q15499" },
  RJ: { arquivo: "Bandeira do estado do Rio de Janeiro.svg", wikidata: "Q41428" },
  RN: { arquivo: "Bandeira do Rio Grande do Norte.svg", wikidata: "Q43255" },
  RO: { arquivo: "Bandeira de Rondônia.svg", wikidata: "Q43235" },
  RR: { arquivo: "Bandeira de Roraima.svg", wikidata: "Q42508" },
  RS: { arquivo: "Bandeira do Rio Grande do Sul.svg", wikidata: "Q40030" },
  SC: { arquivo: "Bandeira de Santa Catarina.svg", wikidata: "Q41115" },
  SE: { arquivo: "Bandeira de Sergipe.svg", wikidata: "Q43783" },
  SP: { arquivo: "Bandeira do estado de São Paulo.svg", wikidata: "Q175" },
  TO: { arquivo: "Bandeira do Tocantins.svg", wikidata: "Q43695" },
};

/** Page on Wikimedia Commons with the original file, its history and license. */
export const fontePagina = (uf: string) => {
  const b = BANDEIRAS[uf];
  return b ? `https://commons.wikimedia.org/wiki/File:${encodeURIComponent(b.arquivo.replace(/ /g, "_"))}` : undefined;
};

export const temBandeira = (uf: string) => uf in BANDEIRAS;

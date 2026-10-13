/**
 * Visual identity of each party: brand color and logo, shown next to the acronym (never instead of
 * it, and never as the color of a chart or a plenary seat; see PRODUCT.md).
 *
 * Source: the Wikidata item of each party, properties "sRGB color hex code" (P465) and "logo image"
 * (P154); logos are 128 px renders by Wikimedia Commons of the file named in logoArquivo, kept in
 * public/partidos/{logo}.png. Commons only hosts files it considers free to reuse; each file's page
 * (fonteLogo) states its license, and the marks remain the property of each party, used here only to
 * identify it. Retrieved on 2026-10-13. A party without an entry, color or logo falls back to the plain
 * acronym. "texto" is the text color that reads best on "cor" (contrast computed when generating).
 */
export const PARTIDOS_CONSULTADOS_EM = "2026-10-13";

export interface IdentidadePartido {
  wikidata: string;
  cor?: string;
  texto?: string;
  logo?: string;
  logoArquivo?: string;
}

export const IDENTIDADE_PARTIDOS: Record<string, IdentidadePartido> = {
  AVANTE: { wikidata: "Q3366792", cor: "#ED5F36", texto: "#111111" },
  CIDADANIA: { wikidata: "Q2598527", cor: "#B43104", texto: "#FFFFFF", logo: "cidadania.png", logoArquivo: "Logo do Cidadania 23.png" },
  DC: { wikidata: "Q2653287", cor: "#293490", texto: "#FFFFFF", logo: "dc.png", logoArquivo: "Bandeira-democracia-cristã.png" },
  MDB: { wikidata: "Q1322751", cor: "#2E8B57", texto: "#111111", logo: "mdb.png", logoArquivo: "Movimento Democrático Brasileiro (2017).png" },
  NOVO: { wikidata: "Q18552710", cor: "#FF8511", texto: "#111111", logo: "novo.png", logoArquivo: "Partido Novo logo (2023).svg" },
  PCdoB: { wikidata: "Q504000", cor: "#DA251C", texto: "#FFFFFF", logo: "pcdob.png", logoArquivo: "PCdoB logo.svg" },
  PDT: { wikidata: "Q1414708", cor: "#ED1C24", texto: "#FFFFFF", logo: "pdt.png", logoArquivo: "PDT logo 2026 (cropped).png" },
  PL: { wikidata: "Q2731720", cor: "#0F0073", texto: "#FFFFFF", logo: "pl.png", logoArquivo: "Partido Liberal (Brazil) logo.svg" },
  PODE: { wikidata: "Q3181274", cor: "#2E9AFE", texto: "#111111", logo: "pode.png", logoArquivo: "PODEMOSLogo (from 1997 to 2022).png" },
  PP: { wikidata: "Q732852", cor: "#3A5AA7", texto: "#FFFFFF", logo: "pp.png", logoArquivo: "Progressistas logo.png" },
  PRD: { wikidata: "Q115156140", logo: "prd.png", logoArquivo: "Partido Renovação Democrática logo.svg" },
  PSB: { wikidata: "Q2054789", cor: "#FFBF00", texto: "#111111", logo: "psb.png", logoArquivo: "Logo of the Brazilian Socialist Party (wordmark color).svg" },
  PSD: { wikidata: "Q2054750", cor: "#70C846", texto: "#111111", logo: "psd.png", logoArquivo: "PSD Brazil logo.svg" },
  PSDB: { wikidata: "Q1322897", cor: "#084B8A", texto: "#FFFFFF", logo: "psdb.png", logoArquivo: "Logo of the Brazilian Social Democracy Party (2023).svg" },
  PSOL: { wikidata: "Q1754827", cor: "#FFEE57", texto: "#111111" },
  PT: { wikidata: "Q657089", cor: "#DA1208", texto: "#FFFFFF", logo: "pt.png", logoArquivo: "PT (Brazil) logo 2021.svg" },
  PV: { wikidata: "Q1234489", cor: "#006600", texto: "#FFFFFF", logo: "pv.png", logoArquivo: "PV Logo.svg" },
  REDE: { wikidata: "Q10358279", cor: "#088A68", texto: "#111111", logo: "rede.png", logoArquivo: "Rede Sustentabilidade logo.svg" },
  REPUBLICANOS: { wikidata: "Q926973", cor: "#4DBCE7", texto: "#111111" },
  SOLIDARIEDADE: { wikidata: "Q20061311", cor: "#D86425", texto: "#111111", logo: "solidariedade.png", logoArquivo: "Logomarca do Partido Solidariedade.png" },
  UNIÃO: { wikidata: "Q108837483", cor: "#40CCFF", texto: "#111111", logo: "uniao.png", logoArquivo: "União Brasil logo.svg" },
  AGIR: { wikidata: "Q2534868", cor: "#0066BB", texto: "#FFFFFF", logo: "agir.png", logoArquivo: "Logomarca do Partido Agir.png" },
  MOBILIZA: { wikidata: "Q429972", cor: "#DA010A", texto: "#FFFFFF", logo: "mobiliza.png", logoArquivo: "Logomarca Partido Mobiliza.png" },
  PCB: { wikidata: "Q2597196", cor: "#FF0000", texto: "#111111", logo: "pcb.png", logoArquivo: "PCB logo.svg" },
  PSTU: { wikidata: "Q2453869", cor: "#FF0000", texto: "#111111", logo: "pstu.png", logoArquivo: "Logo PSTU.png" },
  UP: { wikidata: "Q86534531", logo: "up.png", logoArquivo: "Unidade Popular logo.svg" },
  PCO: { wikidata: "Q2453216", cor: "#9F030A", texto: "#FFFFFF", logo: "pco.jpg", logoArquivo: "PCO29.jpg" },
  PRTB: { wikidata: "Q2453861", cor: "#2CB53F", texto: "#111111", logo: "prtb.png", logoArquivo: "PRTB-LOGO-03-1024x393.png" },
  PMDB: { wikidata: "Q1322751", cor: "#2E8B57", texto: "#111111", logo: "pmdb.png", logoArquivo: "Movimento Democrático Brasileiro (2017).png" },
  PFL: { wikidata: "Q1185830", cor: "#99FF33", texto: "#111111", logo: "pfl.jpg", logoArquivo: "Democratas (Brazil) logo (2018-2022) (vertical).jpg" },
  DEM: { wikidata: "Q1185830", cor: "#99FF33", texto: "#111111", logo: "dem.jpg", logoArquivo: "Democratas (Brazil) logo (2018-2022) (vertical).jpg" },
  PPS: { wikidata: "Q2598527", cor: "#B43104", texto: "#FFFFFF", logo: "pps.png", logoArquivo: "Logo do Cidadania 23.png" },
  PRB: { wikidata: "Q926973", cor: "#4DBCE7", texto: "#111111" },
  PTB: { wikidata: "Q1576143", cor: "#005533", texto: "#FFFFFF", logo: "ptb.png", logoArquivo: "Logomarca Partido Trabalhista Brasileiro.png" },
  PSL: { wikidata: "Q2366265", cor: "#008000", texto: "#FFFFFF", logo: "psl.png", logoArquivo: "Partido Social Liberal logo.svg" },
  PSC: { wikidata: "Q2626213", cor: "#009038", texto: "#111111", logo: "psc.png", logoArquivo: "PSC logo.svg" },
  PROS: { wikidata: "Q15564211", cor: "#F78907", texto: "#111111", logo: "pros.png", logoArquivo: "Logomarca do Partido Republicano da Ordem Social (PROS), do Brasil.png" },
  PATRIOTA: { wikidata: "Q10345629", cor: "#00A859", texto: "#111111", logo: "patriota.png", logoArquivo: "Logotipo do partido Patriota.svg" },
  PEN: { wikidata: "Q10345629", cor: "#00A859", texto: "#111111", logo: "pen.png", logoArquivo: "Logotipo do partido Patriota.svg" },
  PTC: { wikidata: "Q2534868", cor: "#0066BB", texto: "#FFFFFF", logo: "ptc.png", logoArquivo: "Logomarca do Partido Agir.png" },
  PHS: { wikidata: "Q2453205", cor: "#B87333", texto: "#111111", logo: "phs.png", logoArquivo: "Logo - Partido Humanista da Solidariedade.png" },
  PPL: { wikidata: "Q5499876", cor: "#9ACD32", texto: "#111111", logo: "ppl.png", logoArquivo: "Logotipo - Partido Pátria Livre (Brasil).png" },
  PRP: { wikidata: "Q960955", cor: "#007FC5", texto: "#111111" },
  SD: { wikidata: "Q20061311", cor: "#D86425", texto: "#111111", logo: "sd.png", logoArquivo: "Logomarca do Partido Solidariedade.png" },
  "PT do B": { wikidata: "Q3366792", cor: "#ED5F36", texto: "#111111" },
  PTN: { wikidata: "Q48862035" },
  PSDC: { wikidata: "Q2653287", cor: "#293490", texto: "#FFFFFF", logo: "psdc.png", logoArquivo: "Bandeira-democracia-cristã.png" },
  PRONA: { wikidata: "Q1636064", cor: "#121212", texto: "#FFFFFF", logo: "prona.png", logoArquivo: "Partido de Reedificação da Ordem Nacional logo (2004–2006).png" },
  PPB: { wikidata: "Q732852", cor: "#3A5AA7", texto: "#FFFFFF", logo: "ppb.png", logoArquivo: "Progressistas logo.png" },
};

export const identidadePartido = (sigla: string | undefined): IdentidadePartido | undefined => (sigla ? IDENTIDADE_PARTIDOS[sigla] : undefined);

/** Page on Wikimedia Commons with the original logo file, its history and license. */
export const fonteLogo = (sigla: string) => {
  const a = IDENTIDADE_PARTIDOS[sigla]?.logoArquivo;
  return a ? `https://commons.wikimedia.org/wiki/File:${encodeURIComponent(a.replace(/ /g, "_"))}` : undefined;
};

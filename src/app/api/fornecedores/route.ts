import { documentoPublicavel } from "@/lib/cnpj";
import { getEmpresa, getGastosGerais, getPoliticos } from "@/lib/data";
import { lerOrdemFornecedores, linhasFornecedores, ordenarFornecedores } from "@/lib/fornecedores";

const celula = (v: unknown) => {
  if (v == null || v === "") return "";
  const s = String(v);
  return /[",;\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

/** The suppliers table of /gastos as CSV, in the same order as the page. */
export async function GET(req: Request) {
  const sp = Object.fromEntries(new URL(req.url).searchParams);
  const [g, pols] = await Promise.all([getGastosGerais(), getPoliticos()]);
  if (!g) return new Response("", { status: 404 });
  const total = g.porCasa.reduce((s, c) => s + c.total, 0);
  const empresas = new Map(await Promise.all(g.fornecedores.map(async (f) => [documentoPublicavel(f.doc) ?? "", await getEmpresa(f.doc ?? "")] as const)));
  const linhas = ordenarFornecedores(linhasFornecedores(g.fornecedores, total, empresas, new Map(pols.map((p) => [p.id, p])), documentoPublicavel), lerOrdemFornecedores(sp));
  const cab = [
    "fornecedor",
    "cnpj",
    "total",
    "parte_da_cota",
    "parlamentares",
    "pagamentos",
    "quem_mais_pagou",
    "quem_mais_pagou_valor",
    "media_por_pagamento",
    "media_por_parlamentar",
    "deputados_federais",
    "senadores",
    "deputados_estaduais",
    "campanhas",
    "categoria_principal",
    "primeiro_pagamento",
    "ultimo_pagamento",
  ];
  const corpo = linhas.map((f) =>
    [
      f.nome,
      f.cnpj,
      f.valor.toFixed(2),
      f.parte.toFixed(4),
      f.parlamentares,
      f.n,
      f.maiorPagador?.nome,
      f.maiorPagador?.valor.toFixed(2),
      f.mediaPagamento.toFixed(2),
      f.mediaParlamentar.toFixed(2),
      f.deputados,
      f.senadores,
      f.estaduais,
      f.campanhas?.toFixed(2),
      f.categoria,
      f.primeira,
      f.ultima,
    ]
      .map(celula)
      .join(","),
  );
  return new Response([cab.join(","), ...corpo].join("\n") + "\n", {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="raio-x-fornecedores.csv"',
      "Cache-Control": "public, max-age=3600",
    },
  });
}

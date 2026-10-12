import type { Metadata } from "next";
import { Dispersao, type Ponto } from "@/components/Dispersao";
import { Container, Origem, Secao } from "@/components/ui";
import { getPoliticos, getVotacoes } from "@/lib/data";
import { resumirPartidos } from "@/lib/partidos";
import { correlacao, forcaCorrelacao } from "@/lib/stats";
import type { PoliticoResumo } from "@/lib/types";

export const metadata: Metadata = {
  title: "Cruzamentos de dados",
  description:
    "Perguntas que muita gente faz, respondidas cruzando dados públicos: quem gasta mais falta mais? Experiência muda a presença? Partidos que votam unidos votam com o governo?",
};

function pontos(pols: PoliticoResumo[], x: keyof PoliticoResumo["m"] | "anos", y: keyof PoliticoResumo["m"]): Ponto[] {
  const ano = new Date().getUTCFullYear();
  return pols
    .map((p) => ({ p, vx: x === "anos" ? (p.inicioPolitica ? ano - p.inicioPolitica : undefined) : p.m[x], vy: p.m[y] }))
    .filter((o): o is { p: PoliticoResumo; vx: number; vy: number } => typeof o.vx === "number" && typeof o.vy === "number")
    .filter((o) => x !== "anos" || (o.vx >= 0 && o.vx <= 70))
    .map(({ p, vx, vy }) => ({ id: p.id, x: vx, y: vy, rotulo: p.nome, sub: `${p.partido}-${p.uf}`, foto: p.foto ?? "", href: `/politico/${p.id}` }));
}

function Resposta({ pts }: { pts: Ponto[] }) {
  const r = correlacao(pts.map((p) => [p.x, p.y]));
  return (
    <p className="mt-4 rounded-xl bg-surface-2 p-4 text-lg">
      <b>Resposta curta:</b> {forcaCorrelacao(r)}
      {r != null && (
        <span className="block text-sm text-ink-3">
          Coeficiente de correlação: {r.toFixed(2).replace(".", ",")} (vai de -1 a 1). Relação não quer dizer que uma coisa causa a outra.
        </span>
      )}
    </p>
  );
}

export default async function Analises() {
  const [pols, votacoes] = await Promise.all([getPoliticos(), getVotacoes()]);
  const dep = pols.filter((p) => p.casa === "camara" && p.emExercicio);
  const gastoPresenca = pontos(dep, "presenca", "gasto12m");
  const experiencia = pontos(dep, "anos", "presenca");
  const partidos = resumirPartidos(pols, votacoes).filter((p) => p.cadeiras.camara >= 3 && p.governismo != null && p.unidade != null);
  const bolhas: Ponto[] = partidos.map((p) => ({
    id: p.sigla,
    x: p.governismo!,
    y: p.unidade!,
    rotulo: p.sigla,
    sub: `${p.cadeiras.camara} deputados`,
    tamanho: p.cadeiras.camara,
    href: `/partido/${encodeURIComponent(p.sigla)}`,
    fixo: true,
  }));

  return (
    <Container className="py-10">
      <h1 className="display text-4xl font-extrabold sm:text-5xl">Cruzamentos de dados</h1>
      <p className="mt-4 max-w-3xl text-xl leading-relaxed text-ink-2">
        Perguntas que muita gente faz, respondidas com os números oficiais. Cada ponto é uma pessoa (ou um partido). Toque para abrir.
      </p>

      <Secao titulo="Quem gasta mais da cota falta mais?" subtitulo="Deputados federais: presença no Plenário e gasto da cota nos últimos 12 meses.">
        <div className="cartao p-4 sm:p-6">
          <Dispersao
            pontos={gastoPresenca}
            eixoX={{ rotulo: "Presença no Plenário", formato: "pct" }}
            eixoY={{ rotulo: "Gasto da cota em 12 meses", formato: "moeda" }}
            titulo="Presença e gasto da cota"
          />
          <Resposta pts={gastoPresenca} />
        </div>
      </Secao>

      <Secao titulo="Quem está há mais tempo na política aparece mais?" subtitulo="Deputados federais: anos desde o primeiro mandato encontrado e presença no Plenário.">
        <div className="cartao p-4 sm:p-6">
          <Dispersao
            pontos={experiencia}
            eixoX={{ rotulo: "Anos na política", formato: "anos" }}
            eixoY={{ rotulo: "Presença no Plenário", formato: "pct" }}
            titulo="Anos na política e presença"
          />
          <Resposta pts={experiencia} />
        </div>
      </Secao>

      <Secao
        titulo="Partidos que votam com o governo também votam mais unidos?"
        subtitulo="Cada bolha é um partido na Câmara; o tamanho é o número de deputados. Para a direita, mais votos junto com o governo; para cima, membros votando mais iguais entre si."
      >
        <div className="cartao p-4 sm:p-6">
          <Dispersao
            pontos={bolhas}
            eixoX={{ rotulo: "Vota com o governo (valor típico)", formato: "pct" }}
            eixoY={{ rotulo: "Unidade do partido", formato: "pct" }}
            titulo="Partidos: alinhamento com o governo e unidade"
          />
          <Resposta pts={bolhas} />
        </div>
      </Secao>

      <Origem titulo="Como ler estes gráficos">
        <p>
          Cada ponto mostra dois números da mesma pessoa ou partido. Se os pontos formam uma linha subindo, os dois números crescem juntos; se ficam espalhados, não há relação
          clara.
        </p>
        <p>Relação não é causa: dois números podem andar juntos por um terceiro motivo. Use os gráficos para fazer perguntas, não para tirar conclusões sobre alguém.</p>
      </Origem>
    </Container>
  );
}

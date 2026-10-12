/**
 * Seat layout for hemicycle (plenary) charts. Seats sit on concentric arcs split by a central aisle,
 * like the Câmara and Senado plenaries, all facing the presiding board (Mesa) at the bottom center.
 * Seats are numbered by angle from left to right, so consecutive seats form wedges: a group that
 * takes seats 0..k occupies one contiguous slice of the room.
 */
export interface Assento {
  x: number;
  y: number;
  r: number;
}

export const LARGURA = 1000;
export const ALTURA = 520;
const CX = LARGURA / 2;
const CY = 500;
const RAIO_EXTERNO = 480;

export function layoutPlenario(total: number, opts: { fileiras?: number; corredor?: number } = {}): Assento[] {
  if (total <= 0) return [];
  const fileiras = opts.fileiras ?? Math.max(3, Math.min(14, Math.round(Math.sqrt(total / 2.6))));
  const raioInterno = RAIO_EXTERNO * 0.36;
  // The central aisle has the same width on every row, like a real corridor; a fixed angle would
  // make it vanish on the inner rows and seats on both sides would touch.
  const corredor = opts.corredor ?? 22;
  const passo = (RAIO_EXTERNO - raioInterno) / Math.max(1, fileiras - 1);
  const raios = Array.from({ length: fileiras }, (_, i) => raioInterno + i * passo);

  let raioAssento = passo * 0.42;
  let linhas: { r: number; fim: number; n: number }[] = [];
  // Two passes: the aisle depends on the seat size, and the seat size on how many seats fit per row
  for (let passada = 0; passada < 2; passada++) {
    // Each section spans from the floor line (angle π or 0) to the edge of the aisle
    const meiaAbertura = raios.map((r) => Math.PI / 2 - Math.asin(Math.min(1, (corredor / 2 + raioAssento) / r)));
    const comprimentos = raios.map((r, i) => 2 * r * meiaAbertura[i]);
    const soma = comprimentos.reduce((a, b) => a + b, 0);
    const porFileira = comprimentos.map((c) => Math.floor((c / soma) * total));
    let faltam = total - porFileira.reduce((a, b) => a + b, 0);
    for (let i = fileiras - 1; faltam > 0; i = (i - 1 + fileiras) % fileiras, faltam--) porFileira[i]++;
    linhas = raios.map((r, i) => ({ r, fim: meiaAbertura[i], n: porFileira[i] }));
    // Largest seat that keeps neighbours apart on every row
    const espacos = linhas.map(({ r, fim, n }) => {
      const lado = Math.ceil(n / 2);
      return lado > 1 ? (r * fim) / (lado - 1) : Infinity;
    });
    raioAssento = Math.min(passo * 0.42, Math.min(...espacos) / 2.3);
  }

  const pontos: (Assento & { angulo: number })[] = [];
  for (const { r, fim, n } of linhas) {
    const esquerda = Math.ceil(n / 2);
    const direita = n - esquerda;
    const angulo = (k: number, qtd: number) => (qtd === 1 ? fim / 2 : (k / (qtd - 1)) * fim);
    // Left section: from the floor line (π) up to the aisle; right section mirrors it
    for (let k = 0; k < esquerda; k++) {
      const a = Math.PI - angulo(k, esquerda);
      pontos.push({ x: CX + r * Math.cos(a), y: CY - r * Math.sin(a), r: raioAssento, angulo: a });
    }
    for (let k = 0; k < direita; k++) {
      const a = fim - angulo(k, direita);
      pontos.push({ x: CX + r * Math.cos(a), y: CY - r * Math.sin(a), r: raioAssento, angulo: a });
    }
  }
  // Left to right by angle; within the same angle, inner rows first
  pontos.sort((p, q) => q.angulo - p.angulo || Math.hypot(p.x - CX, p.y - CY) - Math.hypot(q.x - CX, q.y - CY));
  return pontos.map(({ x, y, r }) => ({ x: Math.round(x * 10) / 10, y: Math.round(y * 10) / 10, r: Math.round(r * 10) / 10 }));
}

export const MESA = { x: CX - 90, y: CY - 26, largura: 180, altura: 34 };

export interface Cadeira {
  id: string;
  nome: string;
  partido: string;
  uf: string;
  foto?: string;
  /** CSS color (token) of the seat */
  cor: string;
  /** Short text shown on hover, e.g. the vote or the party position */
  detalhe?: string;
  /** Link target; seats without it are not clickable (e.g. people outside our dataset) */
  href?: string;
  esmaecido?: boolean;
}

export interface ItemLegenda {
  cor: string;
  rotulo: string;
  n: number;
}

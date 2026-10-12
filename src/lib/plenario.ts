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
  const corredor = opts.corredor ?? 0.07; // radians removed around the vertical axis (central aisle)
  const passo = (RAIO_EXTERNO - raioInterno) / Math.max(1, fileiras - 1);
  const raios = Array.from({ length: fileiras }, (_, i) => raioInterno + i * passo);

  // Seats per row proportional to its arc length, adjusted so the total is exact
  const arco = Math.PI - corredor;
  const comprimentos = raios.map((r) => r * arco);
  const soma = comprimentos.reduce((a, b) => a + b, 0);
  const porFileira = comprimentos.map((c) => Math.floor((c / soma) * total));
  let faltam = total - porFileira.reduce((a, b) => a + b, 0);
  for (let i = fileiras - 1; faltam > 0; i = (i - 1 + fileiras) % fileiras, faltam--) porFileira[i]++;

  const raioAssento = Math.min(passo * 0.42, (RAIO_EXTERNO * arco) / porFileira[fileiras - 1] / 2.3);
  const pontos: (Assento & { angulo: number })[] = [];
  raios.forEach((r, i) => {
    const n = porFileira[i];
    // Split each row's seats between the left and right sections of the aisle
    const esquerda = Math.ceil(n / 2);
    const direita = n - esquerda;
    const meia = arco / 2;
    const lado = (k: number, qtd: number, inicio: number) => {
      const t = qtd === 1 ? 0.5 : k / (qtd - 1);
      return inicio - t * meia;
    };
    for (let k = 0; k < esquerda; k++) {
      const a = lado(k, esquerda, Math.PI);
      pontos.push({ x: CX + r * Math.cos(a), y: CY - r * Math.sin(a), r: raioAssento, angulo: a });
    }
    for (let k = 0; k < direita; k++) {
      const a = lado(k, direita, Math.PI / 2 - corredor / 2);
      pontos.push({ x: CX + r * Math.cos(a), y: CY - r * Math.sin(a), r: raioAssento, angulo: a });
    }
  });
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

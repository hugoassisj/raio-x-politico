/** States with their full names and a tile-grid position that preserves Brazil's rough geography. */
export const ESTADOS: { uf: string; nome: string; col: number; row: number }[] = [
  { uf: "RR", nome: "Roraima", col: 3, row: 1 },
  { uf: "AP", nome: "Amapá", col: 5, row: 1 },
  { uf: "AM", nome: "Amazonas", col: 2, row: 2 },
  { uf: "PA", nome: "Pará", col: 4, row: 2 },
  { uf: "MA", nome: "Maranhão", col: 5, row: 2 },
  { uf: "CE", nome: "Ceará", col: 6, row: 2 },
  { uf: "RN", nome: "Rio Grande do Norte", col: 7, row: 2 },
  { uf: "AC", nome: "Acre", col: 1, row: 3 },
  { uf: "RO", nome: "Rondônia", col: 2, row: 3 },
  { uf: "TO", nome: "Tocantins", col: 4, row: 3 },
  { uf: "PI", nome: "Piauí", col: 5, row: 3 },
  { uf: "PE", nome: "Pernambuco", col: 6, row: 3 },
  { uf: "PB", nome: "Paraíba", col: 7, row: 3 },
  { uf: "MT", nome: "Mato Grosso", col: 3, row: 4 },
  { uf: "GO", nome: "Goiás", col: 4, row: 4 },
  { uf: "BA", nome: "Bahia", col: 5, row: 4 },
  { uf: "SE", nome: "Sergipe", col: 6, row: 4 },
  { uf: "AL", nome: "Alagoas", col: 7, row: 4 },
  { uf: "MS", nome: "Mato Grosso do Sul", col: 3, row: 5 },
  { uf: "DF", nome: "Distrito Federal", col: 4, row: 5 },
  { uf: "MG", nome: "Minas Gerais", col: 5, row: 5 },
  { uf: "ES", nome: "Espírito Santo", col: 6, row: 5 },
  { uf: "SP", nome: "São Paulo", col: 4, row: 6 },
  { uf: "RJ", nome: "Rio de Janeiro", col: 5, row: 6 },
  { uf: "PR", nome: "Paraná", col: 3, row: 7 },
  { uf: "SC", nome: "Santa Catarina", col: 4, row: 7 },
  { uf: "RS", nome: "Rio Grande do Sul", col: 3, row: 8 },
];

export const nomeUf = (uf: string) => ESTADOS.find((e) => e.uf === uf)?.nome ?? uf;
export const ufValida = (uf: string) => ESTADOS.some((e) => e.uf === uf.toUpperCase());

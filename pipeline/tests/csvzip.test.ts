import { strToU8, zipSync } from "fflate";
import { describe, expect, it } from "vitest";
import { leitor, percorrerCsvZip } from "../lib/csvzip";

/** Walks the archive in 64 KB slices, as the disk reader does, and reports what fflate still holds. */
function percorrer(zip: Uint8Array, opts: Parameters<typeof leitor>[1]) {
  const linhas: Record<string, string>[] = [];
  const uz = leitor((row) => linhas.push(row), opts);
  const FATIA = 1 << 16;
  for (let i = 0; i < zip.length; i += FATIA) uz.push(zip.subarray(i, i + FATIA), i + FATIA >= zip.length);
  const retido = (uz as unknown as { k: Uint8Array[][] }).k.flat().reduce((s, c) => s + c.length, 0);
  return { linhas, retido };
}

describe("zip walker", () => {
  it("streams skipped files through instead of holding them in memory", () => {
    // One wanted state file and one national file ten times larger that must be ignored
    const linha = '"1";"2026";"SQ1";"RECEITA";"100"\n';
    const estado = `"ANO";"X";"SQ_CANDIDATO";"DS";"VR"\n${linha.repeat(50)}`;
    const nacional = `"ANO";"X";"SQ_CANDIDATO";"DS";"VR"\n${linha.repeat(40_000)}`;
    const zip = zipSync({
      "receitas_candidatos_2020_BRASIL.csv": [strToU8(nacional), { level: 0 }],
      "receitas_candidatos_2020_SP.csv": [strToU8(estado), { level: 6 }],
      "leiame.pdf": strToU8("x"),
    });
    expect(zip.length).toBeGreaterThan(1 << 20);
    const { linhas, retido } = percorrer(zip, { arquivo: (n) => /_[A-Z]{2}\.csv$/.test(n) });
    expect(linhas).toHaveLength(50);
    expect(linhas[0].SQ_CANDIDATO).toBe("SQ1");
    // Before the fix the whole national file (over 1 MB) stayed in fflate's buffers until the end
    expect(retido).toBeLessThan(1 << 16);
  });

  it("reads every wanted file of a small archive in one go", () => {
    const zip = zipSync({ "a_SP.csv": strToU8('"A";"B"\n"1";"2"\n'), "a_RJ.csv": strToU8('"A";"B"\n"3";"4"\n') });
    const vistos: string[] = [];
    percorrerCsvZip(zip, (row, nome) => vistos.push(`${nome}:${row.A}`));
    expect(vistos.sort()).toEqual(["a_RJ.csv:3", "a_SP.csv:1"]);
  });
});

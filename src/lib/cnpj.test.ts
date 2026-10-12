import { describe, expect, it } from "vitest";
import { cnpjValido, documentoPublicavel, formatarCnpj, normalizarCnpj } from "./cnpj";

describe("CNPJ", () => {
  it("normalizes punctuation and leading zeros", () => {
    expect(normalizarCnpj("11.222.333/0001-81")).toBe("11222333000181");
    // Some files drop leading zeros; 11 digits is a CPF and is never padded
    expect(normalizarCnpj("191000000000")).toBe("00191000000000");
    expect(normalizarCnpj("12345678909")).toBeUndefined();
    expect(normalizarCnpj("1222333000181")).toBe("01222333000181");
    expect(normalizarCnpj("abc")).toBeUndefined();
  });

  it("checks the two digits", () => {
    expect(cnpjValido("11.222.333/0001-81")).toBe(true);
    expect(cnpjValido("11.222.333/0001-82")).toBe(false);
    expect(cnpjValido("00000000000000")).toBe(false);
    // Banco do Brasil, a well-known public CNPJ
    expect(cnpjValido("00.000.000/0001-91")).toBe(true);
  });

  it("accepts the alphanumeric format issued from July 2026", () => {
    // Example published by the Receita Federal for the new format
    expect(cnpjValido("12.ABC.345/01DE-35")).toBe(true);
    expect(cnpjValido("12.ABC.345/01DE-36")).toBe(false);
    expect(formatarCnpj("12abc34501de35")).toBe("12.ABC.345/01DE-35");
  });

  it("never publishes a CPF", () => {
    expect(documentoPublicavel("123.456.789-09")).toBeUndefined();
    expect(documentoPublicavel("11222333000181")).toBe("11222333000181");
    expect(documentoPublicavel("11222333000182")).toBeUndefined();
  });
});

import { nomeUf } from "@/lib/ufs";
import { temBandeira } from "@/lib/bandeiras";

/**
 * The flag of a state, as a small contextual image next to its name. Renders nothing for an unknown
 * code, so a missing flag never leaves a broken image. Always paired with the state name in text:
 * the flag helps recognition, it never carries the information alone.
 */
export function BandeiraUf({ uf, altura = 16, className = "" }: { uf: string; altura?: number; className?: string }) {
  const sigla = uf.toUpperCase();
  if (!temBandeira(sigla)) return null;
  return (
    // eslint-disable-next-line @next/next/no-img-element -- tiny local PNGs, already sized; no optimizer needed
    <img
      src={`/bandeiras/${sigla}.png`}
      alt={`Bandeira de ${nomeUf(sigla)}`}
      width={Math.round(altura * (10 / 7))}
      height={altura}
      loading="lazy"
      decoding="async"
      className={`inline-block shrink-0 rounded-[3px] object-cover align-[-0.15em] ring-1 ring-line ${className}`}
      style={{ height: altura, width: Math.round(altura * (10 / 7)) }}
    />
  );
}

import Link from "next/link";
import { nomePartido } from "@/lib/partidos";
import { identidadePartido } from "@/lib/partidos-identidade";

/**
 * A party shown the same way everywhere: its brand color as a small dot, its logo when asked, and
 * always the acronym in text, with the full name for screen readers and on hover. Color and logo
 * identify the party; they never color charts or seats, so no screen reads as favoring a side.
 * `link` only for parties with a page (members in office today).
 */
export function SiglaPartido({ sigla, link = false, logo = true, className = "" }: { sigla?: string; link?: boolean; logo?: boolean; className?: string }) {
  if (!sigla) return null;
  const nome = nomePartido(sigla);
  const id = identidadePartido(sigla);
  const conteudo = (
    // Plain inline content, so the badge sits on the same baseline as the text around it
    <span className="whitespace-nowrap">
      {logo && id?.logo ? <LogoPartido sigla={sigla} altura={16} className="mr-1.5" /> : <CorPartido sigla={sigla} className="mr-1.5" />}
      <abbr title={nome !== sigla ? nome : undefined} className="no-underline">
        {sigla}
      </abbr>
    </span>
  );
  return link ? (
    <Link href={`/partido/${encodeURIComponent(sigla)}`} className={`hover:underline ${className}`}>
      {conteudo}
    </Link>
  ) : (
    <span className={className}>{conteudo}</span>
  );
}

/** The party's brand color as a dot; nothing when the party has no recorded color. */
export function CorPartido({ sigla, className = "" }: { sigla: string; className?: string }) {
  const cor = identidadePartido(sigla)?.cor;
  if (!cor) return null;
  return <span className={`inline-block h-2.5 w-2.5 shrink-0 rounded-full align-middle ring-1 ring-inset ring-black/15 ${className}`} style={{ background: cor }} aria-hidden />;
}

/** The party's logo, on a white tile so dark marks stay visible in the dark theme. */
export function LogoPartido({ sigla, altura = 24, className = "" }: { sigla: string; altura?: number; className?: string }) {
  const id = identidadePartido(sigla);
  if (!id?.logo) return null;
  return (
    // eslint-disable-next-line @next/next/no-img-element -- small local files, already sized
    <img
      src={`/partidos/${id.logo}`}
      alt=""
      width={altura}
      height={altura}
      loading="lazy"
      decoding="async"
      className={`inline-block shrink-0 rounded bg-white object-contain p-px align-[-0.3em] ring-1 ring-line ${className}`}
      style={{ height: altura, width: altura }}
    />
  );
}

/** A chip in the party's own color with its logo, acronym and name, for headers. */
export function ChipPartido({ sigla, href }: { sigla: string; href?: string }) {
  const id = identidadePartido(sigla);
  const estilo = id?.cor ? { background: id.cor, color: id.texto } : undefined;
  const classe = `inline-flex items-center gap-2 rounded-lg px-3 py-1.5 ${id?.cor ? "" : "bg-ink text-paper"} ${href ? "hover:opacity-90" : ""}`;
  const conteudo = (
    <>
      {id?.logo && <LogoPartido sigla={sigla} altura={22} />}
      <b>{sigla}</b> <span className="hidden text-sm opacity-85 sm:inline">{nomePartido(sigla)}</span>
    </>
  );
  return href ? (
    <Link href={href} className={classe} style={estilo}>
      {conteudo}
    </Link>
  ) : (
    <span className={classe} style={estilo}>
      {conteudo}
    </span>
  );
}

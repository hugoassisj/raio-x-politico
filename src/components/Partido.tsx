import Link from "next/link";
import { nomePartido } from "@/lib/partidos";

/**
 * A party shown the same way everywhere: the acronym, with the full name for screen readers and on
 * hover. `link` only for parties with a page (members in office today). No party colors: no screen
 * should read as favoring a side (see PRODUCT.md).
 */
export function SiglaPartido({ sigla, link = false, className = "" }: { sigla?: string; link?: boolean; className?: string }) {
  if (!sigla) return null;
  const nome = nomePartido(sigla);
  const conteudo = (
    <abbr title={nome !== sigla ? nome : undefined} className="no-underline">
      {sigla}
    </abbr>
  );
  return link ? (
    <Link href={`/partido/${encodeURIComponent(sigla)}`} className={`hover:underline ${className}`}>
      {conteudo}
    </Link>
  ) : (
    <span className={className}>{conteudo}</span>
  );
}

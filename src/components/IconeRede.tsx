import { Globe, Briefcase, Video } from "lucide-react";
import { siBluesky, siFacebook, siInstagram, siTelegram, siThreads, siTiktok, siX, siYoutube, type SimpleIcon } from "simple-icons";
import type { RedeSocial } from "@/lib/types";

/**
 * Platform marks from Simple Icons (CC0), drawn in the text color so no network stands out.
 * Platforms without a published mark use a generic icon.
 */
const MARCAS: Partial<Record<RedeSocial["plataforma"], SimpleIcon>> = {
  x: siX,
  instagram: siInstagram,
  tiktok: siTiktok,
  youtube: siYoutube,
  facebook: siFacebook,
  threads: siThreads,
  bluesky: siBluesky,
  telegram: siTelegram,
};

export function IconeRede({ plataforma, className = "h-4 w-4" }: { plataforma: RedeSocial["plataforma"]; className?: string }) {
  const m = MARCAS[plataforma];
  if (m)
    return (
      <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
        <path d={m.path} />
      </svg>
    );
  if (plataforma === "linkedin") return <Briefcase className={className} aria-hidden />;
  if (plataforma === "kwai") return <Video className={className} aria-hidden />;
  return <Globe className={className} aria-hidden />;
}

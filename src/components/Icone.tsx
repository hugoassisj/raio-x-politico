import { CalendarCheck, FileText, Flag, House, Landmark, Scroll, SearchCheck, Send, Users, Vote, Wallet, type LucideIcon } from "lucide-react";
import type { DefMetrica } from "@/lib/metricas";

const MAPA: Record<DefMetrica["icone"], LucideIcon> = {
  "calendar-check": CalendarCheck,
  vote: Vote,
  flag: Flag,
  landmark: Landmark,
  wallet: Wallet,
  "search-check": SearchCheck,
  "file-text": FileText,
  scroll: Scroll,
  send: Send,
  home: House,
  users: Users,
};

/** Topic icon in a soft tile: helps people scan sections without reading every word. */
export function IconeTema({ nome, tamanho = 20, className = "" }: { nome: DefMetrica["icone"]; tamanho?: number; className?: string }) {
  const I = MAPA[nome];
  return (
    <span
      aria-hidden
      className={`inline-flex shrink-0 items-center justify-center rounded-xl bg-surface-2 text-ink ${className}`}
      style={{ width: tamanho * 2, height: tamanho * 2 }}
    >
      <I size={tamanho} strokeWidth={2} />
    </span>
  );
}

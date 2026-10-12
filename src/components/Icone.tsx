import {
  Briefcase,
  GitCompare,
  History,
  PiggyBank,
  Wrench,
  HandCoins,
  MapPin,
  MessageSquareQuote,
  Scale,
  Building2,
  Bus,
  CalendarCheck,
  Cpu,
  FileText,
  Flag,
  Globe,
  GraduationCap,
  HeartPulse,
  House,
  Landmark,
  Leaf,
  Music,
  Scroll,
  SearchCheck,
  Send,
  Shield,
  Store,
  Users,
  Vote,
  Wallet,
  Wheat,
  type LucideIcon,
} from "lucide-react";
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
      className={`inline-flex shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent-ink ${className}`}
      style={{ width: tamanho * 2, height: tamanho * 2 }}
    >
      <I size={tamanho} strokeWidth={2} />
    </span>
  );
}

const ASSUNTO: Record<string, LucideIcon> = { HeartPulse, GraduationCap, Landmark, Store, Briefcase, Shield, Leaf, Wheat, Bus, Users, Building2, Cpu, Music, Globe };

/** Icon of a subject area (see src/lib/assuntos.ts). */
export function IconeAssunto({ nome, className = "h-4 w-4" }: { nome: string; className?: string }) {
  const I = ASSUNTO[nome] ?? FileText;
  return <I className={className} aria-hidden />;
}

const PERGUNTA: Record<string, LucideIcon> = {
  MapPin,
  CalendarCheck,
  Vote,
  Scale,
  Wallet,
  Users,
  MessageSquareQuote,
  Landmark,
  GitCompare,
  HandCoins,
  FileText,
  History,
  PiggyBank,
  Wrench,
};

/** Icon of a question the site answers (see src/lib/perguntas.ts). */
export function IconePergunta({ nome, className = "h-5 w-5" }: { nome: string; className?: string }) {
  const I = PERGUNTA[nome] ?? FileText;
  return <I className={className} aria-hidden />;
}

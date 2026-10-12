import type { Metadata, Viewport } from "next";
import { AvisoDemo, Cabecalho, Rodape } from "@/components/Moldura";
import { BarraInferior } from "@/components/BarraInferior";
import "./globals.css";

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://raio-x-politico.vercel.app";

export const metadata: Metadata = {
  metadataBase: new URL(SITE),
  title: { default: "Raio-X Político: o que fazem deputados e senadores", template: "%s | Raio-X Político" },
  description:
    "Presença, votos, projetos, gastos, emendas, patrimônio e falas de todos os senadores, deputados federais e estaduais do Brasil, com dados públicos oficiais e fonte em cada número.",
  openGraph: { type: "website", locale: "pt_BR", siteName: "Raio-X Político" },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f4f6fa" },
    { media: "(prefers-color-scheme: dark)", color: "#0b1018" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className="min-h-dvh antialiased">
        <Cabecalho />
        <AvisoDemo />
        <main id="conteudo">{children}</main>
        <Rodape />
        <BarraInferior />
      </body>
    </html>
  );
}

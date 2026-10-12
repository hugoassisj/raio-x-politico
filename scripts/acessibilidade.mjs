/**
 * Automated accessibility check (WCAG 2.2 A and AA rules of axe-core) on the main pages, in the
 * light and dark themes. Run against a site that is already up:
 *
 *   npm run dev            # in another terminal
 *   npm run a11y           # or: SITE=http://localhost:3000 CHROMIUM=/path/to/chrome npm run a11y
 *
 * Automated rules catch only part of the problems; keyboard and screen reader checks are still
 * done by hand (see docs/IMPLEMENTATION_ROADMAP.md, A11Y-01).
 */
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { chromium } from "playwright-core";

const require = createRequire(import.meta.url);
const axe = readFileSync(require.resolve("axe-core/axe.min.js"), "utf8");
const SITE = process.env.SITE ?? "http://localhost:3000";
const PAGINAS = (process.env.PAGINAS ?? "/,/votacoes,/politicos,/partidos,/gastos,/presidencia,/empresas,/emendas,/relacoes,/como-funciona,/dados,/sobre").split(",");

const navegador = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {});
let problemas = 0;
for (const tema of ["light", "dark"]) {
  const pagina = await navegador.newPage({ viewport: { width: 1280, height: 900 }, colorScheme: tema });
  for (const caminho of PAGINAS) {
    await pagina.goto(SITE + caminho, { waitUntil: "networkidle" });
    await pagina.addScriptTag({ content: axe });
    const violacoes = await pagina.evaluate(async () => {
      const r = await window.axe.run(document, { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"] } });
      return r.violations.map((v) => `${v.id} (${v.nodes.length}): ${v.nodes[0]?.target?.join(" ")}`);
    });
    problemas += violacoes.length;
    console.log(`${violacoes.length ? "✖" : "✓"} ${tema} ${caminho}${violacoes.length ? `\n    ${violacoes.join("\n    ")}` : ""}`);
  }
  await pagina.close();
}
await navegador.close();
process.exit(problemas ? 1 : 0);

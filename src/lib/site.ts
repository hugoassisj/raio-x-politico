/** Public addresses of the project, defined once. */
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://raio-x-politico.vercel.app";
export const REPO_URL = process.env.NEXT_PUBLIC_REPO_URL ?? "https://github.com/hugoassisj/raio-x-politico";

/** Opens the "erro nos dados" form with the page already filled in. */
export function urlCorrecao(caminho?: string): string {
  const u = new URLSearchParams({ template: "erro-nos-dados.yml" });
  if (caminho) u.set("pagina", `${SITE_URL}${caminho}`);
  return `${REPO_URL}/issues/new?${u}`;
}

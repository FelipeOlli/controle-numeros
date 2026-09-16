// Rotas estáticas do app que não podem colidir com o slug de uma empresa.
export const RESERVED_SLUGS = new Set([
  "painel",
  "empresas",
  "login",
  "convite",
  "api",
  "sem-organizacao",
]);

const COMBINING_DIACRITICS = /[̀-ͯ]/g;

export function slugify(input: string): string {
  return input
    .normalize("NFD")
    .replace(COMBINING_DIACRITICS, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

// Slug derivado do título da receita.
//
// O Decap CMS não renomeia o arquivo .md quando o título muda — só edita o
// frontmatter. Se o slug viesse do filename (recipe.id), URLs ficariam
// presas ao nome original mesmo depois de renomear a receita no admin.
//
// Pra resolver, derivamos a URL do data.title slugificado em build time.
// Custo: URLs antigas mudam quando o título muda (bookmarks quebram). Aceitável
// num site novo e pessoal sem peso de SEO histórico.

export function slugify(str: string): string {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')    // remove acentos (combining marks)
    .replace(/[^a-z0-9]+/g, '-')        // tudo que não é alfanumérico vira hífen
    .replace(/^-+|-+$/g, '');            // tira hífen nas pontas
}

/**
 * Slug de URL pra uma receita.
 * Recebe entry do content collection (com .data.title).
 * Fallback pro id se o title estiver vazio por algum motivo.
 */
export function recipeSlug(entry: { id: string; data: { title?: string } }): string {
  const fromTitle = entry.data.title ? slugify(entry.data.title) : '';
  return fromTitle || entry.id;
}

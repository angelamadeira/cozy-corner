import pt from './pt.json';
import en from './en.json';

export const locales = ['pt', 'en'] as const;
export const defaultLocale = 'pt' as const;
export type Locale = (typeof locales)[number];

const dictionaries: Record<Locale, typeof pt> = {
  pt,
  en: en as typeof pt, // forçamos shape igual; en pode ter chaves faltando que caem no pt
};

/**
 * Pega um valor aninhado por path tipo "recipe.ingredients" do dicionário.
 * Retorna undefined se não existir.
 */
function getByPath(obj: Record<string, unknown>, path: string): string | undefined {
  const parts = path.split('.');
  let cur: unknown = obj;
  for (const p of parts) {
    if (cur && typeof cur === 'object' && p in (cur as object)) {
      cur = (cur as Record<string, unknown>)[p];
    } else {
      return undefined;
    }
  }
  return typeof cur === 'string' ? cur : undefined;
}

/**
 * Interpola placeholders {key} no template usando o objeto values.
 */
function interpolate(template: string, values?: Record<string, string | number>): string {
  if (!values) return template;
  return template.replace(/\{(\w+)\}/g, (_, key) =>
    key in values ? String(values[key]) : `{${key}}`
  );
}

/**
 * Cria um tradutor pra um locale específico.
 * Uso: const t = useT(Astro.currentLocale); t('recipe.ingredients')
 */
export function useT(locale: string | undefined) {
  const loc = (locales.includes(locale as Locale) ? locale : defaultLocale) as Locale;
  return function t(key: string, values?: Record<string, string | number>): string {
    const dict = dictionaries[loc];
    const pt_dict = dictionaries[defaultLocale];
    const value = getByPath(dict, key) ?? getByPath(pt_dict, key) ?? key;
    return interpolate(value, values);
  };
}

/**
 * Retorna o locale "limpo" com fallback pro default.
 */
export function normalizeLocale(locale: string | undefined): Locale {
  return locales.includes(locale as Locale) ? (locale as Locale) : defaultLocale;
}

/**
 * Helper pra criar URLs respeitando o locale atual.
 * Em PT (default), URL é /receitas/slug
 * Em EN, URL é /en/recipes/slug
 */
export function localePath(path: string, locale: string | undefined): string {
  const loc = normalizeLocale(locale);
  const cleaned = path.startsWith('/') ? path : '/' + path;
  if (loc === defaultLocale) return cleaned;
  return '/' + loc + cleaned;
}

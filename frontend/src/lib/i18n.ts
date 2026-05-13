// Strings da UI por idioma. Quando adicionar EN/outra língua,
// duplicar o objeto 'pt-br' e traduzir.

export const STRINGS = {
  'pt-br': {
    intro: {
      phrase1: 'olá!',
      phrase2: 'que bom te ver por aqui :)',
      skip: 'pular intro ✕',
    },
    kitchen: {
      title: 'cozinha · clique em qualquer elemento',
    },
    category: {
      back: 'voltar pra cozinha',
      search: 'buscar nesta categoria...',
      filters: ['todas', 'até 30 min', 'vegetariana', 'sem glúten'],
      count: (n: number) => `${n} receita${n === 1 ? '' : 's'}`,
      empty: 'ainda sem receitas por aqui...',
    },
    recipe: {
      ingredients: 'Ingredientes',
      materials: 'Materiais',
      steps: 'Modo de preparo',
      cookingMode: 'Modo cozinha',
      portion: 'ajustar porções',
      unit: { metric: 'métrico', imperial: 'imperial' },
      share: {
        whatsapp: 'Mandar pro WhatsApp',
        copy: 'Copiar link',
        print: 'Imprimir',
      },
    },
    recado: {
      title: 'Deixe seu recado',
      sub: 'manda um oi, dúvida ou sugestão de receita 💌',
      nameLabel: 'seu nome',
      messageLabel: 'mensagem',
      messagePlaceholder: 'oi Gigi!',
      send: '📱 enviar pelo WhatsApp',
      altText: 'ou me escreve em',
    },
    nav: {
      allRecipes: 'todas as receitas',
    },
  },
} as const;

export type Lang = keyof typeof STRINGS;
export const DEFAULT_LANG: Lang = 'pt-br';

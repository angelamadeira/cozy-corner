import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

// As 6 categorias fixas + atalho "todas" (não é categoria real, é shortcut)
export const CATEGORIES = [
  'principais',
  'sobremesas',
  'datas',
  'vegetarianas',
  'congelar',
  'rapidas',
] as const;

export type Category = (typeof CATEGORIES)[number];

const recipes = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/recipes' }),
  schema: z.object({
    title: z.string(),
    description: z.string().optional(),
    category: z.enum(CATEGORIES),
    time: z.number().int().positive(), // minutos
    servings: z.number().int().positive(),
    difficulty: z.enum(['fácil', 'médio', 'difícil']).default('médio'),
    tags: z.array(z.string()).default([]),
    unitSystem: z.enum(['metric', 'imperial']).default('metric'),
    media: z.array(z.object({
      type: z.enum(['image', 'video']),
      src: z.string(),
      alt: z.string().optional(),
      cover: z.boolean().optional(),
    })).default([]),
    ingredients: z.array(z.string()).default([]),
    materials: z.array(z.string()).default([]),
    steps: z.array(z.string()).default([]),
    notes: z.string().optional(),
    published: z.boolean().default(true),
    publishedAt: z.coerce.date(),
    lang: z.string().default('pt-br'),
  }),
});

export const collections = { recipes };

import type { Category } from '../content.config';

// Mapping entre slug da categoria, label visível e ícone line-art (Phosphor thin)
export const CATEGORY_META: Record<Category, {
  label: string;
  hotspot: string; // qual objeto da cozinha aciona essa categoria
  icon: string;    // ícone Iconify (Phosphor thin) — line art
}> = {
  principais:   { label: 'Pratos principais',    hotspot: 'prato',      icon: 'ph:bowl-food-thin' },
  sobremesas:   { label: 'Sobremesas',           hotspot: 'doce',       icon: 'ph:ice-cream-thin' },
  datas:        { label: 'Datas comemorativas',  hotspot: 'calendario', icon: 'ph:calendar-thin' },
  vegetarianas: { label: 'Vegetarianas',         hotspot: 'vaso',       icon: 'ph:plant-thin' },
  congelar:     { label: 'Para congelar',        hotspot: 'freezer',    icon: 'ph:snowflake-thin' },
  rapidas:      { label: 'Receitas rápidas',     hotspot: 'relogio',    icon: 'ph:clock-thin' },
};

// Hotspots não-categoria da cozinha
export const KITCHEN_ACTIONS = {
  todas:  { label: 'Todas as receitas', hotspot: 'livros', icon: 'ph:books-thin' },
  recado: { label: 'Deixe seu recado',  hotspot: 'postit', icon: 'ph:envelope-thin' },
  switch: { label: 'Liga/desliga luz',  hotspot: 'switch', icon: 'ph:lightbulb-thin' },
} as const;

import type { Category } from '../content.config';

// Mapping entre slug da categoria, label visível e hotspot da cozinha
export const CATEGORY_META: Record<Category, {
  label: string;
  hotspot: string; // qual objeto da cozinha aciona essa categoria
  emoji?: string;
}> = {
  principais:   { label: 'Pratos principais',    hotspot: 'prato',      emoji: '🍝' },
  sobremesas:   { label: 'Sobremesas',           hotspot: 'doce',       emoji: '🍨' },
  datas:        { label: 'Datas comemorativas',  hotspot: 'calendario', emoji: '📅' },
  vegetarianas: { label: 'Vegetarianas',         hotspot: 'vaso',       emoji: '🌱' },
  congelar:     { label: 'Para congelar',        hotspot: 'freezer',    emoji: '❄️' },
  rapidas:      { label: 'Receitas rápidas',     hotspot: 'relogio',    emoji: '⏱' },
};

// Hotspots não-categoria da cozinha
export const KITCHEN_ACTIONS = {
  todas:  { label: 'Todas as receitas', hotspot: 'livros' },
  recado: { label: 'Deixe seu recado',  hotspot: 'postit' },
  switch: { label: 'Liga/desliga luz',  hotspot: 'switch' },
} as const;

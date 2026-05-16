#!/usr/bin/env node
// Traduz campos PT das receitas pra EN via DeepL API e grava de volta no
// frontmatter dos arquivos .md. Idempotente: só traduz campos `*_en` que
// estão vazios/ausentes. Se você editar manualmente um `*_en` no Decap, a
// próxima execução respeita.
//
// Uso:
//   DEEPL_API_KEY=xxx node scripts/translate-recipes.mjs
//   DEEPL_API_KEY=xxx node scripts/translate-recipes.mjs path/to/recipe.md ...
//
// Sem args, processa TODOS os arquivos em frontend/src/content/recipes/.
// Com args (caminhos relativos ao repo), processa só esses (usado pela
// GitHub Action pra economizar quota — só traduz o que mudou).

import { readFile, writeFile, readdir } from 'node:fs/promises';
import { resolve, join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import matter from 'gray-matter';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, '..');
const RECIPES_DIR = join(REPO_ROOT, 'frontend/src/content/recipes');

const DEEPL_API_KEY = process.env.DEEPL_API_KEY;
// Free tier: api-free.deepl.com. Pro: api.deepl.com.
// A free key termina em ":fx" — detecta automaticamente.
const DEEPL_ENDPOINT = (DEEPL_API_KEY && DEEPL_API_KEY.endsWith(':fx'))
  ? 'https://api-free.deepl.com/v2/translate'
  : 'https://api.deepl.com/v2/translate';

if (!DEEPL_API_KEY) {
  console.error('[translate] missing DEEPL_API_KEY env var');
  process.exit(1);
}

/**
 * Traduz um array de textos PT → EN em uma única chamada à DeepL (lote).
 * @param {string[]} texts
 * @returns {Promise<string[]>}
 */
async function translateBatch(texts) {
  if (!texts.length) return [];
  const params = new URLSearchParams();
  for (const t of texts) params.append('text', t);
  params.append('source_lang', 'PT');
  params.append('target_lang', 'EN-US');
  // Formality default (não força tu/você); preserve_formatting ajuda em
  // listas/passos com quebras de linha.
  params.append('preserve_formatting', '1');

  const resp = await fetch(DEEPL_ENDPOINT, {
    method: 'POST',
    headers: {
      'Authorization': `DeepL-Auth-Key ${DEEPL_API_KEY}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params.toString(),
  });
  if (!resp.ok) {
    const errText = await resp.text();
    throw new Error(`DeepL HTTP ${resp.status}: ${errText}`);
  }
  const data = await resp.json();
  return data.translations.map((t) => t.text);
}

/** Verifica se um valor é "vazio" (string vazia, array vazio, null, undef). */
function isEmpty(v) {
  if (v === null || v === undefined) return true;
  if (typeof v === 'string') return v.trim().length === 0;
  if (Array.isArray(v)) return v.length === 0;
  return false;
}

/**
 * Pega o valor textual de um item de lista que pode ser string OU
 * objeto {item: "..."} (formato do Decap). Retorna a string.
 */
function listItemText(x) {
  if (typeof x === 'string') return x;
  if (x && typeof x === 'object' && typeof x.item === 'string') return x.item;
  return '';
}

/**
 * Reconstroi um item de lista mantendo o formato original (string ou objeto).
 * Se a entrada era objeto {item: ...}, retorna {item: novoTexto}.
 */
function listItemRebuild(original, newText) {
  if (typeof original === 'string') return newText;
  if (original && typeof original === 'object') return { ...original, item: newText };
  return newText;
}

/**
 * Processa um arquivo de receita. Lê frontmatter, traduz campos faltantes,
 * salva de volta. Retorna true se alguma alteração foi feita.
 */
async function processRecipe(filePath) {
  const raw = await readFile(filePath, 'utf-8');
  const parsed = matter(raw);
  const data = parsed.data;
  const changes = [];

  // Coleta tudo que precisa traduzir em UMA chamada à DeepL (mais barato/rápido).
  // Mantém referência ao que faz com cada resultado.
  const queue = []; // { text: string, apply: (translated) => void }

  // ---- Campos string simples ----
  for (const [ptKey, enKey] of [
    ['title', 'title_en'],
    ['description', 'description_en'],
    ['notes', 'notes_en'],
  ]) {
    const ptVal = data[ptKey];
    const enVal = data[enKey];
    if (ptVal && isEmpty(enVal)) {
      queue.push({ text: ptVal, apply: (t) => { data[enKey] = t; changes.push(enKey); } });
    }
  }

  // ---- Listas (ingredientes, materiais, passos) ----
  for (const [ptKey, enKey] of [
    ['ingredients', 'ingredients_en'],
    ['materials', 'materials_en'],
    ['steps', 'steps_en'],
  ]) {
    const ptArr = data[ptKey];
    const enArr = data[enKey];
    if (Array.isArray(ptArr) && ptArr.length > 0 && isEmpty(enArr)) {
      const items = ptArr.map(listItemText).filter(Boolean);
      if (items.length === 0) continue;
      const startIdx = queue.length;
      for (const text of items) {
        queue.push({ text, apply: () => {} }); // placeholder; substituído abaixo
      }
      // Quando todas as traduções voltarem, monta o array e atribui de uma vez.
      const captureResults = (translated) => {
        const newItems = ptArr.map((orig, i) => listItemRebuild(orig, translated[i] || listItemText(orig)));
        data[enKey] = newItems;
        changes.push(enKey);
      };
      // Substitui os placeholders por handlers que coletam no batch e chamam
      // o capture quando completo.
      const collected = new Array(items.length);
      let received = 0;
      for (let i = 0; i < items.length; i++) {
        queue[startIdx + i].apply = (t) => {
          collected[i] = t;
          received++;
          if (received === items.length) captureResults(collected);
        };
      }
    }
  }

  // ---- media.alt → media[i].alt_en ----
  if (Array.isArray(data.media)) {
    for (let i = 0; i < data.media.length; i++) {
      const m = data.media[i];
      if (m && m.alt && isEmpty(m.alt_en)) {
        queue.push({
          text: m.alt,
          apply: (t) => { data.media[i].alt_en = t; changes.push(`media[${i}].alt_en`); },
        });
      }
    }
  }

  if (queue.length === 0) return false;

  console.log(`[translate] ${filePath}: traduzindo ${queue.length} item(s)...`);
  const texts = queue.map(q => q.text);
  const translated = await translateBatch(texts);
  for (let i = 0; i < queue.length; i++) {
    queue[i].apply(translated[i]);
  }

  // Reescreve o arquivo com o novo frontmatter, preservando o body.
  const newContent = matter.stringify(parsed.content, data, {
    // Mantém aspas/format consistente — gray-matter usa js-yaml por baixo.
  });
  await writeFile(filePath, newContent, 'utf-8');
  console.log(`[translate] ${filePath}: salvo (${changes.join(', ')})`);
  return true;
}

async function listMdFiles(dir) {
  const entries = await readdir(dir);
  return entries.filter(e => e.endsWith('.md')).map(e => join(dir, e));
}

async function main() {
  let targets = process.argv.slice(2);
  if (targets.length === 0) {
    targets = await listMdFiles(RECIPES_DIR);
  } else {
    targets = targets.map(t => resolve(REPO_ROOT, t));
  }

  let touched = 0;
  for (const file of targets) {
    if (!file.endsWith('.md')) continue;
    try {
      const changed = await processRecipe(file);
      if (changed) touched++;
    } catch (err) {
      console.error(`[translate] erro processando ${file}:`, err.message);
      // Continua nos próximos pra não bloquear tudo se uma receita falhar.
    }
  }

  console.log(`[translate] feito. ${touched} arquivo(s) alterado(s).`);
}

main().catch((err) => {
  console.error('[translate] fatal:', err);
  process.exit(1);
});

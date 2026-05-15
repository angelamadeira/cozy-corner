// Cloudflare Pages Function — endpoints públicos e privados pros recados.
//
//   POST /recados   → recebe o form de qualquer visitante e salva no KV
//   GET  /recados   → lista todos (precisa Authorization: Bearer <RECADOS_ADMIN_TOKEN>)
//
// Setup necessário no Cloudflare Pages → Settings → Variables/Bindings:
//   - KV binding   : RECADOS_KV → namespace KV criado na conta
//   - Secret       : RECADOS_ADMIN_TOKEN → token escolhido pela Gigi pra
//                    autorizar o admin viewer

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', ...corsHeaders() },
  });
}

function isAuthorized(request, env) {
  const auth = request.headers.get('authorization');
  if (!auth || !auth.startsWith('Bearer ')) return false;
  const token = auth.slice(7);
  return env.RECADOS_ADMIN_TOKEN && token === env.RECADOS_ADMIN_TOKEN;
}

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: corsHeaders() });
}

// POST /recados — público. Qualquer visitante pode enviar.
export async function onRequestPost(context) {
  const { request, env } = context;
  if (!env.RECADOS_KV) {
    return json({ error: 'KV não configurado (RECADOS_KV)' }, 500);
  }

  let body;
  try { body = await request.json(); } catch { return json({ error: 'JSON inválido' }, 400); }

  // Honeypot: bots costumam preencher TODO campo. Se "website" veio, é bot.
  // Respondemos 200 (não dá pista de honeypot) e ignoramos.
  if (body.website) return json({ ok: true });

  const name = String(body.name || '').trim().slice(0, 100);
  const email = String(body.email || '').trim().toLowerCase().slice(0, 200);
  const message = String(body.message || '').trim().slice(0, 2000);

  // Email é obrigatório (pra Gigi poder responder).
  if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
    return json({ error: 'Email inválido' }, 400);
  }
  if (!message) return json({ error: 'Mensagem vazia' }, 400);

  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const recado = {
    id,
    name: name || 'Anônimo',
    email,
    message,
    createdAt: now,
    read: false,
  };

  // Key com timestamp no começo permite listagem ordenada.
  const key = `recado:${now}:${id}`;
  await env.RECADOS_KV.put(key, JSON.stringify(recado));

  return json({ ok: true, id });
}

// GET /recados — privado. Lista todos os recados (mais novos primeiro).
export async function onRequestGet(context) {
  const { request, env } = context;
  if (!isAuthorized(request, env)) return json({ error: 'Não autorizado' }, 401);
  if (!env.RECADOS_KV) return json({ error: 'KV não configurado' }, 500);

  const list = await env.RECADOS_KV.list({ prefix: 'recado:', limit: 1000 });
  const recados = [];
  for (const k of list.keys) {
    const v = await env.RECADOS_KV.get(k.name);
    if (!v) continue;
    try { recados.push({ ...JSON.parse(v), _key: k.name }); } catch {}
  }
  // Mais recentes primeiro.
  recados.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));

  return json({ recados });
}

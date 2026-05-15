// Cloudflare Pages Function — operações em recados específicos.
//
//   DELETE /recados/{id} → deleta recado
//   PATCH  /recados/{id} → atualiza (atualmente só { read: true|false })
//
// Ambos exigem Authorization: Bearer <RECADOS_ADMIN_TOKEN>.

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'DELETE, PATCH, OPTIONS',
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
  return env.RECADOS_ADMIN_TOKEN && auth.slice(7) === env.RECADOS_ADMIN_TOKEN;
}

// Encontra a chave KV ('recado:<timestamp>:<id>') a partir do id.
async function findKey(env, id) {
  const list = await env.RECADOS_KV.list({ prefix: 'recado:' });
  return list.keys.find((k) => k.name.endsWith(':' + id))?.name;
}

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: corsHeaders() });
}

export async function onRequestDelete(context) {
  const { request, env, params } = context;
  if (!isAuthorized(request, env)) return json({ error: 'Não autorizado' }, 401);
  if (!env.RECADOS_KV) return json({ error: 'KV não configurado' }, 500);

  const key = await findKey(env, params.id);
  if (!key) return json({ error: 'Não encontrado' }, 404);

  await env.RECADOS_KV.delete(key);
  return json({ ok: true });
}

export async function onRequestPatch(context) {
  const { request, env, params } = context;
  if (!isAuthorized(request, env)) return json({ error: 'Não autorizado' }, 401);
  if (!env.RECADOS_KV) return json({ error: 'KV não configurado' }, 500);

  let body;
  try { body = await request.json(); } catch { body = {}; }

  const key = await findKey(env, params.id);
  if (!key) return json({ error: 'Não encontrado' }, 404);

  const raw = await env.RECADOS_KV.get(key);
  const recado = raw ? JSON.parse(raw) : null;
  if (!recado) return json({ error: 'Recado inválido' }, 500);

  if ('read' in body) recado.read = !!body.read;

  await env.RECADOS_KV.put(key, JSON.stringify(recado));
  return json({ ok: true, recado });
}

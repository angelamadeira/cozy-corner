// Cloudflare Pages Function — proxy reverso pra api.github.com.
//
// Por que existe: a rede da usuária pode estar bloqueando api.github.com
// direto. Roteando via Cloudflare resolve, porque:
//   1. Browser fala com cozy-corner.pages.dev (não bloqueado)
//   2. Cloudflare Worker fala com api.github.com (do edge, não bloqueado)
//   3. Como é same-origin pra o browser, não tem CORS preflight.
//
// Como funciona: catch-all em /api/* via [[path]]. Forwarda método,
// headers, query, body. Devolve a resposta do GitHub com headers de CORS
// abertos pra outras situações (ex.: ainda funcionar mesmo se Decap
// detectar a origem diferente em algum ponto).
export async function onRequest(context) {
  const { request, params } = context;
  const path = Array.isArray(params.path) ? params.path.join('/') : (params.path || '');

  // Constrói URL do GitHub preservando a query string original.
  const originalUrl = new URL(request.url);
  const githubUrl = `https://api.github.com/${path}${originalUrl.search}`;

  // Clona headers, exceto os hop-by-hop que o browser pode mandar
  // e que não fazem sentido pra forwardar.
  const headers = new Headers();
  for (const [key, value] of request.headers.entries()) {
    const k = key.toLowerCase();
    if (k === 'host' || k === 'cf-connecting-ip' || k === 'cf-ray' ||
        k === 'cf-visitor' || k === 'x-forwarded-proto' ||
        k === 'x-forwarded-for' || k.startsWith('cf-')) {
      continue;
    }
    headers.set(key, value);
  }
  // GitHub API exige User-Agent
  if (!headers.has('user-agent')) {
    headers.set('User-Agent', 'cozy-corner-proxy');
  }
  // Pede JSON por padrão (Decap envia esse Accept também)
  if (!headers.has('accept')) {
    headers.set('Accept', 'application/vnd.github.v3+json');
  }

  // Encaminha o request pra GitHub
  const githubResponse = await fetch(githubUrl, {
    method: request.method,
    headers,
    body: ['GET', 'HEAD'].includes(request.method) ? undefined : request.body,
    redirect: 'follow',
  });

  // Devolve a resposta com headers permissivos
  const respHeaders = new Headers(githubResponse.headers);
  respHeaders.set('Access-Control-Allow-Origin', '*');
  respHeaders.set('Access-Control-Allow-Methods', 'GET,POST,PATCH,PUT,DELETE,OPTIONS');
  respHeaders.set('Access-Control-Allow-Headers', '*');
  respHeaders.set('Access-Control-Expose-Headers', '*');
  // Remove headers que confundem o browser num contexto same-origin
  respHeaders.delete('content-encoding');
  respHeaders.delete('transfer-encoding');

  return new Response(githubResponse.body, {
    status: githubResponse.status,
    statusText: githubResponse.statusText,
    headers: respHeaders,
  });
}

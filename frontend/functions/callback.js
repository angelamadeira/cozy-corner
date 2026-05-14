// Cloudflare Pages Function — recebe o callback do GitHub depois do login.
//
// Troca o `code` por um access_token, depois devolve o token pro Decap CMS
// via postMessage na janela pai (que ficou aguardando o popup fechar).
export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const code = url.searchParams.get('code');

  if (!code) {
    return new Response('Faltou o code no callback do GitHub.', {
      status: 400,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  }

  // Troca code por access_token. GitHub responde JSON quando pedimos Accept: json.
  const tokenResp = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'User-Agent': 'cozy-corner-oauth',
    },
    body: JSON.stringify({
      client_id: env.GITHUB_CLIENT_ID,
      client_secret: env.GITHUB_CLIENT_SECRET,
      code,
    }),
  });

  const data = await tokenResp.json();

  if (data.error || !data.access_token) {
    return new Response(
      `Erro no OAuth: ${data.error_description || data.error || 'sem token'}`,
      { status: 400, headers: { 'Content-Type': 'text/plain; charset=utf-8' } }
    );
  }

  // Decap espera mensagem no formato: 'authorization:github:success:<json>'
  const payload = JSON.stringify({
    token: data.access_token,
    provider: 'github',
  });

  // HTML que roda no popup. O Decap faz um handshake:
  //   1. popup sinaliza 'authorizing:github' pro opener
  //   2. opener (Decap admin) responde com a mesma mensagem
  //   3. ao receber a resposta, popup manda o token de fato
  // Sem essa coreografia, o Decap ignora o token e o login parece "preso".
  const html = `<!DOCTYPE html>
<html lang="pt-br">
<head>
  <meta charset="UTF-8">
  <title>Login bem-sucedido</title>
  <style>
    body {
      font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
      padding: 40px;
      color: #1a1a1a;
      background: #faf6ee;
      line-height: 1.6;
    }
  </style>
</head>
<body>
<script>
  (function () {
    var msg = 'authorization:github:success:' + ${JSON.stringify(payload)};

    function authorize(e) {
      if (typeof e.data !== 'string') return;
      if (e.data.indexOf('authorizing:') !== 0) return;
      if (!window.opener) return;
      // Responde com o token usando o origin que veio na mensagem.
      window.opener.postMessage(msg, e.origin);
    }

    window.addEventListener('message', authorize, false);

    // Sinaliza que tá pronto — Decap responde com 'authorizing:github'
    // e aí cai no handler acima.
    if (window.opener) {
      window.opener.postMessage('authorizing:github', '*');
    }

    // Fecha o popup depois de 2s (tempo de fazer o handshake).
    setTimeout(function () { window.close(); }, 2000);
  })();
</script>
<p>Login bem-sucedido! Pode fechar essa janela. 💛</p>
</body>
</html>`;

  return new Response(html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
}

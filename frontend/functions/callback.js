// Cloudflare Pages Function — recebe o callback do GitHub depois do login.
//
// Troca o `code` por um access_token e salva em localStorage. O admin
// (admin/index.html) tem uma ponte que detecta essa escrita e entrega o
// token pro Decap simulando o postMessage que ele espera.
//
// Também tenta postMessage clássico via window.opener como fallback —
// alguns navegadores preservam o opener entre redirects, outros não (COOP).
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

  const payload = JSON.stringify({
    token: data.access_token,
    provider: 'github',
  });

  // Popup escreve token em localStorage (canal same-origin) e também tenta
  // postMessage como fallback. Auto-fecha em 2s.
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
      text-align: center;
    }
  </style>
</head>
<body>
<p>Login bem-sucedido! 💛</p>
<p>Pode fechar essa janela.</p>
<script>
  (function () {
    var payload = ${JSON.stringify(payload)};
    var msg = 'authorization:github:success:' + payload;

    // 1) localStorage — same-origin, sobrevive mesmo se opener foi severado
    try {
      localStorage.setItem('cozy-decap-oauth-token', payload);
      setTimeout(function () { localStorage.removeItem('cozy-decap-oauth-token'); }, 30000);
    } catch (e) {}

    // 2) postMessage clássico como fallback
    if (window.opener) {
      try {
        function reply(e) {
          if (typeof e.data === 'string' && e.data.indexOf('authorizing:') === 0) {
            window.opener.postMessage(msg, e.origin || '*');
          }
        }
        window.addEventListener('message', reply, false);
        window.opener.postMessage('authorizing:github', '*');
        setTimeout(function () {
          try { window.opener.postMessage(msg, '*'); } catch (e) {}
        }, 200);
      } catch (e) {}
    }

    setTimeout(function () { window.close(); }, 2000);
  })();
</script>
</body>
</html>`;

  return new Response(html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
}

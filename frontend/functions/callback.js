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

  // HTML que roda no popup: manda postMessage pra janela pai e fecha.
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
    function send() {
      if (window.opener) {
        window.opener.postMessage(msg, '*');
      }
    }
    send();
    // Reenvia depois de 100ms caso a janela pai ainda não esteja escutando.
    setTimeout(send, 100);
    // Fecha o popup depois de 1s.
    setTimeout(function () { window.close(); }, 1000);
  })();
</script>
<p>Login bem-sucedido! Pode fechar essa janela. 💛</p>
</body>
</html>`;

  return new Response(html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
}

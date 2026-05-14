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

  // HTML que roda no popup. Tenta vários caminhos pro Decap pegar o token:
  //   1. Handshake clássico: popup sinaliza 'authorizing:github' pro opener,
  //      opener responde, popup manda o token.
  //   2. Listener: se o Decap mandar 'authorizing:' a qualquer momento,
  //      respondemos com o token.
  //   3. Defensivo: depois de 500ms manda o token direto algumas vezes pro
  //      caso do Decap não fazer o handshake (versões variam).
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
    var sent = false;

    function log() {
      try { console.log.apply(console, ['[decap-oauth]'].concat([].slice.call(arguments))); } catch (e) {}
    }

    function sendToken(targetOrigin) {
      if (!window.opener || window.opener.closed) {
        log('opener missing, cannot send token');
        return;
      }
      window.opener.postMessage(msg, targetOrigin || '*');
      sent = true;
      log('sent token to opener (origin=' + (targetOrigin || '*') + ')');
    }

    function handleMessage(e) {
      log('received message from opener', { origin: e.origin, data: e.data });
      if (typeof e.data !== 'string') return;
      if (e.data.indexOf('authorizing:') === 0) {
        sendToken(e.origin || '*');
      }
    }

    window.addEventListener('message', handleMessage, false);
    log('listener installed, opener exists:', !!window.opener);

    // Sinaliza pronto pro opener.
    if (window.opener) {
      try {
        window.opener.postMessage('authorizing:github', '*');
        log('sent authorizing:github to opener');
      } catch (e) { log('error posting authorizing', e); }
    }

    // Defensivo: depois de 500ms começa a tentar mandar o token direto
    // (em caso de versões do Decap que não fazem o handshake completo).
    var attempts = 0;
    var interval = setInterval(function () {
      if (sent || attempts >= 8) {
        clearInterval(interval);
        return;
      }
      attempts++;
      sendToken('*');
    }, 500);

    // Fecha o popup depois de 5s.
    setTimeout(function () {
      log('closing popup, sent=' + sent);
      window.close();
    }, 5000);
  })();
</script>
<p>Login bem-sucedido! Pode fechar essa janela. 💛</p>
</body>
</html>`;

  return new Response(html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
}

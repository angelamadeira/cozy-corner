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

  // Popup escreve o token em localStorage IMEDIATAMENTE (mais confiável que
  // postMessage — funciona mesmo se a janela popup perdeu o opener por COOP
  // ou foi fechada rápido). O admin/index.html injeta um script que escuta
  // mudanças em localStorage e dispara um MessageEvent simulado pro Decap.
  // Também tenta postMessage pelo opener como fallback.
  const html = `<!DOCTYPE html>
<html lang="pt-br">
<head>
  <meta charset="UTF-8">
  <title>Login bem-sucedido</title>
  <style>
    body {
      font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
      padding: 24px;
      color: #1a1a1a;
      background: #faf6ee;
      line-height: 1.5;
      font-size: 13px;
    }
    h1 { font-size: 16px; margin: 0 0 12px; }
    #log {
      background: #1a1a1a;
      color: #b8e986;
      padding: 12px;
      border-radius: 4px;
      font-size: 11px;
      white-space: pre-wrap;
      word-break: break-all;
      max-height: 380px;
      overflow-y: auto;
    }
    .ok { color: #b8e986; }
    .info { color: #87ceeb; }
    .warn { color: #ffd700; }
    .err { color: #ff7575; }
    button {
      margin-top: 12px;
      padding: 6px 14px;
      background: #1a1a1a;
      color: #faf6ee;
      border: 0;
      border-radius: 4px;
      cursor: pointer;
      font-family: inherit;
      font-size: 12px;
    }
  </style>
</head>
<body>
<h1>Login bem-sucedido 💛</h1>
<p>Veja o status da comunicação com o Decap abaixo. (Auto-close desabilitado pra debug.)</p>
<div id="log"></div>
<button onclick="window.close()">Fechar janela</button>
<script>
  (function () {
    var payload = ${JSON.stringify(payload)};
    var msg = 'authorization:github:success:' + payload;
    var logEl = document.getElementById('log');

    function log(level) {
      var args = [].slice.call(arguments, 1);
      var line = '[' + new Date().toISOString().slice(11, 19) + '] ' + args.map(function (a) {
        return (typeof a === 'object') ? JSON.stringify(a) : String(a);
      }).join(' ');
      var div = document.createElement('div');
      div.className = level;
      div.textContent = line;
      logEl.appendChild(div);
      try { console.log.apply(console, ['[decap-oauth]'].concat(args)); } catch (e) {}
    }

    // 1) PRINCIPAL: localStorage. Dispara storage event no admin abre,
    //    funciona mesmo sem window.opener.
    try {
      localStorage.setItem('cozy-decap-oauth-token', payload);
      // Apaga depois de 30s pra não vazar o token em armazenamento de longo prazo
      setTimeout(function () { localStorage.removeItem('cozy-decap-oauth-token'); }, 30000);
      log('ok', '✓ token salvo em localStorage (cozy-decap-oauth-token)');
    } catch (e) {
      log('err', 'falha ao escrever localStorage: ' + e.message);
    }

    // 2) FALLBACK: postMessage clássico, caso window.opener exista
    log('info', 'opener existe: ' + !!window.opener);
    if (window.opener) {
      function handleMessage(e) {
        if (typeof e.data !== 'string') return;
        if (e.data.indexOf('authorizing:') === 0) {
          window.opener.postMessage(msg, e.origin || '*');
          log('ok', '✓ token enviado pro opener via postMessage');
        }
      }
      window.addEventListener('message', handleMessage, false);
      try {
        window.opener.postMessage('authorizing:github', '*');
        log('info', "→ handshake 'authorizing:github' enviado pro opener");
        // Também envia direto após 200ms
        setTimeout(function () {
          try {
            window.opener.postMessage(msg, '*');
            log('ok', '✓ token enviado direto pro opener (fallback)');
          } catch (e) { log('err', 'falha no fallback: ' + e.message); }
        }, 200);
      } catch (e) {
        log('err', 'erro no handshake: ' + e.message);
      }
    } else {
      log('warn', 'sem opener — confiando só no localStorage');
    }

    log('ok', '✓ pronto. O admin deve receber o token automaticamente.');
    log('info', 'Pode fechar essa janela manualmente se ela não fechar sozinha.');
  })();
</script>
</body>
</html>`;

  return new Response(html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
}

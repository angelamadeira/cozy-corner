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
<button onclick="window.__sendNow && window.__sendNow()">Enviar agora (manual)</button>
<button onclick="window.close()">Fechar janela</button>
<script>
  (function () {
    var msg = 'authorization:github:success:' + ${JSON.stringify(payload)};
    var sent = false;
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

    function sendToken(targetOrigin) {
      if (!window.opener || window.opener.closed) {
        log('err', 'opener ausente — não posso mandar token (popup foi aberto direto?)');
        return;
      }
      window.opener.postMessage(msg, targetOrigin || '*');
      sent = true;
      log('ok', 'token enviado pro opener (origin=' + (targetOrigin || '*') + ')');
    }

    function handleMessage(e) {
      log('info', 'mensagem recebida do opener:', { origin: e.origin, data: String(e.data).slice(0, 80) });
      if (typeof e.data !== 'string') return;
      if (e.data.indexOf('authorizing:') === 0) {
        log('info', '→ é authorizing, respondendo com token');
        sendToken(e.origin || '*');
      }
    }

    window.addEventListener('message', handleMessage, false);
    log('info', 'listener instalado. opener existe: ' + !!window.opener);
    log('info', 'opener.location (se acessível): ' + (function () {
      try { return window.opener && window.opener.location.origin; } catch (e) { return 'BLOQUEADO cross-origin: ' + e.message; }
    })());
    log('info', 'window.name: "' + window.name + '"');
    log('info', 'document.referrer: "' + document.referrer + '"');

    if (window.opener) {
      try {
        window.opener.postMessage('authorizing:github', '*');
        log('info', "enviou 'authorizing:github' pro opener");
      } catch (e) { log('err', 'erro ao postar authorizing:', e.message); }
    }

    // Auto-send com DELAY de 8 segundos pra dar tempo de inspecionar.
    // (botão manual abaixo também envia.)
    var attempts = 0;
    var maxAttempts = 6;
    var started = false;

    function startDefensiveSending() {
      if (started) return;
      started = true;
      log('warn', '== começando envios defensivos (5s atrás) ==');
      var interval = setInterval(function () {
        if (sent || attempts >= maxAttempts) {
          clearInterval(interval);
          if (!sent) log('warn', 'desistiu após ' + attempts + ' tentativas');
          return;
        }
        attempts++;
        log('info', 'tentativa #' + attempts + ' de enviar token');
        sendToken('*');
      }, 500);
    }

    // Conta regressiva de 8s antes de começar
    var countdown = 8;
    log('warn', '⏳ aguardando ' + countdown + 's antes de enviar token (inspecione AGORA)');
    var ticker = setInterval(function () {
      countdown--;
      if (countdown <= 0) {
        clearInterval(ticker);
        startDefensiveSending();
      } else if (countdown <= 3) {
        log('warn', '⏳ ' + countdown + 's...');
      }
    }, 1000);

    // Botão manual também
    window.__sendNow = function () {
      log('info', '== envio manual disparado ==');
      startDefensiveSending();
    };
  })();
</script>
</body>
</html>`;

  return new Response(html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
}

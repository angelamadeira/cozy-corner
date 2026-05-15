// Endpoint só pra DEBUG — retorna a mesma HTML do /callback mas com token fake.
// Permite inspecionar visualmente o que o popup faria, sem precisar do OAuth.
//
// Uso: abrir https://cozy-corner.pages.dev/callback-test em aba normal.
// REMOVER depois que terminar de debugar.
export async function onRequest() {
  const payload = JSON.stringify({
    token: 'gho_FAKETOKEN_so_pra_inspecionar_layout',
    provider: 'github',
  });

  const html = `<!DOCTYPE html>
<html lang="pt-br">
<head>
  <meta charset="UTF-8">
  <title>[DEBUG] Callback test</title>
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
<h1>[DEBUG] Callback test 💛</h1>
<p>Endpoint de teste — mostra o mesmo HTML que o /callback real retorna, mas com token fake.</p>
<div id="log"></div>
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

    log('info', 'Mensagem que SERIA enviada pro opener:');
    log('ok', msg);
    log('info', 'window.opener existe? ' + !!window.opener);
    log('info', 'Se for "false", isso é normal pra essa aba de teste — em popup real seria true.');
  })();
</script>
</body>
</html>`;

  return new Response(html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
}

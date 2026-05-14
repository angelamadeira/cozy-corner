// Cloudflare Pages Function — inicia o OAuth do GitHub pro Decap CMS.
//
// Decap abre popup em /auth?provider=github&site_id=...&scope=repo
// Aqui redirecionamos pro GitHub OAuth authorize, passando nosso client_id
// e definindo /callback como o redirect_uri.
export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const scope = url.searchParams.get('scope') || 'repo,user';

  const params = new URLSearchParams({
    client_id: env.GITHUB_CLIENT_ID,
    scope,
    redirect_uri: `${url.origin}/callback`,
    // state aleatório — protege contra CSRF.
    state: crypto.randomUUID(),
  });

  return Response.redirect(
    `https://github.com/login/oauth/authorize?${params}`,
    302
  );
}

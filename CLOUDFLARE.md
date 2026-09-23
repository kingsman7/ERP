# Cloudflare Pages deployment

This Angular application is configured for **Cloudflare Pages**. The production
build produces static browser files in `dist/app/browser`; the Angular SSR
server remains available in `dist/app/server` for a Node-compatible deployment,
but it is not required by Pages.

## Build and deploy

From `frontend` in PowerShell:

```powershell
npm ci
npx wrangler@latest login
$env:CLOUDFLARE_PAGES_PROJECT = "your-pages-project"
$env:CLOUDFLARE_API_ORIGIN = "https://api.example.com"
npm run deploy:cloudflare
```

In Git Bash, use the equivalent commands:

```bash
export CLOUDFLARE_PAGES_PROJECT=your-pages-project
export CLOUDFLARE_API_ORIGIN=https://api.example.com
npm run deploy:cloudflare
```

The Pages output directory is `dist/app/browser`. The deploy command requires
`CLOUDFLARE_PAGES_PROJECT`; it does not store Cloudflare tokens or credentials
in the repository.

## API routing

The Angular services intentionally use the relative `/api` path. This keeps
development on the existing `src/proxy.conf.json` and avoids exposing an API
origin in the browser bundle.

For Pages, set `CLOUDFLARE_API_ORIGIN` to the public HTTPS origin of the backend
when building:

`npm run deploy:cloudflare` runs `npm run build:cloudflare` first. For a build
without deploying, run `npm run build:cloudflare` after setting the same
variables.

The preparation script writes this Pages rewrite before the SPA fallback:

```text
/api/* https://api.example.com/api/:splat 200
/* /index.html 200
```

Do not put API tokens, database credentials, JWT secrets, or other secrets in
`CLOUDFLARE_API_ORIGIN`. Configure authentication and CORS on the backend.
If the backend is already exposed through a same-origin Cloudflare Worker,
reverse proxy, or another gateway, leave `CLOUDFLARE_API_ORIGIN` unset and
route `/api/*` there instead.

## Client routes and SSR limitation

`/app/...` is client-rendered and `/master/...` can be prerendered. The generated
`_redirects` file sends direct navigation and browser refreshes for both route
families to `index.html`, preventing Cloudflare Pages 404 responses while the
Angular router resolves the route. The existing auth guards still control access.

Cloudflare Pages does not execute the current Express server from
`src/server.ts`, so dynamic Angular SSR and the server-side backend proxy are
not used in this deployment. Use the generated static browser output with a
same-origin API gateway, or deploy the existing Node SSR server to a
Cloudflare Workers-compatible adapter/container if server-side rendering is a
hard requirement.
# Cloudflare production topology

This ERP serves one company per deployment. Route the company application on
its configured application hostname and keep the backend private. The browser
uses same-origin relative `/api/*` requests:

| Traffic | Cloudflare product | Public hostname |
| --- | --- | --- |
| Corporate site | Pages | `helameb.com` and, if used, `www.helameb.com` |
| Company application | Worker with the Angular SSR app in `wrangler.jsonc` | `erp.helameb.com` (optionally `admin.helameb.com` as an alias) |
| API origin | Cloudflare Tunnel to a private reverse proxy/backend | No public hostname required |

Do not configure wildcard company subdomains or tenant-based hostname
resolution. The Worker should forward application requests and `/api/*` to the
private origin without adding company or tenant headers. Do not commit account
IDs, zone IDs, tokens, Tunnel credentials, or backend URLs to this repository.

## DNS, routes, and TLS

Keep these DNS records **Proxied** (orange cloud):

| Record | Target | Purpose |
| --- | --- | --- |
| `@` | Pages target supplied by Cloudflare | Corporate site |
| `www` | Pages target supplied by Cloudflare, if enabled | Corporate site alias |
| `erp` | Worker custom domain or route | Company application |
| `admin` | Worker custom domain or route, if used | Company application alias |

Associate the Worker only with the configured application hostnames. Exclude
the corporate hostnames when they are served by Pages. Set SSL/TLS encryption
mode to **Full (strict)**, enable HTTPS redirects, and use a TLS minimum version
that meets the organization's security baseline.

## Private origin

Run `cloudflared` from the private network and map Tunnel ingress to a private
reverse proxy or application listener. Do not publish the backend port,
database port, or origin IP in DNS. Restrict the origin firewall to the
Tunnel/private proxy path. Configure forwarded host and client IP headers at
the trusted proxy according to the backend's deployment contract; overwrite
client-supplied forwarding headers rather than trusting them directly.

Keep API traffic same-origin through the Worker/private gateway so
authenticated cookies do not depend on a cross-origin CORS exception. The
development `src/proxy.conf.json` is local-only and is not a production proxy
configuration.

## Cloudflare dashboard controls

Configure account- and environment-specific settings outside source control:

1. Map the corporate hostnames to Pages after its first deployment.
2. Deploy the application Worker described by `wrangler.jsonc` and bind the
   chosen application hostname or aliases.
3. Create and run a Cloudflare Tunnel connector on the private host. Add private
   ingress rules for the application gateway; do not create a public API DNS
   record unless a separately reviewed integration requires one.
4. Apply rate limiting to authentication endpoints and enforce expected
   methods/content types for `/api/*`. Enable managed WAF rules after reviewing
   false positives.
5. Protect administrative access with Cloudflare Access where appropriate,
   using the organization's identity provider and least-privilege groups.
6. Enable logging and alerting for WAF, Access, Tunnel health, Worker errors,
   and authentication anomalies. Restrict dashboard roles and rotate
   credentials in the secret manager.

## Build notes

The `build:cloudflare` and `deploy:cloudflare` scripts remain useful for a Pages
static deployment. They require `CLOUDFLARE_PAGES_PROJECT` and may use
`CLOUDFLARE_API_ORIGIN` for a Pages-only API rewrite; neither variable may
contain a secret. Use the Worker configuration for the SSR application path.
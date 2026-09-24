# Cloudflare production topology

This ERP uses `helameb.com` as its tenant base domain. The production topology
must keep the backend private and preserve the original tenant host while
proxying `/api/*` on the same origin:

| Traffic | Cloudflare product | Public hostname |
| --- | --- | --- |
| Corporate site | Pages | `helameb.com` and, if used, `www.helameb.com` |
| Platform app | Worker with the Angular assets in `wrangler.jsonc` | `admin.helameb.com` and `erp.helameb.com` |
| Tenant app | The same Worker route | `<tenant>.helameb.com` |
| API origin | Cloudflare Tunnel to a private reverse proxy/backend | No public hostname required |

Do not use the Pages `_redirects` API rewrite as the production tenant gateway.
Pages is suitable for the corporate static site, but the application needs a
Worker route (or equivalent same-origin gateway) that handles the wildcard
hostname and forwards `/api/*` to the private origin. The existing
`wrangler.jsonc` defines the application Worker and its assets; bind its routes
in the Cloudflare dashboard or deployment pipeline using the real zone and
Worker identifiers. Do not commit account IDs, zone IDs, tokens, Tunnel tokens,
or backend URLs to this repository.

## DNS, routes, and TLS

Configure these DNS records in the `helameb.com` zone and keep them **Proxied**
(orange cloud):

| Record | Target | Purpose |
| --- | --- | --- |
| `@` | Pages target supplied by Cloudflare | Corporate site |
| `www` | Pages target supplied by Cloudflare, if enabled | Corporate site alias |
| `admin` | Worker custom domain or route | Platform administration |
| `erp` | Worker custom domain or route | Platform application |
| `*` | Worker custom domain or route | Tenant applications |

Associate the Worker with `admin.helameb.com/*`, `erp.helameb.com/*`, and
`*.helameb.com/*`. Exclude the corporate hostnames from the wildcard route if
they are served by Pages. Confirm Cloudflare route precedence so the explicit
corporate hostnames resolve to Pages and every tenant hostname resolves to the
application Worker.

Set SSL/TLS encryption mode to **Full (strict)**. The Tunnel connector and its
private origin must present a certificate trusted by Cloudflare; never use
Flexible TLS. Enable HTTPS redirects and configure the zone's TLS minimum
version according to the organization's current security baseline.

## Private origin and trusted proxy headers

Run `cloudflared` from the VPS/private network and map the Tunnel ingress to a
private reverse proxy or application listener. Do not publish the backend port,
database port, or an origin IP in DNS. The origin firewall must only accept
connections from the Tunnel/private proxy path.

The final trusted proxy immediately before NestJS must forward the original host
and client chain to the backend on every request:

```text
X-Forwarded-Host: <requested hostname, for example acme.helameb.com>
X-Forwarded-For: <client IP chain>
```

Cloudflare provides client context at the edge, but the private reverse proxy is
responsible for setting or appending these headers when it relays traffic to
NestJS. It must overwrite any client-supplied `X-Forwarded-Host` and construct
`X-Forwarded-For` only from trusted upstream data. This is required because the
tenant resolver rejects production requests without a trusted proxy context.

Configure the backend deployment environment, outside source control:

```text
NODE_ENV=production
TENANT_BASE_DOMAIN=helameb.com
TRUST_PROXY_CIDRS=<CIDR of the private reverse-proxy/Tunnel-to-backend hop>
```

`TRUST_PROXY_CIDRS` must contain the actual private source CIDR seen by NestJS,
not a broad internet range. Multiple CIDRs are comma-separated. Determine the
value from the deployed network and verify that a request to
`<tenant>.helameb.com` reaches the backend with `request.ips` populated. These
settings are configuration values, not credentials; keep database URLs, JWT
keys, API tokens, and Tunnel credentials in the platform's secret store only.

The browser uses relative `/api` requests. Keep API traffic same-origin through
the Worker/private gateway so tenant host resolution and authenticated cookies
do not rely on a cross-origin CORS exception. The development
`src/proxy.conf.json` is local-only and must not be treated as a production
proxy configuration.

## Cloudflare dashboard controls

Configure the following manually in the Cloudflare dashboard because they are
account- and environment-specific:

1. Create the Pages project only for the corporate site and map the apex/
	`www` hostnames after its first deployment.
2. Deploy the application Worker described by `wrangler.jsonc`, then add the
	explicit and wildcard application routes above. Test `admin`, `erp`, and a
	representative tenant hostname before enabling broad traffic.
3. Create and run a Cloudflare Tunnel connector on the private host. Add private
	ingress rules for the application gateway; do not create a public API DNS
	record unless a separately reviewed integration requires one.
4. Create WAF custom rules for the application routes: block malformed or
	multi-label tenant hosts, apply rate limiting to authentication endpoints,
	and enforce the expected methods/content types for `/api/*`. Enable managed
	WAF rules after reviewing false positives.
5. Protect `admin.helameb.com` with Cloudflare Access using the organization's
	identity provider and least-privilege administrator groups. Do not put the
	tenant-facing wildcard behind an administrator-only Access policy.
6. Enable logging/alerting for WAF, Access, Tunnel health, Worker errors, and
	authentication anomalies. Restrict dashboard roles and rotate credentials in
	the secret manager.

## Build notes

The `build:cloudflare` and `deploy:cloudflare` scripts remain useful only for a
Pages static deployment. They require `CLOUDFLARE_PAGES_PROJECT` and may use
`CLOUDFLARE_API_ORIGIN` for a Pages-only API rewrite, but neither is the
production multi-tenant application path described above. Neither variable may
contain a secret.
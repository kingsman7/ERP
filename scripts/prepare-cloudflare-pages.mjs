import {mkdir, writeFile} from 'node:fs/promises';

const outputDirectory = 'dist/app/browser';
const apiOrigin = process.env.CLOUDFLARE_API_ORIGIN?.replace(/\/$/, '');
const redirects = [
  ...(apiOrigin ? [`/api/* ${apiOrigin}/api/:splat 200`] : []),
  '/* /index.html 200',
  '',
].join('\n');

await mkdir(outputDirectory, {recursive: true});
await writeFile(`${outputDirectory}/_redirects`, redirects, 'utf8');

console.log(
  apiOrigin
    ? `Cloudflare Pages redirects prepared with API proxy: ${apiOrigin}`
    : 'Cloudflare Pages redirects prepared with SPA fallback; configure a same-origin /api proxy separately.',
);
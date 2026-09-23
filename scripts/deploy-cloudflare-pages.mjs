import {spawnSync} from 'node:child_process';

const projectName = process.env.CLOUDFLARE_PAGES_PROJECT?.trim();

if (!projectName) {
  console.error('CLOUDFLARE_PAGES_PROJECT is required.');
  process.exit(1);
}

const result = spawnSync(
  process.platform === 'win32' ? 'npx.cmd' : 'npx',
  ['wrangler@latest', 'pages', 'deploy', 'dist/app/browser', '--project-name', projectName],
  {stdio: 'inherit'},
);

if (result.error) {
  console.error(`Cloudflare Pages deploy failed: ${result.error.message}`);
  process.exit(1);
}

process.exit(result.status ?? 1);
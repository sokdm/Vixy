const { spawn } = require('node:child_process');

const DEPLOYED_APP_ORIGIN = process.env.VIXY_LIVE_ORIGIN || 'https://your-domain.example';
const PUBLIC_CONFIG_URL = `${DEPLOYED_APP_ORIGIN}/api/public-config`;

function validatePublicConfig(config) {
  if (config?.databaseProvider !== 'mongodb' || config?.authProvider !== 'vixy') {
    throw new Error('The live backend is not returning the expected Vixy public configuration.');
  }
}

async function fetchPublicConfig() {
  const response = await fetch(PUBLIC_CONFIG_URL, {
    headers: { Accept: 'application/json' },
    signal: AbortSignal.timeout(15_000),
  });

  if (!response.ok) {
    throw new Error(`The live backend returned HTTP ${response.status} for its public configuration.`);
  }

  const config = await response.json();
  validatePublicConfig(config);
  return config;
}

async function main() {
  await fetchPublicConfig();
  const npmCliPath = process.env.npm_execpath;
  if (!npmCliPath) {
    throw new Error('npm did not provide its executable entry point.');
  }

  const childEnvironment = {
    ...process.env,
    VITE_API_PROXY_TARGET: DEPLOYED_APP_ORIGIN,
    VITE_API_URL: DEPLOYED_APP_ORIGIN,
  };

  console.info('Starting Vixy Desktop against the live backend.');
  console.info('Public client configuration: verified.');

  const child = spawn(process.execPath, [npmCliPath, 'run', 'electron:dev:live:inner'], {
    cwd: process.cwd(),
    env: childEnvironment,
    stdio: 'inherit',
    windowsHide: false,
  });

  child.on('exit', (code, signal) => {
    if (signal) process.kill(process.pid, signal);
    process.exit(code ?? 0);
  });
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});

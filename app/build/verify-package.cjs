const fs = require('node:fs/promises');
const path = require('node:path');
const { listPackage } = require('@electron/asar');

const MAX_PACKAGE_BYTES = 1536 * 1024 * 1024;

function forbiddenEntry(entry) {
  const normalized = entry.replaceAll('\\', '/');
  return /(^|\/)node_modules\/morphly-api(\/|$)/.test(normalized)
    || /(^|\/)(?:\.meanvc|runtime-40ms)(\/|$)/.test(normalized)
    || /(^|\/)\.env(?:\.|$)/.test(normalized);
}

async function verifyPackage(appOutDir, { maxBytes = MAX_PACKAGE_BYTES } = {}) {
  const archive = path.join(appOutDir, 'resources', 'app.asar');
  const forbidden = listPackage(archive).find(forbiddenEntry);
  if (forbidden) throw new Error(`Unexpected repository, voice runtime or environment file in app.asar: ${forbidden}`);

  let totalBytes = 0;
  async function visit(directory) {
    for (const entry of await fs.readdir(directory, { withFileTypes: true })) {
      const fullPath = path.join(directory, entry.name);
      const relativePath = path.relative(appOutDir, fullPath);
      if (forbiddenEntry(relativePath)) throw new Error(`Unexpected file in desktop package: ${relativePath}`);
      if (entry.isSymbolicLink()) throw new Error(`Unexpected symlink in Windows package: ${relativePath}`);
      if (entry.isDirectory()) await visit(fullPath);
      else totalBytes += (await fs.stat(fullPath)).size;
    }
  }
  await visit(appOutDir);
  if (totalBytes >= maxBytes) {
    throw new Error(`Desktop package is too large (${Math.ceil(totalBytes / 1024 / 1024)} MiB). Keep the optional voice runtime outside the NSIS installer.`);
  }
  console.log(`[package-check] Desktop payload: ${Math.ceil(totalBytes / 1024 / 1024)} MiB; optional voice runtime excluded.`);
  return totalBytes;
}

module.exports = { verifyPackage };

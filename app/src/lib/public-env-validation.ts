type PublicBuildEnvironment = Record<string, string | undefined>;

function isValidPublicUrl(value: string, requireHttps: boolean): boolean {
  if (!value) return true;
  try {
    const parsed = new URL(value);
    return requireHttps ? parsed.protocol === 'https:' : ['https:', 'http:'].includes(parsed.protocol);
  } catch {
    return false;
  }
}

export function validatePublicBuildEnvironment(
  environment: PublicBuildEnvironment,
  { requireHttps = true }: { requireHttps?: boolean } = {},
): void {
  if (!requireHttps && (environment.VITE_LOCAL_PREVIEW === 'true' || environment.LOCAL_PREVIEW === 'true')) return;

  const errors: string[] = [];
  for (const [name, value] of Object.entries({
    VITE_PUBLIC_APP_URL: environment.VITE_PUBLIC_APP_URL,
    VITE_WINDOWS_DOWNLOAD_URL: environment.VITE_WINDOWS_DOWNLOAD_URL,
    VITE_UPDATE_MANIFEST_URL: environment.VITE_UPDATE_MANIFEST_URL,
  })) {
    const trimmed = typeof value === 'string' ? value.trim() : '';
    if (trimmed && !isValidPublicUrl(trimmed, requireHttps)) {
      errors.push(`${name} must be a valid ${requireHttps ? 'HTTPS ' : ''}URL.`);
    }
  }

  if (errors.length > 0) {
    throw new Error(`Vixy public client configuration is invalid:\n- ${errors.join('\n- ')}`);
  }
}

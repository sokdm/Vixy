export const DEFAULT_REALTIME_PROVIDER = 'vidu' as const;
export const XMAX_REALTIME_PROVIDER = 'xmax' as const;
export const VIDU_REALTIME_PROVIDER = 'vidu' as const;
export const VIDU_REALTIME_MODEL = 's2-editing' as const;

// Legacy aliases for backward compatibility
export const DECART_REALTIME_PROVIDER = VIDU_REALTIME_PROVIDER;
export const DECART_REALTIME_MODEL = VIDU_REALTIME_MODEL;

export type RealtimeProvider =
  | typeof XMAX_REALTIME_PROVIDER
  | typeof VIDU_REALTIME_PROVIDER;

export const REALTIME_PROVIDER_OPTIONS: ReadonlyArray<{
  value: RealtimeProvider;
  label: string;
  detail: string;
}> = [
  {
    value: XMAX_REALTIME_PROVIDER,
    label: 'Plus',
    detail: 'X2 realtime',
  },
  {
    value: VIDU_REALTIME_PROVIDER,
    label: 'Pro',
    detail: 'Vidu S2-Editing',
  },
];

export function isRealtimeProvider(value: unknown): value is RealtimeProvider {
  return value === XMAX_REALTIME_PROVIDER || value === VIDU_REALTIME_PROVIDER || value === 'decart';
}

export function getRealtimeProviderLabel(provider: RealtimeProvider | 'decart'): string {
  return provider === VIDU_REALTIME_PROVIDER || provider === 'decart' ? 'Pro' : 'Plus';
}

export function resolveRealtimeProvider(
  value: unknown,
  fallback: RealtimeProvider = DEFAULT_REALTIME_PROVIDER,
): RealtimeProvider {
  if (value === 'decart') return VIDU_REALTIME_PROVIDER;
  return isRealtimeProvider(value) ? (value as RealtimeProvider) : fallback;
}

export function resolveRealtimeModel(provider: RealtimeProvider | 'decart', value: unknown): string {
  if (provider === VIDU_REALTIME_PROVIDER || provider === 'decart') {
    return value === VIDU_REALTIME_MODEL ? value : VIDU_REALTIME_MODEL;
  }

  return value === 'x2.0' ? value : 'x2.0';
}

export function getViduRealtimeUserMessage(
  error: unknown,
  fallback = 'Pro could not complete that realtime request. Please try again.',
): string {
  const candidate = error as { code?: unknown; message?: unknown } | null;
  const code = typeof candidate?.code === 'string' ? candidate.code : '';
  const message = error instanceof Error
    ? error.message
    : typeof candidate?.message === 'string'
      ? candidate.message
      : '';
  const diagnostic = `${code} ${message}`.toLowerCase();

  if (/moderation|unsafe|rejected|policy/.test(diagnostic)) {
    return 'Pro did not accept that image or prompt. Choose another reference and try again.';
  }
  if (/insufficient credits|credit balance|payment required|quota/.test(diagnostic)) {
    return 'Pro is temporarily unavailable because its provider capacity is exhausted. Please use Plus or try Pro again later.';
  }
  if (/token|auth|unauthor|expired|forbidden/.test(diagnostic)) {
    return 'The Pro session expired. Stop the stream and start it again.';
  }
  if (/webrtc|rtc|network|socket|connect|ice|timeout/.test(diagnostic)) {
    return 'The Pro connection was interrupted. Morphly is trying to recover it.';
  }

  return (message || fallback)
    .replace(/\bXmax\b/gi, 'Plus')
    .replace(/\bDecart\b/gi, 'Pro')
    .replace(/\bVidu\b/gi, 'Pro');
}

export const getDecartRealtimeUserMessage = getViduRealtimeUserMessage;

// @ts-nocheck

const MORPHLY_SESSIONS_URL = 'https://api.morphly.fun/v1/realtime/sessions';
const DEFAULT_MODEL = 'M 2.1';
const DEFAULT_MAX_SESSION_SECONDS = 300;
const MIN_SESSION_SECONDS = 10;
const MAX_SESSION_SECONDS = 1800;

function getRequestOrigin(req) {
  return String(req.headers?.origin || req.get?.('origin') || '').trim().replace(/\/$/, '');
}

function getAllowedOrigin(req) {
  const configured = String(process.env.APP_ORIGIN || process.env.VIXY_APP_ORIGIN || '').trim().replace(/\/$/, '');
  if (configured) return configured;

  const host = String(req.headers?.host || req.get?.('host') || '').trim();
  if (!host) return '';
  const protocol = host.includes('localhost') || host.startsWith('127.0.0.1') ? 'http' : 'https';
  return `${protocol}://${host}`;
}

function clampSessionSeconds(value) {
  const numeric = Number(value ?? DEFAULT_MAX_SESSION_SECONDS);
  if (!Number.isFinite(numeric)) return DEFAULT_MAX_SESSION_SECONDS;
  return Math.min(MAX_SESSION_SECONDS, Math.max(MIN_SESSION_SECONDS, Math.floor(numeric)));
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Cache-Control', 'no-store');

  const allowedOrigin = getAllowedOrigin(req);
  if (allowedOrigin) {
    res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
  }

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const requestOrigin = getRequestOrigin(req);
  const isLocalOrigin = !requestOrigin && /^(?:http:\/\/)?(?:localhost|127\.0\.0\.1)(?::\d+)?$/i.test(allowedOrigin.replace(/^https?:\/\//, ''));
  if (allowedOrigin && requestOrigin && requestOrigin !== allowedOrigin) {
    return res.status(403).json({ error: 'Origin not allowed' });
  }
  if (allowedOrigin && !requestOrigin && !isLocalOrigin) {
    return res.status(403).json({ error: 'Origin required' });
  }

  const apiKey = String(process.env.MORPHLY_API_KEY || '').trim();
  if (!apiKey) {
    return res.status(503).json({ error: 'Morphly API key is not configured' });
  }

  const requested = req.body && typeof req.body === 'object' ? req.body : {};
  const maxSessionSeconds = clampSessionSeconds(requested.maxSessionSeconds);

  try {
    const upstream = await fetch(MORPHLY_SESSIONS_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'Idempotency-Key': crypto.randomUUID(),
      },
      body: JSON.stringify({
        model: typeof requested.model === 'string' && requested.model.trim() ? requested.model.trim() : DEFAULT_MODEL,
        origin: allowedOrigin,
        max_session_seconds: maxSessionSeconds,
        image_url: requested.image_url,
        editing_type: requested.editing_type,
      }),
      cache: 'no-store',
      signal: AbortSignal.timeout(20000),
    });

    const data = await upstream.json().catch(() => ({ error: 'Invalid Morphly API response' }));
    return res.status(upstream.status).json(data);
  } catch {
    return res.status(502).json({ error: 'Morphly session service unavailable' });
  }
}

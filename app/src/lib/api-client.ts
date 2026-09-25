const DEPLOYED_APP_ORIGIN = 'https://your-domain.example';
const LOCAL_API_BASE = '/api';
export const AUTH_TOKEN_STORAGE_KEY = 'vixy:auth-token';

function normalizeApiBase(value?: string | null): string | null {
  if (!value) return null;
  const trimmed = value.trim().replace(/\/+$/, '');
  if (!trimmed) return null;
  return trimmed.endsWith('/api') ? trimmed : `${trimmed}/api`;
}

function isFileProtocol(): boolean {
  return typeof window !== 'undefined' && window.location.protocol === 'file:';
}

function getApiBase(): string {
  if (import.meta.env.DEV || !isFileProtocol()) return LOCAL_API_BASE;
  const configuredBase = normalizeApiBase(import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL);
  if (configuredBase && configuredBase.startsWith('/') && isFileProtocol()) return `${DEPLOYED_APP_ORIGIN}/api`;
  return configuredBase || `${DEPLOYED_APP_ORIGIN}/api`;
}

function withLeadingSlash(path: string): string {
  return path.startsWith('/') ? path : `/${path}`;
}

export function getStoredAuthToken(): string | null {
  if (typeof localStorage === 'undefined') return null;
  return localStorage.getItem(AUTH_TOKEN_STORAGE_KEY);
}

export function setStoredAuthToken(token: string | null) {
  if (typeof localStorage === 'undefined') return;
  if (token) localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, token);
  else localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
}

export async function apiFetch(path: string, init?: RequestInit): Promise<Response> {
  const normalizedPath = withLeadingSlash(path);
  const apiBase = getApiBase();
  return fetch(`${apiBase}${normalizedPath}`, init);
}

export async function apiFetchWithAuth(path: string, init?: RequestInit): Promise<Response> {
  const token = getStoredAuthToken();
  if (!token) throw new Error('AUTH_SESSION_REQUIRED');
  const headers = new Headers(init?.headers || {});
  headers.set('Authorization', `Bearer ${token}`);
  return apiFetch(path, { ...init, headers });
}

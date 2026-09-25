import { apiFetch } from './api-client';
import { normalizeEmail } from './auth-flow';

export const CODE_SENT_MESSAGE = 'If an account exists for this email, you will receive a reset code. Check your inbox and spam folder.';

async function request(path: string, body: Record<string, unknown>) {
  const response = await apiFetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data?.error || data?.message || 'Unable to complete the request.');
  return data;
}

export function createPasswordResetFlow() {
  let verifiedResetToken: string | null = null;
  return {
    async request(email: string) {
      verifiedResetToken = null;
      const normalized = normalizeEmail(email);
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) throw new Error('Enter a valid email address.');
      await request('/password-reset', { action: 'request', email: normalized });
    },
    async verify(email: string, code: string) {
      verifiedResetToken = null;
      const token = code.replace(/\s/g, '');
      if (!/^\d{6,10}$/.test(token)) throw new Error('Enter the complete numeric code from your email.');
      const data = await request('/password-reset', { action: 'verify', email: normalizeEmail(email), code: token });
      verifiedResetToken = data.resetToken;
      if (!verifiedResetToken) throw new Error('The reset code could not be verified. Request a new code.');
    },
    async update(password: string, confirmation: string) {
      if (!verifiedResetToken) throw new Error('Verify your reset code before changing your password.');
      if (password.length < 8) throw new Error('Use at least eight characters for your new password.');
      if (password !== confirmation) throw new Error('Passwords do not match.');
      await request('/password-reset', { action: 'update', resetToken: verifiedResetToken, password });
      verifiedResetToken = null;
    },
  };
}

export type RegistrationOutcome = 'signed_in' | 'confirmation_required';
export const EXISTING_ACCOUNT_MESSAGE = 'An account already exists for this email. Sign in or use Forgot password.';
export const CONFIRM_EMAIL_MESSAGE = 'Check your inbox to confirm your email before signing in. If you already have an account, sign in or reset your password instead.';
export const RESET_REQUEST_MESSAGE = 'If an account exists for this email, you will receive a password reset code. Check your inbox and spam folder.';

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export function getPasswordResetUrl(configuredSite?: string): string {
  const url = new URL(configuredSite?.trim() || 'https://your-domain.example');
  if (url.protocol !== 'https:' || url.username || url.password) {
    throw new Error('Password recovery needs a valid HTTPS app address.');
  }
  return `${url.origin}/reset-password`;
}

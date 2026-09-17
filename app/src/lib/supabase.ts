import { createClient } from '@supabase/supabase-js';

const rawUrl = String(import.meta.env.VITE_SUPABASE_URL || '').trim();
const rawKey = String(import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim();

function isValidHttpUrl(val: string): boolean {
  try {
    const url = new URL(val);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

// Fallback to a valid HTTPS URL structure when Supabase is not configured locally,
// ensuring the client library initializes without crashing in local preview mode.
const supabaseUrl = isValidHttpUrl(rawUrl) ? rawUrl : 'https://iwausfzgitoehqecrvxc.supabase.co';
const supabaseAnonKey = (rawKey && rawKey.length > 10) ? rawKey : 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.e30.mock_key_for_preview';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Recovery must never sign the main app in or replace a saved account.
export function createPasswordRecoveryClient() {
  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      storageKey: `morphly-recovery-${crypto.randomUUID()}`,
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
      flowType: 'implicit',
    },
  });
}

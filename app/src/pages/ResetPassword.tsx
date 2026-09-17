import { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Eye, EyeOff, Loader2, ShieldCheck, Video } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { createPasswordRecoveryClient } from '@/lib/supabase';
import { normalizeEmail } from '@/lib/auth-flow';
import { CODE_SENT_MESSAGE, createPasswordResetFlow } from '@/lib/password-reset';

type Step = 'email' | 'code' | 'password' | 'done';

export default function ResetPassword() {
  const location = useLocation();
  const [flow] = useState(() => createPasswordResetFlow(createPasswordRecoveryClient().auth));
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState(() => typeof location.state?.email === 'string' ? location.state.email : '');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [message, setMessage] = useState('');
  const [error, setError] = useState(false);
  const inFlight = useRef(false);
  const feedback = useRef<HTMLParagraphElement>(null);
  const firstInput = useRef<HTMLInputElement>(null);

  useEffect(() => { firstInput.current?.focus(); }, [step]);
  useEffect(() => { if (message) feedback.current?.focus(); }, [message]);
  useEffect(() => {
    if (!cooldown) return;
    const timer = window.setTimeout(() => setCooldown(value => Math.max(0, value - 1)), 1000);
    return () => window.clearTimeout(timer);
  }, [cooldown]);

  async function submit(resend = false) {
    if (inFlight.current || (resend && cooldown > 0)) return;
    inFlight.current = true; setBusy(true); setMessage(''); setError(false);
    try {
      if (step === 'email' || resend) {
        await flow.request(email);
        setEmail(normalizeEmail(email)); setCode(''); setStep('code'); setCooldown(60);
        setMessage(CODE_SENT_MESSAGE);
      } else if (step === 'code') {
        await flow.verify(email, code);
        setCode(''); setStep('password');
        setMessage('Code verified. Choose a new password.');
      } else if (step === 'password') {
        await flow.update(password, confirmation);
        setPassword(''); setConfirmation(''); setStep('done');
        setMessage('Your password has been updated. Sign in with your new password.');
      }
    } catch (failure) {
      const details = failure as { message?: string; code?: string; status?: number };
      if (step === 'password' && (details.status === 401 || details.status === 403 ||
          ['session_not_found', 'refresh_token_not_found', 'bad_jwt'].includes(details.code || ''))) {
        setPassword(''); setConfirmation(''); setStep('email');
        setMessage('Your recovery session expired. Request a new code to continue.');
      } else {
        setMessage(details.code === 'otp_expired' ? 'This code is invalid or has expired. Check your latest email or resend the code.' :
          details.message || 'Unable to complete the request. Please try again.');
      }
      if (details.status === 429) setCooldown(60);
      setError(true);
    } finally {
      inFlight.current = false; setBusy(false);
    }
  }

  const titles = { email: 'Reset your password', code: 'Check your email', password: 'Choose a new password', done: 'Password updated' };
  return (
    <main className="min-h-screen bg-background flex items-center justify-center p-4 text-foreground">
      <div className="w-full max-w-[400px]">
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center"><Video aria-hidden="true" className="w-5 h-5 text-primary-foreground" /></div>
          <span className="text-xl font-semibold tracking-tight">Morphly</span>
        </div>
        <Card className="bg-background border-border">
          <CardHeader className="space-y-3">
            <p className="text-xs text-muted-foreground text-center">{step === 'done' ? 'Account recovery complete' : `Step ${step === 'email' ? 1 : step === 'code' ? 2 : 3} of 3`}</p>
            <CardTitle className="text-xl text-center"><h1>{titles[step]}</h1></CardTitle>
            <p className="text-sm text-muted-foreground text-center break-words">
              {step === 'email' ? 'Enter your account email to receive a one-time reset code.' : step === 'code' ? `Enter the code sent to ${email}. You can complete this here in the app or in your browser.` : step === 'password' ? 'Use at least eight characters. Your account and credits stay the same.' : 'You can now return to Morphly.'}
            </p>
          </CardHeader>
          <CardContent>
            <form onSubmit={event => { event.preventDefault(); void submit(); }} className="space-y-4" aria-busy={busy}>
              {message && <p id="reset-feedback" ref={feedback} tabIndex={-1} role={error ? 'alert' : 'status'} className={`rounded-md border p-3 text-sm leading-5 break-words focus-visible:ring-2 focus-visible:ring-ring ${error ? 'border-destructive/25 text-destructive' : 'border-border'}`}>{message}</p>}
              <fieldset disabled={busy} className="space-y-4 min-w-0">
                {step === 'email' && <div className="space-y-2">
                  <label htmlFor="reset-email" className="text-sm font-medium">Email address</label>
                  <Input ref={firstInput} id="reset-email" type="email" autoComplete="email" autoCapitalize="none" value={email} onChange={event => setEmail(event.target.value)} required className="h-11" aria-describedby="reset-feedback" />
                </div>}
                {step === 'code' && <div className="space-y-2">
                  <label htmlFor="reset-code" className="text-sm font-medium">Reset code</label>
                  <Input ref={firstInput} id="reset-code" type="text" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6,10}" maxLength={10} value={code} onChange={event => setCode(event.target.value.replace(/\s/g, ''))} required className="h-12 text-center text-lg tracking-[0.3em]" aria-describedby="reset-feedback" aria-invalid={error || undefined} />
                </div>}
                {step === 'password' && <>
                  <div className="space-y-2">
                    <label htmlFor="reset-password" className="text-sm font-medium">New password</label>
                    <div className="relative">
                      <Input ref={firstInput} id="reset-password" type={showPassword ? 'text' : 'password'} autoComplete="new-password" minLength={8} value={password} onChange={event => setPassword(event.target.value)} required className="h-11 pr-12" aria-describedby="reset-feedback" />
                      <button type="button" className="absolute inset-y-0 right-0 w-11 flex items-center justify-center rounded-md focus-visible:ring-2 focus-visible:ring-ring" onClick={() => setShowPassword(value => !value)} aria-label={showPassword ? 'Hide passwords' : 'Show passwords'} aria-pressed={showPassword}>{showPassword ? <EyeOff aria-hidden="true" className="w-4 h-4" /> : <Eye aria-hidden="true" className="w-4 h-4" />}</button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="reset-confirmation" className="text-sm font-medium">Confirm new password</label>
                    <Input id="reset-confirmation" type={showPassword ? 'text' : 'password'} autoComplete="new-password" minLength={8} value={confirmation} onChange={event => setConfirmation(event.target.value)} required className="h-11" aria-describedby="reset-feedback" />
                  </div>
                </>}
                {step !== 'done' ? <Button type="submit" className="w-full min-h-11" disabled={busy || (step === 'email' && cooldown > 0)}>
                  {busy && <Loader2 aria-hidden="true" className="w-4 h-4 mr-2 animate-spin motion-reduce:animate-none" />}
                  {busy ? 'Please wait...' : step === 'email' ? cooldown > 0 ? `Try again in ${cooldown}s` : 'Send reset code' : step === 'code' ? 'Verify code' : 'Update password'}
                </Button> : <ShieldCheck aria-hidden="true" className="mx-auto w-10 h-10 text-primary" />}
                {step === 'email' && <Button type="button" variant="ghost" className="w-full min-h-11" onClick={() => {
                  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizeEmail(email))) {
                    setError(true); setMessage('Enter the email address where you received your reset code.');
                    return;
                  }
                  setEmail(normalizeEmail(email)); setStep('code'); setMessage(''); setError(false);
                }}>I already have a code</Button>}
                {step === 'code' && <div className="space-y-1">
                  <Button type="button" variant="outline" className="w-full min-h-11" disabled={cooldown > 0 || busy} onClick={() => void submit(true)}>{cooldown ? `Resend code in ${cooldown}s` : 'Resend code'}</Button>
                  <Button type="button" variant="ghost" className="w-full min-h-11" onClick={() => { setStep('email'); setCode(''); setMessage(''); setError(false); }}>Use a different email</Button>
                </div>}
              </fieldset>
              {!busy && <Link to="/login" className="flex min-h-11 items-center justify-center text-sm text-primary rounded-md focus-visible:ring-2 focus-visible:ring-ring">{step === 'done' ? 'Sign in with your new password' : 'Back to sign in'}</Link>}
            </form>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}

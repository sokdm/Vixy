import { Link } from 'react-router-dom';
import {
  ArrowRight,
  BadgeCheck,
  Bot,
  Code2,
  CreditCard,
  Database,
  Download,
  Gauge,
  KeyRound,
  Layers3,
  LockKeyhole,
  MonitorDown,
  RadioTower,
  ShieldCheck,
  Sparkles,
  Video,
  Wand2,
  Webcam,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

const windowsDownloadUrl = import.meta.env.VITE_WINDOWS_DOWNLOAD_URL || '#';

const productHighlights = [
  {
    icon: Webcam,
    title: 'Virtual camera output',
    copy: 'Route your AI-enhanced feed into Zoom, OBS, Meet, Teams, Discord, and streaming tools that accept a webcam device.',
  },
  {
    icon: Wand2,
    title: 'Realtime transformations',
    copy: 'Use image-guided or prompt-guided looks while keeping a live preview and session controls close at hand.',
  },
  {
    icon: Bot,
    title: 'Voice tools included',
    copy: 'VixyVC prepares the optional voice workflow and keeps local audio controls beside the camera studio.',
  },
  {
    icon: ShieldCheck,
    title: 'Account gated sessions',
    copy: 'Mongo-backed auth, wallet state, and admin access keep the app ready for paid credits and managed users.',
  },
];

const workflow = [
  'Install Vixy Desktop on Windows.',
  'Choose your real camera and microphone.',
  'Start a realtime Vixy session with your selected style.',
  'Select Vixy Virtual Camera inside your meeting or streaming app.',
];

const adminItems = [
  'Admin login uses ADMIN_EMAIL and ADMIN_PASSWORD from Render environment variables.',
  'User, wallet, transaction, usage, and error collections are stored in MongoDB Atlas through Mongoose.',
  'Payment and package screens are ready for the Flutterwave Mongo reconnect step.',
];

const developerItems = [
  'MORPHLY_API_KEY stays server-side only.',
  'The browser calls your own /api/morphly-token route, not the Morphly key directly.',
  'APP_ORIGIN should match the public Render URL so provider-side origin checks are predictable.',
];

export default function Landing() {
  const downloadReady = windowsDownloadUrl !== '#';

  return (
    <main className="min-h-screen bg-background text-foreground">
      <section className="border-b border-border bg-[radial-gradient(circle_at_20%_10%,hsl(var(--primary)/.16),transparent_30%),radial-gradient(circle_at_85%_5%,hsl(var(--accent)/.28),transparent_28%)]">
        <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-5 py-6 lg:px-8">
          <header className="flex items-center justify-between gap-4">
            <Link to="/" className="flex items-center gap-3" aria-label="Vixy home">
              <div className="flex size-10 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-premium">
                <Video className="size-5" aria-hidden="true" />
              </div>
              <div>
                <p className="text-lg font-semibold leading-none tracking-tight">Vixy</p>
                <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">AI Camera Studio</p>
              </div>
            </Link>
            <nav className="hidden items-center gap-5 text-sm text-muted-foreground md:flex">
              <a href="#workflow" className="hover:text-foreground">Workflow</a>
              <a href="#developer" className="hover:text-foreground">Developer</a>
              <a href="#admin" className="hover:text-foreground">Admin</a>
              <a href="#faq" className="hover:text-foreground">FAQ</a>
            </nav>
            <div className="flex items-center gap-2">
              <Button asChild variant="ghost">
                <Link to="/login">Sign in</Link>
              </Button>
              <Button asChild>
                <Link to="/signup">Get started</Link>
              </Button>
            </div>
          </header>

          <div className="grid flex-1 items-center gap-12 py-14 lg:grid-cols-[1.02fr_0.98fr]">
            <div className="max-w-3xl">
              <p className="mb-5 inline-flex items-center gap-2 rounded-full border border-border bg-card/80 px-3 py-1 text-sm text-muted-foreground shadow-premium">
                <Sparkles className="size-4 text-primary" aria-hidden="true" />
                Realtime AI video for calls, streams, demos, and creator work
              </p>
              <h1 className="max-w-3xl text-5xl font-semibold leading-[1.02] tracking-tight text-foreground sm:text-6xl lg:text-7xl">
                A premium AI camera studio for your live presence.
              </h1>
              <p className="mt-6 max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg">
                Vixy gives users a downloadable Windows app, a virtual camera device, account-based access, Morphly realtime integration, and a clean admin path for running the product from Render with MongoDB Atlas.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Button asChild size="lg" className="gap-2">
                  <a href={windowsDownloadUrl} aria-disabled={!downloadReady}>
                    <Download className="size-4" aria-hidden="true" />
                    Download Vixy for Windows
                  </a>
                </Button>
                <Button asChild size="lg" variant="outline" className="gap-2">
                  <Link to="/signup">
                    Create account
                    <ArrowRight className="size-4" aria-hidden="true" />
                  </Link>
                </Button>
              </div>
              {!downloadReady && (
                <p className="mt-3 text-sm text-muted-foreground">
                  Add VITE_WINDOWS_DOWNLOAD_URL after your first GitHub Windows release is uploaded.
                </p>
              )}
              <div className="mt-10 grid max-w-2xl gap-3 sm:grid-cols-3">
                {[
                  ['Windows desktop', 'Vixy-Setup.exe'],
                  ['Database', 'MongoDB Atlas'],
                  ['Payments', 'Flutterwave ready'],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-lg border border-border bg-card/75 p-4">
                    <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{label}</p>
                    <p className="mt-2 text-sm font-semibold text-foreground">{value}</p>
                  </div>
                ))}
              </div>
            </div>

            <ProductPreview />
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-16 lg:px-8">
        <div className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary">What users get</p>
            <h2 className="mt-3 max-w-2xl text-3xl font-semibold tracking-tight sm:text-4xl">One app for camera, style, voice, wallet, and streaming setup.</h2>
          </div>
          <Button asChild variant="outline" className="w-fit gap-2">
            <Link to="/login">
              Open dashboard
              <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          </Button>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {productHighlights.map((item) => (
            <article key={item.title} className="rounded-lg border border-border bg-card p-5 shadow-premium">
              <item.icon className="size-6 text-primary" aria-hidden="true" />
              <h3 className="mt-5 text-lg font-semibold">{item.title}</h3>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">{item.copy}</p>
            </article>
          ))}
        </div>
      </section>

      <section id="workflow" className="border-y border-border bg-card/35">
        <div className="mx-auto grid max-w-7xl gap-10 px-5 py-16 lg:grid-cols-[0.8fr_1.2fr] lg:px-8">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary">Workflow</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">From installer to live virtual camera in minutes.</h2>
            <p className="mt-4 text-sm leading-6 text-muted-foreground">
              The landing page is built to drive downloads first, while signed-in users get the full Vixy dashboard for sessions, wallet, settings, and account actions.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {workflow.map((step, index) => (
              <div key={step} className="rounded-lg border border-border bg-background p-5">
                <span className="flex size-9 items-center justify-center rounded-md bg-primary text-sm font-bold text-primary-foreground">{index + 1}</span>
                <p className="mt-5 text-base font-semibold">{step}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="developer" className="mx-auto grid max-w-7xl gap-8 px-5 py-16 lg:grid-cols-2 lg:px-8">
        <InfoPanel
          icon={Code2}
          eyebrow="Developer API"
          title="Morphly integration stays behind your backend."
          body="Vixy uses a server route for realtime Morphly session creation. Users never receive your Morphly developer key, and Render owns the server-side environment."
          items={developerItems}
        />
        <InfoPanel
          icon={Database}
          eyebrow="MongoDB Atlas"
          title="No Supabase dependency in the active app path."
          body="Auth, users, wallet state, telemetry, password reset codes, and admin checks are wired through the Mongo/Mongoose layer added for Vixy."
          items={[
            'MONGODB_URI connects Render to Atlas.',
            'JWT_SECRET signs Vixy auth tokens.',
            'Password reset uses OTP-style backend actions.',
          ]}
        />
      </section>

      <section id="admin" className="border-y border-border bg-card/35">
        <div className="mx-auto grid max-w-7xl gap-8 px-5 py-16 lg:grid-cols-[1.1fr_0.9fr] lg:px-8">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary">Admin side</p>
            <h2 className="mt-3 max-w-2xl text-3xl font-semibold tracking-tight sm:text-4xl">Run Vixy with an owner login, live user data, and Mongo-backed admin views.</h2>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-muted-foreground">
              The private admin page ships with the app build and signs in through the same Vixy backend. Keep admin credentials in Render, not in the browser.
            </p>
            <ul className="mt-6 grid gap-3">
              {adminItems.map((item) => (
                <li key={item} className="flex gap-3 rounded-lg border border-border bg-background p-4 text-sm text-muted-foreground">
                  <BadgeCheck className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-lg border border-border bg-background p-5 shadow-premium">
            <div className="flex items-center justify-between border-b border-border pb-4">
              <div>
                <p className="text-sm font-semibold">Vixy Admin</p>
                <p className="text-xs text-muted-foreground">Private control center</p>
              </div>
              <LockKeyhole className="size-5 text-primary" aria-hidden="true" />
            </div>
            <div className="mt-5 grid gap-3">
              {[
                ['Users', 'Mongo profiles and roles'],
                ['Wallets', 'Credits and transaction records'],
                ['Logs', 'Error and telemetry collections'],
                ['Releases', 'GitHub download links'],
              ].map(([label, value]) => (
                <div key={label} className="flex items-center justify-between rounded-md border border-border bg-card px-4 py-3">
                  <span className="text-sm font-medium">{label}</span>
                  <span className="text-xs text-muted-foreground">{value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-16 lg:px-8">
        <div className="grid gap-4 md:grid-cols-3">
          <MiniPanel icon={CreditCard} title="Flutterwave" copy="Payment routes are parked for Mongo reconnection, with UI ready for packages and credit purchase flows." />
          <MiniPanel icon={KeyRound} title="Server secrets" copy="Render stores Morphly, Mongo, admin, JWT, and payment secrets outside the client bundle." />
          <MiniPanel icon={MonitorDown} title="Windows release" copy="Upload Vixy-Setup.exe to GitHub Releases and point VITE_WINDOWS_DOWNLOAD_URL at the asset." />
        </div>
      </section>

      <section id="faq" className="mx-auto max-w-4xl px-5 pb-16 lg:px-8">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary">FAQ</p>
        <h2 className="mt-3 text-3xl font-semibold tracking-tight">Before you host</h2>
        <div className="mt-6 grid gap-3">
          {[
            ['Does Vixy include the virtual camera?', 'Yes. The app has been renamed to Vixy Virtual Camera and keeps the desktop virtual camera pipeline in the Electron app.'],
            ['Where is the admin page?', 'The private admin files are copied into the build under /private/vixy/login. Admin API routes use Mongo-backed checks.'],
            ['Can users download the EXE?', 'Yes. The landing page CTA uses VITE_WINDOWS_DOWNLOAD_URL. After building a Windows release, paste the GitHub release asset URL into Render.'],
            ['Can I host on Render?', 'Yes. Use a Node Web Service from the GitHub repo, build the app, and start the Express server from the app folder.'],
          ].map(([question, answer]) => (
            <article key={question} className="rounded-lg border border-border bg-card p-5">
              <h3 className="font-semibold">{question}</h3>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{answer}</p>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}

function ProductPreview() {
  return (
    <div className="rounded-lg border border-border bg-card p-4 shadow-premium">
      <div className="overflow-hidden rounded-md border border-border bg-background">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="size-2.5 rounded-full bg-destructive" />
            <span className="size-2.5 rounded-full bg-warning" />
            <span className="size-2.5 rounded-full bg-primary" />
          </div>
          <span className="text-xs font-medium text-muted-foreground">Vixy Studio Preview</span>
        </div>
        <div className="grid gap-4 p-4 md:grid-cols-[0.78fr_1.22fr]">
          <div className="rounded-md border border-border bg-card p-3">
            <div className="flex items-center gap-2">
              <Layers3 className="size-4 text-primary" aria-hidden="true" />
              <span className="text-sm font-semibold">Session stack</span>
            </div>
            <div className="mt-4 grid gap-3">
              {[
                ['Camera', 'Logitech 1080p'],
                ['Output', 'Vixy Virtual Camera'],
                ['Voice', 'VixyVC standby'],
                ['Wallet', 'Credits tracked'],
              ].map(([label, value]) => (
                <div key={label} className="rounded-md bg-background px-3 py-2">
                  <p className="text-[11px] uppercase tracking-[0.15em] text-muted-foreground">{label}</p>
                  <p className="mt-1 text-xs font-semibold">{value}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="min-h-[320px] rounded-md border border-border bg-[linear-gradient(135deg,hsl(var(--muted)),hsl(var(--background))_52%,hsl(var(--accent)/.5))] p-4">
            <div className="flex h-full flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="rounded-full bg-primary/15 px-3 py-1 text-xs font-semibold text-primary">Live engine ready</span>
                <RadioTower className="size-5 text-primary" aria-hidden="true" />
              </div>
              <div className="mx-auto flex aspect-square w-40 items-center justify-center rounded-full border border-primary/40 bg-background/70">
                <Video className="size-16 text-primary" aria-hidden="true" />
              </div>
              <div className="grid gap-2">
                <div className="flex items-center justify-between rounded-md border border-border bg-background/85 px-3 py-2 text-xs">
                  <span>Frame monitor</span>
                  <span className="text-primary">healthy</span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <span className="h-2 rounded-full bg-primary" />
                  <span className="h-2 rounded-full bg-warning" />
                  <span className="h-2 rounded-full bg-muted" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function InfoPanel({
  icon: Icon,
  eyebrow,
  title,
  body,
  items,
}: {
  icon: typeof Code2;
  eyebrow: string;
  title: string;
  body: string;
  items: string[];
}) {
  return (
    <article className="rounded-lg border border-border bg-card p-6 shadow-premium">
      <Icon className="size-7 text-primary" aria-hidden="true" />
      <p className="mt-5 text-sm font-semibold uppercase tracking-[0.2em] text-primary">{eyebrow}</p>
      <h2 className="mt-3 text-2xl font-semibold tracking-tight sm:text-3xl">{title}</h2>
      <p className="mt-4 text-sm leading-6 text-muted-foreground">{body}</p>
      <ul className="mt-6 grid gap-3">
        {items.map((item) => (
          <li key={item} className="flex gap-3 text-sm text-muted-foreground">
            <Gauge className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </article>
  );
}

function MiniPanel({ icon: Icon, title, copy }: { icon: typeof CreditCard; title: string; copy: string }) {
  return (
    <article className="rounded-lg border border-border bg-card p-5 shadow-premium">
      <Icon className="size-6 text-primary" aria-hidden="true" />
      <h3 className="mt-5 text-lg font-semibold">{title}</h3>
      <p className="mt-3 text-sm leading-6 text-muted-foreground">{copy}</p>
    </article>
  );
}

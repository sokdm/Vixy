import { Link } from 'react-router-dom';
import {
  ArrowRight,
  BadgeCheck,
  Download,
  Film,
  Mic2,
  MonitorPlay,
  RadioTower,
  ShieldCheck,
  Sparkles,
  Video,
  Wand2,
  Webcam,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

const windowsDownloadUrl = import.meta.env.VITE_WINDOWS_DOWNLOAD_URL || '#';

const highlights = [
  {
    icon: Webcam,
    title: 'Show up as a camera',
    copy: 'Use Vixy as a virtual camera in the apps people already use for meetings, classes, streams, and recordings.',
  },
  {
    icon: Wand2,
    title: 'Change your live look',
    copy: 'Create a polished visual style for demos, creator content, remote work, or social calls without rebuilding your setup.',
  },
  {
    icon: Mic2,
    title: 'Keep audio close',
    copy: 'Camera and voice controls live together, so your setup feels like one studio instead of scattered tools.',
  },
  {
    icon: ShieldCheck,
    title: 'Built for real sessions',
    copy: 'Start, monitor, and stop live sessions with clear status messages and a focused desktop workflow.',
  },
];

const steps = [
  'Download and install Vixy Desktop.',
  'Choose your camera and microphone.',
  'Start your AI camera session.',
  'Select Vixy Virtual Camera in your call or streaming app.',
];

const useCases = [
  ['Creators', 'Film reels, tutorials, livestreams, and short-form content with a more distinctive on-camera style.'],
  ['Remote teams', 'Bring a cleaner, more intentional camera look into standups, sales calls, and demos.'],
  ['Educators', 'Create clearer lessons, walkthroughs, and recorded explanations without a studio setup.'],
];

export default function Landing() {
  const downloadReady = windowsDownloadUrl !== '#';

  return (
    <main className="min-h-screen bg-background text-foreground">
      <section className="border-b border-border bg-[radial-gradient(circle_at_18%_8%,hsl(var(--primary)/.16),transparent_28%),radial-gradient(circle_at_82%_4%,hsl(var(--accent)/.24),transparent_30%)]">
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
              <a href="#features" className="hover:text-foreground">Features</a>
              <a href="#how-it-works" className="hover:text-foreground">How it works</a>
              <a href="#use-cases" className="hover:text-foreground">Use cases</a>
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
                Realtime AI video for calls, streams, and creator work
              </p>
              <h1 className="max-w-3xl text-5xl font-semibold leading-[1.02] tracking-tight text-foreground sm:text-6xl lg:text-7xl">
                Your live camera, upgraded with AI.
              </h1>
              <p className="mt-6 max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg">
                Vixy turns your webcam into a premium AI camera studio. Install the Windows app, create your look, and use the Vixy Virtual Camera anywhere you already go live.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Button asChild size="lg" className="gap-2">
                  <a href={windowsDownloadUrl} aria-disabled={!downloadReady}>
                    <Download className="size-4" aria-hidden="true" />
                    Download for Windows
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
                  Windows download will be available after the first public Vixy release.
                </p>
              )}
              <div className="mt-10 grid max-w-2xl gap-3 sm:grid-cols-3">
                {[
                  ['Works with', 'calls and streams'],
                  ['Output', 'virtual camera'],
                  ['Made for', 'Windows desktop'],
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

      <section id="features" className="mx-auto max-w-7xl px-5 py-16 lg:px-8">
        <div className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary">Features</p>
            <h2 className="mt-3 max-w-2xl text-3xl font-semibold tracking-tight sm:text-4xl">Everything you need to look sharper live.</h2>
          </div>
          <Button asChild variant="outline" className="w-fit gap-2">
            <Link to="/login">
              Open Vixy
              <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          </Button>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {highlights.map((item) => (
            <article key={item.title} className="rounded-lg border border-border bg-card p-5 shadow-premium">
              <item.icon className="size-6 text-primary" aria-hidden="true" />
              <h3 className="mt-5 text-lg font-semibold">{item.title}</h3>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">{item.copy}</p>
            </article>
          ))}
        </div>
      </section>

      <section id="how-it-works" className="border-y border-border bg-card/35">
        <div className="mx-auto grid max-w-7xl gap-10 px-5 py-16 lg:grid-cols-[0.8fr_1.2fr] lg:px-8">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary">How it works</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">From install to live camera in minutes.</h2>
            <p className="mt-4 text-sm leading-6 text-muted-foreground">
              Vixy is designed to feel familiar: pick your devices, start your session, then select Vixy wherever you normally choose a webcam.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {steps.map((step, index) => (
              <div key={step} className="rounded-lg border border-border bg-background p-5">
                <span className="flex size-9 items-center justify-center rounded-md bg-primary text-sm font-bold text-primary-foreground">{index + 1}</span>
                <p className="mt-5 text-base font-semibold">{step}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="use-cases" className="mx-auto max-w-7xl px-5 py-16 lg:px-8">
        <div className="mb-8">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary">Use cases</p>
          <h2 className="mt-3 max-w-2xl text-3xl font-semibold tracking-tight sm:text-4xl">A camera upgrade for the places you already show up.</h2>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {useCases.map(([title, copy]) => (
            <article key={title} className="rounded-lg border border-border bg-card p-6 shadow-premium">
              <Film className="size-6 text-primary" aria-hidden="true" />
              <h3 className="mt-5 text-lg font-semibold">{title}</h3>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">{copy}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="border-y border-border bg-card/35">
        <div className="mx-auto grid max-w-7xl gap-8 px-5 py-16 lg:grid-cols-[1fr_0.9fr] lg:px-8">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary">Desktop studio</p>
            <h2 className="mt-3 max-w-2xl text-3xl font-semibold tracking-tight sm:text-4xl">A calm control room for your live look.</h2>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-muted-foreground">
              Vixy keeps the important controls close: camera input, live preview, session status, voice tools, and output guidance. It is made for repeated use, not a one-time demo.
            </p>
            <ul className="mt-6 grid gap-3">
              {[
                'Clear session status while your camera is live.',
                'A virtual camera output designed for common video apps.',
                'A focused dark interface that stays out of your way.',
              ].map((item) => (
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
                <p className="text-sm font-semibold">Live setup</p>
                <p className="text-xs text-muted-foreground">Camera, preview, output</p>
              </div>
              <MonitorPlay className="size-5 text-primary" aria-hidden="true" />
            </div>
            <div className="mt-5 grid gap-3">
              {[
                ['Input', 'Your real camera'],
                ['Preview', 'Live Vixy look'],
                ['Output', 'Vixy Virtual Camera'],
                ['Status', 'Ready for calls'],
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

      <section id="faq" className="mx-auto max-w-4xl px-5 py-16 lg:px-8">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary">FAQ</p>
        <h2 className="mt-3 text-3xl font-semibold tracking-tight">Questions before you start</h2>
        <div className="mt-6 grid gap-3">
          {[
            ['Does Vixy create a virtual camera?', 'Yes. Vixy Desktop includes the Vixy Virtual Camera workflow for supported Windows setups.'],
            ['Can I use it in meeting apps?', 'Yes. Once Vixy is running, choose Vixy Virtual Camera in the camera picker of your meeting or streaming app.'],
            ['Do I need special hardware?', 'You need a Windows computer and a working camera. A stronger machine gives smoother realtime results.'],
            ['Is the desktop app required?', 'Yes. The Windows app handles the local camera workflow and virtual camera output.'],
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
              <Sparkles className="size-4 text-primary" aria-hidden="true" />
              <span className="text-sm font-semibold">Studio stack</span>
            </div>
            <div className="mt-4 grid gap-3">
              {[
                ['Camera', 'HD webcam'],
                ['Look', 'Realtime style'],
                ['Voice', 'Optional tools'],
                ['Output', 'Virtual camera'],
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
                <span className="rounded-full bg-primary/15 px-3 py-1 text-xs font-semibold text-primary">Camera ready</span>
                <RadioTower className="size-5 text-primary" aria-hidden="true" />
              </div>
              <div className="mx-auto flex aspect-square w-40 items-center justify-center rounded-full border border-primary/40 bg-background/70">
                <Video className="size-16 text-primary" aria-hidden="true" />
              </div>
              <div className="grid gap-2">
                <div className="flex items-center justify-between rounded-md border border-border bg-background/85 px-3 py-2 text-xs">
                  <span>Output</span>
                  <span className="text-primary">Vixy Virtual Camera</span>
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

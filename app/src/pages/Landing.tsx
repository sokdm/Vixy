import { Link } from 'react-router-dom';
import { ArrowRight, Download, ShieldCheck, Sparkles, Video } from 'lucide-react';
import { Button } from '@/components/ui/button';

const windowsDownloadUrl = import.meta.env.VITE_WINDOWS_DOWNLOAD_URL || '#';

export default function Landing() {
  const downloadReady = windowsDownloadUrl !== '#';

  return (
    <main className="min-h-screen bg-background text-foreground">
      <section className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-5 py-6">
        <header className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-premium">
              <Video className="size-5" aria-hidden="true" />
            </div>
            <div>
              <p className="text-lg font-semibold leading-none tracking-tight">Vixy</p>
              <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">AI Camera Studio</p>
            </div>
          </div>
          <nav className="flex items-center gap-2">
            <Button asChild variant="ghost">
              <Link to="/login">Sign in</Link>
            </Button>
            <Button asChild>
              <Link to="/signup">Get started</Link>
            </Button>
          </nav>
        </header>

        <div className="grid flex-1 items-center gap-10 py-12 lg:grid-cols-[1.02fr_0.98fr]">
          <div className="max-w-2xl">
            <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-sm text-muted-foreground">
              <Sparkles className="size-4 text-primary" aria-hidden="true" />
              Realtime AI video for calls, streams, and creators
            </p>
            <h1 className="text-5xl font-semibold leading-[1.02] tracking-tight text-foreground sm:text-6xl">
              Vixy turns your camera into a live AI studio.
            </h1>
            <p className="mt-6 max-w-xl text-base leading-7 text-muted-foreground">
              Install the Windows desktop app, pick your physical camera, and publish a transformed feed through the Vixy virtual camera.
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
                Add VITE_WINDOWS_DOWNLOAD_URL after your first Vixy Windows release is uploaded.
              </p>
            )}
          </div>

          <div className="rounded-lg border border-border bg-card p-4 shadow-premium">
            <div className="aspect-video overflow-hidden rounded-md border border-border bg-background">
              <div className="flex h-full flex-col justify-between p-5">
                <div className="flex items-center justify-between">
                  <span className="rounded-full bg-primary/15 px-3 py-1 text-xs font-semibold text-primary">Virtual camera ready</span>
                  <ShieldCheck className="size-5 text-primary" aria-hidden="true" />
                </div>
                <div>
                  <div className="mb-4 h-32 rounded-md border border-border bg-gradient-to-br from-accent via-card to-background" />
                  <div className="grid grid-cols-3 gap-3">
                    <span className="h-2 rounded-full bg-primary" />
                    <span className="h-2 rounded-full bg-muted" />
                    <span className="h-2 rounded-full bg-muted" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

'use client';

import { Button } from '@/components/ui/button';
import { useAuth } from '@/app/context/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import {
  Mail,
  MessageSquare,
  Sparkles,
  Shield,
  ArrowRight,
  Loader2,
  AlertCircle,
} from 'lucide-react';

export default function Home() {
  const { user, loading, error, signIn } = useAuth();
  const router = useRouter();

  // Redirect authenticated users to /chat
  useEffect(() => {
    if (!loading && user) {
      router.replace('/chat');
    }
  }, [user, loading, router]);

  // Check for auth error in URL params
  const urlError =
    typeof window !== 'undefined'
      ? new URLSearchParams(window.location.search).get('error')
      : null;

  // Show minimal loader while checking auth state
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background dark">
        <Loader2 className="w-8 h-8 animate-spin text-purple-400" />
      </div>
    );
  }

  // Authenticated users get redirected above; render nothing while navigating
  if (user) return null;

  return (
    <div className="min-h-screen bg-background dark">
      {/* ── Navbar ────────────────────────────────────────── */}
      <nav className="fixed top-0 inset-x-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-600">
              <MessageSquare className="h-4 w-4 text-white" />
            </div>
            <span className="text-lg font-bold text-foreground tracking-tight">
              Babble
            </span>
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground hover:text-foreground text-sm"
              onClick={() => signIn('azure')}
              disabled={loading}
            >
              Sign in
            </Button>
            <Button
              size="sm"
              className="bg-purple-600 hover:bg-purple-700 text-white text-sm px-4"
              onClick={() => signIn('azure')}
              disabled={loading}
            >
              Get Started
            </Button>
          </div>
        </div>
      </nav>

      {/* ── Hero ─────────────────────────────────────────── */}
      <section className="relative pt-32 pb-20 px-6">
        {/* Gradient glow */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute left-1/2 top-0 -translate-x-1/2 h-125 w-200 rounded-full bg-purple-600/10 blur-[120px]" />
        </div>

        <div className="relative mx-auto max-w-3xl text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-purple-500/20 bg-purple-500/10 px-4 py-1.5 text-xs font-medium text-purple-400">
            <Sparkles className="h-3.5 w-3.5" />
            AI-Powered Unified Inbox
          </div>

          <h1 className="text-5xl font-bold tracking-tight text-foreground sm:text-6xl lg:text-7xl leading-[1.1]">
            Every conversation.
            <br />
            <span className="bg-linear-to-r from-purple-400 via-purple-500 to-indigo-400 bg-clip-text text-transparent">
              One place.
            </span>
          </h1>

          <p className="mt-6 text-lg text-muted-foreground leading-relaxed max-w-xl mx-auto">
            Babble brings your emails, chats, and messages into one intelligent
            inbox — with AI summaries, smart actions, and real-time
            collaboration built in.
          </p>

          {/* Auth error display */}
          {(error || urlError) && (
            <div className="mt-6 mx-auto max-w-md flex items-center gap-2 rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <p>{error || 'Authentication failed. Please try again.'}</p>
            </div>
          )}

          {/* Sign-in buttons */}
          <div className="mt-10 flex flex-col items-center gap-4">
            <div className="flex flex-wrap items-center justify-center gap-3">
              <Button
                size="lg"
                className="bg-purple-600 hover:bg-purple-700 text-white text-sm h-12 px-8 gap-2.5 rounded-xl shadow-lg shadow-purple-600/20"
                onClick={() => signIn('azure')}
                disabled={loading}
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <svg
                    viewBox="0 0 21 21"
                    className="h-5 w-5"
                    fill="currentColor"
                  >
                    <path d="M0 0h10v10H0z" opacity=".8" />
                    <path d="M11 0h10v10H11z" opacity=".6" />
                    <path d="M0 11h10v10H0z" opacity=".6" />
                    <path d="M11 11h10v10H11z" opacity=".4" />
                  </svg>
                )}
                Continue with Microsoft
              </Button>

              <Button
                size="lg"
                variant="outline"
                className="text-sm h-12 px-8 gap-2.5 rounded-xl border-border bg-card hover:bg-accent"
                onClick={() => signIn('google')}
                disabled={loading}
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <svg viewBox="0 0 24 24" className="h-5 w-5">
                    <path
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                      fill="#4285F4"
                    />
                    <path
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      fill="#34A853"
                    />
                    <path
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                      fill="#FBBC05"
                    />
                    <path
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                      fill="#EA4335"
                    />
                  </svg>
                )}
                Continue with Google
              </Button>
            </div>

            <p className="text-xs text-muted-foreground">
              No credit card required • Free to get started
            </p>
          </div>
        </div>
      </section>

      {/* ── Features ─────────────────────────────────────── */}
      <section className="relative border-t border-border/50 py-24 px-6">
        <div className="mx-auto max-w-5xl">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-foreground sm:text-4xl">
              Built for teams that move fast
            </h2>
            <p className="mt-3 text-muted-foreground text-lg max-w-lg mx-auto">
              Stop switching tabs. Start closing conversations.
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[
              {
                icon: Mail,
                title: 'Unified Inbox',
                description:
                  'Email, Slack, WhatsApp, SMS — all channels converge into one prioritized stream.',
                color: 'text-blue-400',
                bg: 'bg-blue-500/10 border-blue-500/20',
              },
              {
                icon: Sparkles,
                title: 'AI Summaries & Actions',
                description:
                  'Instant inbox digests, suggested replies, and one-click actions powered by AI.',
                color: 'text-purple-400',
                bg: 'bg-purple-500/10 border-purple-500/20',
              },
              {
                icon: MessageSquare,
                title: 'Live Collaboration',
                description:
                  'Real-time sessions with meeting memory — decisions, action items, and context that sticks.',
                color: 'text-green-400',
                bg: 'bg-green-500/10 border-green-500/20',
              },
            ].map((feature) => (
              <div
                key={feature.title}
                className="group rounded-2xl border border-border/50 bg-card/50 p-6 transition-colors hover:border-border hover:bg-card"
              >
                <div
                  className={`mb-4 inline-flex h-10 w-10 items-center justify-center rounded-xl border ${feature.bg}`}
                >
                  <feature.icon className={`h-5 w-5 ${feature.color}`} />
                </div>
                <h3 className="text-base font-semibold text-foreground mb-2">
                  {feature.title}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────── */}
      <section className="border-t border-border/50 py-20 px-6">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold text-foreground">
            Ready to tame your inbox?
          </h2>
          <p className="mt-3 text-muted-foreground text-lg">
            Connect your accounts and let Babble do the heavy lifting.
          </p>
          <div className="mt-8 flex justify-center">
            <Button
              size="lg"
              className="bg-purple-600 hover:bg-purple-700 text-white h-12 px-8 gap-2 rounded-xl shadow-lg shadow-purple-600/20"
              onClick={() => signIn('azure')}
              disabled={loading}
            >
              Get Started Free
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────── */}
      <footer className="border-t border-border/50 py-8 px-6">
        <div className="mx-auto max-w-6xl flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-md bg-purple-600">
              <MessageSquare className="h-3 w-3 text-white" />
            </div>
            <span className="text-sm font-semibold text-foreground">
              Babble
            </span>
          </div>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Shield className="h-3 w-3" />
            <span>Your data stays yours. SOC 2 Type II compliant.</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

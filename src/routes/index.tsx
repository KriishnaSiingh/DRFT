import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, BarChart3, QrCode, ShieldCheck, Zap } from "lucide-react";

import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { CARD_IDS } from "@/lib/qr-config";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "QR Routing Manager — 20 dynamic review cards" },
      {
        name: "description",
        content:
          "Manage 20 fixed QR cards from your phone: point each card at any review link, toggle it live, and track every scan.",
      },
      { property: "og:title", content: "QR Routing Manager — 20 dynamic review cards" },
      {
        property: "og:description",
        content:
          "Re-point printed QR cards to any destination in seconds, with live status toggles and scan analytics.",
      },
    ],
  }),
  component: Landing,
});

function Landing() {
  const { user, loading } = useAuth();

  return (
    <div className="grid-noise min-h-screen bg-background">
      <header className="mx-auto flex max-w-5xl items-center justify-between px-5 py-5">
        <span className="flex items-center gap-2 font-display text-lg font-bold">
          <QrCode className="size-5 text-primary" />
          QR Router
        </span>
        <div className="flex items-center gap-1">
          <ThemeToggle />
          {!loading && (
            <Button asChild size="sm">
              <Link to={user ? "/admin" : "/auth"}>{user ? "Dashboard" : "Sign in"}</Link>
            </Button>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-5 pb-20">
        <section className="pt-8 pb-14 sm:pt-16">
          <p className="font-display text-xs tracking-[0.2em] text-primary uppercase">
            20 fixed cards · infinite destinations
          </p>
          <h1 className="mt-4 text-4xl leading-tight font-bold text-foreground sm:text-6xl">
            Print once.
            <br />
            Re-route forever.
          </h1>
          <p className="mt-5 max-w-xl text-base text-muted-foreground sm:text-lg">
            Each printed card carries a permanent link like{" "}
            <code className="text-foreground">/q/007</code>. Change where it points, switch it off,
            or hand it to a new shop — straight from your phone, on site, in seconds.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild size="lg">
              <Link to={user ? "/admin" : "/auth"}>
                {user ? "Open dashboard" : "Admin sign in"} <ArrowRight className="size-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link to="/q/$id" params={{ id: "001" }}>
                Try card 001
              </Link>
            </Button>
          </div>
        </section>

        <section className="grid gap-4 sm:grid-cols-3">
          {[
            {
              icon: Zap,
              title: "Instant redirects",
              body: "A scan resolves server-side and issues a 302 straight to the destination.",
            },
            {
              icon: BarChart3,
              title: "Scan analytics",
              body: "Every scan logs a timestamp and device type, per card and in total.",
            },
            {
              icon: ShieldCheck,
              title: "Locked down",
              body: "Card data is admin-only; the public endpoint can only resolve and count.",
            },
          ].map(({ icon: Icon, title, body }) => (
            <div key={title} className="rounded-2xl border border-border bg-card p-5">
              <Icon className="size-5 text-accent" />
              <h2 className="mt-3 text-base font-semibold text-card-foreground">{title}</h2>
              <p className="mt-1.5 text-sm text-muted-foreground">{body}</p>
            </div>
          ))}
        </section>

        <section className="mt-12 rounded-2xl border border-border bg-card p-5">
          <h2 className="text-base font-semibold text-card-foreground">The card range</h2>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Twenty permanent slugs, ready to print.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {CARD_IDS.map((id) => (
              <span
                key={id}
                className="rounded-md border border-border bg-secondary px-2.5 py-1 font-display text-xs font-semibold text-secondary-foreground"
              >
                /q/{id}
              </span>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}

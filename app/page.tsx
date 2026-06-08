import Link from "next/link";
import { getTranslations } from "next-intl/server";
import {
  ArrowRight,
  BarChart3,
  Calculator,
  Command,
  FolderKanban,
  Layers,
  Package,
  ShoppingCart,
  Sparkles,
  Users,
} from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { Logo } from "@/components/brand/logo";
import { LandingLanguageSwitcher } from "@/components/brand/landing-language-switcher";
import { Reveal } from "@/components/brand/reveal";
import { TiltCard } from "@/components/brand/tilt-card";
import { TiltFeature } from "@/components/brand/tilt-feature";
import { PrinciplesList } from "@/components/brand/principles-list";
import { CtaShowcase } from "@/components/brand/cta-showcase";
import { PreviewApp } from "@/components/brand/preview-app";
import { ShortcutHint } from "@/components/patterns/shortcut";
import {
  LandingThemeProvider,
  LandingThemeToggle,
} from "@/components/brand/landing-theme";

// Module chips: icon + the nav-namespace key whose label we reuse so the
// landing page stays in sync with the in-app module names.
const MODULES = [
  { icon: Users, navKey: "crm" },
  { icon: ShoppingCart, navKey: "salesModule" },
  { icon: Package, navKey: "inventory" },
  { icon: Calculator, navKey: "accounting" },
  { icon: FolderKanban, navKey: "projects" },
  { icon: BarChart3, navKey: "reports" },
] as const;

const FEATURE_ICONS = [Command, Layers, Sparkles] as const;

export default async function LandingPage() {
  const t = await getTranslations("landing");
  const tn = await getTranslations("nav");
  const features = t.raw("features") as { title: string; body: string }[];
  const principles = t.raw("principles") as string[];
  const metrics = t.raw("metrics") as { value: string; label: string }[];

  return (
    // Marketing page owns its own (dark-default) theme scope; the header toggle
    // animates between dark and light.
    <LandingThemeProvider>
      {/* Living aurora background */}
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[900px] overflow-hidden">
        <div className="absolute left-1/2 top-[-12rem] -translate-x-1/2">
          <div className="h-[36rem] w-[64rem] rounded-full bg-primary/25 blur-[130px] animate-aurora" />
        </div>
        <div className="absolute right-[2%] top-[2rem]">
          <div className="h-[26rem] w-[26rem] rounded-full bg-info/20 blur-[120px] animate-aurora-2" />
        </div>
        <div className="absolute left-0 top-[9rem]">
          <div className="h-[24rem] w-[24rem] rounded-full bg-chart-1/20 blur-[120px] animate-aurora" />
        </div>
        <div className="absolute inset-0 [background-image:linear-gradient(to_right,color-mix(in_oklch,var(--foreground)_6%,transparent)_1px,transparent_1px),linear-gradient(to_bottom,color-mix(in_oklch,var(--foreground)_6%,transparent)_1px,transparent_1px)] [background-size:54px_54px] [mask-image:radial-gradient(ellipse_55%_45%_at_50%_0%,black,transparent_72%)]" />
      </div>

      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-border/70 bg-background/60 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" aria-label="aywa home">
            <Logo variant="wordmark" gradient />
          </Link>
          <nav className="flex items-center gap-1.5">
            <LandingThemeToggle />
            <LandingLanguageSwitcher />
            <Link
              href="/sign-in"
              className={buttonVariants({ variant: "ghost", size: "sm" })}
            >
              {t("signIn")}
            </Link>
            <Link
              href="/sign-in"
              className={buttonVariants({ size: "sm", className: "shadow-lg shadow-primary/30" })}
            >
              {t("getStarted")}
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="relative px-6 pt-20 md:pt-28 pb-16">
        <div className="max-w-4xl mx-auto text-center">
          <Reveal>
            <span className="inline-flex items-center gap-2 rounded-full border border-foreground/10 bg-foreground/5 px-3.5 py-1.5 text-xs font-medium text-muted-foreground backdrop-blur">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary/70" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-primary" />
              </span>
              {t("badge")}
            </span>
          </Reveal>

          <Reveal delay={80}>
            <h1 className="mt-7 text-balance text-5xl md:text-7xl font-semibold tracking-tight leading-[1.02]">
              {t("heroTitleLead")}{" "}
              <span className="text-primary [text-shadow:0_0_40px_color-mix(in_oklch,var(--primary)_55%,transparent)]">
                {t("heroTitleAccent")}
              </span>
            </h1>
          </Reveal>

          <Reveal delay={160}>
            <p className="mt-6 text-lg md:text-xl text-pretty text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              {t("heroSubtitle")}
            </p>
          </Reveal>

          <Reveal delay={240}>
            <div className="mt-9 flex items-center justify-center gap-3 flex-wrap">
              <Link
                href="/sign-in"
                className={buttonVariants({
                  size: "lg",
                  className: "gap-1.5 shadow-lg shadow-primary/30",
                })}
              >
                {t("tryDemo")}
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="#features"
                className={buttonVariants({
                  size: "lg",
                  variant: "outline",
                  className: "border-foreground/15 bg-foreground/5",
                })}
              >
                {t("seeInside")}
              </Link>
            </div>
          </Reveal>

          <Reveal delay={320}>
            <div className="mt-10 flex flex-wrap items-center justify-center gap-2.5 text-xs text-muted-foreground">
              {MODULES.map((m, i) => (
                <span
                  key={m.navKey}
                  className="group inline-flex items-center gap-1.5 rounded-full border border-foreground/10 bg-foreground/5 px-3 py-1.5 backdrop-blur transition-all duration-300 hover:-translate-y-1 hover:scale-110 hover:border-primary hover:bg-primary hover:text-primary-foreground hover:shadow-lg hover:shadow-primary/30"
                >
                  {/* Icon bobs forever (staggered) via chip-float, then on hover
                      the whole pill fills with primary and the icon pops white +
                      scales. chip-float animates `transform`; hover uses the
                      separate `scale`/color props (Tailwind v4) so they compose
                      and the hover reaction works even under reduced-motion. */}
                  <m.icon
                    className="chip-float h-3.5 w-3.5 text-primary transition-[scale,color] duration-300 group-hover:scale-150 group-hover:text-primary-foreground"
                    style={{ animationDelay: `${i * 220}ms` }}
                  />
                  {tn(m.navKey)}
                </span>
              ))}
            </div>
          </Reveal>
        </div>

        {/* Product preview */}
        <Reveal delay={200} className="relative mx-auto mt-16 max-w-4xl">
          <div
            aria-hidden
            className="pointer-events-none absolute left-1/2 top-[-3rem] h-64 w-[44rem] max-w-full -translate-x-1/2 rounded-full bg-primary/25 blur-[120px]"
          />
          <TiltCard>
            <PreviewApp />
          </TiltCard>
        </Reveal>
      </section>

      {/* Metrics strip */}
      <section className="border-y border-border/70 bg-foreground/[0.02]">
        <Reveal className="mx-auto grid max-w-5xl grid-cols-2 gap-6 px-6 py-10 sm:grid-cols-4">
          {metrics.map((m) => (
            <div key={m.label} className="text-center">
              <div className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
                {m.value.includes("⌘") ? <ShortcutHint /> : m.value}
              </div>
              <div className="mt-1.5 text-xs uppercase tracking-wider text-muted-foreground">
                {m.label}
              </div>
            </div>
          ))}
        </Reveal>
      </section>

      {/* Features */}
      <section id="features" className="px-6 py-24">
        <div className="mx-auto max-w-6xl">
          <Reveal className="max-w-2xl">
            <h2 className="text-3xl md:text-4xl font-semibold tracking-tight text-balance">
              {t("featuresTitle")}
            </h2>
            <p className="mt-4 text-muted-foreground text-pretty leading-relaxed">
              {t("featuresSubtitle")}
            </p>
          </Reveal>

          <div className="mt-12 grid gap-5 md:grid-cols-3">
            {features.map((f, i) => {
              const Icon = FEATURE_ICONS[i] ?? Sparkles;
              return (
                <Reveal key={f.title} delay={i * 100} className="h-full">
                  <TiltFeature>
                    <div className="group relative h-full rounded-2xl border border-foreground/10 bg-foreground/[0.03] p-6 transition-all duration-300 [transform-style:preserve-3d] hover:-translate-y-1 hover:border-primary/40 hover:bg-foreground/[0.05] hover:shadow-2xl hover:shadow-primary/10">
                      <div className="mb-5 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-lg shadow-primary/30 transition-transform duration-300 ease-out [transform-style:preserve-3d] group-hover:[transform:translateZ(34px)_scale(1.06)]">
                        <Icon className="h-5 w-5" />
                      </div>
                      <h3 className="text-lg font-semibold transition-transform duration-300 ease-out group-hover:[transform:translateZ(18px)]">
                        {f.title}
                      </h3>
                      <p className="mt-2 text-sm leading-relaxed text-muted-foreground transition-transform duration-300 ease-out group-hover:[transform:translateZ(10px)]">
                        {f.body}
                      </p>
                    </div>
                  </TiltFeature>
                </Reveal>
              );
            })}
          </div>
        </div>
      </section>

      {/* Principles */}
      <section className="px-6 py-24 border-t border-border/70 bg-foreground/[0.02]">
        <div className="mx-auto grid max-w-6xl items-start gap-12 md:grid-cols-2">
          <Reveal className="md:sticky md:top-24">
            <h2 className="text-3xl md:text-4xl font-semibold tracking-tight text-balance">
              {t("principlesTitle")}
            </h2>
            <p className="mt-4 text-muted-foreground text-pretty leading-relaxed">
              {t("principlesSubtitle")}
            </p>
            <p className="mt-4 text-muted-foreground text-pretty leading-relaxed">
              {t("principlesDetail")}
            </p>
            <Link
              href="/sign-in"
              className={buttonVariants({
                size: "lg",
                className:
                  "group mt-7 gap-1.5 shadow-lg shadow-primary/30 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-primary/40",
              })}
            >
              {t("openApp")}
              <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
            </Link>
          </Reveal>
          <PrinciplesList items={principles} />
        </div>
      </section>

      {/* CTA */}
      <section className="px-6 py-24">
        <Reveal className="mx-auto max-w-5xl">
          <CtaShowcase
            title={t("ctaTitle")}
            body={t("ctaBody")}
            badge={t("ctaBadge")}
            perks={t.raw("ctaPerks") as string[]}
            socialProof={t("ctaSocialProof")}
            primaryLabel={t("tryDemo")}
            secondaryLabel={t("getStarted")}
          />
        </Reveal>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/70 px-6 py-10">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 text-sm text-muted-foreground md:flex-row">
          <div className="flex items-center gap-2">
            <Logo variant="mark" />
            <span>{t("footerRights", { year: new Date().getFullYear() })}</span>
          </div>
          <span className="text-xs">{t("footerTagline")}</span>
        </div>
      </footer>
    </LandingThemeProvider>
  );
}

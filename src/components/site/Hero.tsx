import { ArrowRight, UtensilsCrossed } from "lucide-react";

import type { SiteSettings } from "@/config/settings";

const EMBERS = [
  { left: "12%", delay: "0s", bottom: "10%" },
  { left: "28%", delay: "1.6s", bottom: "18%" },
  { left: "46%", delay: "3.1s", bottom: "6%" },
  { left: "63%", delay: "0.8s", bottom: "14%" },
  { left: "78%", delay: "2.4s", bottom: "8%" },
  { left: "90%", delay: "4s", bottom: "20%" },
];

export function Hero({ settings, isDemoImage }: { settings: SiteSettings; isDemoImage: boolean }) {
  const { hero } = settings;
  return (
    <section
      id="inicio"
      aria-labelledby="hero-title"
      className="relative isolate overflow-hidden bg-brand-black pt-24 sm:pt-28 lg:min-h-[92vh] lg:pt-32"
    >
      {/* brilho quente de fundo */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background:
            "radial-gradient(60% 60% at 75% 45%, rgba(255,152,0,0.22), transparent 70%), radial-gradient(40% 40% at 10% 90%, rgba(255,176,32,0.08), transparent 70%)",
        }}
      />
      <div
        aria-hidden="true"
        className="bg-grill pointer-events-none absolute inset-0 -z-10 opacity-60"
      />

      <div className="mx-auto grid max-w-7xl items-center gap-10 px-4 pb-16 sm:px-6 lg:grid-cols-[1.05fr_1fr] lg:gap-6 lg:px-8 lg:pb-24">
        <div className="relative z-10 text-center lg:text-left">
          {hero.kicker ? (
            <p className="animate-fade-up font-script text-2xl text-brand-amber sm:text-3xl">
              {hero.kicker}
            </p>
          ) : null}
          <h1
            id="hero-title"
            className="animate-fade-up mt-2 font-display text-[3.1rem] uppercase leading-[0.92] tracking-wide text-white [animation-delay:120ms] sm:text-7xl lg:text-[5.4rem] xl:text-[6.2rem]"
          >
            {hero.title}
            {hero.highlight ? (
              <span className="text-gradient-fire mt-1 block">{hero.highlight}</span>
            ) : null}
          </h1>
          {hero.subtitle ? (
            <p className="animate-fade-up mx-auto mt-5 max-w-xl text-base text-brand-gray [animation-delay:240ms] sm:text-lg lg:mx-0">
              {hero.subtitle}
            </p>
          ) : null}
          <div className="animate-fade-up mt-8 flex flex-col items-stretch gap-3 [animation-delay:360ms] sm:flex-row sm:items-center sm:justify-center lg:justify-start">
            <a
              href="#cardapio"
              className="glow-orange group inline-flex h-14 items-center justify-center gap-2 rounded-full bg-brand-orange px-8 text-base font-bold uppercase tracking-wide text-brand-black transition hover:-translate-y-0.5 hover:bg-brand-amber"
            >
              Fazer meu pedido
              <ArrowRight
                className="h-5 w-5 transition group-hover:translate-x-1"
                aria-hidden="true"
              />
            </a>
            <a
              href="#cardapio"
              className="inline-flex h-14 items-center justify-center gap-2 rounded-full border-2 border-white/25 px-8 text-base font-bold uppercase tracking-wide text-white transition hover:border-brand-orange hover:text-brand-orange"
            >
              <UtensilsCrossed className="h-5 w-5" aria-hidden="true" />
              Ver cardápio
            </a>
          </div>
        </div>

        <div className="relative mx-auto w-full max-w-xl lg:max-w-none">
          <div
            aria-hidden="true"
            className="absolute inset-[8%] -z-10 rounded-full bg-brand-orange/30 blur-3xl"
          />
          <div className="animate-fade-up relative [animation-delay:200ms]">
            <div className="animate-float relative overflow-hidden rounded-[2rem] border border-white/10 shadow-2xl shadow-black/60">
              {hero.imageUrl ? (
                <img
                  src={hero.imageUrl}
                  alt="Lanche prensado recheado, servido quente"
                  width={1400}
                  height={1050}
                  fetchPriority="high"
                  decoding="async"
                  className="aspect-[4/3] w-full object-cover"
                />
              ) : (
                <div className="aspect-[4/3] w-full bg-brand-black-2" />
              )}
              <div
                aria-hidden="true"
                className="absolute inset-0 bg-gradient-to-t from-brand-black/70 via-transparent to-transparent"
              />
              {isDemoImage ? (
                <span className="absolute bottom-3 right-3 rounded-full bg-black/60 px-2.5 py-1 text-[0.65rem] text-white/80 backdrop-blur">
                  Imagem ilustrativa
                </span>
              ) : null}
            </div>
            {/* fumaça e brasas */}
            <div aria-hidden="true" className="pointer-events-none absolute inset-0">
              <span className="smoke left-[30%] top-[10%] h-24 w-24" />
              <span className="smoke left-[55%] top-[4%] h-32 w-32 [animation-delay:2.5s]" />
              {EMBERS.map((e, i) => (
                <span
                  key={i}
                  className="ember"
                  style={{ left: e.left, bottom: e.bottom, animationDelay: e.delay }}
                />
              ))}
            </div>
            <div className="absolute -bottom-5 left-4 flex items-center gap-3 rounded-2xl border border-white/10 bg-brand-black/90 px-4 py-3 shadow-xl backdrop-blur sm:-left-6">
              <span className="font-display text-3xl leading-none text-brand-orange">BIG</span>
              <span className="text-xs leading-tight text-white/85">
                pão tostado,
                <br />
                queijo derretido
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

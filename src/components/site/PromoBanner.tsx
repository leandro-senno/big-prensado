import { ArrowRight, BadgePercent, Copy } from "lucide-react";
import { toast } from "sonner";

import type { SiteSettings } from "@/config/settings";
import type { Promotion } from "@/types/catalog";

export function PromoBanner({
  settings,
  promotions,
  isDemoImage,
}: {
  settings: SiteSettings;
  promotions: Promotion[];
  isDemoImage: boolean;
}) {
  const { promoBanner } = settings;

  const copy = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      toast.success(`Cupom ${code} copiado! Use no carrinho.`);
    } catch {
      toast.info(`Use o cupom ${code} no carrinho.`);
    }
  };

  return (
    <section
      id="promocoes"
      aria-labelledby="promo-title"
      className="bg-brand-black px-4 py-10 sm:px-6 sm:py-16 lg:px-8"
    >
      <div className="relative mx-auto max-w-7xl overflow-hidden rounded-[2rem] bg-gradient-to-br from-brand-amber via-brand-orange to-[#e65c00] shadow-2xl shadow-brand-orange/20">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-20"
          style={{
            backgroundImage:
              "repeating-linear-gradient(135deg, rgba(0,0,0,0.25) 0 2px, transparent 2px 18px)",
          }}
        />
        <div className="relative grid items-center gap-6 p-6 sm:p-10 lg:grid-cols-[1.2fr_1fr] lg:p-14">
          <div className="text-brand-black">
            <h2
              id="promo-title"
              className="font-display text-4xl uppercase leading-[0.95] sm:text-5xl lg:text-6xl"
            >
              {promoBanner.title}
            </h2>
            {promoBanner.subtitle ? (
              <p className="mt-4 max-w-lg text-base font-medium text-brand-black/80 sm:text-lg">
                {promoBanner.subtitle}
              </p>
            ) : null}

            {promotions.length > 0 ? (
              <ul className="mt-6 space-y-3">
                {promotions.map((p) => (
                  <li
                    key={p.id}
                    className="flex flex-col gap-3 rounded-2xl bg-brand-black/90 p-4 text-white sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="flex items-start gap-3">
                      <BadgePercent
                        className="mt-0.5 h-6 w-6 shrink-0 text-brand-amber"
                        aria-hidden="true"
                      />
                      <div>
                        <p className="font-bold">
                          {p.title}
                          {p.discountPercent ? (
                            <span className="text-brand-amber"> · {p.discountPercent}% OFF</span>
                          ) : null}
                        </p>
                        {p.subtitle ? (
                          <p className="text-sm text-brand-gray">{p.subtitle}</p>
                        ) : null}
                      </div>
                    </div>
                    {p.couponCode ? (
                      <button
                        type="button"
                        onClick={() => void copy(p.couponCode ?? "")}
                        className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-dashed border-brand-amber px-4 font-mono text-sm font-bold tracking-wider text-brand-amber transition hover:bg-brand-amber hover:text-brand-black"
                        aria-label={`Copiar cupom ${p.couponCode}`}
                      >
                        {p.couponCode}
                        <Copy className="h-4 w-4" aria-hidden="true" />
                      </button>
                    ) : null}
                  </li>
                ))}
              </ul>
            ) : null}

            <a
              href="#cardapio"
              className="group mt-7 inline-flex h-14 items-center gap-2 rounded-full bg-brand-black px-8 font-bold uppercase tracking-wide text-white transition hover:-translate-y-0.5 hover:bg-black"
            >
              Fazer pedido
              <ArrowRight
                className="h-5 w-5 transition group-hover:translate-x-1"
                aria-hidden="true"
              />
            </a>
          </div>
          {promoBanner.imageUrl ? (
            <div className="relative">
              <img
                src={promoBanner.imageUrl}
                alt="Hambúrguer com batatas fritas servido na tábua"
                loading="lazy"
                decoding="async"
                width={1000}
                height={750}
                className="aspect-[4/3] w-full rounded-3xl border-4 border-brand-black/80 object-cover shadow-2xl"
              />
              {isDemoImage ? (
                <span className="absolute bottom-3 right-3 rounded-full bg-black/60 px-2.5 py-1 text-[0.65rem] text-white/80">
                  Imagem ilustrativa
                </span>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}

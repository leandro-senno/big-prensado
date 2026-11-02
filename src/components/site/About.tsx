import { Flame, Sandwich, Smile } from "lucide-react";

import type { SiteSettings } from "@/config/settings";

import { Reveal } from "./Reveal";

const PILLARS = [
  { icon: Flame, title: "Direto da chapa", text: "Pão tostado na prensa e queijo derretido." },
  { icon: Sandwich, title: "Recheio de verdade", text: "Lanches caprichados para matar a fome." },
  { icon: Smile, title: "Sabor que fideliza", text: "Aquele lanche que dá vontade de repetir." },
];

export function About({ settings, isDemoImage }: { settings: SiteSettings; isDemoImage: boolean }) {
  const { about } = settings;
  const paragraphs = about.text.split(/\n{2,}/).filter(Boolean);
  return (
    <section
      id="sobre"
      aria-labelledby="sobre-title"
      className="relative overflow-hidden bg-brand-black-2 py-16 sm:py-24"
    >
      <div className="mx-auto grid max-w-7xl items-center gap-10 px-4 sm:px-6 lg:grid-cols-2 lg:gap-16 lg:px-8">
        <Reveal className="relative order-2 lg:order-1">
          <div
            aria-hidden="true"
            className="absolute -inset-4 -z-0 rounded-[2.5rem] bg-brand-orange/15 blur-2xl"
          />
          {about.imageUrl ? (
            <div className="relative overflow-hidden rounded-[2rem] border border-white/10">
              <img
                src={about.imageUrl}
                alt="Lanche prensado com marcas da chapa"
                loading="lazy"
                decoding="async"
                width={1000}
                height={1000}
                className="aspect-square w-full object-cover sm:aspect-[5/4]"
              />
              {isDemoImage ? (
                <span className="absolute bottom-3 right-3 rounded-full bg-black/60 px-2.5 py-1 text-[0.65rem] text-white/80">
                  Imagem ilustrativa
                </span>
              ) : null}
            </div>
          ) : null}
        </Reveal>
        <Reveal className="order-1 lg:order-2" delay={100}>
          <p className="font-script text-2xl text-brand-amber">Sobre nós</p>
          <h2
            id="sobre-title"
            className="mt-1 font-display text-4xl uppercase leading-[0.95] tracking-wide text-white sm:text-5xl lg:text-6xl"
          >
            {about.title}
          </h2>
          <div className="mt-5 space-y-4 text-base text-brand-gray sm:text-lg">
            {paragraphs.map((p, i) => (
              <p key={i}>{p}</p>
            ))}
          </div>
          <ul className="mt-8 grid gap-4 sm:grid-cols-3">
            {PILLARS.map(({ icon: Icon, title, text }) => (
              <li key={title} className="rounded-2xl border border-white/10 bg-brand-black p-4">
                <Icon className="h-7 w-7 text-brand-orange" aria-hidden="true" />
                <p className="mt-3 font-display text-lg uppercase tracking-wide text-white">
                  {title}
                </p>
                <p className="mt-1 text-sm text-brand-gray">{text}</p>
              </li>
            ))}
          </ul>
        </Reveal>
      </div>
    </section>
  );
}

import { ExternalLink, MessageSquareQuote } from "lucide-react";

import type { SiteSettings } from "@/config/settings";

import { SectionHeading } from "./SectionHeading";

/**
 * Não exibimos notas nem depoimentos inventados: a seção leva o visitante às
 * avaliações públicas e verificáveis do Google.
 */
export function Reviews({ settings }: { settings: SiteSettings }) {
  if (!settings.reviewsUrl) return null;
  return (
    <section
      id="avaliacoes"
      aria-labelledby="avaliacoes-title"
      className="bg-brand-black-2 py-16 sm:py-20"
    >
      <div className="mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
        <SectionHeading
          id="avaliacoes-title"
          kicker="Quem prova, recomenda"
          title="Avaliações"
          description="Veja o que os clientes dizem nas avaliações públicas do Google e conte como foi a sua experiência."
          className="mb-8"
        />
        <div className="mx-auto flex max-w-xl flex-col items-center gap-5 rounded-3xl border border-white/10 bg-brand-black p-6 sm:p-8">
          <MessageSquareQuote className="h-10 w-10 text-brand-orange" aria-hidden="true" />
          <p className="text-brand-gray">
            As avaliações ficam no perfil do Google Maps, onde cada comentário é público e
            verificável.
          </p>
          <a
            href={settings.reviewsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-12 items-center gap-2 rounded-full border-2 border-brand-orange px-6 font-bold uppercase tracking-wide text-brand-amber transition hover:bg-brand-orange hover:text-brand-black"
          >
            Ver avaliações no Google
            <ExternalLink className="h-4 w-4" aria-hidden="true" />
          </a>
        </div>
      </div>
    </section>
  );
}

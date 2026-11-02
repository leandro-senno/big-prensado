import type { Category } from "@/types/catalog";
import { cn } from "@/lib/utils";

import { CategoryIcon } from "./icons";
import { Reveal } from "./Reveal";
import { SectionHeading } from "./SectionHeading";

export function Categories({
  categories,
  onSelect,
}: {
  categories: Category[];
  onSelect: (categoryId: string) => void;
}) {
  if (categories.length === 0) return null;
  return (
    <section aria-labelledby="categorias-title" className="relative bg-brand-black py-16 sm:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeading id="categorias-title" kicker="Escolha sua fome" title="Nosso cardápio" />
        <ul className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 sm:mx-0 sm:grid sm:grid-cols-3 sm:gap-4 sm:overflow-visible sm:px-0 lg:grid-cols-4">
          {categories.map((c, i) => (
            <Reveal
              as="li"
              key={c.id}
              delay={i * 50}
              className="w-[44%] shrink-0 snap-start sm:w-auto"
            >
              <button
                type="button"
                onClick={() => onSelect(c.id)}
                className={cn(
                  "group flex h-full w-full flex-col items-start rounded-2xl border border-white/10 bg-brand-black-2 p-4 text-left transition duration-300 hover:-translate-y-1 hover:border-brand-orange/60 sm:p-5",
                )}
              >
                <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-brand-amber to-brand-orange text-brand-black shadow-lg shadow-brand-orange/20 transition group-hover:scale-110 sm:h-14 sm:w-14">
                  <CategoryIcon icon={c.icon} className="h-6 w-6 sm:h-7 sm:w-7" />
                </span>
                <span className="mt-4 font-display text-lg uppercase leading-tight tracking-wide text-white sm:text-xl">
                  {c.name}
                </span>
                {c.description ? (
                  <span className="mt-1 text-xs text-brand-gray sm:text-sm">{c.description}</span>
                ) : null}
              </button>
            </Reveal>
          ))}
        </ul>
      </div>
    </section>
  );
}

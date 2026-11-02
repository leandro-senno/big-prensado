import type { Product } from "@/types/catalog";

import { ProductCard } from "./ProductCard";
import { Reveal } from "./Reveal";
import { SectionHeading } from "./SectionHeading";

export function Featured({
  products,
  onDetails,
  onAdd,
}: {
  products: Product[];
  onDetails: (p: Product) => void;
  onAdd: (p: Product) => void;
}) {
  if (products.length === 0) return null;
  return (
    <section
      id="mais-pedidos"
      aria-labelledby="mais-pedidos-title"
      className="bg-grill relative bg-brand-black py-16 sm:py-24"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeading
          id="mais-pedidos-title"
          kicker="Mais pedidos"
          title={
            <>
              Os queridinhos <span className="text-gradient-fire">da galera</span>
            </>
          }
        />
        <ul className="-mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-4 sm:mx-0 sm:grid sm:grid-cols-2 sm:overflow-visible sm:px-0 lg:grid-cols-4 lg:gap-6">
          {products.slice(0, 4).map((p, i) => (
            <Reveal
              as="li"
              key={p.id}
              delay={i * 80}
              className="w-[82%] shrink-0 snap-center sm:w-auto"
            >
              <ProductCard product={p} onDetails={onDetails} onAdd={onAdd} variant="featured" />
            </Reveal>
          ))}
        </ul>
      </div>
    </section>
  );
}

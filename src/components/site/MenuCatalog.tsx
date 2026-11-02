import { useMemo } from "react";
import { Search, X } from "lucide-react";

import { cn } from "@/lib/utils";
import type { Category, Product } from "@/types/catalog";

import { ProductCard } from "./ProductCard";
import { SectionHeading } from "./SectionHeading";

function normalize(text: string) {
  return text.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

export function filterProducts(
  products: Product[],
  categoryId: string | null,
  query: string,
): Product[] {
  const q = normalize(query.trim());
  return products.filter((p) => {
    if (categoryId && p.categoryId !== categoryId) return false;
    if (!q) return true;
    return normalize(`${p.name} ${p.ingredients} ${p.description}`).includes(q);
  });
}

export function MenuCatalog({
  categories,
  products,
  activeCategory,
  onCategoryChange,
  query,
  onQueryChange,
  onDetails,
  onAdd,
}: {
  categories: Category[];
  products: Product[];
  activeCategory: string | null;
  onCategoryChange: (id: string | null) => void;
  query: string;
  onQueryChange: (q: string) => void;
  onDetails: (p: Product) => void;
  onAdd: (p: Product) => void;
}) {
  const filtered = useMemo(
    () => filterProducts(products, activeCategory, query),
    [products, activeCategory, query],
  );

  const grouped = useMemo(() => {
    if (activeCategory || query.trim()) return null;
    return categories
      .map((c) => ({ category: c, items: filtered.filter((p) => p.categoryId === c.id) }))
      .filter((g) => g.items.length > 0);
  }, [categories, filtered, activeCategory, query]);

  const chip = (selected: boolean) =>
    cn(
      "inline-flex min-h-10 shrink-0 items-center rounded-full border px-4 text-sm font-semibold transition",
      selected
        ? "border-brand-orange bg-brand-orange text-brand-black"
        : "border-white/15 bg-white/5 text-white hover:border-brand-orange/60 hover:text-brand-amber",
    );

  const renderGrid = (items: Product[]) => (
    <ul className="grid grid-cols-1 gap-4 min-[480px]:grid-cols-2 lg:grid-cols-3 lg:gap-6 xl:grid-cols-4">
      {items.map((p) => (
        <li key={p.id}>
          <ProductCard product={p} onDetails={onDetails} onAdd={onAdd} />
        </li>
      ))}
    </ul>
  );

  return (
    <section
      id="cardapio"
      aria-labelledby="cardapio-title"
      className="bg-brand-black py-16 sm:py-24"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeading
          id="cardapio-title"
          kicker="Cardápio completo"
          title={
            <>
              Monte seu <span className="text-gradient-fire">pedido</span>
            </>
          }
          description="Busque pelo nome ou ingrediente, filtre por categoria e personalize do seu jeito."
        />

        <div className="sticky top-[4.25rem] z-30 -mx-4 mb-8 border-y border-white/5 bg-brand-black/95 px-4 py-3 backdrop-blur-md sm:mx-0 sm:rounded-2xl sm:border sm:px-4">
          <div className="relative">
            <Search
              className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-white/50"
              aria-hidden="true"
            />
            <label htmlFor="busca-cardapio" className="sr-only">
              Buscar no cardápio
            </label>
            <input
              id="busca-cardapio"
              type="search"
              value={query}
              onChange={(e) => onQueryChange(e.target.value)}
              placeholder="Buscar lanche, ingrediente..."
              autoComplete="off"
              className="h-12 w-full rounded-full border border-white/15 bg-brand-black-2 pl-12 pr-12 text-base text-white placeholder:text-white/40 focus:border-brand-orange focus:outline-none"
            />
            {query ? (
              <button
                type="button"
                onClick={() => onQueryChange("")}
                className="absolute right-2 top-1/2 inline-flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full text-white/60 hover:text-white"
                aria-label="Limpar busca"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            ) : null}
          </div>
          <div
            role="group"
            aria-label="Filtrar por categoria"
            className="-mx-4 mt-3 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0"
          >
            <button
              type="button"
              className={chip(activeCategory === null)}
              aria-pressed={activeCategory === null}
              onClick={() => onCategoryChange(null)}
            >
              Todos
            </button>
            {categories.map((c) => (
              <button
                key={c.id}
                type="button"
                className={chip(activeCategory === c.id)}
                aria-pressed={activeCategory === c.id}
                onClick={() => onCategoryChange(c.id)}
              >
                {c.name}
              </button>
            ))}
          </div>
        </div>

        <p className="sr-only" aria-live="polite">
          {filtered.length} {filtered.length === 1 ? "produto encontrado" : "produtos encontrados"}
        </p>

        {filtered.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/15 p-10 text-center">
            <p className="font-display text-2xl uppercase text-white">Nenhum produto encontrado</p>
            <p className="mt-2 text-brand-gray">
              {products.length === 0
                ? "O cardápio está sendo atualizado. Volte em breve!"
                : "Tente outra busca ou veja todas as categorias."}
            </p>
            {products.length > 0 ? (
              <button
                type="button"
                onClick={() => {
                  onQueryChange("");
                  onCategoryChange(null);
                }}
                className="mt-5 inline-flex h-11 items-center rounded-full bg-brand-orange px-6 font-bold text-brand-black"
              >
                Ver tudo
              </button>
            ) : null}
          </div>
        ) : grouped ? (
          <div className="space-y-12">
            {grouped.map((g) => (
              <div key={g.category.id}>
                <h3 className="mb-5 flex items-center gap-3 font-display text-3xl uppercase tracking-wide text-white">
                  {g.category.name}
                  <span
                    className="h-px flex-1 bg-gradient-to-r from-brand-orange/60 to-transparent"
                    aria-hidden="true"
                  />
                </h3>
                {renderGrid(g.items)}
              </div>
            ))}
          </div>
        ) : (
          renderGrid(filtered)
        )}
      </div>
    </section>
  );
}

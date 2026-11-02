import { Eye, ImageOff, Plus } from "lucide-react";

import { formatBRL } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Product } from "@/types/catalog";

import { DemoBadge } from "./PendingBadge";

export function ProductImage({ product, className }: { product: Product; className?: string }) {
  if (!product.imageUrl) {
    return (
      <div
        className={cn(
          "flex items-center justify-center bg-gradient-to-br from-brand-black-2 to-black text-white/30",
          className,
        )}
      >
        <ImageOff className="h-8 w-8" aria-hidden="true" />
        <span className="sr-only">Foto em breve</span>
      </div>
    );
  }
  return (
    <img
      src={product.imageUrl}
      alt={product.name}
      loading="lazy"
      decoding="async"
      width={800}
      height={600}
      className={cn("object-cover", className)}
    />
  );
}

export function ProductCard({
  product,
  onDetails,
  onAdd,
  variant = "default",
}: {
  product: Product;
  onDetails: (product: Product) => void;
  onAdd: (product: Product) => void;
  variant?: "default" | "featured";
}) {
  const soldOut = !product.available;
  return (
    <article
      className={cn(
        "group relative flex h-full flex-col overflow-hidden rounded-2xl border border-white/10 bg-brand-black-2 shadow-lg shadow-black/30 transition duration-300 hover:-translate-y-1 hover:border-brand-orange/50 hover:shadow-brand-orange/10",
        soldOut && "opacity-75",
      )}
    >
      <button
        type="button"
        onClick={() => onDetails(product)}
        className="relative block overflow-hidden text-left"
        aria-label={`Ver detalhes de ${product.name}`}
      >
        <ProductImage
          product={product}
          className={cn(
            "aspect-[4/3] w-full transition duration-500 group-hover:scale-105",
            soldOut && "grayscale",
          )}
        />
        <div className="absolute left-3 top-3 flex flex-wrap gap-1.5">
          {product.badge && !soldOut ? (
            <span className="rounded-full bg-brand-orange px-2.5 py-1 text-[0.7rem] font-bold uppercase tracking-wide text-brand-black shadow">
              {product.badge}
            </span>
          ) : null}
          {soldOut ? (
            <span className="rounded-full bg-black/80 px-2.5 py-1 text-[0.7rem] font-bold uppercase tracking-wide text-white">
              Esgotado
            </span>
          ) : null}
        </div>
        {product.demo ? <DemoBadge className="absolute right-3 top-3" /> : null}
      </button>

      <div className="flex flex-1 flex-col p-4 sm:p-5">
        <h3
          className={cn(
            "font-display uppercase leading-tight tracking-wide text-white",
            variant === "featured" ? "text-2xl" : "text-xl",
          )}
        >
          {product.name}
        </h3>
        {product.ingredients ? (
          <p className="mt-1.5 line-clamp-2 text-sm text-brand-gray">{product.ingredients}</p>
        ) : null}
        <div className="mt-auto pt-4">
          <p className="whitespace-nowrap text-xl font-bold text-brand-amber sm:text-2xl">
            <span className="sr-only">Preço: </span>
            {formatBRL(product.priceCents)}
          </p>
          <div className="mt-3 flex items-center gap-2">
            <button
              type="button"
              onClick={() => onAdd(product)}
              disabled={soldOut}
              className="inline-flex h-11 flex-1 items-center justify-center gap-1.5 rounded-full bg-brand-orange px-4 text-sm font-bold uppercase text-brand-black transition hover:bg-brand-amber disabled:cursor-not-allowed disabled:bg-white/10 disabled:text-white/40"
              aria-label={
                soldOut ? `${product.name} esgotado` : `Adicionar ${product.name} ao carrinho`
              }
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              <span>{soldOut ? "Esgotado" : "Adicionar"}</span>
            </button>
            <button
              type="button"
              onClick={() => onDetails(product)}
              className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-white/15 text-white transition hover:border-brand-amber hover:text-brand-amber"
              aria-label={`Detalhes de ${product.name}`}
              title="Ver detalhes e personalizar"
            >
              <Eye className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}

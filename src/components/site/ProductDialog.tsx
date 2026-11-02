import { useEffect, useState } from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { Check, Minus, Plus, X } from "lucide-react";

import { clampQuantity, itemUnitTotal } from "@/lib/cart";
import { formatBRL } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Product, ProductAddon } from "@/types/catalog";

import { DemoBadge } from "./PendingBadge";
import { ProductImage } from "./ProductCard";

export interface ProductSelection {
  quantity: number;
  addons: ProductAddon[];
  removed: string[];
  notes: string;
}

export function ProductDialog({
  product,
  onClose,
  onConfirm,
}: {
  product: Product | null;
  onClose: () => void;
  onConfirm: (product: Product, selection: ProductSelection) => void;
}) {
  const [quantity, setQuantity] = useState(1);
  const [addonIds, setAddonIds] = useState<string[]>([]);
  const [removed, setRemoved] = useState<string[]>([]);
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (product) {
      setQuantity(1);
      setAddonIds([]);
      setRemoved([]);
      setNotes("");
    }
  }, [product]);

  const open = product !== null;
  const addons = product ? product.addons.filter((a) => addonIds.includes(a.id)) : [];
  const unit = product ? itemUnitTotal({ unitPriceCents: product.priceCents, addons }) : 0;
  const total = unit * quantity;

  const toggle = (list: string[], value: string) =>
    list.includes(value) ? list.filter((v) => v !== value) : [...list, value];

  return (
    <DialogPrimitive.Root open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm data-[state=open]:animate-in data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content
          className="fixed inset-x-0 bottom-0 z-50 flex max-h-[94dvh] flex-col overflow-hidden rounded-t-3xl border border-white/10 bg-brand-black-2 text-white shadow-2xl outline-none data-[state=open]:animate-in data-[state=open]:slide-in-from-bottom-10 sm:inset-auto sm:left-1/2 sm:top-1/2 sm:w-[min(92vw,720px)] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-3xl"
          aria-describedby={product ? "produto-descricao" : undefined}
        >
          {product ? (
            <>
              <div className="overflow-y-auto">
                <div className="relative">
                  <ProductImage
                    product={product}
                    className="aspect-[16/10] w-full sm:aspect-[16/8]"
                  />
                  <div
                    aria-hidden="true"
                    className="absolute inset-0 bg-gradient-to-t from-brand-black-2 via-transparent to-transparent"
                  />
                  {product.demo ? <DemoBadge className="absolute left-4 top-4" /> : null}
                </div>

                <div className="space-y-6 p-5 sm:p-7">
                  <div>
                    <DialogPrimitive.Title className="font-display text-3xl uppercase leading-tight tracking-wide sm:text-4xl">
                      {product.name}
                    </DialogPrimitive.Title>
                    <p className="mt-1 text-2xl font-bold text-brand-amber">
                      {formatBRL(product.priceCents)}
                    </p>
                    <div id="produto-descricao" className="mt-3 space-y-2 text-brand-gray">
                      {product.description ? <p>{product.description}</p> : null}
                      {product.ingredients ? (
                        <p className="text-sm">
                          <span className="font-semibold text-white">Ingredientes: </span>
                          {product.ingredients}
                        </p>
                      ) : null}
                      {product.demo ? (
                        <p className="text-xs text-brand-amber">
                          Produto demonstrativo: nome, receita e preço ainda serão confirmados.
                        </p>
                      ) : null}
                    </div>
                  </div>

                  {!product.available ? (
                    <p className="rounded-xl border border-white/10 bg-black/40 p-4 text-center font-semibold">
                      Este produto está esgotado no momento.
                    </p>
                  ) : (
                    <>
                      {product.addons.length > 0 ? (
                        <fieldset>
                          <legend className="mb-3 font-display text-xl uppercase tracking-wide">
                            Adicionais
                          </legend>
                          <div className="grid gap-2 sm:grid-cols-2">
                            {product.addons.map((a) => {
                              const checked = addonIds.includes(a.id);
                              return (
                                <label
                                  key={a.id}
                                  className={cn(
                                    "flex min-h-12 cursor-pointer items-center justify-between gap-3 rounded-xl border px-4 py-2 transition",
                                    checked
                                      ? "border-brand-orange bg-brand-orange/10"
                                      : "border-white/10 hover:border-white/30",
                                  )}
                                >
                                  <span className="flex items-center gap-3">
                                    <input
                                      type="checkbox"
                                      className="peer sr-only"
                                      checked={checked}
                                      onChange={() => setAddonIds((l) => toggle(l, a.id))}
                                    />
                                    <span
                                      aria-hidden="true"
                                      className={cn(
                                        "flex h-5 w-5 items-center justify-center rounded border peer-focus-visible:ring-2 peer-focus-visible:ring-brand-amber",
                                        checked
                                          ? "border-brand-orange bg-brand-orange text-brand-black"
                                          : "border-white/30",
                                      )}
                                    >
                                      {checked ? <Check className="h-3.5 w-3.5" /> : null}
                                    </span>
                                    <span className="text-sm font-medium">{a.name}</span>
                                  </span>
                                  <span className="text-sm text-brand-amber">
                                    + {formatBRL(a.priceCents)}
                                  </span>
                                </label>
                              );
                            })}
                          </div>
                        </fieldset>
                      ) : null}

                      {product.removableIngredients.length > 0 ? (
                        <fieldset>
                          <legend className="mb-3 font-display text-xl uppercase tracking-wide">
                            Quer tirar algo?
                          </legend>
                          <div className="flex flex-wrap gap-2">
                            {product.removableIngredients.map((ing) => {
                              const isRemoved = removed.includes(ing);
                              return (
                                <button
                                  key={ing}
                                  type="button"
                                  aria-pressed={isRemoved}
                                  onClick={() => setRemoved((l) => toggle(l, ing))}
                                  className={cn(
                                    "inline-flex min-h-10 items-center gap-1.5 rounded-full border px-4 text-sm transition",
                                    isRemoved
                                      ? "border-red-400/60 bg-red-500/10 text-red-200 line-through"
                                      : "border-white/15 text-white hover:border-white/40",
                                  )}
                                >
                                  {isRemoved ? "Sem " : ""}
                                  {ing}
                                </button>
                              );
                            })}
                          </div>
                        </fieldset>
                      ) : null}

                      <div>
                        <label
                          htmlFor="obs-produto"
                          className="mb-2 block font-display text-xl uppercase tracking-wide"
                        >
                          Observação
                        </label>
                        <textarea
                          id="obs-produto"
                          value={notes}
                          onChange={(e) => setNotes(e.target.value.slice(0, 200))}
                          rows={2}
                          maxLength={200}
                          placeholder="Ex.: carne bem passada, molho à parte..."
                          className="w-full resize-none rounded-xl border border-white/15 bg-brand-black px-4 py-3 text-base text-white placeholder:text-white/40 focus:border-brand-orange focus:outline-none"
                        />
                      </div>
                    </>
                  )}
                </div>
              </div>

              {product.available ? (
                <div className="flex items-center gap-3 border-t border-white/10 bg-brand-black-2 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:p-5">
                  <div
                    className="flex items-center rounded-full border border-white/15"
                    role="group"
                    aria-label="Quantidade"
                  >
                    <button
                      type="button"
                      onClick={() => setQuantity((q) => clampQuantity(q - 1))}
                      disabled={quantity <= 1}
                      className="inline-flex h-12 w-12 items-center justify-center rounded-full text-white disabled:opacity-30"
                      aria-label="Diminuir quantidade"
                    >
                      <Minus className="h-4 w-4" aria-hidden="true" />
                    </button>
                    <span className="w-8 text-center text-lg font-bold" aria-live="polite">
                      {quantity}
                    </span>
                    <button
                      type="button"
                      onClick={() => setQuantity((q) => clampQuantity(q + 1))}
                      className="inline-flex h-12 w-12 items-center justify-center rounded-full text-white"
                      aria-label="Aumentar quantidade"
                    >
                      <Plus className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => onConfirm(product, { quantity, addons, removed, notes })}
                    className="glow-orange flex h-12 flex-1 items-center justify-between gap-2 rounded-full bg-brand-orange px-5 font-bold uppercase text-brand-black transition hover:bg-brand-amber"
                  >
                    <span className="whitespace-nowrap">Adicionar</span>
                    <span className="whitespace-nowrap">{formatBRL(total)}</span>
                  </button>
                </div>
              ) : null}

              <DialogPrimitive.Close
                className="absolute right-3 top-3 inline-flex h-11 w-11 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur transition hover:bg-black"
                aria-label="Fechar"
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </DialogPrimitive.Close>
            </>
          ) : (
            <DialogPrimitive.Title className="sr-only">Produto</DialogPrimitive.Title>
          )}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

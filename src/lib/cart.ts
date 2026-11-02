import type { ProductAddon } from "@/types/catalog";

/** Item do carrinho com todas as escolhas do cliente. */
export interface CartItem {
  /** Chave única da linha (produto + personalização). */
  key: string;
  productId: string;
  name: string;
  imageUrl: string | null;
  unitPriceCents: number;
  quantity: number;
  addons: ProductAddon[];
  removed: string[];
  notes: string;
}

export const MAX_QUANTITY = 50;

export function clampQuantity(q: number): number {
  if (!Number.isFinite(q)) return 1;
  return Math.min(MAX_QUANTITY, Math.max(1, Math.round(q)));
}

export function buildItemKey(
  productId: string,
  addons: ProductAddon[],
  removed: string[],
  notes: string,
): string {
  const a = addons
    .map((x) => x.id)
    .sort()
    .join(",");
  const r = [...removed].sort().join(",");
  return `${productId}|${a}|${r}|${notes.trim().toLowerCase()}`;
}

export function itemUnitTotal(item: Pick<CartItem, "unitPriceCents" | "addons">): number {
  return item.unitPriceCents + item.addons.reduce((sum, a) => sum + a.priceCents, 0);
}

export function itemTotal(item: Pick<CartItem, "unitPriceCents" | "addons" | "quantity">): number {
  return itemUnitTotal(item) * item.quantity;
}

export function cartSubtotal(items: CartItem[]): number {
  return items.reduce((sum, i) => sum + itemTotal(i), 0);
}

export function cartCount(items: CartItem[]): number {
  return items.reduce((sum, i) => sum + i.quantity, 0);
}

export function discountCents(subtotal: number, percent: number | null): number {
  if (!percent || percent <= 0) return 0;
  const p = Math.min(100, percent);
  return Math.round((subtotal * p) / 100);
}

/** Identificador curto e legível para o pedido, ex.: BP-7K3F9Q */
export function generateOrderId(now: number = Date.now(), rand: number = Math.random()): string {
  const t = now.toString(36).slice(-4).toUpperCase();
  const r = Math.floor(rand * 36 * 36)
    .toString(36)
    .padStart(2, "0")
    .toUpperCase();
  return `BP-${t}${r}`;
}

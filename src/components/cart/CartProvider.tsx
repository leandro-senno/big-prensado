import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { buildItemKey, cartCount, cartSubtotal, clampQuantity, type CartItem } from "@/lib/cart";
import type { Product, ProductAddon } from "@/types/catalog";

const STORAGE_KEY = "bp-cart-v1";

export interface AddToCartInput {
  product: Product;
  quantity: number;
  addons: ProductAddon[];
  removed: string[];
  notes: string;
}

interface CartContextValue {
  items: CartItem[];
  count: number;
  subtotalCents: number;
  isOpen: boolean;
  /** Incrementa a cada inclusão — usado para animar o contador. */
  bumpKey: number;
  open: () => void;
  close: () => void;
  setOpen: (open: boolean) => void;
  add: (input: AddToCartInput) => void;
  setQuantity: (key: string, quantity: number) => void;
  removeAddon: (key: string, addonId: string) => void;
  remove: (key: string) => void;
  clear: () => void;
}

const CartContext = createContext<CartContextValue | null>(null);

function isCartItem(v: unknown): v is CartItem {
  if (!v || typeof v !== "object") return false;
  const o = v as Record<string, unknown>;
  return (
    typeof o["key"] === "string" &&
    typeof o["productId"] === "string" &&
    typeof o["name"] === "string" &&
    typeof o["unitPriceCents"] === "number" &&
    typeof o["quantity"] === "number" &&
    Array.isArray(o["addons"]) &&
    Array.isArray(o["removed"]) &&
    typeof o["notes"] === "string"
  );
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [isOpen, setOpen] = useState(false);
  const [bumpKey, setBumpKey] = useState(0);

  // Restaura o carrinho salvo (somente no navegador).
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed: unknown = JSON.parse(raw);
        if (Array.isArray(parsed)) setItems(parsed.filter(isCartItem));
      }
    } catch {
      // armazenamento indisponível
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {
      // armazenamento indisponível
    }
  }, [items, hydrated]);

  const add = useCallback((input: AddToCartInput) => {
    const { product } = input;
    if (!product.available) return;
    const notes = input.notes.trim().slice(0, 200);
    const key = buildItemKey(product.id, input.addons, input.removed, notes);
    setItems((prev) => {
      const existing = prev.find((i) => i.key === key);
      if (existing) {
        return prev.map((i) =>
          i.key === key ? { ...i, quantity: clampQuantity(i.quantity + input.quantity) } : i,
        );
      }
      return [
        ...prev,
        {
          key,
          productId: product.id,
          name: product.name,
          imageUrl: product.imageUrl,
          unitPriceCents: product.priceCents,
          quantity: clampQuantity(input.quantity),
          addons: input.addons,
          removed: input.removed,
          notes,
        },
      ];
    });
    setBumpKey((k) => k + 1);
  }, []);

  const setQuantity = useCallback((key: string, quantity: number) => {
    setItems((prev) =>
      quantity <= 0
        ? prev.filter((i) => i.key !== key)
        : prev.map((i) => (i.key === key ? { ...i, quantity: clampQuantity(quantity) } : i)),
    );
  }, []);

  const removeAddon = useCallback((key: string, addonId: string) => {
    setItems((prev) => {
      const target = prev.find((i) => i.key === key);
      if (!target) return prev;
      const addons = target.addons.filter((a) => a.id !== addonId);
      const newKey = buildItemKey(target.productId, addons, target.removed, target.notes);
      const updated: CartItem = { ...target, addons, key: newKey };
      const merged = prev.find((i) => i.key === newKey && i !== target);
      if (merged) {
        return prev
          .filter((i) => i !== target)
          .map((i) =>
            i === merged ? { ...i, quantity: clampQuantity(i.quantity + target.quantity) } : i,
          );
      }
      return prev.map((i) => (i === target ? updated : i));
    });
  }, []);

  const remove = useCallback((key: string) => {
    setItems((prev) => prev.filter((i) => i.key !== key));
  }, []);

  const clear = useCallback(() => setItems([]), []);

  const value = useMemo<CartContextValue>(
    () => ({
      items,
      count: cartCount(items),
      subtotalCents: cartSubtotal(items),
      isOpen,
      bumpKey,
      open: () => setOpen(true),
      close: () => setOpen(false),
      setOpen,
      add,
      setQuantity,
      removeAddon,
      remove,
      clear,
    }),
    [items, isOpen, bumpKey, add, setQuantity, removeAddon, remove, clear],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart deve ser usado dentro de <CartProvider>");
  return ctx;
}

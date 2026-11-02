/**
 * Tipos do domínio do cardápio. Valores monetários sempre em centavos (inteiros)
 * para evitar erros de arredondamento.
 */

export type CategoryIcon =
  "prensado" | "hamburguer" | "hotdog" | "pastel" | "combo" | "porcao" | "bebida" | "sobremesa";

export interface Category {
  id: string;
  slug: string;
  name: string;
  description: string;
  icon: CategoryIcon;
  sortOrder: number;
  active: boolean;
}

export interface ProductAddon {
  id: string;
  name: string;
  priceCents: number;
}

export interface Product {
  id: string;
  categoryId: string;
  name: string;
  description: string;
  /** Ingredientes exibidos no card, separados por vírgula. */
  ingredients: string;
  priceCents: number;
  imageUrl: string | null;
  available: boolean;
  featured: boolean;
  /** Selo opcional, ex.: "Mais pedido". */
  badge: string | null;
  sortOrder: number;
  active: boolean;
  addons: ProductAddon[];
  /** Ingredientes que o cliente pode pedir para retirar. */
  removableIngredients: string[];
  /** true quando o item é apenas demonstrativo (não é oferta real). */
  demo?: boolean;
}

export interface Promotion {
  id: string;
  title: string;
  subtitle: string;
  couponCode: string | null;
  discountPercent: number | null;
  active: boolean;
  startsAt: string | null;
  endsAt: string | null;
}

export interface GalleryImage {
  id: string;
  url: string;
  alt: string;
  sortOrder: number;
  demo?: boolean;
}

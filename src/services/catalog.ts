import { DEFAULT_SETTINGS, parseSettings, type SiteSettings } from "@/config/settings";
import { DEMO_CATEGORIES, DEMO_GALLERY, DEMO_PRODUCTS, DEMO_PROMOTIONS } from "@/data/demo";
import { dbSelect, isSupabaseConfigured } from "@/lib/supabase";
import type {
  Category,
  CategoryIcon,
  GalleryImage,
  Product,
  ProductAddon,
  Promotion,
} from "@/types/catalog";

/* ----------------------------------------------------------------------------
 * Linhas do banco (snake_case) e conversão para o domínio
 * ------------------------------------------------------------------------- */

export interface CategoryRow {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  icon: string | null;
  sort_order: number;
  active: boolean;
}

export interface ProductRow {
  id: string;
  category_id: string;
  name: string;
  description: string | null;
  ingredients: string | null;
  price_cents: number;
  image_url: string | null;
  available: boolean;
  featured: boolean;
  badge: string | null;
  sort_order: number;
  active: boolean;
  addons: unknown;
  removable_ingredients: string[] | null;
}

export interface PromotionRow {
  id: string;
  title: string;
  subtitle: string | null;
  coupon_code: string | null;
  discount_percent: number | null;
  active: boolean;
  starts_at: string | null;
  ends_at: string | null;
}

export interface GalleryRow {
  id: string;
  url: string;
  alt: string | null;
  sort_order: number;
}

const ICONS: CategoryIcon[] = [
  "prensado",
  "hamburguer",
  "hotdog",
  "pastel",
  "combo",
  "porcao",
  "bebida",
  "sobremesa",
];

export function toCategory(r: CategoryRow): Category {
  const icon = ICONS.includes(r.icon as CategoryIcon) ? (r.icon as CategoryIcon) : "prensado";
  return {
    id: r.id,
    slug: r.slug,
    name: r.name,
    description: r.description ?? "",
    icon,
    sortOrder: r.sort_order,
    active: r.active,
  };
}

function toAddons(raw: unknown): ProductAddon[] {
  if (!Array.isArray(raw)) return [];
  const out: ProductAddon[] = [];
  raw.forEach((a, i) => {
    if (!a || typeof a !== "object") return;
    const o = a as Record<string, unknown>;
    const name = typeof o["name"] === "string" ? o["name"].trim() : "";
    const price =
      typeof o["priceCents"] === "number" ? Math.max(0, Math.round(o["priceCents"])) : 0;
    if (!name) return;
    out.push({ id: typeof o["id"] === "string" ? o["id"] : `addon-${i}`, name, priceCents: price });
  });
  return out;
}

export function toProduct(r: ProductRow): Product {
  return {
    id: r.id,
    categoryId: r.category_id,
    name: r.name,
    description: r.description ?? "",
    ingredients: r.ingredients ?? "",
    priceCents: r.price_cents,
    imageUrl: r.image_url,
    available: r.available,
    featured: r.featured,
    badge: r.badge,
    sortOrder: r.sort_order,
    active: r.active,
    addons: toAddons(r.addons),
    removableIngredients: (r.removable_ingredients ?? []).filter(Boolean),
  };
}

export function toPromotion(r: PromotionRow): Promotion {
  return {
    id: r.id,
    title: r.title,
    subtitle: r.subtitle ?? "",
    couponCode: r.coupon_code,
    discountPercent: r.discount_percent,
    active: r.active,
    startsAt: r.starts_at,
    endsAt: r.ends_at,
  };
}

export function toGallery(r: GalleryRow): GalleryImage {
  return { id: r.id, url: r.url, alt: r.alt ?? "", sortOrder: r.sort_order };
}

/** Promoção vale somente se estiver ativa e dentro do período. */
export function isPromotionLive(p: Promotion, now: Date = new Date()): boolean {
  if (!p.active) return false;
  if (p.startsAt && new Date(p.startsAt) > now) return false;
  if (p.endsAt && new Date(p.endsAt) < now) return false;
  return true;
}

/* ----------------------------------------------------------------------------
 * Carregamento do catálogo público
 * ------------------------------------------------------------------------- */

export type CatalogSource = "database" | "demo";

export interface Catalog {
  source: CatalogSource;
  /** Preenchido quando o banco está configurado mas não respondeu. */
  error: string | null;
  settings: SiteSettings;
  categories: Category[];
  products: Product[];
  promotions: Promotion[];
  gallery: GalleryImage[];
}

function demoCatalog(error: string | null = null): Catalog {
  return {
    source: "demo",
    error,
    settings: DEFAULT_SETTINGS,
    categories: DEMO_CATEGORIES,
    products: DEMO_PRODUCTS,
    promotions: DEMO_PROMOTIONS,
    gallery: DEMO_GALLERY,
  };
}

export async function loadCatalog(): Promise<Catalog> {
  if (!isSupabaseConfigured) return demoCatalog();

  try {
    const [settingsRows, categoryRows, productRows, promotionRows, galleryRows] = await Promise.all(
      [
        dbSelect<{ data: unknown }>("site_settings", "select=data&id=eq.1"),
        dbSelect<CategoryRow>("categories", "select=*&active=eq.true&order=sort_order.asc"),
        dbSelect<ProductRow>("products", "select=*&active=eq.true&order=sort_order.asc,name.asc"),
        dbSelect<PromotionRow>("promotions", "select=*&active=eq.true&order=created_at.desc"),
        dbSelect<GalleryRow>("gallery_images", "select=*&order=sort_order.asc"),
      ],
    );

    return {
      source: "database",
      error: null,
      settings: parseSettings(settingsRows[0]?.data),
      categories: categoryRows.map(toCategory),
      products: productRows.map(toProduct),
      promotions: promotionRows.map(toPromotion).filter((p) => isPromotionLive(p)),
      gallery: galleryRows.map(toGallery),
    };
  } catch (err) {
    console.warn("[catalog] Falha ao carregar do banco; exibindo dados demonstrativos.", err);
    return demoCatalog("Não foi possível carregar o cardápio atualizado.");
  }
}

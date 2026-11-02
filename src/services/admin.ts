import { z } from "zod";

import { parseSettings, settingsSchema, type SiteSettings } from "@/config/settings";
import { dbDelete, dbInsert, dbRpc, dbSelect, dbUpdate, dbUpsert } from "@/lib/supabase";
import type { Category, GalleryImage, Product, Promotion } from "@/types/catalog";

import {
  toCategory,
  toGallery,
  toProduct,
  toPromotion,
  type CategoryRow,
  type GalleryRow,
  type ProductRow,
  type PromotionRow,
} from "./catalog";

/* ----------------------------------------------------------------------------
 * Validação (o banco também valida com CHECK constraints e RLS)
 * ------------------------------------------------------------------------- */

const httpsOrEmpty = z
  .string()
  .trim()
  .refine((v) => v === "" || /^https:\/\/[^\s]+$/i.test(v), "A imagem precisa de um link https://");

export const productInputSchema = z.object({
  name: z.string().trim().min(1, "Informe o nome.").max(80),
  categoryId: z.string().min(1, "Escolha a categoria."),
  description: z.string().trim().max(400),
  ingredients: z.string().trim().max(300),
  priceCents: z.number().int().min(0, "Preço inválido.").max(1_000_000),
  imageUrl: httpsOrEmpty,
  available: z.boolean(),
  featured: z.boolean(),
  badge: z.string().trim().max(24),
  sortOrder: z.number().int().min(-9999).max(9999),
  active: z.boolean(),
  addons: z
    .array(
      z.object({
        id: z.string().min(1),
        name: z.string().trim().min(1, "Nome do adicional obrigatório.").max(60),
        priceCents: z.number().int().min(0).max(100_000),
      }),
    )
    .max(30),
  removableIngredients: z.array(z.string().trim().min(1).max(40)).max(20),
});

export type ProductInput = z.infer<typeof productInputSchema>;

export const categoryInputSchema = z.object({
  name: z.string().trim().min(1, "Informe o nome.").max(60),
  slug: z
    .string()
    .trim()
    .regex(/^[a-z0-9-]{1,60}$/, "Use apenas letras minúsculas, números e hífen."),
  description: z.string().trim().max(160),
  icon: z.enum([
    "prensado",
    "hamburguer",
    "hotdog",
    "pastel",
    "combo",
    "porcao",
    "bebida",
    "sobremesa",
  ]),
  sortOrder: z.number().int().min(-9999).max(9999),
  active: z.boolean(),
});

export type CategoryInput = z.infer<typeof categoryInputSchema>;

export const promotionInputSchema = z
  .object({
    title: z.string().trim().min(1, "Informe o título.").max(80),
    subtitle: z.string().trim().max(200),
    couponCode: z
      .string()
      .trim()
      .toUpperCase()
      .refine(
        (v) => v === "" || /^[A-Z0-9_-]{3,20}$/.test(v),
        "Cupom: 3 a 20 letras/números, sem espaços.",
      ),
    discountPercent: z.number().int().min(1).max(90).nullable(),
    active: z.boolean(),
    startsAt: z.string(),
    endsAt: z.string(),
  })
  .refine((v) => !v.startsAt || !v.endsAt || new Date(v.endsAt) > new Date(v.startsAt), {
    message: "O fim precisa ser depois do início.",
    path: ["endsAt"],
  });

export type PromotionInput = z.infer<typeof promotionInputSchema>;

/* ----------------------------------------------------------------------------
 * Acesso
 * ------------------------------------------------------------------------- */

export async function checkIsAdmin(): Promise<boolean> {
  try {
    return (await dbRpc<boolean>("is_admin")) === true;
  } catch {
    return false;
  }
}

/* ----------------------------------------------------------------------------
 * Leitura (admin vê também itens inativos)
 * ------------------------------------------------------------------------- */

export async function adminLoadAll() {
  const [cats, prods, promos, gallery, settings] = await Promise.all([
    dbSelect<CategoryRow>("categories", "select=*&order=sort_order.asc", true),
    dbSelect<ProductRow>("products", "select=*&order=sort_order.asc,name.asc", true),
    dbSelect<PromotionRow>("promotions", "select=*&order=created_at.desc", true),
    dbSelect<GalleryRow>("gallery_images", "select=*&order=sort_order.asc", true),
    dbSelect<{ data: unknown }>("site_settings", "select=data&id=eq.1", true),
  ]);
  return {
    categories: cats.map(toCategory),
    products: prods.map(toProduct),
    promotions: promos.map(toPromotion),
    gallery: gallery.map(toGallery),
    settings: parseSettings(settings[0]?.data),
  };
}

/* ----------------------------------------------------------------------------
 * Escrita
 * ------------------------------------------------------------------------- */

const enc = encodeURIComponent;

function productRow(p: ProductInput) {
  return {
    name: p.name,
    category_id: p.categoryId,
    description: p.description || null,
    ingredients: p.ingredients || null,
    price_cents: p.priceCents,
    image_url: p.imageUrl || null,
    available: p.available,
    featured: p.featured,
    badge: p.badge || null,
    sort_order: p.sortOrder,
    active: p.active,
    addons: p.addons,
    removable_ingredients: p.removableIngredients,
  };
}

export async function saveProduct(id: string | null, input: ProductInput): Promise<Product> {
  const row = productRow(productInputSchema.parse(input));
  const rows = id
    ? await dbUpdate<ProductRow>("products", `id=eq.${enc(id)}`, row)
    : await dbInsert<ProductRow>("products", row);
  const saved = rows[0];
  if (!saved) throw new Error("Produto não foi salvo.");
  return toProduct(saved);
}

export async function patchProduct(
  id: string,
  patch: Partial<Pick<ProductRow, "available" | "featured" | "active">>,
) {
  const rows = await dbUpdate<ProductRow>("products", `id=eq.${enc(id)}`, patch);
  const saved = rows[0];
  if (!saved) throw new Error("Produto não foi atualizado.");
  return toProduct(saved);
}

export const deleteProduct = (id: string) => dbDelete("products", `id=eq.${enc(id)}`);

export async function saveCategory(id: string | null, input: CategoryInput): Promise<Category> {
  const c = categoryInputSchema.parse(input);
  const row = {
    name: c.name,
    slug: c.slug,
    description: c.description || null,
    icon: c.icon,
    sort_order: c.sortOrder,
    active: c.active,
  };
  const rows = id
    ? await dbUpdate<CategoryRow>("categories", `id=eq.${enc(id)}`, row)
    : await dbInsert<CategoryRow>("categories", row);
  const saved = rows[0];
  if (!saved) throw new Error("Categoria não foi salva.");
  return toCategory(saved);
}

export const deleteCategory = (id: string) => dbDelete("categories", `id=eq.${enc(id)}`);

export async function savePromotion(id: string | null, input: PromotionInput): Promise<Promotion> {
  const p = promotionInputSchema.parse(input);
  const row = {
    title: p.title,
    subtitle: p.subtitle || null,
    coupon_code: p.couponCode || null,
    discount_percent: p.discountPercent,
    active: p.active,
    starts_at: p.startsAt ? new Date(p.startsAt).toISOString() : null,
    ends_at: p.endsAt ? new Date(p.endsAt).toISOString() : null,
  };
  const rows = id
    ? await dbUpdate<PromotionRow>("promotions", `id=eq.${enc(id)}`, row)
    : await dbInsert<PromotionRow>("promotions", row);
  const saved = rows[0];
  if (!saved) throw new Error("Promoção não foi salva.");
  return toPromotion(saved);
}

export const deletePromotion = (id: string) => dbDelete("promotions", `id=eq.${enc(id)}`);

export async function addGalleryImage(
  url: string,
  alt: string,
  sortOrder: number,
): Promise<GalleryImage> {
  const parsed = z
    .object({
      url: z.string().regex(/^https:\/\//),
      alt: z.string().trim().max(160),
      sortOrder: z.number().int(),
    })
    .parse({ url, alt, sortOrder });
  const rows = await dbInsert<GalleryRow>("gallery_images", {
    url: parsed.url,
    alt: parsed.alt || null,
    sort_order: parsed.sortOrder,
  });
  const saved = rows[0];
  if (!saved) throw new Error("Imagem não foi salva.");
  return toGallery(saved);
}

export async function updateGalleryImage(id: string, alt: string, sortOrder: number) {
  await dbUpdate<GalleryRow>("gallery_images", `id=eq.${enc(id)}`, {
    alt: alt.trim().slice(0, 160) || null,
    sort_order: Math.round(sortOrder) || 0,
  });
}

export const deleteGalleryImage = (id: string) => dbDelete("gallery_images", `id=eq.${enc(id)}`);

export async function saveSettings(settings: SiteSettings): Promise<SiteSettings> {
  const data = settingsSchema.parse(settings);
  const rows = await dbUpsert<{ data: unknown }>("site_settings", { id: 1, data });
  return parseSettings(rows[0]?.data ?? data);
}

import { z } from "zod";

/**
 * Configurações comerciais do Big Lanche.
 *
 * IMPORTANTE: as informações abaixo foram encontradas na ficha "Big Lanches"
 * do Google Maps indicada pelo cliente e AINDA NÃO FORAM CONFIRMADAS. Por isso
 * todos os campos com `confirmed: false` aparecem no site como "em validação".
 * Quando o banco de dados estiver configurado, estes valores são substituídos
 * pelos salvos no painel administrativo (/admin).
 */

const httpsUrl = z
  .string()
  .trim()
  .max(500)
  .refine((v) => v === "" || /^https:\/\/[^\s]+$/i.test(v), "Use um link que comece com https://");

export const hourSchema = z.object({
  label: z.string().trim().min(1).max(40),
  value: z.string().trim().min(1).max(60),
});

export const settingsSchema = z.object({
  businessName: z.string().trim().min(1).max(80),
  shortDescription: z.string().trim().max(240),
  address: z.object({
    street: z.string().trim().max(120),
    district: z.string().trim().max(80),
    city: z.string().trim().max(80),
    state: z.string().trim().max(2),
    zip: z.string().trim().max(10),
    confirmed: z.boolean(),
  }),
  phone: z.object({
    display: z.string().trim().max(30),
    confirmed: z.boolean(),
  }),
  /** Apenas dígitos, com DDI 55. Vazio = nenhum WhatsApp cadastrado. */
  whatsapp: z
    .string()
    .trim()
    .refine(
      (v) => v === "" || /^55\d{10,11}$/.test(v),
      "Use DDI + DDD + número, ex.: 5511999998888",
    ),
  mapsUrl: httpsUrl,
  reviewsUrl: httpsUrl,
  hours: z.array(hourSchema).max(10),
  hoursConfirmed: z.boolean(),
  service: z.object({
    delivery: z.boolean(),
    pickup: z.boolean(),
    /** Taxa fixa de entrega em centavos. null = sem regra configurada. */
    deliveryFeeCents: z.number().int().min(0).max(100000).nullable(),
    notes: z.string().trim().max(240),
    confirmed: z.boolean(),
  }),
  paymentMethods: z.array(z.string().trim().min(1).max(40)).max(10),
  orders: z.object({
    /** Recebe pedidos só pelo painel quando ainda não há WhatsApp cadastrado. */
    acceptWithoutWhatsapp: z.boolean(),
  }),
  social: z.object({
    instagram: httpsUrl,
    facebook: httpsUrl,
    tiktok: httpsUrl,
  }),
  hero: z.object({
    kicker: z.string().trim().max(60),
    title: z.string().trim().max(80),
    highlight: z.string().trim().max(40),
    subtitle: z.string().trim().max(200),
    imageUrl: httpsUrl,
  }),
  promoBanner: z.object({
    title: z.string().trim().max(80),
    subtitle: z.string().trim().max(200),
    imageUrl: httpsUrl,
  }),
  about: z.object({
    title: z.string().trim().max(80),
    text: z.string().trim().max(1200),
    imageUrl: httpsUrl,
  }),
});

export type SiteSettings = z.infer<typeof settingsSchema>;

/** Imagens ilustrativas (Unsplash License) usadas até o envio das fotos reais. */
export const ILLUSTRATIVE_IMAGES = {
  hero: "https://images.unsplash.com/photo-1440427810006-0e4109fd4abe?auto=format&fit=crop&w=1400&q=75",
  promo:
    "https://images.unsplash.com/photo-1551782450-a2132b4ba21d?auto=format&fit=crop&w=1000&q=70",
  about:
    "https://images.unsplash.com/photo-1475090169767-40ed8d18f67d?auto=format&fit=crop&w=1000&q=70",
} as const;

export const MAPS_REFERENCE_URL = "https://maps.app.goo.gl/WcneQXVzDAEFueVd7";

export const DEFAULT_SETTINGS: SiteSettings = {
  businessName: "Big Lanche",
  shortDescription:
    "Lanches prensados caprichados, hambúrgueres, pastéis e muito sabor. Peça agora e mate a fome do jeito certo.",
  address: {
    street: "Estrada dos Pinheiros, 376",
    district: "Parque Viana",
    city: "Barueri",
    state: "SP",
    zip: "06449-000",
    confirmed: false,
  },
  phone: { display: "(11) 4162-1591", confirmed: false },
  // Não presumir que o telefone fixo é WhatsApp: fica vazio até o cadastro oficial.
  whatsapp: "",
  mapsUrl: MAPS_REFERENCE_URL,
  reviewsUrl: MAPS_REFERENCE_URL,
  hours: [],
  hoursConfirmed: false,
  service: {
    delivery: true,
    pickup: true,
    deliveryFeeCents: null,
    notes: "",
    confirmed: false,
  },
  paymentMethods: [],
  orders: { acceptWithoutWhatsapp: false },
  social: { instagram: "", facebook: "", tiktok: "" },
  hero: {
    kicker: "Bateu aquela fome?",
    title: "O tamanho da sua fome tem nome.",
    highlight: "Big Lanche!",
    subtitle: "Lanches caprichados, muito recheio e aquele sabor que dá vontade de repetir.",
    imageUrl: ILLUSTRATIVE_IMAGES.hero,
  },
  promoBanner: {
    title: "Bateu a fome? A gente resolve!",
    subtitle: "Escolha seu favorito e prepare-se para uma experiência de dar água na boca.",
    imageUrl: ILLUSTRATIVE_IMAGES.promo,
  },
  about: {
    title: "Feito na chapa, do jeito que tem que ser",
    text: "No Big Lanche, lanche é coisa séria: pão tostadinho na prensa, recheio generoso e queijo derretendo em cada mordida. A ideia é simples: comida bem feita, servida quentinha, para você matar a fome com vontade.\n\nDo clássico prensado aos hambúrgueres, pastéis e porções, a proposta é sempre a mesma: lanche caprichado, com aquele cuidado que faz diferença.",
    imageUrl: ILLUSTRATIVE_IMAGES.about,
  },
};

/**
 * Mescla dados vindos do banco com os padrões e valida.
 * Campos inválidos ou ausentes voltam para o valor padrão.
 */
export function parseSettings(raw: unknown): SiteSettings {
  if (!raw || typeof raw !== "object") return DEFAULT_SETTINGS;
  const r = raw as Record<string, unknown>;
  const merged: Record<string, unknown> = { ...DEFAULT_SETTINGS };
  for (const key of Object.keys(DEFAULT_SETTINGS) as (keyof SiteSettings)[]) {
    const def = DEFAULT_SETTINGS[key];
    const val = r[key];
    if (val === undefined) continue;
    if (def && typeof def === "object" && !Array.isArray(def) && val && typeof val === "object") {
      merged[key] = { ...def, ...(val as object) };
    } else {
      merged[key] = val;
    }
  }
  const parsed = settingsSchema.safeParse(merged);
  if (parsed.success) return parsed.data;

  // Recupera campo a campo, descartando apenas o que estiver inválido.
  const shape = settingsSchema.shape;
  const safe: Record<string, unknown> = {};
  for (const key of Object.keys(shape) as (keyof SiteSettings)[]) {
    const one = shape[key].safeParse(merged[key]);
    safe[key] = one.success ? one.data : DEFAULT_SETTINGS[key];
  }
  return safe as SiteSettings;
}

export function formatAddress(a: SiteSettings["address"]): string {
  const line1 = [a.street, a.district].filter(Boolean).join(", ");
  const cityState = [a.city, a.state].filter(Boolean).join(" – ");
  return [line1, cityState, a.zip ? `CEP ${a.zip}` : ""].filter(Boolean).join(", ");
}

export function phoneToTel(display: string): string {
  const digits = display.replace(/\D/g, "");
  if (!digits) return "";
  return digits.startsWith("55") ? `+${digits}` : `+55${digits}`;
}

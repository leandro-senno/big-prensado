import { describe, expect, it } from "vitest";

import { DEFAULT_SETTINGS, parseSettings } from "@/config/settings";
import { filterProducts } from "@/components/site/MenuCatalog";
import { DEMO_PRODUCTS } from "@/data/demo";
import {
  buildItemKey,
  cartCount,
  cartSubtotal,
  clampQuantity,
  discountCents,
  generateOrderId,
  itemTotal,
  type CartItem,
} from "@/lib/cart";
import { formatBRL, parseBRLToCents } from "@/lib/format";
import { buildOrderMessage, buildWhatsAppUrl, normalizeWhatsapp } from "@/lib/whatsapp";
import { isPromotionLive } from "@/services/catalog";

const bacon = { id: "a1", name: "Bacon extra", priceCents: 500 };
const queijo = { id: "a2", name: "Queijo extra", priceCents: 400 };

function item(overrides: Partial<CartItem> = {}): CartItem {
  return {
    key: "k",
    productId: "p1",
    name: "Big Brasil Prensado",
    imageUrl: null,
    unitPriceCents: 3290,
    quantity: 2,
    addons: [bacon],
    removed: ["Tomate"],
    notes: "Bem passado",
    ...overrides,
  };
}

describe("formatação", () => {
  it("formata reais no padrão brasileiro", () => {
    expect(formatBRL(2990)).toBe("R$ 29,90");
    expect(formatBRL(123456)).toBe("R$ 1.234,56");
  });

  it("converte texto em centavos", () => {
    expect(parseBRLToCents("29,90")).toBe(2990);
    expect(parseBRLToCents("R$ 1.234,56")).toBe(123456);
    expect(parseBRLToCents("12.5")).toBe(1250);
    expect(parseBRLToCents("abc")).toBeNull();
  });
});

describe("carrinho", () => {
  it("soma adicionais e quantidade", () => {
    const i = item();
    expect(itemTotal(i)).toBe((3290 + 500) * 2);
    const items = [i, item({ key: "k2", addons: [], quantity: 1, unitPriceCents: 650 })];
    expect(cartSubtotal(items)).toBe(7580 + 650);
    expect(cartCount(items)).toBe(3);
  });

  it("gera a mesma chave para a mesma personalização", () => {
    expect(buildItemKey("p", [bacon, queijo], ["b", "a"], "x")).toBe(
      buildItemKey("p", [queijo, bacon], ["a", "b"], " X "),
    );
    expect(buildItemKey("p", [bacon], [], "")).not.toBe(buildItemKey("p", [], [], ""));
  });

  it("limita quantidades", () => {
    expect(clampQuantity(0)).toBe(1);
    expect(clampQuantity(999)).toBe(50);
  });

  it("calcula desconto percentual", () => {
    expect(discountCents(10000, 10)).toBe(1000);
    expect(discountCents(10000, null)).toBe(0);
    expect(discountCents(10000, 150)).toBe(10000);
  });

  it("gera identificador de pedido", () => {
    expect(generateOrderId(1_700_000_000_000, 0.5)).toMatch(/^BL-[0-9A-Z]{6}$/);
  });
});

describe("WhatsApp", () => {
  it("valida somente números brasileiros completos", () => {
    expect(normalizeWhatsapp("+55 (11) 99999-8888")).toBe("5511999998888");
    expect(normalizeWhatsapp("(11) 4162-1591")).toBeNull();
    expect(normalizeWhatsapp("")).toBeNull();
  });

  it("monta a mensagem com itens, adicionais, observações e totais", () => {
    const msg = buildOrderMessage(
      {
        name: "Maria",
        phone: "(11) 98888-7777",
        mode: "entrega",
        address: {
          street: "Rua A",
          number: "10",
          district: "Centro",
          complement: "Apto 2",
          reference: "",
        },
        paymentMethod: "Dinheiro",
        changeFor: "R$ 100,00",
      },
      {
        orderId: "BL-TESTE1",
        items: [item()],
        subtotalCents: 7580,
        discountCents: 758,
        couponCode: "BIG10",
        deliveryFeeCents: 500,
        totalCents: 7322,
      },
    );
    expect(msg).toContain("Pedido: *BL-TESTE1*");
    expect(msg).toContain("*Cliente:* Maria");
    expect(msg).toContain("*Atendimento:* Entrega");
    expect(msg).toContain("*Endereço:* Rua A, 10 – Centro");
    expect(msg).toContain("1. 2x Big Brasil Prensado — R$ 75,80");
    expect(msg).toContain("+ Bacon extra (R$ 5,00)");
    expect(msg).toContain("– Sem: Tomate");
    expect(msg).toContain("Obs.: Bem passado");
    expect(msg).toContain("Desconto (BIG10): -R$ 7,58");
    expect(msg).toContain("Taxa de entrega: R$ 5,00");
    expect(msg).toContain("*Total: R$ 73,22*");
    expect(msg).toContain("*Pagamento:* Dinheiro");
    expect(msg).toContain("*Troco para:* R$ 100,00");
  });

  it("omite endereço e taxa na retirada", () => {
    const msg = buildOrderMessage(
      { name: "João", phone: "", mode: "retirada" },
      {
        orderId: "BL-X",
        items: [item({ addons: [], removed: [], notes: "" })],
        subtotalCents: 6580,
        discountCents: 0,
        couponCode: null,
        deliveryFeeCents: null,
        totalCents: 6580,
      },
    );
    expect(msg).toContain("Retirada no local");
    expect(msg).not.toContain("Endereço");
    expect(msg).not.toContain("Taxa de entrega");
    expect(msg).not.toContain("Pagamento");
  });

  it("codifica a URL do WhatsApp", () => {
    expect(buildWhatsAppUrl("5511999998888", "Olá & tchau")).toBe(
      "https://wa.me/5511999998888?text=Ol%C3%A1%20%26%20tchau",
    );
  });
});

describe("cardápio", () => {
  it("filtra por categoria e busca sem acentos", () => {
    const prensados = filterProducts(DEMO_PRODUCTS, "cat-prensados", "");
    expect(prensados.every((p) => p.categoryId === "cat-prensados")).toBe(true);
    expect(filterProducts(DEMO_PRODUCTS, null, "acai").some((p) => p.name.includes("Açaí"))).toBe(
      true,
    );
    expect(filterProducts(DEMO_PRODUCTS, null, "picanha")).toHaveLength(1);
  });

  it("produtos demonstrativos estão marcados", () => {
    expect(DEMO_PRODUCTS.every((p) => p.demo === true)).toBe(true);
  });
});

describe("configurações", () => {
  it("usa padrões e não presume WhatsApp", () => {
    const s = parseSettings(null);
    expect(s.whatsapp).toBe("");
    expect(s.address.confirmed).toBe(false);
  });

  it("descarta campos inválidos mantendo os válidos", () => {
    const s = parseSettings({ whatsapp: "123", businessName: "Big Lanche Barueri" });
    expect(s.whatsapp).toBe(DEFAULT_SETTINGS.whatsapp);
    expect(s.businessName).toBe("Big Lanche Barueri");
  });

  it("valida período das promoções", () => {
    const base = {
      id: "1",
      title: "x",
      subtitle: "",
      couponCode: null,
      discountPercent: 10,
      active: true,
    };
    const now = new Date("2026-11-02T12:00:00Z");
    expect(isPromotionLive({ ...base, startsAt: null, endsAt: null }, now)).toBe(true);
    expect(isPromotionLive({ ...base, startsAt: null, endsAt: "2026-11-01T00:00:00Z" }, now)).toBe(
      false,
    );
    expect(isPromotionLive({ ...base, active: false, startsAt: null, endsAt: null }, now)).toBe(
      false,
    );
  });
});

describe("pedidos", () => {
  it("monta mensagens de status para o cliente", async () => {
    const { buildStatusMessage, customerWhatsapp } = await import("@/services/orders");
    const o = { code: "BL-0007", customerName: "Maria Silva", mode: "entrega" as const };
    expect(buildStatusMessage(o, "saiu_entrega")).toBe(
      "Olá, Maria! Seu pedido *BL-0007* saiu para entrega. 🛵 Bom apetite!",
    );
    expect(buildStatusMessage(o, "em_preparo")).toContain("em preparo");
    expect(customerWhatsapp("11988887777")).toBe("5511988887777");
    expect(customerWhatsapp("5511988887777")).toBe("5511988887777");
  });

  it("envia ao servidor apenas ids e escolhas (sem preços)", async () => {
    const { toOrderPayload } = await import("@/services/orders");
    const payload = toOrderPayload(
      {
        name: "Ana",
        phone: "11999998888",
        mode: "retirada",
        address: null,
        paymentMethod: "",
        changeFor: "",
        couponCode: "",
      },
      [item()],
    );
    expect(payload.items).toEqual([
      { productId: "p1", quantity: 2, addonIds: ["a1"], removed: ["Tomate"], notes: "Bem passado" },
    ]);
    expect(JSON.stringify(payload)).not.toContain("unitPriceCents");
  });

  it("indica taxa a combinar na entrega sem taxa configurada", () => {
    const msg = buildOrderMessage(
      {
        name: "Ana",
        phone: "11999998888",
        mode: "entrega",
        address: {
          street: "Rua B",
          number: "1",
          district: "Centro",
          complement: "",
          reference: "",
        },
      },
      {
        orderId: "BL-0001",
        items: [item()],
        subtotalCents: 7580,
        discountCents: 0,
        couponCode: null,
        deliveryFeeCents: null,
        totalCents: 7580,
      },
    );
    expect(msg).toContain("Taxa de entrega: a combinar");
  });
});

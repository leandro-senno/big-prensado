import { formatBRL } from "./format";
import { itemTotal, type CartItem } from "./cart";

export type ServiceMode = "entrega" | "retirada";

export interface OrderCustomer {
  name: string;
  phone: string;
  mode: ServiceMode;
  address?: {
    street: string;
    number: string;
    district: string;
    complement: string;
    reference: string;
  };
  paymentMethod?: string;
  changeFor?: string;
}

export interface OrderSummary {
  orderId: string;
  items: CartItem[];
  subtotalCents: number;
  discountCents: number;
  couponCode: string | null;
  deliveryFeeCents: number | null;
  totalCents: number;
}

/** Aceita somente números brasileiros com DDI 55 + DDD + número (10 ou 11 dígitos). */
export function normalizeWhatsapp(raw: string): string | null {
  const digits = raw.replace(/\D/g, "");
  return /^55\d{10,11}$/.test(digits) ? digits : null;
}

export function buildOrderMessage(customer: OrderCustomer, order: OrderSummary): string {
  const lines: string[] = [];
  lines.push(`*NOVO PEDIDO — BIG LANCHE*`);
  lines.push(`Pedido: *${order.orderId}*`);
  lines.push("");
  lines.push(`*Cliente:* ${customer.name.trim()}`);
  if (customer.phone.trim()) lines.push(`*Telefone:* ${customer.phone.trim()}`);
  lines.push(`*Atendimento:* ${customer.mode === "entrega" ? "Entrega" : "Retirada no local"}`);

  if (customer.mode === "entrega" && customer.address) {
    const a = customer.address;
    const main = [a.street.trim(), a.number.trim()].filter(Boolean).join(", ");
    lines.push(`*Endereço:* ${[main, a.district.trim()].filter(Boolean).join(" – ")}`);
    if (a.complement.trim()) lines.push(`*Complemento:* ${a.complement.trim()}`);
    if (a.reference.trim()) lines.push(`*Referência:* ${a.reference.trim()}`);
  }

  lines.push("");
  lines.push("*ITENS*");
  order.items.forEach((item, index) => {
    lines.push(`${index + 1}. ${item.quantity}x ${item.name} — ${formatBRL(itemTotal(item))}`);
    for (const addon of item.addons) {
      lines.push(`   + ${addon.name} (${formatBRL(addon.priceCents)})`);
    }
    if (item.removed.length > 0) {
      lines.push(`   – Sem: ${item.removed.join(", ")}`);
    }
    if (item.notes.trim()) {
      lines.push(`   Obs.: ${item.notes.trim()}`);
    }
  });

  lines.push("");
  lines.push(`Subtotal: ${formatBRL(order.subtotalCents)}`);
  if (order.discountCents > 0) {
    const label = order.couponCode ? `Desconto (${order.couponCode})` : "Desconto";
    lines.push(`${label}: -${formatBRL(order.discountCents)}`);
  }
  if (customer.mode === "entrega" && order.deliveryFeeCents !== null) {
    lines.push(`Taxa de entrega: ${formatBRL(order.deliveryFeeCents)}`);
  }
  lines.push(`*Total: ${formatBRL(order.totalCents)}*`);

  if (customer.paymentMethod) {
    lines.push("");
    lines.push(`*Pagamento:* ${customer.paymentMethod}`);
    if (customer.changeFor && customer.changeFor.trim()) {
      lines.push(`*Troco para:* ${customer.changeFor.trim()}`);
    }
  }

  lines.push("");
  lines.push("_Pedido montado pelo site. Aguardo a confirmação do estabelecimento._");
  return lines.join("\n");
}

export function buildWhatsAppUrl(number: string, message: string): string {
  return `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
}

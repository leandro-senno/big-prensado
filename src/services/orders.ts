import { dbDelete, dbRpc, dbSelect, dbUpdate } from "@/lib/supabase";
import type { CartItem } from "@/lib/cart";
import type { ServiceMode } from "@/lib/whatsapp";

export type OrderStatus =
  | "novo"
  | "em_preparo"
  | "saiu_entrega"
  | "pronto_retirada"
  | "concluido"
  | "cancelado";

export const STATUS_LABELS: Record<OrderStatus, string> = {
  novo: "Novo",
  em_preparo: "Em preparo",
  saiu_entrega: "Saiu para entrega",
  pronto_retirada: "Pronto para retirada",
  concluido: "Concluído",
  cancelado: "Cancelado",
};

export const ACTIVE_STATUSES: OrderStatus[] = [
  "novo",
  "em_preparo",
  "saiu_entrega",
  "pronto_retirada",
];

export interface OrderItem {
  productId: string;
  name: string;
  quantity: number;
  unitPriceCents: number;
  addons: { id: string; name: string; priceCents: number }[];
  removed: string[];
  notes: string;
  totalCents: number;
}

export interface OrderAddress {
  street: string;
  number: string;
  district: string;
  complement: string;
  reference: string;
}

export interface Order {
  id: string;
  code: string;
  status: OrderStatus;
  customerName: string;
  customerPhone: string;
  mode: ServiceMode;
  address: OrderAddress | null;
  paymentMethod: string | null;
  changeFor: string | null;
  items: OrderItem[];
  subtotalCents: number;
  discountCents: number;
  couponCode: string | null;
  deliveryFeeCents: number | null;
  totalCents: number;
  createdAt: string;
}

/* ----------------------------------------------------------------------------
 * Envio do pedido (cliente)
 * ------------------------------------------------------------------------- */

export interface OrderPayload {
  name: string;
  phone: string;
  mode: ServiceMode;
  address: OrderAddress | null;
  paymentMethod: string;
  changeFor: string;
  couponCode: string;
  items: {
    productId: string;
    quantity: number;
    addonIds: string[];
    removed: string[];
    notes: string;
  }[];
}

/** Resposta do servidor: valores recalculados a partir do banco. */
export interface CreatedOrder {
  id: string;
  code: string;
  items: OrderItem[];
  subtotalCents: number;
  discountCents: number;
  couponCode: string | null;
  deliveryFeeCents: number | null;
  totalCents: number;
}

export function toOrderPayload(base: Omit<OrderPayload, "items">, items: CartItem[]): OrderPayload {
  return {
    ...base,
    items: items.map((i) => ({
      productId: i.productId,
      quantity: i.quantity,
      addonIds: i.addons.map((a) => a.id),
      removed: i.removed,
      notes: i.notes,
    })),
  };
}

export function submitOrder(payload: OrderPayload): Promise<CreatedOrder> {
  return dbRpc<CreatedOrder>("create_order", { p: payload }, false);
}

/** Converte itens confirmados pelo servidor para o formato do carrinho (mensagem). */
export function orderItemsToCart(items: OrderItem[]): CartItem[] {
  return items.map((i, idx) => ({
    key: `${i.productId}-${idx}`,
    productId: i.productId,
    name: i.name,
    imageUrl: null,
    unitPriceCents: i.unitPriceCents,
    quantity: i.quantity,
    addons: i.addons,
    removed: i.removed,
    notes: i.notes,
  }));
}

/* ----------------------------------------------------------------------------
 * Gestor de pedidos (admin)
 * ------------------------------------------------------------------------- */

interface OrderRow {
  id: string;
  code: string | null;
  number: number;
  status: OrderStatus;
  customer_name: string;
  customer_phone: string;
  mode: ServiceMode;
  address: OrderAddress | null;
  payment_method: string | null;
  change_for: string | null;
  items: OrderItem[] | null;
  subtotal_cents: number;
  discount_cents: number;
  coupon_code: string | null;
  delivery_fee_cents: number | null;
  total_cents: number;
  created_at: string;
}

function toOrder(r: OrderRow): Order {
  return {
    id: r.id,
    code: r.code ?? `BL-${String(r.number).padStart(4, "0")}`,
    status: r.status,
    customerName: r.customer_name,
    customerPhone: r.customer_phone,
    mode: r.mode,
    address: r.address,
    paymentMethod: r.payment_method,
    changeFor: r.change_for,
    items: Array.isArray(r.items) ? r.items : [],
    subtotalCents: r.subtotal_cents,
    discountCents: r.discount_cents,
    couponCode: r.coupon_code,
    deliveryFeeCents: r.delivery_fee_cents,
    totalCents: r.total_cents,
    createdAt: r.created_at,
  };
}

export async function listOrders(limit = 150): Promise<Order[]> {
  const rows = await dbSelect<OrderRow>(
    "orders",
    `select=*&order=created_at.desc&limit=${limit}`,
    true,
  );
  return rows.map(toOrder);
}

export async function updateOrderStatus(id: string, status: OrderStatus): Promise<Order> {
  const rows = await dbUpdate<OrderRow>("orders", `id=eq.${encodeURIComponent(id)}`, { status });
  const row = rows[0];
  if (!row) throw new Error("Pedido não foi atualizado.");
  return toOrder(row);
}

export const deleteOrder = (id: string) => dbDelete("orders", `id=eq.${encodeURIComponent(id)}`);

/** Mensagem pronta para avisar o cliente sobre o status. */
export function buildStatusMessage(
  order: Pick<Order, "code" | "customerName" | "mode">,
  status: OrderStatus,
): string {
  const first = order.customerName.trim().split(/\s+/)[0] ?? "";
  const hi = first ? `Olá, ${first}!` : "Olá!";
  switch (status) {
    case "novo":
      return `${hi} Recebemos seu pedido *${order.code}* no Big Lanche. Já já ele entra em preparo. 🍔`;
    case "em_preparo":
      return `${hi} Seu pedido *${order.code}* está em preparo na chapa! 🔥`;
    case "saiu_entrega":
      return `${hi} Seu pedido *${order.code}* saiu para entrega. 🛵 Bom apetite!`;
    case "pronto_retirada":
      return `${hi} Seu pedido *${order.code}* está pronto para retirada. Estamos te esperando! 🍔`;
    case "concluido":
      return `${hi} Pedido *${order.code}* concluído. Obrigado pela preferência, volte sempre! 🧡`;
    case "cancelado":
      return `${hi} Seu pedido *${order.code}* foi cancelado. Qualquer dúvida, é só responder esta mensagem.`;
  }
}

/** Número do cliente no formato do wa.me (DDI 55). */
export function customerWhatsapp(phone: string): string {
  const d = phone.replace(/\D/g, "");
  return d.startsWith("55") && d.length >= 12 ? d : `55${d}`;
}

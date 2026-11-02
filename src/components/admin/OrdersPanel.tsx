import { useCallback, useEffect, useRef, useState } from "react";
import {
  Bell,
  BellOff,
  Bike,
  Loader2,
  MapPin,
  Phone,
  Printer,
  RefreshCw,
  Store,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import { WhatsappIcon } from "@/components/site/icons";
import { formatBRL } from "@/lib/format";
import { SupabaseError } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import { buildWhatsAppUrl } from "@/lib/whatsapp";
import {
  ACTIVE_STATUSES,
  buildStatusMessage,
  customerWhatsapp,
  deleteOrder,
  listOrders,
  STATUS_LABELS,
  updateOrderStatus,
  type Order,
  type OrderStatus,
} from "@/services/orders";

import { btnGhost, errorMessage, Panel } from "./ui";

const POLL_MS = 15_000;

/* ----------------------------------------------------------------------------
 * Alerta sonoro (gerado no navegador, sem arquivo de áudio)
 * ------------------------------------------------------------------------- */

function playBell(ctx: AudioContext) {
  const now = ctx.currentTime;
  [0, 0.25, 0.5].forEach((offset, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = i === 2 ? 1320 : 990;
    gain.gain.setValueAtTime(0.0001, now + offset);
    gain.gain.exponentialRampToValueAtTime(0.35, now + offset + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + offset + 0.22);
    osc.connect(gain).connect(ctx.destination);
    osc.start(now + offset);
    osc.stop(now + offset + 0.25);
  });
}

/* ----------------------------------------------------------------------------
 * Hook: busca periódica + detecção de pedidos novos
 * ------------------------------------------------------------------------- */

export function useOrdersFeed() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [missingTable, setMissingTable] = useState(false);
  const [soundOn, setSoundOn] = useState(false);
  const seen = useRef<Set<string> | null>(null);
  const audio = useRef<AudioContext | null>(null);
  const soundRef = useRef(false);
  useEffect(() => {
    soundRef.current = soundOn;
  }, [soundOn]);

  const refresh = useCallback(async () => {
    try {
      const list = await listOrders();
      const fresh = seen.current
        ? list.filter((o) => o.status === "novo" && !seen.current?.has(o.id))
        : [];
      seen.current = new Set(list.map((o) => o.id));
      setOrders(list);
      setError("");
      setMissingTable(false);
      if (fresh.length > 0) {
        toast.success(
          fresh.length === 1
            ? `Novo pedido ${fresh[0]?.code ?? ""}!`
            : `${fresh.length} novos pedidos!`,
          { duration: 8000 },
        );
        if (soundRef.current && audio.current) playBell(audio.current);
      }
    } catch (err) {
      if (err instanceof SupabaseError && err.status === 404) setMissingTable(true);
      else setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
    const t = window.setInterval(() => void refresh(), POLL_MS);
    const onVisible = () => document.visibilityState === "visible" && void refresh();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.clearInterval(t);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [refresh]);

  const newCount = orders.filter((o) => o.status === "novo").length;

  useEffect(() => {
    const base = "Painel | Big Lanche";
    document.title = newCount > 0 ? `(${newCount}) Novos pedidos | Big Lanche` : base;
  }, [newCount]);

  const toggleSound = () => {
    if (!soundOn) {
      try {
        const Ctx =
          window.AudioContext ??
          (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (!Ctx) throw new Error("Seu navegador não suporta áudio.");
        audio.current = audio.current ?? new Ctx();
        void audio.current.resume();
        playBell(audio.current);
        setSoundOn(true);
      } catch (err) {
        toast.error(errorMessage(err));
      }
    } else {
      setSoundOn(false);
    }
  };

  const replace = (o: Order) => setOrders((list) => list.map((x) => (x.id === o.id ? o : x)));
  const removeLocal = (id: string) => setOrders((list) => list.filter((x) => x.id !== id));

  return {
    orders,
    loading,
    error,
    missingTable,
    refresh,
    newCount,
    soundOn,
    toggleSound,
    replace,
    removeLocal,
  };
}

export type OrdersFeed = ReturnType<typeof useOrdersFeed>;

/* ----------------------------------------------------------------------------
 * Impressão (cupom 80 mm)
 * ------------------------------------------------------------------------- */

function esc(text: string) {
  return text.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
}

function printOrder(o: Order) {
  const win = window.open("", "_blank", "width=380,height=640");
  if (!win) {
    toast.error("Permita pop-ups para imprimir.");
    return;
  }
  const items = o.items
    .map(
      (
        i,
      ) => `<div class="row"><b>${i.quantity}x ${esc(i.name)}</b><span>${formatBRL(i.totalCents)}</span></div>
      ${i.addons.map((a) => `<div class="sub">+ ${esc(a.name)} (${formatBRL(a.priceCents)})</div>`).join("")}
      ${i.removed.length ? `<div class="sub">Sem: ${esc(i.removed.join(", "))}</div>` : ""}
      ${i.notes ? `<div class="sub">Obs.: ${esc(i.notes)}</div>` : ""}`,
    )
    .join("");
  const addr = o.address
    ? `${esc(o.address.street)}, ${esc(o.address.number)} – ${esc(o.address.district)}${o.address.complement ? ` (${esc(o.address.complement)})` : ""}${o.address.reference ? `<br>Ref.: ${esc(o.address.reference)}` : ""}`
    : "";
  win.document
    .write(`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>${esc(o.code)}</title>
<style>
  body{font-family:monospace;width:72mm;margin:0 auto;padding:8px;font-size:12px;color:#000}
  h1{font-size:16px;text-align:center;margin:0 0 4px} .c{text-align:center}
  hr{border:none;border-top:1px dashed #000;margin:8px 0}
  .row{display:flex;justify-content:space-between;gap:8px} .sub{padding-left:10px}
  .tot{font-size:14px;font-weight:bold}
</style></head><body>
<h1>BIG LANCHE</h1><div class="c">Pedido <b>${esc(o.code)}</b><br>${new Date(o.createdAt).toLocaleString("pt-BR")}</div><hr>
<div><b>${esc(o.customerName)}</b><br>Tel.: ${esc(o.customerPhone)}<br>${o.mode === "entrega" ? "ENTREGA" : "RETIRADA NO LOCAL"}${addr ? `<br>${addr}` : ""}</div><hr>
${items}<hr>
<div class="row"><span>Subtotal</span><span>${formatBRL(o.subtotalCents)}</span></div>
${o.discountCents > 0 ? `<div class="row"><span>Desconto${o.couponCode ? ` (${esc(o.couponCode)})` : ""}</span><span>-${formatBRL(o.discountCents)}</span></div>` : ""}
${o.mode === "entrega" ? `<div class="row"><span>Entrega</span><span>${o.deliveryFeeCents !== null ? formatBRL(o.deliveryFeeCents) : "a combinar"}</span></div>` : ""}
<div class="row tot"><span>TOTAL</span><span>${formatBRL(o.totalCents)}</span></div>
${o.paymentMethod ? `<hr>Pagamento: ${esc(o.paymentMethod)}${o.changeFor ? `<br>Troco para: ${esc(o.changeFor)}` : ""}` : ""}
<script>window.onload=function(){window.print();setTimeout(function(){window.close()},300)}</script>
</body></html>`);
  win.document.close();
}

/* ----------------------------------------------------------------------------
 * Tela
 * ------------------------------------------------------------------------- */

const STATUS_STYLE: Record<OrderStatus, string> = {
  novo: "bg-brand-orange text-brand-black",
  em_preparo: "bg-yellow-400/20 text-yellow-200",
  saiu_entrega: "bg-sky-400/20 text-sky-200",
  pronto_retirada: "bg-sky-400/20 text-sky-200",
  concluido: "bg-green-500/15 text-green-300",
  cancelado: "bg-red-500/15 text-red-300",
};

function nextStatus(o: Order): OrderStatus | null {
  switch (o.status) {
    case "novo":
      return "em_preparo";
    case "em_preparo":
      return o.mode === "entrega" ? "saiu_entrega" : "pronto_retirada";
    case "saiu_entrega":
    case "pronto_retirada":
      return "concluido";
    default:
      return null;
  }
}

const NEXT_LABEL: Partial<Record<OrderStatus, string>> = {
  em_preparo: "Aceitar e preparar",
  saiu_entrega: "Saiu para entrega",
  pronto_retirada: "Pronto para retirada",
  concluido: "Concluir pedido",
};

type Filter = "andamento" | "finalizados" | "todos";

function formatPhone(d: string) {
  const n = d.replace(/^55(?=\d{10,11}$)/, "");
  if (n.length === 11) return `(${n.slice(0, 2)}) ${n.slice(2, 7)}-${n.slice(7)}`;
  if (n.length === 10) return `(${n.slice(0, 2)}) ${n.slice(2, 6)}-${n.slice(6)}`;
  return d;
}

function OrderCard({ order, feed }: { order: Order; feed: OrdersFeed }) {
  const [busy, setBusy] = useState(false);
  const next = nextStatus(order);
  const finished = order.status === "concluido" || order.status === "cancelado";

  const setStatus = async (status: OrderStatus) => {
    setBusy(true);
    try {
      feed.replace(await updateOrderStatus(order.id, status));
      toast.success(`${order.code}: ${STATUS_LABELS[status]}`);
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!window.confirm(`Excluir o pedido ${order.code}? Esta ação não pode ser desfeita.`)) return;
    try {
      await deleteOrder(order.id);
      feed.removeLocal(order.id);
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  const created = new Date(order.createdAt);
  const notifyUrl = buildWhatsAppUrl(
    customerWhatsapp(order.customerPhone),
    buildStatusMessage(order, order.status),
  );

  return (
    <li
      className={cn(
        "rounded-2xl border bg-brand-black p-4 sm:p-5",
        order.status === "novo"
          ? "border-brand-orange shadow-lg shadow-brand-orange/10"
          : "border-white/10",
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-display text-2xl uppercase tracking-wide text-white">{order.code}</p>
          <p className="text-xs text-brand-gray">
            {created.toLocaleDateString("pt-BR")} às{" "}
            {created.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
          </p>
        </div>
        <span
          className={cn(
            "rounded-full px-3 py-1 text-xs font-bold uppercase",
            STATUS_STYLE[order.status],
          )}
        >
          {STATUS_LABELS[order.status]}
        </span>
      </div>

      <div className="mt-3 grid gap-3 text-sm md:grid-cols-2">
        <div className="space-y-1">
          <p className="font-semibold text-white">{order.customerName}</p>
          <p className="flex items-center gap-1.5 text-brand-gray">
            <Phone className="h-3.5 w-3.5" aria-hidden="true" />
            {formatPhone(order.customerPhone)}
          </p>
          <p className="flex items-center gap-1.5 text-brand-gray">
            {order.mode === "entrega" ? (
              <Bike className="h-3.5 w-3.5" aria-hidden="true" />
            ) : (
              <Store className="h-3.5 w-3.5" aria-hidden="true" />
            )}
            {order.mode === "entrega" ? "Entrega" : "Retirada no local"}
          </p>
          {order.address ? (
            <p className="flex items-start gap-1.5 text-brand-gray">
              <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              <span>
                {order.address.street}, {order.address.number} – {order.address.district}
                {order.address.complement ? ` (${order.address.complement})` : ""}
                {order.address.reference ? (
                  <>
                    <br />
                    Ref.: {order.address.reference}
                  </>
                ) : null}
              </span>
            </p>
          ) : null}
          {order.paymentMethod ? (
            <p className="text-brand-gray">
              Pagamento: <span className="text-white">{order.paymentMethod}</span>
              {order.changeFor ? ` · troco para ${order.changeFor}` : ""}
            </p>
          ) : null}
        </div>

        <div>
          <ul className="space-y-1.5">
            {order.items.map((i, idx) => (
              <li key={idx}>
                <div className="flex justify-between gap-3">
                  <span className="font-medium text-white">
                    {i.quantity}x {i.name}
                  </span>
                  <span className="text-brand-gray">{formatBRL(i.totalCents)}</span>
                </div>
                {i.addons.map((a) => (
                  <p key={a.id} className="pl-3 text-xs text-brand-gray">
                    + {a.name}
                  </p>
                ))}
                {i.removed.length > 0 ? (
                  <p className="pl-3 text-xs text-red-200">Sem: {i.removed.join(", ")}</p>
                ) : null}
                {i.notes ? (
                  <p className="pl-3 text-xs italic text-brand-amber">Obs.: {i.notes}</p>
                ) : null}
              </li>
            ))}
          </ul>
          <div className="mt-2 space-y-0.5 border-t border-white/10 pt-2 text-xs text-brand-gray">
            {order.discountCents > 0 ? (
              <p className="flex justify-between">
                <span>Desconto {order.couponCode ? `(${order.couponCode})` : ""}</span>
                <span>-{formatBRL(order.discountCents)}</span>
              </p>
            ) : null}
            {order.mode === "entrega" ? (
              <p className="flex justify-between">
                <span>Entrega</span>
                <span>
                  {order.deliveryFeeCents !== null
                    ? formatBRL(order.deliveryFeeCents)
                    : "a combinar"}
                </span>
              </p>
            ) : null}
            <p className="flex justify-between text-base font-bold text-brand-amber">
              <span>Total</span>
              <span>{formatBRL(order.totalCents)}</span>
            </p>
          </div>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        {next ? (
          <button
            type="button"
            disabled={busy}
            onClick={() => void setStatus(next)}
            className="inline-flex h-10 items-center gap-2 rounded-full bg-brand-orange px-4 text-sm font-bold text-brand-black hover:bg-brand-amber disabled:opacity-50"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}
            {NEXT_LABEL[next] ?? STATUS_LABELS[next]}
          </button>
        ) : null}
        <a
          href={notifyUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex h-10 items-center gap-2 rounded-full bg-[#25D366]/15 px-4 text-sm font-semibold text-[#5ee08f] hover:bg-[#25D366]/25"
          title="Abre o WhatsApp do cliente com uma mensagem sobre o status atual"
        >
          <WhatsappIcon className="h-4 w-4" /> Avisar cliente
        </a>
        <button
          type="button"
          onClick={() => printOrder(order)}
          className={cn(btnGhost, "h-10 px-4")}
        >
          <Printer className="h-4 w-4" aria-hidden="true" /> Imprimir
        </button>
        <label className="sr-only" htmlFor={`st-${order.id}`}>
          Alterar status
        </label>
        <select
          id={`st-${order.id}`}
          value={order.status}
          disabled={busy}
          onChange={(e) => void setStatus(e.target.value as OrderStatus)}
          className="h-10 rounded-full border border-white/15 bg-brand-black px-3 text-sm text-white"
        >
          {(Object.keys(STATUS_LABELS) as OrderStatus[]).map((s) => (
            <option key={s} value={s}>
              {STATUS_LABELS[s]}
            </option>
          ))}
        </select>
        {finished ? (
          <button
            type="button"
            onClick={() => void remove()}
            className="ml-auto inline-flex h-10 w-10 items-center justify-center rounded-full text-red-300 hover:bg-red-500/10"
            aria-label={`Excluir pedido ${order.code}`}
          >
            <Trash2 className="h-4 w-4" aria-hidden="true" />
          </button>
        ) : null}
      </div>
    </li>
  );
}

export function OrdersPanel({ feed }: { feed: OrdersFeed }) {
  const [filter, setFilter] = useState<Filter>("andamento");
  const active = feed.orders.filter((o) => ACTIVE_STATUSES.includes(o.status));
  const finished = feed.orders.filter((o) => !ACTIVE_STATUSES.includes(o.status));
  const list = filter === "andamento" ? active : filter === "finalizados" ? finished : feed.orders;

  const chip = (f: Filter, label: string, count: number) => (
    <button
      type="button"
      onClick={() => setFilter(f)}
      aria-pressed={filter === f}
      className={cn(
        "h-9 rounded-full px-4 text-sm font-semibold",
        filter === f ? "bg-white text-brand-black" : "bg-white/5 text-white hover:bg-white/10",
      )}
    >
      {label} ({count})
    </button>
  );

  return (
    <Panel
      title="Gestor de pedidos"
      actions={
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={feed.toggleSound}
            className={cn(
              btnGhost,
              "h-9 px-4 text-xs",
              feed.soundOn && "border-brand-orange text-brand-amber",
            )}
            aria-pressed={feed.soundOn}
          >
            {feed.soundOn ? (
              <Bell className="h-4 w-4" aria-hidden="true" />
            ) : (
              <BellOff className="h-4 w-4" aria-hidden="true" />
            )}
            {feed.soundOn ? "Som ativado" : "Ativar som de novo pedido"}
          </button>
          <button
            type="button"
            onClick={() => void feed.refresh()}
            className={cn(btnGhost, "h-9 px-4 text-xs")}
          >
            <RefreshCw className="h-4 w-4" aria-hidden="true" /> Atualizar
          </button>
        </div>
      }
    >
      {feed.missingTable ? (
        <div className="rounded-xl border border-brand-amber/30 bg-brand-amber/10 p-4 text-sm text-brand-amber">
          A tabela de pedidos ainda não existe no banco. Rode o arquivo{" "}
          <code>supabase/migrations/20261102220000_pedidos.sql</code> no SQL Editor do Supabase.
        </div>
      ) : feed.loading ? (
        <p className="flex items-center justify-center py-10 text-brand-gray" role="status">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" aria-hidden="true" /> Carregando pedidos...
        </p>
      ) : (
        <>
          {feed.error ? (
            <p className="mb-4 text-sm text-red-300" role="alert">
              {feed.error}
            </p>
          ) : null}
          <p className="mb-4 text-xs text-brand-gray">
            A lista atualiza sozinha a cada 15 segundos. Mantenha esta aba aberta e ative o som para
            ser avisado de novos pedidos.
          </p>
          <div className="mb-5 flex flex-wrap gap-2">
            {chip("andamento", "Em andamento", active.length)}
            {chip("finalizados", "Finalizados", finished.length)}
            {chip("todos", "Todos", feed.orders.length)}
          </div>
          {list.length === 0 ? (
            <p className="py-10 text-center text-brand-gray">Nenhum pedido aqui por enquanto.</p>
          ) : (
            <ul className="space-y-4">
              {list.map((o) => (
                <OrderCard key={o.id} order={o} feed={feed} />
              ))}
            </ul>
          )}
        </>
      )}
    </Panel>
  );
}

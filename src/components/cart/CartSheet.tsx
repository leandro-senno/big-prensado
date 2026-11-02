import { useEffect, useMemo, useState } from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import {
  ArrowLeft,
  CheckCircle2,
  ImageOff,
  Loader2,
  Minus,
  Plus,
  ShoppingBag,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";

import { WhatsappIcon } from "@/components/site/icons";
import type { SiteSettings } from "@/config/settings";
import { discountCents, generateOrderId, itemTotal } from "@/lib/cart";
import { formatBRL } from "@/lib/format";
import { isSupabaseConfigured, SupabaseError } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import {
  buildOrderMessage,
  buildWhatsAppUrl,
  normalizeWhatsapp,
  type OrderCustomer,
  type ServiceMode,
} from "@/lib/whatsapp";
import { orderItemsToCart, submitOrder, toOrderPayload } from "@/services/orders";
import type { Promotion } from "@/types/catalog";

import { useCart } from "./CartProvider";

type Step = "cart" | "checkout" | "review" | "done";

interface DoneOrder {
  code: string;
  message: string;
  totalCents: number;
  saved: boolean;
}

const checkoutSchema = z
  .object({
    name: z.string().trim().min(2, "Informe seu nome.").max(80),
    phone: z
      .string()
      .trim()
      .max(20)
      .refine((v) => v.replace(/\D/g, "").length >= 10, "Informe seu WhatsApp com DDD."),
    mode: z.enum(["entrega", "retirada"]),
    street: z.string().trim().max(120),
    number: z.string().trim().max(20),
    district: z.string().trim().max(80),
    complement: z.string().trim().max(80),
    reference: z.string().trim().max(120),
    payment: z.string().trim().max(40),
    changeFor: z.string().trim().max(20),
  })
  .superRefine((v, ctx) => {
    if (v.mode === "entrega") {
      if (v.street.length < 3)
        ctx.addIssue({ code: "custom", path: ["street"], message: "Informe a rua." });
      if (!v.number)
        ctx.addIssue({ code: "custom", path: ["number"], message: "Informe o número." });
      if (v.district.length < 2)
        ctx.addIssue({ code: "custom", path: ["district"], message: "Informe o bairro." });
    }
  });

type CheckoutForm = z.infer<typeof checkoutSchema>;
type FormErrors = Partial<Record<keyof CheckoutForm, string | undefined>>;

const EMPTY_FORM: CheckoutForm = {
  name: "",
  phone: "",
  mode: "entrega",
  street: "",
  number: "",
  district: "",
  complement: "",
  reference: "",
  payment: "",
  changeFor: "",
};

function Field({
  id,
  label,
  error,
  children,
  className,
}: {
  id: string;
  label: string;
  error?: string | undefined;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-white">
        {label}
      </label>
      {children}
      {error ? (
        <p id={`${id}-erro`} className="mt-1 text-sm text-red-300" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

const inputCls =
  "h-12 w-full rounded-xl border border-white/15 bg-brand-black px-4 text-base text-white placeholder:text-white/40 focus:border-brand-orange focus:outline-none aria-[invalid=true]:border-red-400";

export function CartSheet({
  settings,
  promotions,
}: {
  settings: SiteSettings;
  promotions: Promotion[];
}) {
  const cart = useCart();
  const [step, setStep] = useState<Step>("cart");
  const [form, setForm] = useState<CheckoutForm>(EMPTY_FORM);
  const [errors, setErrors] = useState<FormErrors>({});
  const [couponInput, setCouponInput] = useState("");
  const [coupon, setCoupon] = useState<Promotion | null>(null);
  const [couponError, setCouponError] = useState("");
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState<DoneOrder | null>(null);

  const whatsapp = normalizeWhatsapp(settings.whatsapp);
  const { delivery, pickup, deliveryFeeCents } = settings.service;
  const modes = useMemo<ServiceMode[]>(() => {
    const list: ServiceMode[] = [];
    if (delivery) list.push("entrega");
    if (pickup) list.push("retirada");
    return list;
  }, [delivery, pickup]);

  useEffect(() => {
    if (!cart.isOpen && step !== "done") setStep("cart");
  }, [cart.isOpen, step]);

  const acceptsOrders =
    Boolean(whatsapp) || (isSupabaseConfigured && settings.orders.acceptWithoutWhatsapp);

  useEffect(() => {
    const only = modes.length === 1 ? modes[0] : undefined;
    if (only && form.mode !== only) {
      setForm((f) => ({ ...f, mode: only }));
    }
  }, [modes, form.mode]);

  const couponPromos = useMemo(
    () => promotions.filter((p) => p.couponCode && p.discountPercent && p.discountPercent > 0),
    [promotions],
  );

  const subtotal = cart.subtotalCents;
  const discount = discountCents(subtotal, coupon?.discountPercent ?? null);
  const fee = form.mode === "entrega" && deliveryFeeCents !== null ? deliveryFeeCents : 0;
  const total = Math.max(0, subtotal - discount) + fee;

  const set = <K extends keyof CheckoutForm>(key: K, value: CheckoutForm[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => ({ ...e, [key]: undefined }));
  };

  const applyCoupon = () => {
    const code = couponInput.trim().toUpperCase();
    if (!code) return;
    const found = couponPromos.find((p) => (p.couponCode ?? "").toUpperCase() === code);
    if (found) {
      setCoupon(found);
      setCouponError("");
    } else {
      setCoupon(null);
      setCouponError("Cupom inválido ou expirado.");
    }
  };

  const goReview = () => {
    const parsed = checkoutSchema.safeParse(form);
    if (!parsed.success) {
      const errs: FormErrors = {};
      for (const issue of parsed.error.issues) {
        const k = issue.path[0] as keyof CheckoutForm | undefined;
        if (k && !errs[k]) errs[k] = issue.message;
      }
      setErrors(errs);
      const first = Object.keys(errs)[0];
      if (first) document.getElementById(`ck-${first}`)?.focus();
      return;
    }
    setStep("review");
  };

  const customer: OrderCustomer = useMemo(() => {
    const c: OrderCustomer = { name: form.name, phone: form.phone, mode: form.mode };
    if (form.mode === "entrega") {
      c.address = {
        street: form.street,
        number: form.number,
        district: form.district,
        complement: form.complement,
        reference: form.reference,
      };
    }
    if (form.payment) {
      c.paymentMethod = form.payment;
      if (form.changeFor) c.changeFor = form.changeFor;
    }
    return c;
  }, [form]);

  const message = useMemo(
    () =>
      buildOrderMessage(customer, {
        orderId: "(gerado ao enviar)",
        items: cart.items,
        subtotalCents: subtotal,
        discountCents: discount,
        couponCode: coupon?.couponCode ?? null,
        deliveryFeeCents: form.mode === "entrega" ? deliveryFeeCents : null,
        totalCents: total,
      }),
    [customer, cart.items, subtotal, discount, coupon, deliveryFeeCents, form.mode, total],
  );

  const finishLocally = () => {
    // Sem banco (ou função ainda não instalada): usa os valores calculados aqui.
    const code = generateOrderId();
    setDone({
      code,
      message: message.replace("(gerado ao enviar)", code),
      totalCents: total,
      saved: false,
    });
  };

  const submit = async () => {
    if (sending || cart.items.length === 0) return;
    setSending(true);
    try {
      if (!isSupabaseConfigured) {
        if (!whatsapp) return;
        finishLocally();
      } else {
        try {
          const created = await submitOrder(
            toOrderPayload(
              {
                name: form.name,
                phone: form.phone,
                mode: form.mode,
                address: customer.address ?? null,
                paymentMethod: form.payment,
                changeFor: form.changeFor,
                couponCode: coupon?.couponCode ?? "",
              },
              cart.items,
            ),
          );
          const serverMessage = buildOrderMessage(customer, {
            orderId: created.code,
            items: orderItemsToCart(created.items),
            subtotalCents: created.subtotalCents,
            discountCents: created.discountCents,
            couponCode: created.couponCode,
            deliveryFeeCents: created.deliveryFeeCents,
            totalCents: created.totalCents,
          });
          setDone({
            code: created.code,
            message: serverMessage,
            totalCents: created.totalCents,
            saved: true,
          });
        } catch (err) {
          // 404 = função de pedidos ainda não instalada no banco.
          if (err instanceof SupabaseError && err.status === 404 && whatsapp) {
            finishLocally();
          } else {
            throw err;
          }
        }
      }
      cart.clear();
      setCoupon(null);
      setCouponInput("");
      setStep("done");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível enviar o pedido.");
    } finally {
      setSending(false);
    }
  };

  const startNewOrder = () => {
    setDone(null);
    setStep("cart");
    cart.close();
  };

  const empty = cart.items.length === 0;

  return (
    <DialogPrimitive.Root open={cart.isOpen} onOpenChange={cart.setOpen}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm data-[state=open]:animate-in data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content
          className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col border-l border-white/10 bg-brand-black-2 text-white shadow-2xl outline-none data-[state=open]:animate-in data-[state=open]:slide-in-from-right"
          aria-describedby={undefined}
        >
          <div className="flex items-center gap-2 border-b border-white/10 px-4 py-3">
            {step === "checkout" || step === "review" ? (
              <button
                type="button"
                onClick={() => setStep(step === "review" ? "checkout" : "cart")}
                className="inline-flex h-11 w-11 items-center justify-center rounded-full hover:bg-white/5"
                aria-label="Voltar"
              >
                <ArrowLeft className="h-5 w-5" aria-hidden="true" />
              </button>
            ) : null}
            <DialogPrimitive.Title className="flex-1 font-display text-2xl uppercase tracking-wide">
              {step === "cart"
                ? "Seu pedido"
                : step === "checkout"
                  ? "Seus dados"
                  : step === "review"
                    ? "Resumo do pedido"
                    : "Pedido enviado"}
            </DialogPrimitive.Title>
            <DialogPrimitive.Close
              className="inline-flex h-11 w-11 items-center justify-center rounded-full hover:bg-white/5"
              aria-label="Fechar carrinho"
            >
              <X className="h-5 w-5" aria-hidden="true" />
            </DialogPrimitive.Close>
          </div>

          <div className="flex-1 overflow-y-auto px-4 py-4">
            {step === "done" && done ? (
              <div className="flex flex-col items-center py-6 text-center">
                <CheckCircle2 className="h-16 w-16 text-green-400" aria-hidden="true" />
                <p className="mt-4 font-display text-3xl uppercase">Pedido {done.code}</p>
                <p className="mt-1 text-lg font-bold text-brand-amber">
                  {formatBRL(done.totalCents)}
                </p>
                {whatsapp ? (
                  <p className="mt-4 text-brand-gray">
                    {done.saved ? "Seu pedido foi registrado. " : ""}Agora toque em{" "}
                    <strong className="text-white">Enviar no WhatsApp</strong> para mandar a
                    mensagem para a lanchonete.
                  </p>
                ) : (
                  <p className="mt-4 text-brand-gray">
                    A lanchonete recebeu seu pedido e vai falar com você pelo WhatsApp informado.
                  </p>
                )}
                <p className="mt-3 text-xs text-brand-gray">
                  O pedido é confirmado pela lanchonete. Nenhum pagamento foi feito pelo site.
                </p>
                <details className="mt-6 w-full rounded-2xl border border-white/10 bg-brand-black p-4 text-left text-sm">
                  <summary className="cursor-pointer font-semibold">Ver resumo do pedido</summary>
                  <pre className="mt-3 whitespace-pre-wrap break-words font-sans text-xs text-brand-gray">
                    {done.message}
                  </pre>
                </details>
              </div>
            ) : empty ? (
              <div className="flex h-full flex-col items-center justify-center text-center">
                <ShoppingBag className="h-14 w-14 text-white/20" aria-hidden="true" />
                <p className="mt-4 font-display text-2xl uppercase">Carrinho vazio</p>
                <p className="mt-1 text-brand-gray">
                  Bateu a fome? Escolha seu lanche no cardápio.
                </p>
                <DialogPrimitive.Close asChild>
                  <a
                    href="#cardapio"
                    className="mt-6 inline-flex h-12 items-center rounded-full bg-brand-orange px-6 font-bold uppercase text-brand-black"
                  >
                    Ver cardápio
                  </a>
                </DialogPrimitive.Close>
              </div>
            ) : step === "cart" ? (
              <ul className="space-y-3">
                {cart.items.map((item) => (
                  <li
                    key={item.key}
                    className="rounded-2xl border border-white/10 bg-brand-black p-3"
                  >
                    <div className="flex gap-3">
                      {item.imageUrl ? (
                        <img
                          src={item.imageUrl}
                          alt=""
                          loading="lazy"
                          className="h-16 w-16 shrink-0 rounded-xl object-cover"
                        />
                      ) : (
                        <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-white/5 text-white/30">
                          <ImageOff className="h-5 w-5" aria-hidden="true" />
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <p className="font-semibold leading-tight">{item.name}</p>
                          <button
                            type="button"
                            onClick={() => cart.remove(item.key)}
                            className="-mr-1 -mt-1 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-white/50 hover:bg-white/5 hover:text-red-300"
                            aria-label={`Remover ${item.name}`}
                          >
                            <Trash2 className="h-4 w-4" aria-hidden="true" />
                          </button>
                        </div>
                        {item.addons.length > 0 ? (
                          <ul className="mt-1 flex flex-wrap gap-1">
                            {item.addons.map((a) => (
                              <li key={a.id}>
                                <button
                                  type="button"
                                  onClick={() => cart.removeAddon(item.key, a.id)}
                                  className="inline-flex items-center gap-1 rounded-full bg-brand-orange/15 px-2 py-0.5 text-xs text-brand-amber hover:bg-red-500/20 hover:text-red-200"
                                  aria-label={`Remover adicional ${a.name}`}
                                >
                                  + {a.name}
                                  <X className="h-3 w-3" aria-hidden="true" />
                                </button>
                              </li>
                            ))}
                          </ul>
                        ) : null}
                        {item.removed.length > 0 ? (
                          <p className="mt-1 text-xs text-brand-gray">
                            Sem: {item.removed.join(", ")}
                          </p>
                        ) : null}
                        {item.notes ? (
                          <p className="mt-1 text-xs italic text-brand-gray">“{item.notes}”</p>
                        ) : null}
                        <div className="mt-2 flex items-center justify-between">
                          <div
                            className="flex items-center rounded-full border border-white/15"
                            role="group"
                            aria-label={`Quantidade de ${item.name}`}
                          >
                            <button
                              type="button"
                              onClick={() => cart.setQuantity(item.key, item.quantity - 1)}
                              className="inline-flex h-9 w-9 items-center justify-center"
                              aria-label="Diminuir"
                            >
                              <Minus className="h-3.5 w-3.5" aria-hidden="true" />
                            </button>
                            <span className="w-6 text-center text-sm font-bold">
                              {item.quantity}
                            </span>
                            <button
                              type="button"
                              onClick={() => cart.setQuantity(item.key, item.quantity + 1)}
                              className="inline-flex h-9 w-9 items-center justify-center"
                              aria-label="Aumentar"
                            >
                              <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                            </button>
                          </div>
                          <span className="font-bold text-brand-amber">
                            {formatBRL(itemTotal(item))}
                          </span>
                        </div>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            ) : step === "checkout" ? (
              <form
                id="form-checkout"
                noValidate
                onSubmit={(e) => {
                  e.preventDefault();
                  goReview();
                }}
                className="space-y-4"
              >
                <Field id="ck-name" label="Seu nome *" error={errors.name}>
                  <input
                    id="ck-name"
                    className={inputCls}
                    value={form.name}
                    onChange={(e) => set("name", e.target.value)}
                    autoComplete="name"
                    aria-invalid={Boolean(errors.name)}
                    maxLength={80}
                  />
                </Field>
                <Field id="ck-phone" label="Seu WhatsApp *" error={errors.phone}>
                  <input
                    id="ck-phone"
                    className={inputCls}
                    value={form.phone}
                    onChange={(e) => set("phone", e.target.value)}
                    autoComplete="tel"
                    inputMode="tel"
                    placeholder="(11) 90000-0000"
                    aria-invalid={Boolean(errors.phone)}
                    maxLength={20}
                  />
                </Field>

                {modes.length > 1 ? (
                  <fieldset>
                    <legend className="mb-1.5 text-sm font-medium">Como prefere receber? *</legend>
                    <div className="grid grid-cols-2 gap-2">
                      {modes.map((m) => (
                        <label
                          key={m}
                          className={cn(
                            "flex min-h-12 cursor-pointer items-center justify-center rounded-xl border px-3 text-sm font-semibold transition",
                            form.mode === m
                              ? "border-brand-orange bg-brand-orange/10 text-brand-amber"
                              : "border-white/15",
                          )}
                        >
                          <input
                            type="radio"
                            name="mode"
                            value={m}
                            checked={form.mode === m}
                            onChange={() => set("mode", m)}
                            className="sr-only"
                          />
                          {m === "entrega" ? "Entrega" : "Retirada no local"}
                        </label>
                      ))}
                    </div>
                  </fieldset>
                ) : null}

                {form.mode === "entrega" ? (
                  <div className="space-y-4 rounded-2xl border border-white/10 p-3">
                    <Field id="ck-street" label="Rua *" error={errors.street}>
                      <input
                        id="ck-street"
                        className={inputCls}
                        value={form.street}
                        onChange={(e) => set("street", e.target.value)}
                        autoComplete="address-line1"
                        aria-invalid={Boolean(errors.street)}
                        maxLength={120}
                      />
                    </Field>
                    <div className="grid grid-cols-[1fr_2fr] gap-3">
                      <Field id="ck-number" label="Número *" error={errors.number}>
                        <input
                          id="ck-number"
                          className={inputCls}
                          value={form.number}
                          onChange={(e) => set("number", e.target.value)}
                          inputMode="numeric"
                          aria-invalid={Boolean(errors.number)}
                          maxLength={20}
                        />
                      </Field>
                      <Field id="ck-district" label="Bairro *" error={errors.district}>
                        <input
                          id="ck-district"
                          className={inputCls}
                          value={form.district}
                          onChange={(e) => set("district", e.target.value)}
                          aria-invalid={Boolean(errors.district)}
                          maxLength={80}
                        />
                      </Field>
                    </div>
                    <Field id="ck-complement" label="Complemento">
                      <input
                        id="ck-complement"
                        className={inputCls}
                        value={form.complement}
                        onChange={(e) => set("complement", e.target.value)}
                        autoComplete="address-line2"
                        maxLength={80}
                      />
                    </Field>
                    <Field id="ck-reference" label="Ponto de referência">
                      <input
                        id="ck-reference"
                        className={inputCls}
                        value={form.reference}
                        onChange={(e) => set("reference", e.target.value)}
                        maxLength={120}
                      />
                    </Field>
                  </div>
                ) : null}

                {settings.paymentMethods.length > 0 ? (
                  <Field id="ck-payment" label="Forma de pagamento">
                    <select
                      id="ck-payment"
                      className={inputCls}
                      value={form.payment}
                      onChange={(e) => set("payment", e.target.value)}
                    >
                      <option value="">Combinar no atendimento</option>
                      {settings.paymentMethods.map((m) => (
                        <option key={m} value={m}>
                          {m}
                        </option>
                      ))}
                    </select>
                  </Field>
                ) : null}
                {/^dinheiro$/i.test(form.payment) ? (
                  <Field id="ck-changeFor" label="Troco para quanto?">
                    <input
                      id="ck-changeFor"
                      className={inputCls}
                      value={form.changeFor}
                      onChange={(e) => set("changeFor", e.target.value)}
                      inputMode="decimal"
                      placeholder="Ex.: R$ 100,00"
                      maxLength={20}
                    />
                  </Field>
                ) : null}
                <p className="text-xs text-brand-gray">
                  Usamos seus dados apenas para preparar e entregar o pedido. Veja a Política de
                  Privacidade.
                </p>
              </form>
            ) : (
              <div className="space-y-4">
                <div className="rounded-2xl border border-white/10 bg-brand-black p-4 text-sm">
                  <p className="font-semibold">Confira seu pedido</p>
                  <p className="text-brand-gray">
                    {form.name} · {form.mode === "entrega" ? "Entrega" : "Retirada no local"}
                  </p>
                  {form.mode === "entrega" ? (
                    <p className="text-brand-gray">
                      {form.street}, {form.number} – {form.district}
                      {form.complement ? ` (${form.complement})` : ""}
                    </p>
                  ) : null}
                  {form.payment ? (
                    <p className="text-brand-gray">Pagamento: {form.payment}</p>
                  ) : null}
                </div>
                <ul className="divide-y divide-white/10 rounded-2xl border border-white/10 bg-brand-black px-4">
                  {cart.items.map((item) => (
                    <li key={item.key} className="py-3 text-sm">
                      <div className="flex justify-between gap-3">
                        <span className="font-semibold">
                          {item.quantity}x {item.name}
                        </span>
                        <span>{formatBRL(itemTotal(item))}</span>
                      </div>
                      {item.addons.map((a) => (
                        <p key={a.id} className="text-brand-gray">
                          + {a.name} ({formatBRL(a.priceCents)})
                        </p>
                      ))}
                      {item.removed.length > 0 ? (
                        <p className="text-brand-gray">Sem: {item.removed.join(", ")}</p>
                      ) : null}
                      {item.notes ? (
                        <p className="italic text-brand-gray">Obs.: {item.notes}</p>
                      ) : null}
                    </li>
                  ))}
                </ul>
                <details className="rounded-2xl border border-white/10 bg-brand-black p-4 text-sm">
                  <summary className="cursor-pointer font-semibold">
                    Ver mensagem que será enviada
                  </summary>
                  <pre className="mt-3 whitespace-pre-wrap break-words font-sans text-xs text-brand-gray">
                    {message}
                  </pre>
                </details>
              </div>
            )}
          </div>

          {step === "done" && done ? (
            <div className="space-y-3 border-t border-white/10 bg-brand-black-2 p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
              {whatsapp ? (
                <a
                  href={buildWhatsAppUrl(whatsapp, done.message)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex h-14 w-full items-center justify-center gap-2 rounded-full bg-[#25D366] font-bold uppercase tracking-wide text-brand-black transition hover:brightness-110"
                >
                  <WhatsappIcon className="h-5 w-5" />
                  Enviar no WhatsApp
                </a>
              ) : null}
              <button
                type="button"
                onClick={startNewOrder}
                className="flex h-12 w-full items-center justify-center rounded-full border border-white/15 font-semibold text-white transition hover:border-white/40"
              >
                Fazer novo pedido
              </button>
            </div>
          ) : !empty ? (
            <div className="space-y-3 border-t border-white/10 bg-brand-black-2 p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
              {step === "cart" && couponPromos.length > 0 ? (
                <div>
                  <div className="flex gap-2">
                    <label htmlFor="cupom" className="sr-only">
                      Cupom de desconto
                    </label>
                    <input
                      id="cupom"
                      value={couponInput}
                      onChange={(e) => setCouponInput(e.target.value)}
                      placeholder="Cupom de desconto"
                      className="h-11 flex-1 rounded-full border border-white/15 bg-brand-black px-4 text-sm uppercase text-white placeholder:normal-case placeholder:text-white/40 focus:border-brand-orange focus:outline-none"
                      maxLength={30}
                    />
                    <button
                      type="button"
                      onClick={applyCoupon}
                      className="h-11 rounded-full border border-brand-orange px-4 text-sm font-bold text-brand-amber hover:bg-brand-orange hover:text-brand-black"
                    >
                      Aplicar
                    </button>
                  </div>
                  {couponError ? <p className="mt-1 text-xs text-red-300">{couponError}</p> : null}
                  {coupon ? (
                    <p className="mt-1 text-xs text-green-300">
                      Cupom {coupon.couponCode} aplicado ({coupon.discountPercent}% de desconto).
                    </p>
                  ) : null}
                </div>
              ) : null}

              <dl className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <dt className="text-brand-gray">Subtotal</dt>
                  <dd>{formatBRL(subtotal)}</dd>
                </div>
                {discount > 0 ? (
                  <div className="flex justify-between text-green-300">
                    <dt>Desconto</dt>
                    <dd>-{formatBRL(discount)}</dd>
                  </div>
                ) : null}
                {step !== "cart" && form.mode === "entrega" ? (
                  <div className="flex justify-between">
                    <dt className="text-brand-gray">Taxa de entrega</dt>
                    <dd>
                      {deliveryFeeCents !== null ? formatBRL(deliveryFeeCents) : "A combinar"}
                    </dd>
                  </div>
                ) : null}
                <div className="flex justify-between pt-1 text-lg font-bold">
                  <dt>Total</dt>
                  <dd className="text-brand-amber">{formatBRL(total)}</dd>
                </div>
              </dl>

              {step === "cart" ? (
                <button
                  type="button"
                  onClick={() => setStep("checkout")}
                  className="glow-orange flex h-14 w-full items-center justify-center rounded-full bg-brand-orange font-bold uppercase tracking-wide text-brand-black transition hover:bg-brand-amber"
                >
                  Continuar
                </button>
              ) : step === "checkout" ? (
                <button
                  type="submit"
                  form="form-checkout"
                  className="glow-orange flex h-14 w-full items-center justify-center rounded-full bg-brand-orange font-bold uppercase tracking-wide text-brand-black transition hover:bg-brand-amber"
                >
                  Revisar pedido
                </button>
              ) : acceptsOrders ? (
                <>
                  <button
                    type="button"
                    onClick={() => void submit()}
                    disabled={sending}
                    className={cn(
                      "flex h-14 w-full items-center justify-center gap-2 rounded-full font-bold uppercase tracking-wide text-brand-black transition hover:brightness-110 disabled:opacity-60",
                      whatsapp ? "bg-[#25D366]" : "bg-brand-orange",
                    )}
                  >
                    {sending ? (
                      <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
                    ) : whatsapp ? (
                      <WhatsappIcon className="h-5 w-5" />
                    ) : null}
                    {sending ? "Enviando..." : "Enviar pedido"}
                  </button>
                  <p className="text-center text-xs text-brand-gray">
                    {whatsapp
                      ? "Registramos o pedido e abrimos o WhatsApp com a mensagem pronta."
                      : "O pedido vai direto para a lanchonete."}{" "}
                    A confirmação é feita pela lanchonete.
                  </p>
                </>
              ) : (
                <div
                  className="rounded-2xl border border-brand-amber/30 bg-brand-amber/10 p-3 text-center text-sm text-brand-amber"
                  role="status"
                >
                  Pedidos pelo site estarão disponíveis em breve. O WhatsApp oficial ainda não foi
                  cadastrado.
                </div>
              )}
            </div>
          ) : null}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

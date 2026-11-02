import { useState } from "react";
import { Loader2, Pencil, Plus, Trash2, X } from "lucide-react";
import { toast } from "sonner";

import { isPromotionLive } from "@/services/catalog";
import { deletePromotion, savePromotion, type PromotionInput } from "@/services/admin";
import type { Promotion } from "@/types/catalog";

import { btnGhost, btnPrimary, errorMessage, FormField, inputCls, Panel, Toggle } from "./ui";

/** ISO -> valor de <input type="datetime-local"> no fuso local. */
function toLocalInput(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const empty: PromotionInput = {
  title: "",
  subtitle: "",
  couponCode: "",
  discountPercent: null,
  active: false,
  startsAt: "",
  endsAt: "",
};

export function PromotionsPanel({
  promotions,
  onChange,
}: {
  promotions: Promotion[];
  onChange: (p: Promotion[]) => void;
}) {
  const [editing, setEditing] = useState<{ id: string | null; draft: PromotionInput } | null>(null);
  const [saving, setSaving] = useState(false);

  const update = <K extends keyof PromotionInput>(key: K, value: PromotionInput[K]) =>
    setEditing((e) => (e ? { ...e, draft: { ...e.draft, [key]: value } } : e));

  const submit = async () => {
    if (!editing) return;
    setSaving(true);
    try {
      const saved = await savePromotion(editing.id, editing.draft);
      onChange(
        editing.id
          ? promotions.map((p) => (p.id === saved.id ? saved : p))
          : [saved, ...promotions],
      );
      toast.success("Promoção salva.");
      setEditing(null);
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const remove = async (p: Promotion) => {
    if (!window.confirm(`Excluir a promoção "${p.title}"?`)) return;
    try {
      await deletePromotion(p.id);
      onChange(promotions.filter((x) => x.id !== p.id));
      toast.success("Promoção excluída.");
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  if (editing) {
    const d = editing.draft;
    return (
      <Panel
        title={editing.id ? "Editar promoção" : "Nova promoção"}
        actions={
          <button type="button" className={btnGhost} onClick={() => setEditing(null)}>
            <X className="h-4 w-4" aria-hidden="true" /> Cancelar
          </button>
        }
      >
        <form
          className="grid gap-4 md:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault();
            void submit();
          }}
        >
          <FormField label="Título *" htmlFor="pr-title" className="md:col-span-2">
            <input
              id="pr-title"
              className={inputCls}
              value={d.title}
              onChange={(e) => update("title", e.target.value)}
              maxLength={80}
              required
            />
          </FormField>
          <FormField label="Descrição / regras" htmlFor="pr-sub" className="md:col-span-2">
            <input
              id="pr-sub"
              className={inputCls}
              value={d.subtitle}
              onChange={(e) => update("subtitle", e.target.value)}
              maxLength={200}
            />
          </FormField>
          <FormField label="Cupom" htmlFor="pr-code" hint="Opcional. Ex.: BIG10">
            <input
              id="pr-code"
              className={`${inputCls} uppercase`}
              value={d.couponCode}
              onChange={(e) =>
                update("couponCode", e.target.value.toUpperCase().replace(/\s/g, ""))
              }
              maxLength={20}
            />
          </FormField>
          <FormField
            label="Desconto (%)"
            htmlFor="pr-pct"
            hint="Opcional. Aplicado ao subtotal com o cupom."
          >
            <input
              id="pr-pct"
              className={inputCls}
              inputMode="numeric"
              value={d.discountPercent === null ? "" : String(d.discountPercent)}
              onChange={(e) => {
                const n = Number.parseInt(e.target.value, 10);
                update("discountPercent", Number.isFinite(n) ? n : null);
              }}
            />
          </FormField>
          <FormField label="Início" htmlFor="pr-start">
            <input
              id="pr-start"
              type="datetime-local"
              className={inputCls}
              value={d.startsAt}
              onChange={(e) => update("startsAt", e.target.value)}
            />
          </FormField>
          <FormField label="Fim" htmlFor="pr-end">
            <input
              id="pr-end"
              type="datetime-local"
              className={inputCls}
              value={d.endsAt}
              onChange={(e) => update("endsAt", e.target.value)}
            />
          </FormField>
          <Toggle
            id="pr-active"
            label="Promoção ativa (aparece no site)"
            checked={d.active}
            onChange={(v) => update("active", v)}
          />
          <div className="flex justify-end md:col-span-2">
            <button type="submit" className={btnPrimary} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}
              Salvar promoção
            </button>
          </div>
        </form>
      </Panel>
    );
  }

  return (
    <Panel
      title="Promoções e cupons"
      actions={
        <button
          type="button"
          className={btnPrimary}
          onClick={() => setEditing({ id: null, draft: empty })}
        >
          <Plus className="h-4 w-4" aria-hidden="true" /> Nova promoção
        </button>
      }
    >
      <p className="mb-4 text-sm text-brand-gray">
        Promoções só aparecem no site quando estão ativas e dentro do período definido.
      </p>
      {promotions.length === 0 ? (
        <p className="py-8 text-center text-brand-gray">Nenhuma promoção cadastrada.</p>
      ) : (
        <ul className="divide-y divide-white/10">
          {promotions.map((p) => {
            const live = isPromotionLive(p);
            return (
              <li key={p.id} className="flex items-center gap-3 py-3">
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-white">{p.title}</p>
                  <p className="text-sm text-brand-gray">
                    {p.couponCode ? `Cupom ${p.couponCode}` : "Sem cupom"}
                    {p.discountPercent ? ` · ${p.discountPercent}%` : ""}
                  </p>
                </div>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${live ? "bg-green-500/15 text-green-300" : "bg-white/10 text-brand-gray"}`}
                >
                  {live ? "No ar" : "Inativa"}
                </span>
                <button
                  type="button"
                  onClick={() =>
                    setEditing({
                      id: p.id,
                      draft: {
                        title: p.title,
                        subtitle: p.subtitle,
                        couponCode: p.couponCode ?? "",
                        discountPercent: p.discountPercent,
                        active: p.active,
                        startsAt: toLocalInput(p.startsAt),
                        endsAt: toLocalInput(p.endsAt),
                      },
                    })
                  }
                  className="inline-flex h-9 w-9 items-center justify-center rounded-full hover:bg-white/5"
                  aria-label={`Editar ${p.title}`}
                >
                  <Pencil className="h-4 w-4" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  onClick={() => void remove(p)}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-full text-red-300 hover:bg-red-500/10"
                  aria-label={`Excluir ${p.title}`}
                >
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </Panel>
  );
}

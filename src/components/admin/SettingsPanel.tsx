import { useState } from "react";
import { Loader2, Plus, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";

import type { SiteSettings } from "@/config/settings";
import { formatBRL, parseBRLToCents } from "@/lib/format";
import { saveSettings } from "@/services/admin";

import {
  btnGhost,
  btnPrimary,
  errorMessage,
  FormField,
  ImageInput,
  inputCls,
  Panel,
  textareaCls,
  Toggle,
} from "./ui";

function Group({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <fieldset className="rounded-xl border border-white/10 p-4">
      <legend className="px-2 font-display text-lg uppercase tracking-wide text-brand-amber">
        {title}
      </legend>
      {description ? <p className="mb-3 text-xs text-brand-gray">{description}</p> : null}
      <div className="grid gap-4 md:grid-cols-2">{children}</div>
    </fieldset>
  );
}

export function SettingsPanel({
  settings,
  onSaved,
}: {
  settings: SiteSettings;
  onSaved: (s: SiteSettings) => void;
}) {
  const [s, setS] = useState<SiteSettings>(settings);
  const [fee, setFee] = useState(
    settings.service.deliveryFeeCents === null ? "" : formatBRL(settings.service.deliveryFeeCents),
  );
  const [payments, setPayments] = useState(settings.paymentMethods.join(", "));
  const [saving, setSaving] = useState(false);

  const patch = <K extends keyof SiteSettings>(
    key: K,
    value: Partial<SiteSettings[K]> | SiteSettings[K],
  ) =>
    setS((cur) => {
      const prev = cur[key];
      const next =
        prev &&
        typeof prev === "object" &&
        !Array.isArray(prev) &&
        value &&
        typeof value === "object" &&
        !Array.isArray(value)
          ? { ...prev, ...value }
          : value;
      return { ...cur, [key]: next } as SiteSettings;
    });

  const submit = async () => {
    let deliveryFeeCents: number | null = null;
    if (fee.trim()) {
      deliveryFeeCents = parseBRLToCents(fee);
      if (deliveryFeeCents === null) {
        toast.error("Taxa de entrega inválida. Ex.: 5,00 — ou deixe vazio.");
        return;
      }
    }
    const next: SiteSettings = {
      ...s,
      whatsapp: s.whatsapp.replace(/\D/g, ""),
      service: { ...s.service, deliveryFeeCents },
      paymentMethods: payments
        .split(",")
        .map((p) => p.trim())
        .filter(Boolean),
      hours: s.hours.filter((h) => h.label.trim() && h.value.trim()),
    };
    setSaving(true);
    try {
      const saved = await saveSettings(next);
      setS(saved);
      onSaved(saved);
      toast.success("Configurações salvas. Recarregue o site para ver as mudanças.");
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Panel title="Configurações do site">
      <form
        className="space-y-6"
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
      >
        <Group
          title="Contato e WhatsApp"
          description="Sem um WhatsApp válido, o botão de finalizar pedido fica desativado."
        >
          <FormField label="Nome do estabelecimento" htmlFor="s-name">
            <input
              id="s-name"
              className={inputCls}
              value={s.businessName}
              onChange={(e) => patch("businessName", e.target.value)}
              maxLength={80}
            />
          </FormField>
          <FormField
            label="WhatsApp para pedidos"
            htmlFor="s-wa"
            hint="DDI + DDD + número. Ex.: 5511999998888"
          >
            <input
              id="s-wa"
              className={inputCls}
              value={s.whatsapp}
              onChange={(e) => patch("whatsapp", e.target.value)}
              inputMode="tel"
            />
          </FormField>
          <FormField label="Telefone exibido" htmlFor="s-phone">
            <input
              id="s-phone"
              className={inputCls}
              value={s.phone.display}
              onChange={(e) => patch("phone", { display: e.target.value })}
            />
          </FormField>
          <Toggle
            id="s-phone-ok"
            label="Telefone confirmado"
            checked={s.phone.confirmed}
            onChange={(v) => patch("phone", { confirmed: v })}
          />
          <FormField
            label="Descrição curta (rodapé e SEO)"
            htmlFor="s-desc"
            className="md:col-span-2"
          >
            <textarea
              id="s-desc"
              className={textareaCls}
              rows={2}
              value={s.shortDescription}
              onChange={(e) => patch("shortDescription", e.target.value)}
              maxLength={240}
            />
          </FormField>
        </Group>

        <Group title="Endereço">
          <FormField label="Rua e número" htmlFor="s-street">
            <input
              id="s-street"
              className={inputCls}
              value={s.address.street}
              onChange={(e) => patch("address", { street: e.target.value })}
            />
          </FormField>
          <FormField label="Bairro" htmlFor="s-district">
            <input
              id="s-district"
              className={inputCls}
              value={s.address.district}
              onChange={(e) => patch("address", { district: e.target.value })}
            />
          </FormField>
          <FormField label="Cidade" htmlFor="s-city">
            <input
              id="s-city"
              className={inputCls}
              value={s.address.city}
              onChange={(e) => patch("address", { city: e.target.value })}
            />
          </FormField>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="UF" htmlFor="s-uf">
              <input
                id="s-uf"
                className={inputCls}
                value={s.address.state}
                maxLength={2}
                onChange={(e) => patch("address", { state: e.target.value.toUpperCase() })}
              />
            </FormField>
            <FormField label="CEP" htmlFor="s-zip">
              <input
                id="s-zip"
                className={inputCls}
                value={s.address.zip}
                maxLength={10}
                onChange={(e) => patch("address", { zip: e.target.value })}
              />
            </FormField>
          </div>
          <FormField label="Link do Google Maps (botão Como chegar)" htmlFor="s-maps">
            <input
              id="s-maps"
              className={inputCls}
              value={s.mapsUrl}
              onChange={(e) => patch("mapsUrl", e.target.value)}
              inputMode="url"
            />
          </FormField>
          <FormField label="Link das avaliações no Google" htmlFor="s-reviews">
            <input
              id="s-reviews"
              className={inputCls}
              value={s.reviewsUrl}
              onChange={(e) => patch("reviewsUrl", e.target.value)}
              inputMode="url"
            />
          </FormField>
          <Toggle
            id="s-addr-ok"
            label="Endereço confirmado"
            checked={s.address.confirmed}
            onChange={(v) => patch("address", { confirmed: v })}
          />
        </Group>

        <Group title="Horário de funcionamento">
          <div className="space-y-2 md:col-span-2">
            {s.hours.map((h, i) => (
              <div key={i} className="flex gap-2">
                <input
                  aria-label="Dias"
                  className={inputCls}
                  value={h.label}
                  placeholder="Seg a Sex"
                  onChange={(e) =>
                    patch(
                      "hours",
                      s.hours.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)),
                    )
                  }
                  maxLength={40}
                />
                <input
                  aria-label="Horário"
                  className={inputCls}
                  value={h.value}
                  placeholder="18h às 23h"
                  onChange={(e) =>
                    patch(
                      "hours",
                      s.hours.map((x, j) => (j === i ? { ...x, value: e.target.value } : x)),
                    )
                  }
                  maxLength={60}
                />
                <button
                  type="button"
                  className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-red-300 hover:bg-red-500/10"
                  aria-label="Remover horário"
                  onClick={() =>
                    patch(
                      "hours",
                      s.hours.filter((_, j) => j !== i),
                    )
                  }
                >
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
            ))}
            <button
              type="button"
              className={`${btnGhost} h-9 text-xs`}
              onClick={() => patch("hours", [...s.hours, { label: "", value: "" }])}
            >
              <Plus className="h-4 w-4" aria-hidden="true" /> Adicionar linha
            </button>
          </div>
          <Toggle
            id="s-hours-ok"
            label="Horários confirmados (exibir no site)"
            checked={s.hoursConfirmed}
            onChange={(v) => patch("hoursConfirmed", v)}
          />
        </Group>

        <Group title="Entrega, retirada e pagamento">
          <Toggle
            id="s-delivery"
            label="Faz entrega"
            checked={s.service.delivery}
            onChange={(v) => patch("service", { delivery: v })}
          />
          <Toggle
            id="s-pickup"
            label="Permite retirada no local"
            checked={s.service.pickup}
            onChange={(v) => patch("service", { pickup: v })}
          />
          <FormField
            label="Taxa de entrega fixa (R$)"
            htmlFor="s-fee"
            hint="Deixe vazio para “a combinar”."
          >
            <input
              id="s-fee"
              className={inputCls}
              value={fee}
              onChange={(e) => setFee(e.target.value)}
              inputMode="decimal"
            />
          </FormField>
          <FormField
            label="Formas de pagamento"
            htmlFor="s-pay"
            hint="Separe por vírgula. Ex.: Pix, Dinheiro, Cartão"
          >
            <input
              id="s-pay"
              className={inputCls}
              value={payments}
              onChange={(e) => setPayments(e.target.value)}
            />
          </FormField>
          <FormField label="Observações sobre entrega" htmlFor="s-notes" className="md:col-span-2">
            <input
              id="s-notes"
              className={inputCls}
              value={s.service.notes}
              onChange={(e) => patch("service", { notes: e.target.value })}
              maxLength={240}
            />
          </FormField>
          <Toggle
            id="s-service-ok"
            label="Informações de entrega confirmadas"
            checked={s.service.confirmed}
            onChange={(v) => patch("service", { confirmed: v })}
          />
        </Group>

        <Group
          title="Redes sociais"
          description="Deixe vazio para não exibir. Use apenas perfis oficiais."
        >
          <FormField label="Instagram" htmlFor="s-ig">
            <input
              id="s-ig"
              className={inputCls}
              value={s.social.instagram}
              onChange={(e) => patch("social", { instagram: e.target.value })}
              placeholder="https://instagram.com/..."
            />
          </FormField>
          <FormField label="Facebook" htmlFor="s-fb">
            <input
              id="s-fb"
              className={inputCls}
              value={s.social.facebook}
              onChange={(e) => patch("social", { facebook: e.target.value })}
              placeholder="https://facebook.com/..."
            />
          </FormField>
          <FormField label="TikTok" htmlFor="s-tt">
            <input
              id="s-tt"
              className={inputCls}
              value={s.social.tiktok}
              onChange={(e) => patch("social", { tiktok: e.target.value })}
              placeholder="https://tiktok.com/@..."
            />
          </FormField>
        </Group>

        <Group title="Destaque principal (topo)">
          <FormField label="Chamada manuscrita" htmlFor="s-kicker">
            <input
              id="s-kicker"
              className={inputCls}
              value={s.hero.kicker}
              onChange={(e) => patch("hero", { kicker: e.target.value })}
              maxLength={60}
            />
          </FormField>
          <FormField label="Destaque em laranja" htmlFor="s-hl">
            <input
              id="s-hl"
              className={inputCls}
              value={s.hero.highlight}
              onChange={(e) => patch("hero", { highlight: e.target.value })}
              maxLength={40}
            />
          </FormField>
          <FormField label="Título" htmlFor="s-title" className="md:col-span-2">
            <input
              id="s-title"
              className={inputCls}
              value={s.hero.title}
              onChange={(e) => patch("hero", { title: e.target.value })}
              maxLength={80}
            />
          </FormField>
          <FormField label="Subtítulo" htmlFor="s-sub" className="md:col-span-2">
            <input
              id="s-sub"
              className={inputCls}
              value={s.hero.subtitle}
              onChange={(e) => patch("hero", { subtitle: e.target.value })}
              maxLength={200}
            />
          </FormField>
          <FormField label="Foto principal" htmlFor="s-hero-img" className="md:col-span-2">
            <ImageInput
              id="s-hero-img"
              value={s.hero.imageUrl}
              onChange={(v) => patch("hero", { imageUrl: v })}
              folder="banners"
            />
          </FormField>
        </Group>

        <Group title="Banner promocional">
          <FormField label="Título" htmlFor="s-pb-title">
            <input
              id="s-pb-title"
              className={inputCls}
              value={s.promoBanner.title}
              onChange={(e) => patch("promoBanner", { title: e.target.value })}
              maxLength={80}
            />
          </FormField>
          <FormField label="Subtítulo" htmlFor="s-pb-sub">
            <input
              id="s-pb-sub"
              className={inputCls}
              value={s.promoBanner.subtitle}
              onChange={(e) => patch("promoBanner", { subtitle: e.target.value })}
              maxLength={200}
            />
          </FormField>
          <FormField label="Imagem" htmlFor="s-pb-img" className="md:col-span-2">
            <ImageInput
              id="s-pb-img"
              value={s.promoBanner.imageUrl}
              onChange={(v) => patch("promoBanner", { imageUrl: v })}
              folder="banners"
            />
          </FormField>
        </Group>

        <Group title="Sobre nós">
          <FormField label="Título" htmlFor="s-ab-title" className="md:col-span-2">
            <input
              id="s-ab-title"
              className={inputCls}
              value={s.about.title}
              onChange={(e) => patch("about", { title: e.target.value })}
              maxLength={80}
            />
          </FormField>
          <FormField
            label="Texto"
            htmlFor="s-ab-text"
            hint="Deixe uma linha em branco para separar parágrafos."
            className="md:col-span-2"
          >
            <textarea
              id="s-ab-text"
              className={textareaCls}
              rows={6}
              value={s.about.text}
              onChange={(e) => patch("about", { text: e.target.value })}
              maxLength={1200}
            />
          </FormField>
          <FormField label="Imagem" htmlFor="s-ab-img" className="md:col-span-2">
            <ImageInput
              id="s-ab-img"
              value={s.about.imageUrl}
              onChange={(v) => patch("about", { imageUrl: v })}
              folder="banners"
            />
          </FormField>
        </Group>

        <div className="sticky bottom-4 flex justify-end">
          <button type="submit" className={`${btnPrimary} shadow-xl`} disabled={saving}>
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <Save className="h-4 w-4" aria-hidden="true" />
            )}
            Salvar configurações
          </button>
        </div>
      </form>
    </Panel>
  );
}

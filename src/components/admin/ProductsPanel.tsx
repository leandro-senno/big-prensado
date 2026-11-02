import { useState } from "react";
import { Loader2, Pencil, Plus, Star, Trash2, X } from "lucide-react";
import { toast } from "sonner";

import { formatBRL, parseBRLToCents } from "@/lib/format";
import { cn } from "@/lib/utils";
import { deleteProduct, patchProduct, saveProduct, type ProductInput } from "@/services/admin";
import type { Category, Product } from "@/types/catalog";

import {
  btnDanger,
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

interface Draft {
  name: string;
  categoryId: string;
  description: string;
  ingredients: string;
  price: string;
  imageUrl: string;
  available: boolean;
  featured: boolean;
  badge: string;
  sortOrder: string;
  active: boolean;
  addons: { id: string; name: string; price: string }[];
  removable: string;
}

function toDraft(p: Product | null, categories: Category[]): Draft {
  if (!p) {
    return {
      name: "",
      categoryId: categories[0]?.id ?? "",
      description: "",
      ingredients: "",
      price: "",
      imageUrl: "",
      available: true,
      featured: false,
      badge: "",
      sortOrder: "0",
      active: true,
      addons: [],
      removable: "",
    };
  }
  return {
    name: p.name,
    categoryId: p.categoryId,
    description: p.description,
    ingredients: p.ingredients,
    price: (p.priceCents / 100).toFixed(2).replace(".", ","),
    imageUrl: p.imageUrl ?? "",
    available: p.available,
    featured: p.featured,
    badge: p.badge ?? "",
    sortOrder: String(p.sortOrder),
    active: p.active,
    addons: p.addons.map((a) => ({
      id: a.id,
      name: a.name,
      price: (a.priceCents / 100).toFixed(2).replace(".", ","),
    })),
    removable: p.removableIngredients.join(", "),
  };
}

function newId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function ProductsPanel({
  products,
  categories,
  onChange,
}: {
  products: Product[];
  categories: Category[];
  onChange: (products: Product[]) => void;
}) {
  const [editing, setEditing] = useState<{ id: string | null; draft: Draft } | null>(null);
  const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState("");

  const catName = (id: string) => categories.find((c) => c.id === id)?.name ?? "—";

  const startEdit = (p: Product | null) => {
    if (categories.length === 0) {
      toast.error("Cadastre uma categoria antes de criar produtos.");
      return;
    }
    setEditing({ id: p?.id ?? null, draft: toDraft(p, categories) });
  };

  const update = <K extends keyof Draft>(key: K, value: Draft[K]) =>
    setEditing((e) => (e ? { ...e, draft: { ...e.draft, [key]: value } } : e));

  const submit = async () => {
    if (!editing) return;
    const d = editing.draft;
    const priceCents = parseBRLToCents(d.price);
    if (priceCents === null) {
      toast.error("Informe um preço válido, ex.: 29,90");
      return;
    }
    const addons: ProductInput["addons"] = [];
    for (const a of d.addons) {
      if (!a.name.trim()) continue;
      const cents = parseBRLToCents(a.price || "0");
      if (cents === null) {
        toast.error(`Preço inválido no adicional "${a.name}".`);
        return;
      }
      addons.push({ id: a.id, name: a.name.trim(), priceCents: cents });
    }
    const input: ProductInput = {
      name: d.name,
      categoryId: d.categoryId,
      description: d.description,
      ingredients: d.ingredients,
      priceCents,
      imageUrl: d.imageUrl.trim(),
      available: d.available,
      featured: d.featured,
      badge: d.badge,
      sortOrder: Number.parseInt(d.sortOrder, 10) || 0,
      active: d.active,
      addons,
      removableIngredients: d.removable
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
    };
    setSaving(true);
    try {
      const saved = await saveProduct(editing.id, input);
      onChange(
        editing.id ? products.map((p) => (p.id === saved.id ? saved : p)) : [...products, saved],
      );
      toast.success("Produto salvo.");
      setEditing(null);
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const quickToggle = async (p: Product, field: "available" | "featured") => {
    try {
      const saved = await patchProduct(
        p.id,
        field === "available" ? { available: !p.available } : { featured: !p.featured },
      );
      onChange(products.map((x) => (x.id === saved.id ? saved : x)));
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  const remove = async (p: Product) => {
    if (!window.confirm(`Excluir "${p.name}"? Esta ação não pode ser desfeita.`)) return;
    try {
      await deleteProduct(p.id);
      onChange(products.filter((x) => x.id !== p.id));
      toast.success("Produto excluído.");
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  if (editing) {
    const d = editing.draft;
    return (
      <Panel
        title={editing.id ? "Editar produto" : "Novo produto"}
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
          <FormField label="Nome *" htmlFor="p-name">
            <input
              id="p-name"
              className={inputCls}
              value={d.name}
              onChange={(e) => update("name", e.target.value)}
              maxLength={80}
              required
            />
          </FormField>
          <FormField label="Categoria *" htmlFor="p-cat">
            <select
              id="p-cat"
              className={inputCls}
              value={d.categoryId}
              onChange={(e) => update("categoryId", e.target.value)}
            >
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                  {!c.active ? " (inativa)" : ""}
                </option>
              ))}
            </select>
          </FormField>
          <FormField label="Preço (R$) *" htmlFor="p-price" hint="Ex.: 29,90">
            <input
              id="p-price"
              className={inputCls}
              value={d.price}
              onChange={(e) => update("price", e.target.value)}
              inputMode="decimal"
              required
            />
          </FormField>
          <FormField
            label="Selo de destaque"
            htmlFor="p-badge"
            hint="Opcional. Ex.: Mais pedido, Novidade"
          >
            <input
              id="p-badge"
              className={inputCls}
              value={d.badge}
              onChange={(e) => update("badge", e.target.value)}
              maxLength={24}
            />
          </FormField>
          <FormField label="Ingredientes" htmlFor="p-ing" className="md:col-span-2">
            <input
              id="p-ing"
              className={inputCls}
              value={d.ingredients}
              onChange={(e) => update("ingredients", e.target.value)}
              maxLength={300}
            />
          </FormField>
          <FormField label="Descrição" htmlFor="p-desc" className="md:col-span-2">
            <textarea
              id="p-desc"
              className={textareaCls}
              rows={3}
              value={d.description}
              onChange={(e) => update("description", e.target.value)}
              maxLength={400}
            />
          </FormField>
          <FormField label="Foto" htmlFor="p-img" className="md:col-span-2">
            <ImageInput
              id="p-img"
              value={d.imageUrl}
              onChange={(v) => update("imageUrl", v)}
              folder="produtos"
            />
          </FormField>

          <fieldset className="md:col-span-2">
            <legend className="mb-2 text-sm font-medium text-white">Adicionais</legend>
            <div className="space-y-2">
              {d.addons.map((a, i) => (
                <div key={a.id} className="flex gap-2">
                  <input
                    aria-label={`Nome do adicional ${i + 1}`}
                    className={inputCls}
                    value={a.name}
                    placeholder="Ex.: Bacon extra"
                    maxLength={60}
                    onChange={(e) =>
                      update(
                        "addons",
                        d.addons.map((x) => (x.id === a.id ? { ...x, name: e.target.value } : x)),
                      )
                    }
                  />
                  <input
                    aria-label={`Preço do adicional ${i + 1}`}
                    className={cn(inputCls, "w-28")}
                    value={a.price}
                    placeholder="5,00"
                    inputMode="decimal"
                    onChange={(e) =>
                      update(
                        "addons",
                        d.addons.map((x) => (x.id === a.id ? { ...x, price: e.target.value } : x)),
                      )
                    }
                  />
                  <button
                    type="button"
                    className={cn(btnDanger, "w-11 shrink-0 px-0")}
                    aria-label="Remover adicional"
                    onClick={() =>
                      update(
                        "addons",
                        d.addons.filter((x) => x.id !== a.id),
                      )
                    }
                  >
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>
              ))}
              <button
                type="button"
                className={cn(btnGhost, "h-9 text-xs")}
                onClick={() =>
                  update("addons", [...d.addons, { id: newId(), name: "", price: "" }])
                }
              >
                <Plus className="h-4 w-4" aria-hidden="true" /> Adicionar opcional
              </button>
            </div>
          </fieldset>

          <FormField
            label="Ingredientes que podem ser retirados"
            htmlFor="p-rem"
            hint="Separe por vírgula. Ex.: Tomate, Alface, Cebola"
            className="md:col-span-2"
          >
            <input
              id="p-rem"
              className={inputCls}
              value={d.removable}
              onChange={(e) => update("removable", e.target.value)}
            />
          </FormField>

          <FormField label="Ordem de exibição" htmlFor="p-order" hint="Menor aparece primeiro">
            <input
              id="p-order"
              className={inputCls}
              value={d.sortOrder}
              onChange={(e) => update("sortOrder", e.target.value)}
              inputMode="numeric"
            />
          </FormField>
          <div className="flex flex-col justify-center">
            <Toggle
              id="p-available"
              label="Disponível (desmarque para Esgotado)"
              checked={d.available}
              onChange={(v) => update("available", v)}
            />
            <Toggle
              id="p-featured"
              label="Destaque em “Os queridinhos da galera”"
              checked={d.featured}
              onChange={(v) => update("featured", v)}
            />
            <Toggle
              id="p-active"
              label="Visível no site"
              checked={d.active}
              onChange={(v) => update("active", v)}
            />
          </div>

          <div className="flex justify-end gap-2 md:col-span-2">
            <button type="button" className={btnGhost} onClick={() => setEditing(null)}>
              Cancelar
            </button>
            <button type="submit" className={btnPrimary} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}
              Salvar produto
            </button>
          </div>
        </form>
      </Panel>
    );
  }

  const q = filter.trim().toLowerCase();
  const list = q ? products.filter((p) => p.name.toLowerCase().includes(q)) : products;

  return (
    <Panel
      title={`Produtos (${products.length})`}
      actions={
        <button type="button" className={btnPrimary} onClick={() => startEdit(null)}>
          <Plus className="h-4 w-4" aria-hidden="true" /> Novo produto
        </button>
      }
    >
      <label htmlFor="filtro-produtos" className="sr-only">
        Filtrar produtos
      </label>
      <input
        id="filtro-produtos"
        className={cn(inputCls, "mb-4")}
        placeholder="Filtrar por nome..."
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
      />
      {list.length === 0 ? (
        <p className="py-8 text-center text-brand-gray">Nenhum produto cadastrado.</p>
      ) : (
        <ul className="divide-y divide-white/10">
          {list.map((p) => (
            <li key={p.id} className="flex flex-wrap items-center gap-3 py-3">
              <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-brand-black">
                {p.imageUrl ? (
                  <img
                    src={p.imageUrl}
                    alt=""
                    className="h-full w-full object-cover"
                    loading="lazy"
                  />
                ) : null}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold text-white">
                  {p.name}{" "}
                  {!p.active ? <span className="text-xs text-brand-gray">(oculto)</span> : null}
                </p>
                <p className="text-sm text-brand-gray">
                  {catName(p.categoryId)} · {formatBRL(p.priceCents)}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => void quickToggle(p, "available")}
                  className={cn(
                    "h-9 rounded-full px-3 text-xs font-semibold",
                    p.available ? "bg-green-500/15 text-green-300" : "bg-red-500/15 text-red-300",
                  )}
                  title="Alternar disponibilidade"
                >
                  {p.available ? "Disponível" : "Esgotado"}
                </button>
                <button
                  type="button"
                  onClick={() => void quickToggle(p, "featured")}
                  className={cn(
                    "inline-flex h-9 w-9 items-center justify-center rounded-full",
                    p.featured ? "text-brand-amber" : "text-white/30",
                  )}
                  aria-label={p.featured ? "Remover dos destaques" : "Marcar como destaque"}
                  aria-pressed={p.featured}
                >
                  <Star
                    className="h-5 w-5"
                    fill={p.featured ? "currentColor" : "none"}
                    aria-hidden="true"
                  />
                </button>
                <button
                  type="button"
                  onClick={() => startEdit(p)}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-full text-white hover:bg-white/5"
                  aria-label={`Editar ${p.name}`}
                >
                  <Pencil className="h-4 w-4" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  onClick={() => void remove(p)}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-full text-red-300 hover:bg-red-500/10"
                  aria-label={`Excluir ${p.name}`}
                >
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

import { useState } from "react";
import { Loader2, Pencil, Plus, Trash2, X } from "lucide-react";
import { toast } from "sonner";

import { CategoryIcon } from "@/components/site/icons";
import { slugify } from "@/lib/format";
import { deleteCategory, saveCategory, type CategoryInput } from "@/services/admin";
import type { Category, CategoryIcon as IconName, Product } from "@/types/catalog";

import { btnGhost, btnPrimary, errorMessage, FormField, inputCls, Panel, Toggle } from "./ui";

const ICON_OPTIONS: { value: IconName; label: string }[] = [
  { value: "prensado", label: "Lanche prensado" },
  { value: "hamburguer", label: "Hambúrguer" },
  { value: "hotdog", label: "Cachorro-quente" },
  { value: "pastel", label: "Pastel" },
  { value: "combo", label: "Combo" },
  { value: "porcao", label: "Porção" },
  { value: "bebida", label: "Bebida" },
  { value: "sobremesa", label: "Açaí / sobremesa" },
];

const empty: CategoryInput = {
  name: "",
  slug: "",
  description: "",
  icon: "prensado",
  sortOrder: 0,
  active: true,
};

export function CategoriesPanel({
  categories,
  products,
  onChange,
}: {
  categories: Category[];
  products: Product[];
  onChange: (c: Category[]) => void;
}) {
  const [editing, setEditing] = useState<{ id: string | null; draft: CategoryInput } | null>(null);
  const [saving, setSaving] = useState(false);

  const update = <K extends keyof CategoryInput>(key: K, value: CategoryInput[K]) =>
    setEditing((e) => (e ? { ...e, draft: { ...e.draft, [key]: value } } : e));

  const submit = async () => {
    if (!editing) return;
    setSaving(true);
    try {
      const draft = { ...editing.draft, slug: editing.draft.slug || slugify(editing.draft.name) };
      const saved = await saveCategory(editing.id, draft);
      onChange(
        (editing.id
          ? categories.map((c) => (c.id === saved.id ? saved : c))
          : [...categories, saved]
        ).sort((a, b) => a.sortOrder - b.sortOrder),
      );
      toast.success("Categoria salva.");
      setEditing(null);
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const remove = async (c: Category) => {
    if (products.some((p) => p.categoryId === c.id)) {
      toast.error("Mova ou exclua os produtos desta categoria antes de removê-la.");
      return;
    }
    if (!window.confirm(`Excluir a categoria "${c.name}"?`)) return;
    try {
      await deleteCategory(c.id);
      onChange(categories.filter((x) => x.id !== c.id));
      toast.success("Categoria excluída.");
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  if (editing) {
    const d = editing.draft;
    return (
      <Panel
        title={editing.id ? "Editar categoria" : "Nova categoria"}
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
          <FormField label="Nome *" htmlFor="c-name">
            <input
              id="c-name"
              className={inputCls}
              value={d.name}
              maxLength={60}
              required
              onChange={(e) => {
                const name = e.target.value;
                setEditing((cur) =>
                  cur
                    ? {
                        ...cur,
                        draft: {
                          ...cur.draft,
                          name,
                          slug: cur.id ? cur.draft.slug : slugify(name),
                        },
                      }
                    : cur,
                );
              }}
            />
          </FormField>
          <FormField
            label="Endereço amigável (slug)"
            htmlFor="c-slug"
            hint="Gerado automaticamente"
          >
            <input
              id="c-slug"
              className={inputCls}
              value={d.slug}
              onChange={(e) => update("slug", slugify(e.target.value))}
            />
          </FormField>
          <FormField label="Descrição curta" htmlFor="c-desc" className="md:col-span-2">
            <input
              id="c-desc"
              className={inputCls}
              value={d.description}
              onChange={(e) => update("description", e.target.value)}
              maxLength={160}
            />
          </FormField>
          <FormField label="Ícone" htmlFor="c-icon">
            <select
              id="c-icon"
              className={inputCls}
              value={d.icon}
              onChange={(e) => update("icon", e.target.value as IconName)}
            >
              {ICON_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </FormField>
          <FormField label="Ordem" htmlFor="c-order">
            <input
              id="c-order"
              className={inputCls}
              inputMode="numeric"
              value={String(d.sortOrder)}
              onChange={(e) => update("sortOrder", Number.parseInt(e.target.value, 10) || 0)}
            />
          </FormField>
          <Toggle
            id="c-active"
            label="Categoria ativa"
            checked={d.active}
            onChange={(v) => update("active", v)}
          />
          <div className="flex justify-end gap-2 md:col-span-2">
            <button type="submit" className={btnPrimary} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}
              Salvar categoria
            </button>
          </div>
        </form>
      </Panel>
    );
  }

  return (
    <Panel
      title={`Categorias (${categories.length})`}
      actions={
        <button
          type="button"
          className={btnPrimary}
          onClick={() =>
            setEditing({ id: null, draft: { ...empty, sortOrder: categories.length + 1 } })
          }
        >
          <Plus className="h-4 w-4" aria-hidden="true" /> Nova categoria
        </button>
      }
    >
      <p className="mb-4 text-sm text-brand-gray">
        Apenas categorias ativas e com produtos visíveis aparecem no site.
      </p>
      <ul className="divide-y divide-white/10">
        {categories.map((c) => {
          const count = products.filter((p) => p.categoryId === c.id).length;
          return (
            <li key={c.id} className="flex items-center gap-3 py-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-orange/15 text-brand-orange">
                <CategoryIcon icon={c.icon} className="h-5 w-5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-white">
                  {c.name}{" "}
                  {!c.active ? <span className="text-xs text-brand-gray">(inativa)</span> : null}
                </p>
                <p className="text-sm text-brand-gray">
                  {count} {count === 1 ? "produto" : "produtos"} · ordem {c.sortOrder}
                </p>
              </div>
              <button
                type="button"
                onClick={() =>
                  setEditing({
                    id: c.id,
                    draft: {
                      name: c.name,
                      slug: c.slug,
                      description: c.description,
                      icon: c.icon,
                      sortOrder: c.sortOrder,
                      active: c.active,
                    },
                  })
                }
                className="inline-flex h-9 w-9 items-center justify-center rounded-full hover:bg-white/5"
                aria-label={`Editar ${c.name}`}
              >
                <Pencil className="h-4 w-4" aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={() => void remove(c)}
                className="inline-flex h-9 w-9 items-center justify-center rounded-full text-red-300 hover:bg-red-500/10"
                aria-label={`Excluir ${c.name}`}
              >
                <Trash2 className="h-4 w-4" aria-hidden="true" />
              </button>
            </li>
          );
        })}
      </ul>
    </Panel>
  );
}

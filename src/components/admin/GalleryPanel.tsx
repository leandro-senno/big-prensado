import { useState } from "react";
import { Loader2, Plus, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { addGalleryImage, deleteGalleryImage, updateGalleryImage } from "@/services/admin";
import type { GalleryImage } from "@/types/catalog";

import { btnPrimary, errorMessage, FormField, ImageInput, inputCls, Panel } from "./ui";

export function GalleryPanel({
  images,
  onChange,
}: {
  images: GalleryImage[];
  onChange: (g: GalleryImage[]) => void;
}) {
  const [url, setUrl] = useState("");
  const [alt, setAlt] = useState("");
  const [saving, setSaving] = useState(false);
  const [edits, setEdits] = useState<Record<string, { alt: string; order: string }>>({});

  const add = async () => {
    if (!url) {
      toast.error("Envie uma imagem ou informe o link.");
      return;
    }
    setSaving(true);
    try {
      const saved = await addGalleryImage(url, alt, images.length + 1);
      onChange([...images, saved]);
      setUrl("");
      setAlt("");
      toast.success("Imagem adicionada à galeria.");
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const saveEdit = async (img: GalleryImage) => {
    const e = edits[img.id];
    if (!e) return;
    try {
      const order = Number.parseInt(e.order, 10) || 0;
      await updateGalleryImage(img.id, e.alt, order);
      onChange(
        images
          .map((x) => (x.id === img.id ? { ...x, alt: e.alt, sortOrder: order } : x))
          .sort((a, b) => a.sortOrder - b.sortOrder),
      );
      toast.success("Imagem atualizada.");
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  const remove = async (img: GalleryImage) => {
    if (!window.confirm("Remover esta imagem da galeria?")) return;
    try {
      await deleteGalleryImage(img.id);
      onChange(images.filter((x) => x.id !== img.id));
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  return (
    <Panel title="Galeria">
      <div className="mb-6 grid gap-4 rounded-xl border border-white/10 p-4 md:grid-cols-2">
        <FormField label="Nova imagem" htmlFor="g-url" className="md:col-span-2">
          <ImageInput id="g-url" value={url} onChange={setUrl} folder="galeria" />
        </FormField>
        <FormField label="Descrição da imagem (acessibilidade)" htmlFor="g-alt">
          <input
            id="g-alt"
            className={inputCls}
            value={alt}
            onChange={(e) => setAlt(e.target.value)}
            maxLength={160}
            placeholder="Ex.: Big Brasil Prensado na chapa"
          />
        </FormField>
        <div className="flex items-end">
          <button type="button" className={btnPrimary} onClick={() => void add()} disabled={saving}>
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <Plus className="h-4 w-4" aria-hidden="true" />
            )}
            Adicionar
          </button>
        </div>
      </div>

      {images.length === 0 ? (
        <p className="py-6 text-center text-brand-gray">
          Nenhuma imagem cadastrada. A galeria fica oculta no site até haver fotos.
        </p>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {images.map((img) => {
            const e = edits[img.id] ?? { alt: img.alt, order: String(img.sortOrder) };
            const set = (patch: Partial<typeof e>) =>
              setEdits((all) => ({ ...all, [img.id]: { ...e, ...patch } }));
            return (
              <li
                key={img.id}
                className="overflow-hidden rounded-xl border border-white/10 bg-brand-black"
              >
                <img
                  src={img.url}
                  alt={img.alt}
                  className="aspect-[4/3] w-full object-cover"
                  loading="lazy"
                />
                <div className="space-y-2 p-3">
                  <input
                    aria-label="Descrição"
                    className={inputCls}
                    value={e.alt}
                    onChange={(ev) => set({ alt: ev.target.value })}
                    maxLength={160}
                  />
                  <div className="flex gap-2">
                    <input
                      aria-label="Ordem"
                      className={`${inputCls} w-20`}
                      inputMode="numeric"
                      value={e.order}
                      onChange={(ev) => set({ order: ev.target.value })}
                    />
                    <button
                      type="button"
                      className="inline-flex h-11 flex-1 items-center justify-center gap-1 rounded-lg border border-white/15 text-sm hover:border-white/40"
                      onClick={() => void saveEdit(img)}
                    >
                      <Save className="h-4 w-4" aria-hidden="true" /> Salvar
                    </button>
                    <button
                      type="button"
                      className="inline-flex h-11 w-11 items-center justify-center rounded-lg text-red-300 hover:bg-red-500/10"
                      aria-label="Remover imagem"
                      onClick={() => void remove(img)}
                    >
                      <Trash2 className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </Panel>
  );
}

import { useRef, useState, type ReactNode } from "react";
import { ImageOff, Loader2, Upload } from "lucide-react";
import { toast } from "sonner";

import { ALLOWED_IMAGE_TYPES, MAX_IMAGE_BYTES, uploadImage } from "@/lib/supabase";
import { cn } from "@/lib/utils";

export const inputCls =
  "h-11 w-full rounded-lg border border-white/15 bg-brand-black px-3 text-sm text-white placeholder:text-white/35 focus:border-brand-orange focus:outline-none";
export const textareaCls =
  "w-full rounded-lg border border-white/15 bg-brand-black px-3 py-2 text-sm text-white placeholder:text-white/35 focus:border-brand-orange focus:outline-none";
export const btnPrimary =
  "inline-flex h-11 items-center justify-center gap-2 rounded-full bg-brand-orange px-5 text-sm font-bold text-brand-black transition hover:bg-brand-amber disabled:opacity-50";
export const btnGhost =
  "inline-flex h-11 items-center justify-center gap-2 rounded-full border border-white/15 px-5 text-sm font-semibold text-white transition hover:border-white/40 disabled:opacity-50";
export const btnDanger =
  "inline-flex h-11 items-center justify-center gap-2 rounded-full border border-red-400/40 px-4 text-sm font-semibold text-red-300 transition hover:bg-red-500/10 disabled:opacity-50";

export function FormField({
  label,
  htmlFor,
  hint,
  error,
  children,
  className,
}: {
  label: string;
  htmlFor: string;
  hint?: string;
  error?: string | undefined;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <label htmlFor={htmlFor} className="mb-1 block text-sm font-medium text-white">
        {label}
      </label>
      {children}
      {hint ? <p className="mt-1 text-xs text-brand-gray">{hint}</p> : null}
      {error ? (
        <p className="mt-1 text-xs text-red-300" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function Toggle({
  checked,
  onChange,
  label,
  id,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  id: string;
}) {
  return (
    <label
      htmlFor={id}
      className="flex min-h-11 cursor-pointer items-center gap-3 text-sm text-white"
    >
      <span className="relative inline-flex">
        <input
          id={id}
          type="checkbox"
          className="peer sr-only"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
        />
        <span className="h-6 w-11 rounded-full bg-white/15 transition peer-checked:bg-brand-orange peer-focus-visible:ring-2 peer-focus-visible:ring-brand-amber" />
        <span className="absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white transition peer-checked:translate-x-5" />
      </span>
      {label}
    </label>
  );
}

export function Panel({
  title,
  actions,
  children,
}: {
  title: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-white/10 bg-brand-black-2 p-4 sm:p-6">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-2xl uppercase tracking-wide text-white">{title}</h2>
        {actions}
      </div>
      {children}
    </section>
  );
}

/** Campo de imagem: envio de arquivo (validado) ou link https. */
export function ImageInput({
  id,
  value,
  onChange,
  folder,
}: {
  id: string;
  value: string;
  onChange: (url: string) => void;
  folder: string;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      toast.error("Formato não permitido. Use JPG, PNG, WEBP ou AVIF.");
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      toast.error("Imagem muito grande (máx. 5 MB).");
      return;
    }
    setUploading(true);
    try {
      const url = await uploadImage(file, folder);
      onChange(url);
      toast.success("Imagem enviada.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha no envio da imagem.");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
      <div
        className={cn(
          "flex h-24 w-32 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-white/10 bg-brand-black",
        )}
      >
        {value ? (
          <img src={value} alt="Pré-visualização" className="h-full w-full object-cover" />
        ) : (
          <ImageOff className="h-6 w-6 text-white/30" aria-hidden="true" />
        )}
      </div>
      <div className="flex-1 space-y-2">
        <input
          id={id}
          className={inputCls}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="https://..."
          inputMode="url"
        />
        <div className="flex flex-wrap gap-2">
          <input
            ref={fileRef}
            type="file"
            accept={ALLOWED_IMAGE_TYPES.join(",")}
            className="sr-only"
            id={`${id}-file`}
            onChange={(e) => void onFile(e.target.files?.[0])}
          />
          <label htmlFor={`${id}-file`} className={cn(btnGhost, "h-9 cursor-pointer px-4 text-xs")}>
            {uploading ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <Upload className="h-4 w-4" aria-hidden="true" />
            )}
            {uploading ? "Enviando..." : "Enviar arquivo"}
          </label>
          {value ? (
            <button
              type="button"
              className={cn(btnGhost, "h-9 px-4 text-xs")}
              onClick={() => onChange("")}
            >
              Remover imagem
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export function errorMessage(err: unknown): string {
  if (
    err &&
    typeof err === "object" &&
    "issues" in err &&
    Array.isArray((err as { issues: unknown[] }).issues)
  ) {
    const first = (err as { issues: { message?: string }[] }).issues[0];
    if (first?.message) return first.message;
  }
  return err instanceof Error ? err.message : "Ocorreu um erro inesperado.";
}

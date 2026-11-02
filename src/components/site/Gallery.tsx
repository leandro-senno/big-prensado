import { useState } from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { ChevronLeft, ChevronRight, X, ZoomIn } from "lucide-react";

import { cn } from "@/lib/utils";
import type { GalleryImage } from "@/types/catalog";

import { Reveal } from "./Reveal";
import { SectionHeading } from "./SectionHeading";

export function Gallery({ images }: { images: GalleryImage[] }) {
  const [index, setIndex] = useState<number | null>(null);
  if (images.length === 0) return null;
  const current = index !== null ? images[index] : undefined;
  const isDemo = images.some((i) => i.demo);

  const go = (delta: number) =>
    setIndex((i) => (i === null ? i : (i + delta + images.length) % images.length));

  return (
    <section id="galeria" aria-labelledby="galeria-title" className="bg-brand-black py-16 sm:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeading
          id="galeria-title"
          kicker="Dá até água na boca"
          title="Galeria"
          description={
            isDemo
              ? "Imagens ilustrativas. Em breve, fotos reais dos nossos lanches e do espaço."
              : ""
          }
        />
        <ul className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
          {images.map((img, i) => (
            <Reveal
              as="li"
              key={img.id}
              delay={i * 60}
              className={cn(
                i === 0 && "col-span-2 row-span-2",
                // evita "buraco" na última linha do celular (2 colunas)
                i === images.length - 1 && i % 2 === 1 && "col-span-2 lg:col-span-1",
              )}
            >
              <button
                type="button"
                onClick={() => setIndex(i)}
                className="group relative block h-full w-full overflow-hidden rounded-2xl border border-white/10"
                aria-label={`Ampliar imagem: ${img.alt || "foto"}`}
              >
                <img
                  src={img.url}
                  alt={img.alt}
                  loading="lazy"
                  decoding="async"
                  className={cn(
                    "h-full w-full object-cover transition duration-500 group-hover:scale-105",
                    i === 0 ? "aspect-square" : "aspect-[4/3]",
                  )}
                />
                <span className="absolute inset-0 flex items-center justify-center bg-black/0 opacity-0 transition group-hover:bg-black/40 group-hover:opacity-100">
                  <ZoomIn className="h-8 w-8 text-white" aria-hidden="true" />
                </span>
              </button>
            </Reveal>
          ))}
        </ul>
      </div>

      <DialogPrimitive.Root open={current !== undefined} onOpenChange={(o) => !o && setIndex(null)}>
        <DialogPrimitive.Portal>
          <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/90 data-[state=open]:animate-in data-[state=open]:fade-in-0" />
          <DialogPrimitive.Content
            className="fixed inset-0 z-50 flex items-center justify-center p-4 outline-none"
            aria-describedby={undefined}
            onKeyDown={(e) => {
              if (e.key === "ArrowRight") go(1);
              if (e.key === "ArrowLeft") go(-1);
            }}
          >
            <DialogPrimitive.Title className="sr-only">
              {current?.alt || "Imagem da galeria"}
            </DialogPrimitive.Title>
            {current ? (
              <img
                src={current.url}
                alt={current.alt}
                className="max-h-[85dvh] max-w-full rounded-2xl object-contain"
              />
            ) : null}
            {images.length > 1 ? (
              <>
                <button
                  type="button"
                  onClick={() => go(-1)}
                  className="absolute left-3 top-1/2 inline-flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
                  aria-label="Imagem anterior"
                >
                  <ChevronLeft className="h-6 w-6" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  onClick={() => go(1)}
                  className="absolute right-3 top-1/2 inline-flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
                  aria-label="Próxima imagem"
                >
                  <ChevronRight className="h-6 w-6" aria-hidden="true" />
                </button>
              </>
            ) : null}
            <DialogPrimitive.Close
              className="absolute right-3 top-3 inline-flex h-12 w-12 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
              aria-label="Fechar"
            >
              <X className="h-6 w-6" aria-hidden="true" />
            </DialogPrimitive.Close>
          </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>
    </section>
  );
}

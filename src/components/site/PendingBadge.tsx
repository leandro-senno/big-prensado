import { cn } from "@/lib/utils";

/** Selo para informações comerciais que ainda aguardam confirmação do estabelecimento. */
export function PendingBadge({
  className,
  label = "Em validação",
}: {
  className?: string;
  label?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border border-brand-amber/40 bg-brand-amber/10 px-2 py-0.5 text-[0.7rem] font-medium uppercase tracking-wide text-brand-amber",
        className,
      )}
      title="Informação ainda não confirmada pelo estabelecimento"
    >
      {label}
    </span>
  );
}

export function DemoBadge({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full bg-white/90 px-2 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wide text-brand-black",
        className,
      )}
      title="Produto demonstrativo — não é uma oferta real"
    >
      Exemplo
    </span>
  );
}

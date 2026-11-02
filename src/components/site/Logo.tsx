import { cn } from "@/lib/utils";

/**
 * Marca própria do Big Prensado: selo com sanduíche prensado (marcas da chapa)
 * + logotipo tipográfico. Não reproduz artes de terceiros.
 */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" aria-hidden="true" className={cn("h-10 w-10", className)}>
      <defs>
        <linearGradient id="bp-mark-bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#FFB020" />
          <stop offset="1" stopColor="#FF9800" />
        </linearGradient>
      </defs>
      <rect x="2" y="2" width="60" height="60" rx="16" fill="url(#bp-mark-bg)" />
      {/* pão superior */}
      <path d="M12 26c0-7 9-12 20-12s20 5 20 12v2H12z" fill="#0B0B0D" />
      {/* marcas da chapa */}
      <path
        d="M20 18l-3 7M28 15l-3 10M36 15l-3 10M44 18l-3 7"
        stroke="#FF9800"
        strokeWidth="2.4"
        strokeLinecap="round"
      />
      {/* queijo derretendo */}
      <path d="M11 31h42l-3 4-3-1-3 5-3-4-4 3-3-3-4 5-3-5-4 2-3-3-3 2z" fill="#FFF3D6" />
      {/* recheio */}
      <rect x="12" y="38" width="40" height="5" rx="2.5" fill="#7A2E0E" />
      {/* pão inferior */}
      <path d="M12 45h40v2c0 3-3 5-6 5H18c-3 0-6-2-6-5z" fill="#0B0B0D" />
    </svg>
  );
}

export function Logo({ className, compact = false }: { className?: string; compact?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <LogoMark className={compact ? "h-9 w-9" : "h-10 w-10 sm:h-11 sm:w-11"} />
      <span className="flex flex-col leading-none">
        <span className="font-display text-[1.35rem] tracking-wide text-brand-orange sm:text-2xl">
          BIG
        </span>
        <span className="font-display text-sm tracking-[0.18em] text-white sm:text-base">
          PRENSADO
        </span>
      </span>
    </span>
  );
}

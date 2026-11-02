import {
  Beef,
  CupSoda,
  IceCreamBowl,
  Package,
  Popcorn,
  Sandwich,
  type LucideProps,
} from "lucide-react";

import type { CategoryIcon as CategoryIconName } from "@/types/catalog";

function HotdogIcon(props: LucideProps) {
  const { size = 24, strokeWidth = 2, className } = props;
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M4 14c-1.5-1.5-1.5-4 0-5.5L8.5 4c1.5-1.5 4-1.5 5.5 0" />
      <path d="M10 20c1.5 1.5 4 1.5 5.5 0L20 15.5c1.5-1.5 1.5-4 0-5.5" />
      <path d="M6.5 17.5 17.5 6.5a2.1 2.1 0 0 0-3-3L3.5 14.5a2.1 2.1 0 0 0 3 3Z" />
      <path d="m9 12 1 1m2-4 1 1m2-4 1 1" />
    </svg>
  );
}

function PastelIcon(props: LucideProps) {
  const { size = 24, strokeWidth = 2, className } = props;
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <rect x="3" y="6" width="18" height="12" rx="3" />
      <path d="M3 9h1m2 0h1m2 0h1m2 0h1m2 0h1m2 0h1" />
      <path d="M8 13h8" />
    </svg>
  );
}

export function CategoryIcon({ icon, className }: { icon: CategoryIconName; className?: string }) {
  const props = { className, "aria-hidden": true } as const;
  switch (icon) {
    case "prensado":
      return <Sandwich {...props} />;
    case "hamburguer":
      return <Beef {...props} />;
    case "hotdog":
      return <HotdogIcon {...props} />;
    case "pastel":
      return <PastelIcon {...props} />;
    case "combo":
      return <Package {...props} />;
    case "porcao":
      return <Popcorn {...props} />;
    case "bebida":
      return <CupSoda {...props} />;
    case "sobremesa":
      return <IceCreamBowl {...props} />;
  }
}

export function InstagramIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <rect x="2" y="2" width="20" height="20" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="0.6" fill="currentColor" />
    </svg>
  );
}

export function FacebookIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
    </svg>
  );
}

export function TiktokIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M9 12a4 4 0 1 0 4 4V2c.5 3 2.5 5 6 5" />
    </svg>
  );
}

export function WhatsappIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91C21.95 6.45 17.5 2 12.04 2Zm0 18.15c-1.48 0-2.93-.4-4.2-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.25 8.25 0 0 1-1.26-4.38c0-4.54 3.7-8.24 8.25-8.24 4.54 0 8.24 3.7 8.24 8.24 0 4.55-3.7 8.24-8.24 8.24Zm4.52-6.16c-.25-.12-1.47-.72-1.69-.81-.23-.08-.39-.12-.56.12-.17.25-.64.81-.78.97-.14.17-.29.19-.54.06-.25-.12-1.05-.39-1.99-1.23-.74-.66-1.23-1.47-1.38-1.72-.14-.25-.02-.38.11-.51.11-.11.25-.29.37-.43.12-.14.17-.25.25-.41.08-.17.04-.31-.02-.43-.06-.12-.56-1.34-.76-1.84-.2-.48-.41-.42-.56-.43h-.48c-.17 0-.43.06-.66.31-.23.25-.86.85-.86 2.07 0 1.22.89 2.4 1.01 2.56.12.17 1.75 2.67 4.23 3.74.59.26 1.05.41 1.41.52.59.19 1.13.16 1.56.1.48-.07 1.47-.6 1.67-1.18.21-.58.21-1.07.14-1.18-.06-.1-.22-.16-.47-.28Z" />
    </svg>
  );
}

import { Home, MapPin, ShoppingCart, UtensilsCrossed } from "lucide-react";

import { useCart } from "@/components/cart/CartProvider";

/** Barra inferior fixa no celular com atalhos principais. */
export function MobileNav() {
  const { count, open, bumpKey } = useCart();
  const item =
    "flex min-h-14 flex-1 flex-col items-center justify-center gap-0.5 text-[0.7rem] font-medium text-white/80 transition hover:text-brand-amber";
  return (
    <nav
      aria-label="Atalhos"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-brand-black/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md md:hidden"
    >
      <ul className="flex">
        <li className="flex flex-1">
          <a href="#inicio" className={item}>
            <Home className="h-5 w-5" aria-hidden="true" />
            Início
          </a>
        </li>
        <li className="flex flex-1">
          <a href="#cardapio" className={item}>
            <UtensilsCrossed className="h-5 w-5" aria-hidden="true" />
            Cardápio
          </a>
        </li>
        <li className="flex flex-1">
          <button type="button" onClick={open} className={item}>
            <span className="relative">
              <ShoppingCart className="h-5 w-5 text-brand-orange" aria-hidden="true" />
              {count > 0 ? (
                <span
                  key={bumpKey}
                  className="animate-bump absolute -right-2.5 -top-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-brand-orange px-1 text-[0.6rem] font-bold text-brand-black"
                >
                  {count > 99 ? "99+" : count}
                </span>
              ) : null}
            </span>
            Carrinho
            <span className="sr-only">{count > 0 ? `, ${count} itens` : ", vazio"}</span>
          </button>
        </li>
        <li className="flex flex-1">
          <a href="#localizacao" className={item}>
            <MapPin className="h-5 w-5" aria-hidden="true" />
            Contato
          </a>
        </li>
      </ul>
    </nav>
  );
}

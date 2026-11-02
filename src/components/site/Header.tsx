import { useEffect, useState } from "react";
import { Menu as MenuIcon, ShoppingCart, X } from "lucide-react";

import { useCart } from "@/components/cart/CartProvider";
import { cn } from "@/lib/utils";

import { Logo } from "./Logo";

export const NAV_LINKS = [
  { href: "#inicio", label: "Início" },
  { href: "#cardapio", label: "Cardápio" },
  { href: "#mais-pedidos", label: "Mais pedidos" },
  { href: "#promocoes", label: "Promoções" },
  { href: "#sobre", label: "Sobre nós" },
  { href: "#localizacao", label: "Localização" },
] as const;

export function CartButton({ className }: { className?: string }) {
  const { count, open, bumpKey } = useCart();
  return (
    <button
      type="button"
      onClick={open}
      className={cn(
        "relative inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/15 bg-white/5 text-white transition hover:border-brand-orange hover:text-brand-orange",
        className,
      )}
      aria-label={
        count > 0 ? `Abrir carrinho, ${count} ${count === 1 ? "item" : "itens"}` : "Abrir carrinho"
      }
    >
      <ShoppingCart className="h-5 w-5" aria-hidden="true" />
      {count > 0 ? (
        <span
          key={bumpKey}
          className="animate-bump absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-brand-orange px-1 text-[0.7rem] font-bold text-brand-black"
          aria-hidden="true"
        >
          {count > 99 ? "99+" : count}
        </span>
      ) : null}
    </button>
  );
}

export function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!mobileOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setMobileOpen(false);
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-40 transition-all duration-300",
        scrolled || mobileOpen
          ? "border-b border-white/10 bg-brand-black/90 py-2 shadow-lg shadow-black/40 backdrop-blur-md"
          : "bg-gradient-to-b from-black/70 to-transparent py-3 sm:py-4",
      )}
    >
      <a
        href="#conteudo"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-2 focus:z-50 focus:rounded-md focus:bg-brand-orange focus:px-3 focus:py-2 focus:text-brand-black"
      >
        Pular para o conteúdo
      </a>
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <a
          href="#inicio"
          aria-label="Big Prensado — início"
          className="shrink-0"
          onClick={() => setMobileOpen(false)}
        >
          <Logo compact={scrolled} />
        </a>

        <nav aria-label="Principal" className="hidden lg:block">
          <ul className="flex items-center gap-1 xl:gap-2">
            {NAV_LINKS.map((link) => (
              <li key={link.href}>
                <a
                  href={link.href}
                  className="rounded-full px-3 py-2 text-sm font-medium text-white/85 transition hover:bg-white/5 hover:text-brand-amber"
                >
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="flex items-center gap-2 sm:gap-3">
          <a
            href="#cardapio"
            className="hidden h-11 items-center rounded-full bg-brand-orange px-5 text-sm font-bold uppercase tracking-wide text-brand-black transition hover:-translate-y-0.5 hover:bg-brand-amber sm:inline-flex glow-orange"
          >
            Pedir agora
          </a>
          <CartButton />
          <button
            type="button"
            className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/15 bg-white/5 text-white lg:hidden"
            aria-label={mobileOpen ? "Fechar menu" : "Abrir menu"}
            aria-expanded={mobileOpen}
            aria-controls="menu-mobile"
            onClick={() => setMobileOpen((v) => !v)}
          >
            {mobileOpen ? (
              <X className="h-5 w-5" aria-hidden="true" />
            ) : (
              <MenuIcon className="h-5 w-5" aria-hidden="true" />
            )}
          </button>
        </div>
      </div>

      {mobileOpen ? (
        <nav
          id="menu-mobile"
          aria-label="Menu"
          className="animate-fade-up mx-auto max-h-[calc(100dvh-4.5rem)] max-w-7xl overflow-y-auto px-4 pb-6 pt-2 lg:hidden"
        >
          <ul className="flex flex-col divide-y divide-white/5">
            {NAV_LINKS.map((link) => (
              <li key={link.href}>
                <a
                  href={link.href}
                  onClick={() => setMobileOpen(false)}
                  className="flex min-h-12 items-center py-3 font-display text-2xl uppercase tracking-wide text-white hover:text-brand-amber"
                >
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
          <a
            href="#cardapio"
            onClick={() => setMobileOpen(false)}
            className="mt-4 flex h-12 items-center justify-center rounded-full bg-brand-orange font-bold uppercase tracking-wide text-brand-black"
          >
            Pedir agora
          </a>
        </nav>
      ) : null}
    </header>
  );
}

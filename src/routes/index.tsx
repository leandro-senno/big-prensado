import { useCallback, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";

import { CartProvider, useCart } from "@/components/cart/CartProvider";
import { CartSheet } from "@/components/cart/CartSheet";
import { About } from "@/components/site/About";
import { Categories } from "@/components/site/Categories";
import { DemoNotice } from "@/components/site/DemoNotice";
import { Featured } from "@/components/site/Featured";
import { Footer } from "@/components/site/Footer";
import { Gallery } from "@/components/site/Gallery";
import { Header } from "@/components/site/Header";
import { Hero } from "@/components/site/Hero";
import { Location } from "@/components/site/Location";
import { MenuCatalog } from "@/components/site/MenuCatalog";
import { MobileNav } from "@/components/site/MobileNav";
import { ProductDialog, type ProductSelection } from "@/components/site/ProductDialog";
import { PromoBanner } from "@/components/site/PromoBanner";
import { Reviews } from "@/components/site/Reviews";
import { ILLUSTRATIVE_IMAGES } from "@/config/settings";
import { loadCatalog, type Catalog } from "@/services/catalog";
import type { Product } from "@/types/catalog";

// O título/descrição/OG padrão vêm de __root.tsx.
export const Route = createFileRoute("/")({
  loader: () => loadCatalog(),
  head: ({ loaderData }) => ({
    scripts: loaderData ? [restaurantJsonLd(loaderData)] : [],
  }),
  component: Index,
});

/** Dados estruturados com SOMENTE informações confirmadas. */
function restaurantJsonLd(catalog: Catalog) {
  const s = catalog.settings;
  const data: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Restaurant",
    name: s.businessName,
    servesCuisine: ["Lanches", "Hambúrgueres", "Brasileira"],
    description: s.shortDescription,
  };
  if (s.address.confirmed) {
    data["address"] = {
      "@type": "PostalAddress",
      streetAddress: s.address.street,
      addressLocality: s.address.city,
      addressRegion: s.address.state,
      postalCode: s.address.zip,
      addressCountry: "BR",
    };
  }
  if (s.phone.confirmed && s.phone.display) data["telephone"] = s.phone.display;
  if (s.hoursConfirmed && s.hours.length > 0) {
    data["openingHours"] = s.hours.map((h) => `${h.label} ${h.value}`);
  }
  const sameAs = [s.social.instagram, s.social.facebook, s.social.tiktok].filter(Boolean);
  if (sameAs.length > 0) data["sameAs"] = sameAs;
  if (s.address.confirmed) data["hasMap"] = s.mapsUrl;
  // Evita fechar a tag <script> por conteúdo editável.
  const json = JSON.stringify(data).replace(/</g, "\\u003c");
  return { type: "application/ld+json", children: json };
}

function Index() {
  const catalog = Route.useLoaderData();
  return (
    <CartProvider>
      <HomePage catalog={catalog} />
    </CartProvider>
  );
}

function HomePage({ catalog }: { catalog: Catalog }) {
  const { settings, categories, products, promotions, gallery, source, error } = catalog;
  const cart = useCart();
  const [selected, setSelected] = useState<Product | null>(null);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  // Mostra apenas categorias ativas que tenham produtos.
  const visibleCategories = useMemo(
    () =>
      categories
        .filter((c) => c.active && products.some((p) => p.categoryId === c.id))
        .sort((a, b) => a.sortOrder - b.sortOrder),
    [categories, products],
  );

  const featured = useMemo(() => {
    const list = products.filter((p) => p.featured);
    return [...list.filter((p) => p.available), ...list.filter((p) => !p.available)].slice(0, 4);
  }, [products]);

  const addToCart = useCallback(
    (product: Product, selection: ProductSelection) => {
      if (!product.available) {
        toast.error(`${product.name} está esgotado.`);
        return;
      }
      cart.add({ product, ...selection });
      toast.success(`${selection.quantity}x ${product.name} adicionado ao carrinho`, {
        action: { label: "Ver carrinho", onClick: () => cart.open() },
      });
    },
    [cart],
  );

  const quickAdd = useCallback(
    (product: Product) => addToCart(product, { quantity: 1, addons: [], removed: [], notes: "" }),
    [addToCart],
  );

  const selectCategory = useCallback((id: string) => {
    setActiveCategory(id);
    setQuery("");
    document.getElementById("cardapio")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  const isDemo = source === "demo";
  const img = (url: string, demoUrl: string) => isDemo || url === demoUrl;

  return (
    <div className="min-h-screen bg-brand-black pb-16 text-white md:pb-0">
      <Header />
      <main id="conteudo">
        <Hero
          settings={settings}
          isDemoImage={img(settings.hero.imageUrl, ILLUSTRATIVE_IMAGES.hero)}
        />
        {isDemo || error ? <DemoNotice error={error} /> : null}
        <Categories categories={visibleCategories} onSelect={selectCategory} />
        <Featured products={featured} onDetails={setSelected} onAdd={quickAdd} />
        <PromoBanner
          settings={settings}
          promotions={promotions}
          isDemoImage={img(settings.promoBanner.imageUrl, ILLUSTRATIVE_IMAGES.promo)}
        />
        <MenuCatalog
          categories={visibleCategories}
          products={products}
          activeCategory={activeCategory}
          onCategoryChange={setActiveCategory}
          query={query}
          onQueryChange={setQuery}
          onDetails={setSelected}
          onAdd={quickAdd}
        />
        <About
          settings={settings}
          isDemoImage={img(settings.about.imageUrl, ILLUSTRATIVE_IMAGES.about)}
        />
        <Gallery images={gallery} />
        <Reviews settings={settings} />
        <Location settings={settings} />
      </main>
      <Footer settings={settings} />
      <MobileNav />
      <ProductDialog
        product={selected}
        onClose={() => setSelected(null)}
        onConfirm={(product, selection) => {
          addToCart(product, selection);
          setSelected(null);
        }}
      />
      <CartSheet settings={settings} promotions={promotions} />
    </div>
  );
}

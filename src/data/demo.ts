import type { Category, GalleryImage, Product, Promotion } from "@/types/catalog";

/**
 * DADOS DEMONSTRATIVOS
 * --------------------
 * Servem apenas para visualizar o layout enquanto o banco de dados não está
 * configurado. Nomes, descrições, preços e fotos NÃO são ofertas reais do
 * Big Lanche e aparecem no site com o selo "Exemplo".
 *
 * "Big Brasil Prensado" e "Big Picanha" foram citados em avaliações públicas da
 * unidade de referência; disponibilidade, receita e preço precisam ser
 * confirmados pelo estabelecimento.
 */

const img = (id: string, w = 800) =>
  `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${w}&q=70`;

export const DEMO_IMAGES = {
  prensadoHand: img("1440427810006-0e4109fd4abe"),
  prensadoSlices: img("1475090169767-40ed8d18f67d"),
  burgerFries: img("1561758033-d89a9ad46330"),
  burgerClose: img("1553979459-d2229ba7433b"),
  burgerBoard: img("1551782450-a2132b4ba21d"),
  burgerLettuce: img("1594212699903-ec8a3eca50f5"),
  hotdog: img("1638368593249-7cadb261e8b3"),
  hotdogPlate: img("1613482084286-41f25b486fa2"),
  fries: img("1526230427044-d092040d48dc"),
  soda: img("1563101730-5ace2fd8e7d7"),
  acai: img("1674316037121-5210009059f5"),
} as const;

export const DEMO_CATEGORIES: Category[] = [
  {
    id: "cat-prensados",
    slug: "lanches-prensados",
    name: "Lanches prensados",
    description: "Pão tostado na prensa e recheio generoso.",
    icon: "prensado",
    sortOrder: 1,
    active: true,
  },
  {
    id: "cat-hamburgueres",
    slug: "hamburgueres",
    name: "Hambúrgueres",
    description: "Blend suculento, queijo e muito sabor.",
    icon: "hamburguer",
    sortOrder: 2,
    active: true,
  },
  {
    id: "cat-hotdogs",
    slug: "cachorros-quentes",
    name: "Cachorros-quentes",
    description: "Dogão completo do jeito brasileiro.",
    icon: "hotdog",
    sortOrder: 3,
    active: true,
  },
  {
    id: "cat-pasteis",
    slug: "pasteis",
    name: "Pastéis",
    description: "Massa crocante e recheio farto.",
    icon: "pastel",
    sortOrder: 4,
    active: true,
  },
  {
    id: "cat-combos",
    slug: "combos",
    name: "Combos",
    description: "Lanche, acompanhamento e bebida.",
    icon: "combo",
    sortOrder: 5,
    active: true,
  },
  {
    id: "cat-porcoes",
    slug: "porcoes",
    name: "Porções",
    description: "Para dividir (ou não) com a galera.",
    icon: "porcao",
    sortOrder: 6,
    active: true,
  },
  {
    id: "cat-bebidas",
    slug: "bebidas",
    name: "Bebidas",
    description: "Geladas para acompanhar.",
    icon: "bebida",
    sortOrder: 7,
    active: true,
  },
  {
    id: "cat-sobremesas",
    slug: "acai-e-sobremesas",
    name: "Açaí e sobremesas",
    description: "O docinho para fechar com chave de ouro.",
    icon: "sobremesa",
    sortOrder: 8,
    active: true,
  },
];

const baseAddons = [
  { id: "add-bacon", name: "Bacon extra", priceCents: 500 },
  { id: "add-queijo", name: "Queijo extra", priceCents: 400 },
  { id: "add-ovo", name: "Ovo", priceCents: 300 },
  { id: "add-catupiry", name: "Catupiry", priceCents: 450 },
];

function p(
  data: Omit<
    Product,
    "active" | "demo" | "addons" | "removableIngredients" | "badge" | "featured" | "available"
  > &
    Partial<Pick<Product, "addons" | "removableIngredients" | "badge" | "featured" | "available">>,
): Product {
  return {
    addons: [],
    removableIngredients: [],
    badge: null,
    featured: false,
    available: true,
    ...data,
    active: true,
    demo: true,
  };
}

export const DEMO_PRODUCTS: Product[] = [
  p({
    id: "demo-big-brasil",
    categoryId: "cat-prensados",
    name: "Big Brasil Prensado",
    description: "O prensado da casa, montado na hora e tostado na chapa até o queijo derreter.",
    ingredients:
      "Pão francês prensado, carne, presunto, mussarela, ovo, tomate, alface e maionese da casa",
    priceCents: 3290,
    imageUrl: DEMO_IMAGES.prensadoSlices,
    featured: true,
    badge: "Mais pedido",
    sortOrder: 1,
    addons: baseAddons,
    removableIngredients: ["Tomate", "Alface", "Maionese", "Ovo"],
  }),
  p({
    id: "demo-big-picanha",
    categoryId: "cat-prensados",
    name: "Big Picanha",
    description: "Tiras de picanha na chapa com queijo derretido e cebola caramelizada.",
    ingredients: "Pão prensado, picanha em tiras, mussarela, cebola caramelizada e molho especial",
    priceCents: 3890,
    imageUrl: DEMO_IMAGES.prensadoHand,
    featured: true,
    badge: "Destaque",
    sortOrder: 2,
    addons: baseAddons,
    removableIngredients: ["Cebola", "Molho especial"],
  }),
  p({
    id: "demo-misto-prensado",
    categoryId: "cat-prensados",
    name: "Misto Prensado Duplo",
    description: "Clássico que nunca falha, com o dobro de recheio.",
    ingredients: "Pão de forma, presunto, mussarela em dobro e manteiga",
    priceCents: 1890,
    imageUrl: null,
    sortOrder: 3,
    addons: baseAddons.slice(0, 2),
  }),
  p({
    id: "demo-big-burger",
    categoryId: "cat-hamburgueres",
    name: "Big Burger Bacon",
    description: "Hambúrguer artesanal com bacon crocante e cheddar cremoso.",
    ingredients: "Pão brioche, blend 160 g, cheddar, bacon, alface, tomate e molho da casa",
    priceCents: 3490,
    imageUrl: DEMO_IMAGES.burgerClose,
    featured: true,
    sortOrder: 1,
    addons: baseAddons,
    removableIngredients: ["Alface", "Tomate", "Molho da casa"],
  }),
  p({
    id: "demo-x-salada",
    categoryId: "cat-hamburgueres",
    name: "X-Salada Caprichado",
    description: "O tradicional com salada fresquinha.",
    ingredients: "Pão, hambúrguer, mussarela, alface, tomate e maionese",
    priceCents: 2490,
    imageUrl: DEMO_IMAGES.burgerLettuce,
    sortOrder: 2,
    addons: baseAddons,
    removableIngredients: ["Alface", "Tomate", "Maionese"],
  }),
  p({
    id: "demo-dogao",
    categoryId: "cat-hotdogs",
    name: "Dogão Completo",
    description: "Cachorro-quente prensado com tudo que tem direito.",
    ingredients: "Pão, duas salsichas, purê, vinagrete, milho, batata palha e queijo ralado",
    priceCents: 2190,
    imageUrl: DEMO_IMAGES.hotdog,
    featured: true,
    badge: "Favorito",
    sortOrder: 1,
    addons: baseAddons.slice(1),
    removableIngredients: ["Vinagrete", "Milho", "Purê"],
  }),
  p({
    id: "demo-dog-simples",
    categoryId: "cat-hotdogs",
    name: "Dog Tradicional",
    description: "Simples, rápido e gostoso.",
    ingredients: "Pão, salsicha, molho de tomate, ketchup e mostarda",
    priceCents: 1490,
    imageUrl: DEMO_IMAGES.hotdogPlate,
    sortOrder: 2,
    available: false,
  }),
  p({
    id: "demo-pastel-carne",
    categoryId: "cat-pasteis",
    name: "Pastel de Carne com Queijo",
    description: "Massa sequinha e crocante, recheio caprichado.",
    ingredients: "Massa de pastel, carne moída temperada e mussarela",
    priceCents: 1590,
    imageUrl: null,
    sortOrder: 1,
  }),
  p({
    id: "demo-combo-big",
    categoryId: "cat-combos",
    name: "Combo Big Lanche",
    description: "Big Brasil Prensado + batata frita + refrigerante lata.",
    ingredients: "1 Big Brasil Prensado, batata frita média e 1 refrigerante lata",
    priceCents: 4490,
    imageUrl: DEMO_IMAGES.burgerFries,
    sortOrder: 1,
    addons: baseAddons,
  }),
  p({
    id: "demo-batata",
    categoryId: "cat-porcoes",
    name: "Batata Frita com Cheddar e Bacon",
    description: "Porção generosa para compartilhar.",
    ingredients: "Batata frita, cheddar cremoso e bacon em cubos",
    priceCents: 2890,
    imageUrl: DEMO_IMAGES.fries,
    sortOrder: 1,
  }),
  p({
    id: "demo-refri",
    categoryId: "cat-bebidas",
    name: "Refrigerante Lata",
    description: "350 ml, bem gelado.",
    ingredients: "Consulte os sabores disponíveis",
    priceCents: 650,
    imageUrl: DEMO_IMAGES.soda,
    sortOrder: 1,
  }),
  p({
    id: "demo-acai",
    categoryId: "cat-sobremesas",
    name: "Açaí 500 ml",
    description: "Açaí cremoso com acompanhamentos.",
    ingredients: "Açaí, granola, banana e leite condensado",
    priceCents: 2290,
    imageUrl: DEMO_IMAGES.acai,
    sortOrder: 1,
    addons: [
      { id: "add-nutella", name: "Creme de avelã", priceCents: 500 },
      { id: "add-morango", name: "Morango", priceCents: 400 },
    ],
    removableIngredients: ["Banana", "Leite condensado"],
  }),
];

/** Nenhuma promoção demonstrativa: descontos só aparecem quando cadastrados e ativos. */
export const DEMO_PROMOTIONS: Promotion[] = [];

export const DEMO_GALLERY: GalleryImage[] = [
  {
    id: "g1",
    url: DEMO_IMAGES.prensadoSlices,
    alt: "Lanche prensado com marcas da chapa",
    sortOrder: 1,
    demo: true,
  },
  {
    id: "g2",
    url: DEMO_IMAGES.burgerBoard,
    alt: "Hambúrguer com batatas fritas",
    sortOrder: 2,
    demo: true,
  },
  { id: "g3", url: DEMO_IMAGES.hotdog, alt: "Cachorro-quente completo", sortOrder: 3, demo: true },
  { id: "g4", url: DEMO_IMAGES.fries, alt: "Porção de batatas fritas", sortOrder: 4, demo: true },
  {
    id: "g5",
    url: DEMO_IMAGES.prensadoHand,
    alt: "Lanche recheado servido na mão",
    sortOrder: 5,
    demo: true,
  },
  { id: "g6", url: DEMO_IMAGES.burgerFries, alt: "Hambúrguer e fritas", sortOrder: 6, demo: true },
];

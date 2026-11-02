-- =============================================================================
-- Big Prensado — estrutura inicial do banco (Supabase / PostgreSQL)
--
-- Segurança:
--   * RLS ativo em todas as tabelas.
--   * Visitantes (anon) só LEEM dados públicos e ativos.
--   * Escrita somente para usuários cadastrados na tabela public.admins.
--   * Bucket de imagens aceita apenas JPG/PNG/WEBP/AVIF até 5 MB.
--   * Pedidos NÃO são gravados (finalização via WhatsApp).
-- =============================================================================

create extension if not exists pgcrypto;

-- -----------------------------------------------------------------------------
-- Administradores
-- -----------------------------------------------------------------------------
create table if not exists public.admins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.admins enable row level security;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.admins a where a.user_id = auth.uid());
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated;

drop policy if exists "admins_self_read" on public.admins;
create policy "admins_self_read" on public.admins
  for select to authenticated using (user_id = auth.uid());

-- -----------------------------------------------------------------------------
-- updated_at automático
-- -----------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- -----------------------------------------------------------------------------
-- Categorias
-- -----------------------------------------------------------------------------
create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9-]{1,60}$'),
  name text not null check (char_length(name) between 1 and 60),
  description text check (char_length(description) <= 160),
  icon text not null default 'prensado'
    check (icon in ('prensado','hamburguer','hotdog','pastel','combo','porcao','bebida','sobremesa')),
  sort_order integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists categories_updated_at on public.categories;
create trigger categories_updated_at before update on public.categories
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- Produtos
-- addons: [{ "id": "...", "name": "Bacon extra", "priceCents": 500 }]
-- -----------------------------------------------------------------------------
create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.categories (id) on delete restrict,
  name text not null check (char_length(name) between 1 and 80),
  description text check (char_length(description) <= 400),
  ingredients text check (char_length(ingredients) <= 300),
  price_cents integer not null check (price_cents between 0 and 1000000),
  image_url text check (image_url is null or image_url ~ '^https://'),
  available boolean not null default true,
  featured boolean not null default false,
  badge text check (char_length(badge) <= 24),
  sort_order integer not null default 0,
  active boolean not null default true,
  addons jsonb not null default '[]'::jsonb check (jsonb_typeof(addons) = 'array' and jsonb_array_length(addons) <= 30),
  removable_ingredients text[] not null default '{}' check (cardinality(removable_ingredients) <= 20),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists products_category_idx on public.products (category_id);

drop trigger if exists products_updated_at on public.products;
create trigger products_updated_at before update on public.products
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- Promoções / cupons (só aparecem quando ativas e dentro do período)
-- -----------------------------------------------------------------------------
create table if not exists public.promotions (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 1 and 80),
  subtitle text check (char_length(subtitle) <= 200),
  coupon_code text check (coupon_code is null or coupon_code ~ '^[A-Z0-9_-]{3,20}$'),
  discount_percent integer check (discount_percent is null or discount_percent between 1 and 90),
  active boolean not null default false,
  starts_at timestamptz,
  ends_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at is null or starts_at is null or ends_at > starts_at)
);

drop trigger if exists promotions_updated_at on public.promotions;
create trigger promotions_updated_at before update on public.promotions
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- Galeria
-- -----------------------------------------------------------------------------
create table if not exists public.gallery_images (
  id uuid primary key default gen_random_uuid(),
  url text not null check (url ~ '^https://'),
  alt text check (char_length(alt) <= 160),
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- Configurações do site (linha única, JSON validado também no painel)
-- -----------------------------------------------------------------------------
create table if not exists public.site_settings (
  id integer primary key default 1 check (id = 1),
  data jsonb not null default '{}'::jsonb check (jsonb_typeof(data) = 'object'),
  updated_at timestamptz not null default now()
);

drop trigger if exists site_settings_updated_at on public.site_settings;
create trigger site_settings_updated_at before update on public.site_settings
  for each row execute function public.set_updated_at();

insert into public.site_settings (id, data) values (1, '{}'::jsonb)
on conflict (id) do nothing;

-- -----------------------------------------------------------------------------
-- RLS
-- -----------------------------------------------------------------------------
alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.promotions enable row level security;
alter table public.gallery_images enable row level security;
alter table public.site_settings enable row level security;

-- Leitura pública (somente o que deve aparecer no site) + leitura total para admin
drop policy if exists "categories_read" on public.categories;
create policy "categories_read" on public.categories
  for select using (active or public.is_admin());

drop policy if exists "products_read" on public.products;
create policy "products_read" on public.products
  for select using (active or public.is_admin());

drop policy if exists "promotions_read" on public.promotions;
create policy "promotions_read" on public.promotions
  for select using (
    (active and (starts_at is null or starts_at <= now()) and (ends_at is null or ends_at >= now()))
    or public.is_admin()
  );

drop policy if exists "gallery_read" on public.gallery_images;
create policy "gallery_read" on public.gallery_images for select using (true);

drop policy if exists "settings_read" on public.site_settings;
create policy "settings_read" on public.site_settings for select using (true);

-- Escrita apenas para administradores
do $$
declare t text;
begin
  foreach t in array array['categories','products','promotions','gallery_images','site_settings'] loop
    execute format('drop policy if exists "%1$s_admin_insert" on public.%1$I', t);
    execute format('drop policy if exists "%1$s_admin_update" on public.%1$I', t);
    execute format('drop policy if exists "%1$s_admin_delete" on public.%1$I', t);
    execute format('create policy "%1$s_admin_insert" on public.%1$I for insert to authenticated with check (public.is_admin())', t);
    execute format('create policy "%1$s_admin_update" on public.%1$I for update to authenticated using (public.is_admin()) with check (public.is_admin())', t);
    execute format('create policy "%1$s_admin_delete" on public.%1$I for delete to authenticated using (public.is_admin())', t);
  end loop;
end $$;

-- -----------------------------------------------------------------------------
-- Categorias iniciais (somente as que tiverem produtos aparecem no site)
-- -----------------------------------------------------------------------------
insert into public.categories (slug, name, description, icon, sort_order) values
  ('lanches-prensados', 'Lanches prensados', 'Pão tostado na prensa e recheio generoso.', 'prensado', 1),
  ('hamburgueres', 'Hambúrgueres', 'Blend suculento, queijo e muito sabor.', 'hamburguer', 2),
  ('cachorros-quentes', 'Cachorros-quentes', 'Dogão do jeito brasileiro.', 'hotdog', 3),
  ('pasteis', 'Pastéis', 'Massa crocante e recheio farto.', 'pastel', 4),
  ('combos', 'Combos', 'Lanche, acompanhamento e bebida.', 'combo', 5),
  ('porcoes', 'Porções', 'Para dividir com a galera.', 'porcao', 6),
  ('bebidas', 'Bebidas', 'Geladas para acompanhar.', 'bebida', 7),
  ('acai-e-sobremesas', 'Açaí e sobremesas', 'O docinho para fechar.', 'sobremesa', 8)
on conflict (slug) do nothing;

-- -----------------------------------------------------------------------------
-- Storage: bucket público para leitura, upload só por admin
-- -----------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('imagens', 'imagens', true, 5242880, array['image/jpeg','image/png','image/webp','image/avif'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "imagens_admin_insert" on storage.objects;
create policy "imagens_admin_insert" on storage.objects
  for insert to authenticated with check (bucket_id = 'imagens' and public.is_admin());

drop policy if exists "imagens_admin_update" on storage.objects;
create policy "imagens_admin_update" on storage.objects
  for update to authenticated using (bucket_id = 'imagens' and public.is_admin());

drop policy if exists "imagens_admin_delete" on storage.objects;
create policy "imagens_admin_delete" on storage.objects
  for delete to authenticated using (bucket_id = 'imagens' and public.is_admin());

-- -----------------------------------------------------------------------------
-- Para liberar o primeiro administrador (rode no SQL Editor depois de criar o
-- usuário em Authentication > Users):
--
--   insert into public.admins (user_id)
--   select id from auth.users where email = 'email-do-dono@exemplo.com';
-- -----------------------------------------------------------------------------

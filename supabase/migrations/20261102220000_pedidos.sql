-- =============================================================================
-- Big Lanche — pedidos (gestor de pedidos estilo WhatsMenu)
--
-- * O navegador NUNCA grava direto na tabela: o pedido entra pela função
--   public.create_order, que recalcula preços, adicionais, cupom e taxa de
--   entrega a partir do banco (não confia nos valores do navegador).
-- * Somente administradores leem, alteram ou excluem pedidos (RLS).
-- * Rode este arquivo no SQL Editor do Supabase (depois da migração inicial).
-- =============================================================================

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  number bigint generated always as identity unique,
  code text unique,
  status text not null default 'novo'
    check (status in ('novo','em_preparo','saiu_entrega','pronto_retirada','concluido','cancelado')),
  customer_name text not null check (char_length(customer_name) between 2 and 80),
  customer_phone text not null check (customer_phone ~ '^\d{10,13}$'),
  mode text not null check (mode in ('entrega','retirada')),
  address jsonb,
  payment_method text check (char_length(payment_method) <= 40),
  change_for text check (char_length(change_for) <= 20),
  items jsonb not null check (jsonb_typeof(items) = 'array'),
  subtotal_cents integer not null check (subtotal_cents >= 0),
  discount_cents integer not null default 0 check (discount_cents >= 0),
  coupon_code text,
  delivery_fee_cents integer check (delivery_fee_cents >= 0),
  total_cents integer not null check (total_cents >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists orders_created_idx on public.orders (created_at desc);
create index if not exists orders_phone_idx on public.orders (customer_phone, created_at desc);

drop trigger if exists orders_updated_at on public.orders;
create trigger orders_updated_at before update on public.orders
  for each row execute function public.set_updated_at();

alter table public.orders enable row level security;

drop policy if exists "orders_admin_select" on public.orders;
create policy "orders_admin_select" on public.orders
  for select to authenticated using (public.is_admin());

drop policy if exists "orders_admin_update" on public.orders;
create policy "orders_admin_update" on public.orders
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "orders_admin_delete" on public.orders;
create policy "orders_admin_delete" on public.orders
  for delete to authenticated using (public.is_admin());

revoke insert on public.orders from anon, authenticated;

-- -----------------------------------------------------------------------------
-- Criação do pedido com recálculo no servidor
-- -----------------------------------------------------------------------------
create or replace function public.create_order(p jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_settings jsonb;
  v_name text := btrim(coalesce(p->>'name', ''));
  v_phone text := regexp_replace(coalesce(p->>'phone', ''), '\D', '', 'g');
  v_mode text := coalesce(p->>'mode', '');
  v_address jsonb := null;
  v_payment text := nullif(btrim(coalesce(p->>'paymentMethod', '')), '');
  v_change text := nullif(left(btrim(coalesce(p->>'changeFor', '')), 20), '');
  v_coupon text := nullif(upper(btrim(coalesce(p->>'couponCode', ''))), '');
  v_item jsonb;
  v_prod public.products%rowtype;
  v_qty integer;
  v_addon_ids text[];
  v_addons jsonb;
  v_addons_total integer;
  v_removed jsonb;
  v_notes text;
  v_line integer;
  v_items jsonb := '[]'::jsonb;
  v_subtotal integer := 0;
  v_discount integer := 0;
  v_fee integer := null;
  v_pct integer;
  v_total integer;
  v_id uuid;
  v_number bigint;
  v_code text;
  v_payments jsonb;
begin
  select data into v_settings from public.site_settings where id = 1;
  v_settings := coalesce(v_settings, '{}'::jsonb);

  if coalesce(v_settings->>'whatsapp', '') = ''
     and coalesce((v_settings->'orders'->>'acceptWithoutWhatsapp')::boolean, false) = false then
    raise exception 'A lanchonete ainda não está recebendo pedidos pelo site.';
  end if;

  if char_length(v_name) < 2 or char_length(v_name) > 80 then
    raise exception 'Informe seu nome.';
  end if;
  if v_phone !~ '^\d{10,13}$' then
    raise exception 'Informe um telefone/WhatsApp válido com DDD.';
  end if;

  if v_mode not in ('entrega', 'retirada') then
    raise exception 'Escolha entrega ou retirada.';
  end if;
  if v_mode = 'entrega' and coalesce((v_settings->'service'->>'delivery')::boolean, true) = false then
    raise exception 'No momento não estamos fazendo entregas.';
  end if;
  if v_mode = 'retirada' and coalesce((v_settings->'service'->>'pickup')::boolean, true) = false then
    raise exception 'No momento não temos retirada no local.';
  end if;

  if v_mode = 'entrega' then
    v_address := jsonb_build_object(
      'street', left(btrim(coalesce(p->'address'->>'street', '')), 120),
      'number', left(btrim(coalesce(p->'address'->>'number', '')), 20),
      'district', left(btrim(coalesce(p->'address'->>'district', '')), 80),
      'complement', left(btrim(coalesce(p->'address'->>'complement', '')), 80),
      'reference', left(btrim(coalesce(p->'address'->>'reference', '')), 120)
    );
    if char_length(v_address->>'street') < 3 or v_address->>'number' = '' or char_length(v_address->>'district') < 2 then
      raise exception 'Endereço de entrega incompleto.';
    end if;
  end if;

  v_payments := coalesce(v_settings->'paymentMethods', '[]'::jsonb);
  if jsonb_typeof(v_payments) <> 'array' or jsonb_array_length(v_payments) = 0 then
    v_payment := null;
    v_change := null;
  elsif v_payment is not null and not (v_payments ? v_payment) then
    raise exception 'Forma de pagamento inválida.';
  end if;

  if jsonb_typeof(p->'items') is distinct from 'array'
     or jsonb_array_length(p->'items') < 1 or jsonb_array_length(p->'items') > 30 then
    raise exception 'Seu carrinho está vazio.';
  end if;

  for v_item in select value from jsonb_array_elements(p->'items') loop
    if coalesce(v_item->>'productId', '') !~ '^[0-9a-fA-F-]{36}$' then
      raise exception 'Produto inválido no carrinho.';
    end if;

    select * into v_prod from public.products
      where id = (v_item->>'productId')::uuid and active;
    if not found then
      raise exception 'Um dos produtos do carrinho não está mais disponível. Atualize a página.';
    end if;
    if not v_prod.available then
      raise exception '% está esgotado no momento.', v_prod.name;
    end if;

    if coalesce(v_item->>'quantity', '') !~ '^\d{1,2}$' then
      raise exception 'Quantidade inválida.';
    end if;
    v_qty := (v_item->>'quantity')::integer;
    if v_qty < 1 or v_qty > 50 then
      raise exception 'Quantidade inválida.';
    end if;

    v_addon_ids := array(
      select x.value from jsonb_array_elements_text(
        case when jsonb_typeof(v_item->'addonIds') = 'array' then v_item->'addonIds' else '[]'::jsonb end
      ) as x(value)
    );
    select coalesce(jsonb_agg(jsonb_build_object(
             'id', a.value->>'id',
             'name', a.value->>'name',
             'priceCents', (a.value->>'priceCents')::integer)), '[]'::jsonb),
           coalesce(sum((a.value->>'priceCents')::integer), 0)
      into v_addons, v_addons_total
      from jsonb_array_elements(v_prod.addons) as a(value)
      where a.value->>'id' = any(v_addon_ids);

    select coalesce(jsonb_agg(r.value), '[]'::jsonb) into v_removed
      from jsonb_array_elements_text(
        case when jsonb_typeof(v_item->'removed') = 'array' then v_item->'removed' else '[]'::jsonb end
      ) as r(value)
      where r.value = any(v_prod.removable_ingredients);

    v_notes := left(btrim(coalesce(v_item->>'notes', '')), 200);
    v_line := (v_prod.price_cents + v_addons_total) * v_qty;
    v_subtotal := v_subtotal + v_line;

    v_items := v_items || jsonb_build_array(jsonb_build_object(
      'productId', v_prod.id,
      'name', v_prod.name,
      'quantity', v_qty,
      'unitPriceCents', v_prod.price_cents,
      'addons', v_addons,
      'removed', v_removed,
      'notes', v_notes,
      'totalCents', v_line
    ));
  end loop;

  if v_coupon is not null then
    select discount_percent into v_pct from public.promotions
      where upper(coupon_code) = v_coupon
        and active
        and discount_percent is not null
        and (starts_at is null or starts_at <= now())
        and (ends_at is null or ends_at >= now())
      limit 1;
    if not found then
      raise exception 'Cupom inválido ou expirado.';
    end if;
    v_discount := round(v_subtotal * v_pct / 100.0);
  end if;

  if v_mode = 'entrega' and jsonb_typeof(v_settings->'service'->'deliveryFeeCents') = 'number' then
    v_fee := (v_settings->'service'->>'deliveryFeeCents')::integer;
  end if;

  v_total := greatest(0, v_subtotal - v_discount) + coalesce(v_fee, 0);

  -- proteção simples contra envios repetidos / spam
  if (select count(*) from public.orders
        where customer_phone = v_phone and created_at > now() - interval '10 minutes') >= 5 then
    raise exception 'Muitos pedidos em sequência. Aguarde alguns minutos ou fale com a lanchonete.';
  end if;

  insert into public.orders (
    customer_name, customer_phone, mode, address, payment_method, change_for,
    items, subtotal_cents, discount_cents, coupon_code, delivery_fee_cents, total_cents
  ) values (
    v_name, v_phone, v_mode, v_address, v_payment, v_change,
    v_items, v_subtotal, v_discount, case when v_discount > 0 then v_coupon end, v_fee, v_total
  ) returning id, number into v_id, v_number;

  v_code := 'BL-' || lpad(v_number::text, 4, '0');
  update public.orders set code = v_code where id = v_id;

  return jsonb_build_object(
    'id', v_id,
    'code', v_code,
    'items', v_items,
    'subtotalCents', v_subtotal,
    'discountCents', v_discount,
    'couponCode', case when v_discount > 0 then v_coupon end,
    'deliveryFeeCents', v_fee,
    'totalCents', v_total
  );
end;
$$;

revoke all on function public.create_order(jsonb) from public;
grant execute on function public.create_order(jsonb) to anon, authenticated;

-- Testes da função create_order (rodados no CI com psql -v ON_ERROR_STOP=1)
\set QUIET on

insert into public.products (id, category_id, name, price_cents, addons, removable_ingredients, available)
select '11111111-1111-1111-1111-111111111111', id, 'Big Brasil', 3290,
       '[{"id":"bacon","name":"Bacon extra","priceCents":500}]'::jsonb, array['Tomate'], true
from public.categories where slug = 'lanches-prensados';

insert into public.products (id, category_id, name, price_cents, available)
select '22222222-2222-2222-2222-222222222222', id, 'Esgotado', 1000, false
from public.categories where slug = 'lanches-prensados';

insert into public.promotions (title, coupon_code, discount_percent, active)
values ('Teste', 'BIG10', 10, true);

-- 1) Sem WhatsApp e sem a opção ligada: recusa
do $$ begin
  perform public.create_order('{"name":"Ana","phone":"11999998888","mode":"retirada","items":[{"productId":"11111111-1111-1111-1111-111111111111","quantity":1}]}');
  raise exception 'deveria recusar';
exception when others then
  assert sqlerrm like 'A lanchonete ainda não está recebendo%', sqlerrm;
end $$;

update public.site_settings set data = '{
  "whatsapp":"5511999998888",
  "service":{"delivery":true,"pickup":true,"deliveryFeeCents":500},
  "paymentMethods":["Pix","Dinheiro"]
}' where id = 1;

-- 2) Recalcula preços no servidor (ignora preço enviado e adicional inexistente)
do $$
declare r jsonb;
begin
  set local role anon;
  r := public.create_order('{
    "name":"Maria","phone":"(11) 98888-7777","mode":"entrega",
    "address":{"street":"Rua A","number":"10","district":"Centro"},
    "paymentMethod":"Pix","couponCode":"big10",
    "items":[{"productId":"11111111-1111-1111-1111-111111111111","quantity":2,
              "addonIds":["bacon","fake"],"removed":["Tomate","Inventado"],"notes":" bem passado ",
              "unitPriceCents":1}]
  }');
  reset role;
  assert r->>'code' = 'BL-0001', r::text;
  assert (r->>'subtotalCents')::int = 7580, r::text;          -- (3290+500)*2
  assert (r->>'discountCents')::int = 758, r::text;           -- 10%
  assert (r->>'deliveryFeeCents')::int = 500, r::text;
  assert (r->>'totalCents')::int = 7322, r::text;
  assert jsonb_array_length(r->'items'->0->'addons') = 1, r::text;
  assert r->'items'->0->'removed' = '["Tomate"]'::jsonb, r::text;
  assert r->'items'->0->>'notes' = 'bem passado', r::text;
  assert (select customer_phone from public.orders where code = 'BL-0001') = '11988887777';
end $$;

-- 3) Produto esgotado
do $$ begin
  perform public.create_order('{"name":"Ana","phone":"11999998888","mode":"retirada","items":[{"productId":"22222222-2222-2222-2222-222222222222","quantity":1}]}');
  raise exception 'deveria recusar';
exception when others then
  assert sqlerrm like '%esgotado%', sqlerrm;
end $$;

-- 4) Retirada não cobra taxa; pagamento inválido é recusado
do $$
declare r jsonb;
begin
  r := public.create_order('{"name":"Ana","phone":"11999998888","mode":"retirada","items":[{"productId":"11111111-1111-1111-1111-111111111111","quantity":1}]}');
  assert r->'deliveryFeeCents' = 'null'::jsonb, r::text;
  assert (r->>'totalCents')::int = 3290, r::text;
  begin
    perform public.create_order('{"name":"Ana","phone":"11999998888","mode":"retirada","paymentMethod":"Bitcoin","items":[{"productId":"11111111-1111-1111-1111-111111111111","quantity":1}]}');
    raise exception 'deveria recusar pagamento';
  exception when others then
    assert sqlerrm = 'Forma de pagamento inválida.', sqlerrm;
  end;
end $$;

-- 5) Entrega sem endereço e cupom inválido
do $$ begin
  begin
    perform public.create_order('{"name":"Ana","phone":"11999998888","mode":"entrega","items":[{"productId":"11111111-1111-1111-1111-111111111111","quantity":1}]}');
    raise exception 'x';
  exception when others then assert sqlerrm = 'Endereço de entrega incompleto.', sqlerrm; end;
  begin
    perform public.create_order('{"name":"Ana","phone":"11999998888","mode":"retirada","couponCode":"NAOEXISTE","items":[{"productId":"11111111-1111-1111-1111-111111111111","quantity":1}]}');
    raise exception 'x';
  exception when others then assert sqlerrm = 'Cupom inválido ou expirado.', sqlerrm; end;
end $$;

-- 6) Anti-spam: no máximo 5 pedidos do mesmo número em 10 minutos
do $$
declare i int;
begin
  for i in 1..4 loop
    perform public.create_order('{"name":"Leo","phone":"11977776666","mode":"retirada","items":[{"productId":"11111111-1111-1111-1111-111111111111","quantity":1}]}');
  end loop;
  perform public.create_order('{"name":"Leo","phone":"11977776666","mode":"retirada","items":[{"productId":"11111111-1111-1111-1111-111111111111","quantity":1}]}');
  begin
    perform public.create_order('{"name":"Leo","phone":"11977776666","mode":"retirada","items":[{"productId":"11111111-1111-1111-1111-111111111111","quantity":1}]}');
    raise exception 'x';
  exception when others then assert sqlerrm like 'Muitos pedidos%', sqlerrm; end;
end $$;

-- 7) Visitante não grava nem lê a tabela diretamente
do $$ begin
  set local role anon;
  begin
    insert into public.orders (customer_name, customer_phone, mode, items, subtotal_cents, total_cents)
    values ('X', '11999998888', 'retirada', '[]', 0, 0);
    raise exception 'anon não deveria inserir';
  exception when insufficient_privilege then null; end;
  reset role;
end $$;

\echo 'OK: todos os testes de pedidos passaram'

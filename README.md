# Big Lanche

Site comercial da lanchonete **Big Lanche**: cardápio digital, carrinho com personalização, finalização de pedido pelo WhatsApp e painel administrativo com banco de dados.

> O repositório no GitHub é a fonte oficial do código. O Lovable é usado apenas para visualizar o resultado (preview).

## Funcionalidades

- **Página inicial**: cabeçalho fixo, destaque principal, categorias, “Os queridinhos da galera”, banner promocional, cardápio completo, sobre nós, galeria com ampliação, avaliações (link para o Google), localização com mapa e rodapé.
- **Cardápio**: busca (ignora acentos), filtro por categoria, modal de detalhes, adicionais, retirada de ingredientes, quantidade, observação e produtos esgotados.
- **Carrinho**: salvo no navegador, edição de quantidades e adicionais, cupom de desconto (só quando há promoção ativa), entrega ou retirada, taxa de entrega apenas se configurada, resumo antes de finalizar.
- **WhatsApp**: mensagem montada automaticamente (pedido, cliente, itens, adicionais, observações, subtotal, desconto, taxa, total, modalidade, endereço e pagamento). Sem número válido cadastrado, o botão de finalizar fica desativado.
- **Painel `/admin`**: login, produtos (com upload de imagem), categorias, promoções/cupons, galeria e configurações (WhatsApp, endereço, horários, entrega, pagamento, redes sociais, textos e imagens).
- **SEO e acessibilidade**: metadados e Open Graph, `sitemap.xml`, `robots.txt`, dados estruturados de restaurante (somente com informações confirmadas), navegação por teclado, foco visível e respeito a “movimento reduzido”.

## Dados comerciais pendentes de confirmação

As informações abaixo vieram da ficha “Big Lanches” no Google Maps indicada pelo cliente. **Não foi confirmado que seja a mesma empresa.** No site, elas aparecem com o selo “Em validação” até serem confirmadas no painel:

- Endereço: Estrada dos Pinheiros, 376, Parque Viana, Barueri – SP, CEP 06449-000
- Telefone: (11) 4162-1591 (não é tratado como WhatsApp)
- Mapa/avaliações: https://maps.app.goo.gl/WcneQXVzDAEFueVd7

Horários, WhatsApp, formas de pagamento, taxa de entrega e redes sociais **não** foram preenchidos.

## Dados demonstrativos

Sem banco configurado, o site usa `src/data/demo.ts`: produtos e preços **de exemplo**, marcados com o selo “Exemplo”, e fotos ilustrativas (Unsplash License) marcadas como “Imagem ilustrativa”. Esses dados ficam separados dos dados oficiais e deixam de aparecer assim que o banco é configurado.

## Estrutura

```
src/
  routes/                 páginas (TanStack Start, roteamento por arquivo)
    index.tsx             página inicial
    admin.tsx             painel administrativo
    politica-de-privacidade.tsx
    sitemap[.]xml.ts      sitemap dinâmico
    robots[.]txt.ts       robots.txt dinâmico
  components/site/        componentes visuais do site
  components/cart/        carrinho e checkout
  components/admin/       telas do painel
  config/settings.ts      configurações comerciais + validação (Zod)
  data/demo.ts            dados demonstrativos
  lib/                    regras de negócio (carrinho, WhatsApp, formatação, cliente Supabase)
  services/               consultas ao banco (site e painel)
supabase/migrations/      tabelas, RLS, storage e categorias iniciais
```

## Banco de dados (Supabase)

1. Crie um projeto no Supabase (ou ative o Lovable Cloud).
2. Execute `supabase/migrations/20261102120000_big_prensado_inicial.sql` no **SQL Editor**.
3. Em **Authentication → Users**, crie o usuário do proprietário (e-mail e senha).
4. Libere esse usuário como administrador no SQL Editor:
   ```sql
   insert into public.admins (user_id)
   select id from auth.users where email = 'email-do-dono@exemplo.com';
   ```
5. Configure as variáveis de ambiente (veja `.env.example`):
   ```
   VITE_SUPABASE_URL=https://SEU-PROJETO.supabase.co
   VITE_SUPABASE_PUBLISHABLE_KEY=sua-chave-publica
   ```
6. Acesse `/admin`, entre e cadastre WhatsApp, horários, produtos e fotos reais.

### Segurança

- Só a chave **pública** vai para o navegador. Nunca use a `service_role` em variáveis `VITE_*`.
- Row Level Security em todas as tabelas: visitantes apenas leem o que é público; escrita somente para usuários da tabela `admins`.
- Restrições no banco (CHECK) validam tamanhos, preços, links `https://` e formatos de cupom; o painel valida antes com Zod.
- Bucket `imagens` aceita apenas JPG, PNG, WEBP e AVIF de até 5 MB, com upload restrito a administradores.
- Pedidos **não** são gravados nem pagos pelo site: abrir o WhatsApp não confirma o pedido. A estrutura está preparada para, no futuro, registrar pedidos no servidor com recálculo de preços e integrar pagamento online.

## Desenvolvimento

Requer Node.js 20+ (ou Bun).

```sh
bun install        # ou npm install
bun run dev        # servidor local
bun run test       # testes (carrinho, WhatsApp, filtros, configurações)
bun run build      # build de produção
```

O GitHub Actions (`.github/workflows/ci.yml`) roda build, verificação de tipos e testes a cada push.

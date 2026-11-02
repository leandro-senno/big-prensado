import { useCallback, useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ExternalLink, Loader2, LogOut } from "lucide-react";
import { toast } from "sonner";

import { Logo } from "@/components/site/Logo";
import type { SiteSettings } from "@/config/settings";
import { getSession, isSupabaseConfigured, signIn, signOut, type Session } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import { adminLoadAll, checkIsAdmin } from "@/services/admin";
import type { Category, GalleryImage, Product, Promotion } from "@/types/catalog";

import { CategoriesPanel } from "./CategoriesPanel";
import { GalleryPanel } from "./GalleryPanel";
import { OrdersPanel, useOrdersFeed } from "./OrdersPanel";
import { ProductsPanel } from "./ProductsPanel";
import { PromotionsPanel } from "./PromotionsPanel";
import { SettingsPanel } from "./SettingsPanel";
import { btnGhost, btnPrimary, errorMessage, FormField, inputCls, Panel } from "./ui";

type Tab = "produtos" | "categorias" | "promocoes" | "galeria" | "configuracoes" | "pedidos";

const TABS: { id: Tab; label: string }[] = [
  { id: "pedidos", label: "Pedidos" },
  { id: "produtos", label: "Produtos" },
  { id: "categorias", label: "Categorias" },
  { id: "promocoes", label: "Promoções" },
  { id: "galeria", label: "Galeria" },
  { id: "configuracoes", label: "Configurações" },
];

interface AdminData {
  categories: Category[];
  products: Product[];
  promotions: Promotion[];
  gallery: GalleryImage[];
  settings: SiteSettings;
}

function Shell({
  children,
  email,
  onLogout,
}: {
  children: React.ReactNode;
  email?: string;
  onLogout?: () => void;
}) {
  return (
    <div className="min-h-screen bg-brand-black text-white">
      <header className="border-b border-white/10 bg-brand-black-2">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <Logo compact />
            <span className="rounded-full bg-white/10 px-2.5 py-1 text-xs font-semibold uppercase tracking-wide text-brand-gray">
              Painel
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Link to="/" className={cn(btnGhost, "h-9 px-4 text-xs")}>
              <ExternalLink className="h-4 w-4" aria-hidden="true" /> Ver site
            </Link>
            {onLogout ? (
              <button
                type="button"
                onClick={onLogout}
                className={cn(btnGhost, "h-9 px-4 text-xs")}
                title={email}
              >
                <LogOut className="h-4 w-4" aria-hidden="true" /> Sair
              </button>
            ) : null}
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">{children}</main>
    </div>
  );
}

function NotConfigured() {
  return (
    <Shell>
      <Panel title="Banco de dados não configurado">
        <div className="space-y-3 text-sm text-brand-gray">
          <p>
            O painel administrativo grava as alterações no Supabase (PostgreSQL). Para ativá-lo,
            configure as variáveis de ambiente{" "}
            <code className="text-brand-amber">VITE_SUPABASE_URL</code> e{" "}
            <code className="text-brand-amber">VITE_SUPABASE_PUBLISHABLE_KEY</code> e aplique a
            migração em <code className="text-brand-amber">supabase/migrations</code>.
          </p>
          <p>Enquanto isso, o site exibe os dados demonstrativos, identificados como “Exemplo”.</p>
          <p>O passo a passo completo está no README do projeto.</p>
        </div>
      </Panel>
    </Shell>
  );
}

function LoginForm({ onLogged }: { onLogged: (s: Session) => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  return (
    <Shell>
      <div className="mx-auto max-w-sm">
        <Panel title="Entrar">
          <form
            className="space-y-4"
            onSubmit={async (e) => {
              e.preventDefault();
              setError("");
              setLoading(true);
              try {
                const s = await signIn(email.trim(), password);
                onLogged(s);
              } catch (err) {
                setError(errorMessage(err));
              } finally {
                setLoading(false);
              }
            }}
          >
            <FormField label="E-mail" htmlFor="adm-email">
              <input
                id="adm-email"
                type="email"
                autoComplete="username"
                className={inputCls}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </FormField>
            <FormField label="Senha" htmlFor="adm-pass">
              <input
                id="adm-pass"
                type="password"
                autoComplete="current-password"
                className={inputCls}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </FormField>
            {error ? (
              <p className="text-sm text-red-300" role="alert">
                {error}
              </p>
            ) : null}
            <button type="submit" className={cn(btnPrimary, "w-full")} disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}
              Entrar
            </button>
          </form>
        </Panel>
      </div>
    </Shell>
  );
}

export function AdminApp() {
  const [status, setStatus] = useState<"checking" | "anon" | "denied" | "ready" | "error">(
    "checking",
  );
  const [session, setSession] = useState<Session | null>(null);
  const [data, setData] = useState<AdminData | null>(null);
  const [loadError, setLoadError] = useState("");

  const bootstrap = useCallback(async (s: Session | null) => {
    if (!s) {
      setStatus("anon");
      return;
    }
    setSession(s);
    setStatus("checking");
    const ok = await checkIsAdmin();
    if (!ok) {
      setStatus("denied");
      return;
    }
    try {
      setData(await adminLoadAll());
      setStatus("ready");
    } catch (err) {
      setLoadError(errorMessage(err));
      setStatus("error");
    }
  }, []);

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    void getSession().then(bootstrap);
  }, [bootstrap]);

  const logout = async () => {
    await signOut();
    setSession(null);
    setData(null);
    setStatus("anon");
    toast.success("Você saiu do painel.");
  };

  if (!isSupabaseConfigured) return <NotConfigured />;
  if (status === "anon") return <LoginForm onLogged={(s) => void bootstrap(s)} />;

  if (status === "checking") {
    return (
      <Shell>
        <div className="flex items-center justify-center py-24 text-brand-gray" role="status">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" aria-hidden="true" /> Carregando...
        </div>
      </Shell>
    );
  }

  if (status === "denied") {
    return (
      <Shell email={session?.email ?? ""} onLogout={() => void logout()}>
        <Panel title="Acesso não autorizado">
          <p className="text-sm text-brand-gray">
            Sua conta ({session?.email}) não tem permissão de administrador. Peça ao responsável
            técnico para liberar seu usuário na tabela{" "}
            <code className="text-brand-amber">admins</code>.
          </p>
        </Panel>
      </Shell>
    );
  }

  if (status === "error" || !data) {
    return (
      <Shell email={session?.email ?? ""} onLogout={() => void logout()}>
        <Panel title="Não foi possível carregar os dados">
          <p className="text-sm text-brand-gray">{loadError || "Tente novamente em instantes."}</p>
          <button
            type="button"
            className={cn(btnPrimary, "mt-4")}
            onClick={() => void bootstrap(session)}
          >
            Tentar novamente
          </button>
        </Panel>
      </Shell>
    );
  }

  return (
    <Shell email={session?.email ?? ""} onLogout={() => void logout()}>
      <Dashboard data={data} setData={setData} />
    </Shell>
  );
}

function Dashboard({ data, setData }: { data: AdminData; setData: (d: AdminData) => void }) {
  const [tab, setTab] = useState<Tab>("pedidos");
  const feed = useOrdersFeed();

  return (
    <>
      <nav
        aria-label="Seções do painel"
        className="-mx-4 mb-6 overflow-x-auto px-4 sm:mx-0 sm:px-0"
      >
        <ul className="flex gap-2" role="tablist">
          {TABS.map((t) => (
            <li key={t.id}>
              <button
                type="button"
                role="tab"
                aria-selected={tab === t.id}
                onClick={() => setTab(t.id)}
                className={cn(
                  "relative h-10 whitespace-nowrap rounded-full px-4 text-sm font-semibold transition",
                  tab === t.id
                    ? "bg-brand-orange text-brand-black"
                    : "bg-white/5 text-white hover:bg-white/10",
                )}
              >
                {t.label}
                {t.id === "pedidos" && feed.newCount > 0 ? (
                  <span className="ml-2 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-xs font-bold text-white">
                    {feed.newCount}
                  </span>
                ) : null}
              </button>
            </li>
          ))}
        </ul>
      </nav>

      {tab === "pedidos" ? (
        <OrdersPanel feed={feed} />
      ) : tab === "produtos" ? (
        <ProductsPanel
          products={data.products}
          categories={data.categories}
          onChange={(products) => setData({ ...data, products })}
        />
      ) : tab === "categorias" ? (
        <CategoriesPanel
          categories={data.categories}
          products={data.products}
          onChange={(categories) => setData({ ...data, categories })}
        />
      ) : tab === "promocoes" ? (
        <PromotionsPanel
          promotions={data.promotions}
          onChange={(promotions) => setData({ ...data, promotions })}
        />
      ) : tab === "galeria" ? (
        <GalleryPanel images={data.gallery} onChange={(gallery) => setData({ ...data, gallery })} />
      ) : (
        <SettingsPanel
          settings={data.settings}
          onSaved={(settings) => setData({ ...data, settings })}
        />
      )}
    </>
  );
}

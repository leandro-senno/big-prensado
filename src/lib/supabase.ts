/**
 * Cliente mínimo para Supabase (PostgREST, Auth e Storage) usando fetch.
 *
 * Só usa a chave PÚBLICA (anon/publishable). Toda a proteção dos dados é feita
 * no banco por Row Level Security (veja supabase/migrations). Nunca coloque a
 * service_role key em variáveis VITE_*: elas são enviadas ao navegador.
 */

const env = import.meta.env as Record<string, string | undefined>;

const SUPABASE_URL = (env["VITE_SUPABASE_URL"] ?? "").replace(/\/+$/, "");
const SUPABASE_KEY = env["VITE_SUPABASE_PUBLISHABLE_KEY"] ?? env["VITE_SUPABASE_ANON_KEY"] ?? "";

export const isSupabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_KEY);

export const IMAGE_BUCKET = "imagens";

export class SupabaseError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "SupabaseError";
    this.status = status;
  }
}

/* ----------------------------------------------------------------------------
 * Sessão (somente no navegador)
 * ------------------------------------------------------------------------- */

export interface Session {
  accessToken: string;
  refreshToken: string;
  expiresAt: number; // epoch em segundos
  userId: string;
  email: string;
}

const SESSION_KEY = "bp-admin-session";

function readSession(): Session | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(SESSION_KEY);
    return raw ? (JSON.parse(raw) as Session) : null;
  } catch {
    return null;
  }
}

function writeSession(session: Session | null) {
  if (typeof window === "undefined") return;
  try {
    if (session) window.localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    else window.localStorage.removeItem(SESSION_KEY);
  } catch {
    // armazenamento indisponível (modo privado): a sessão dura só nesta aba
  }
}

let memorySession: Session | null = null;

interface TokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  user: { id: string; email?: string };
}

function toSession(t: TokenResponse): Session {
  return {
    accessToken: t.access_token,
    refreshToken: t.refresh_token,
    expiresAt: Math.floor(Date.now() / 1000) + t.expires_in,
    userId: t.user.id,
    email: t.user.email ?? "",
  };
}

async function authRequest(path: string, body: unknown): Promise<TokenResponse> {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/${path}`, {
    method: "POST",
    headers: { apikey: SUPABASE_KEY, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    throw new SupabaseError(
      res.status === 400 ? "E-mail ou senha incorretos." : "Não foi possível entrar agora.",
      res.status,
    );
  }
  return (await res.json()) as TokenResponse;
}

export async function signIn(email: string, password: string): Promise<Session> {
  const data = await authRequest("token?grant_type=password", { email, password });
  const session = toSession(data);
  memorySession = session;
  writeSession(session);
  return session;
}

export async function signOut(): Promise<void> {
  const session = memorySession ?? readSession();
  memorySession = null;
  writeSession(null);
  if (session) {
    try {
      await fetch(`${SUPABASE_URL}/auth/v1/logout`, {
        method: "POST",
        headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${session.accessToken}` },
      });
    } catch {
      // sessão local já removida
    }
  }
}

/** Retorna uma sessão válida, renovando o token quando necessário. */
export async function getSession(): Promise<Session | null> {
  const current = memorySession ?? readSession();
  if (!current) return null;
  const now = Math.floor(Date.now() / 1000);
  if (current.expiresAt - now > 60) {
    memorySession = current;
    return current;
  }
  try {
    const data = await authRequest("token?grant_type=refresh_token", {
      refresh_token: current.refreshToken,
    });
    const session = toSession(data);
    memorySession = session;
    writeSession(session);
    return session;
  } catch {
    memorySession = null;
    writeSession(null);
    return null;
  }
}

/* ----------------------------------------------------------------------------
 * PostgREST
 * ------------------------------------------------------------------------- */

async function headers(auth: boolean, extra?: Record<string, string>) {
  const h: Record<string, string> = {
    apikey: SUPABASE_KEY,
    "Content-Type": "application/json",
    ...extra,
  };
  if (auth) {
    const session = await getSession();
    if (!session) throw new SupabaseError("Sua sessão expirou. Entre novamente.", 401);
    h["Authorization"] = `Bearer ${session.accessToken}`;
  } else if (SUPABASE_KEY.startsWith("eyJ")) {
    // Chave "anon" antiga (JWT). As novas chaves publishable (sb_publishable_...)
    // não são JWT e devem ir somente no cabeçalho apikey.
    h["Authorization"] = `Bearer ${SUPABASE_KEY}`;
  }
  return h;
}

async function handle<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let message = "Erro ao comunicar com o banco de dados.";
    try {
      const body = (await res.json()) as { message?: string };
      if (res.status === 401 || res.status === 403) {
        message = "Você não tem permissão para esta ação.";
      } else if (body.message) {
        message = body.message;
      }
    } catch {
      // corpo vazio
    }
    throw new SupabaseError(message, res.status);
  }
  if (res.status === 204) return undefined as T;
  const text = await res.text();
  return (text ? JSON.parse(text) : undefined) as T;
}

export async function dbSelect<T>(table: string, query: string, auth = false): Promise<T[]> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${query}`, {
    headers: await headers(auth),
  });
  return handle<T[]>(res);
}

export async function dbInsert<T>(table: string, rows: object | object[]): Promise<T[]> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
    method: "POST",
    headers: await headers(true, { Prefer: "return=representation" }),
    body: JSON.stringify(rows),
  });
  return handle<T[]>(res);
}

export async function dbUpsert<T>(table: string, rows: object | object[]): Promise<T[]> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
    method: "POST",
    headers: await headers(true, {
      Prefer: "return=representation,resolution=merge-duplicates",
    }),
    body: JSON.stringify(rows),
  });
  return handle<T[]>(res);
}

export async function dbUpdate<T>(table: string, filter: string, patch: object): Promise<T[]> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${filter}`, {
    method: "PATCH",
    headers: await headers(true, { Prefer: "return=representation" }),
    body: JSON.stringify(patch),
  });
  return handle<T[]>(res);
}

export async function dbDelete(table: string, filter: string): Promise<void> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${filter}`, {
    method: "DELETE",
    headers: await headers(true),
  });
  await handle<void>(res);
}

export async function dbRpc<T>(fn: string, args: object = {}, auth = true): Promise<T> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${fn}`, {
    method: "POST",
    headers: await headers(auth),
    body: JSON.stringify(args),
  });
  return handle<T>(res);
}

/* ----------------------------------------------------------------------------
 * Storage
 * ------------------------------------------------------------------------- */

export const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/avif"];
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

const EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/avif": "avif",
};

/** Envia uma imagem validada e devolve a URL pública. */
export async function uploadImage(file: File, folder: string): Promise<string> {
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    throw new SupabaseError("Formato não permitido. Envie JPG, PNG, WEBP ou AVIF.", 400);
  }
  if (file.size > MAX_IMAGE_BYTES) {
    throw new SupabaseError("Imagem muito grande. O limite é 5 MB.", 400);
  }
  const safeFolder = folder.replace(/[^a-z0-9-]/gi, "").slice(0, 30) || "geral";
  const id =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const path = `${safeFolder}/${id}.${EXT[file.type] ?? "jpg"}`;
  const h = await headers(true, { "Content-Type": file.type, "x-upsert": "false" });
  const res = await fetch(`${SUPABASE_URL}/storage/v1/object/${IMAGE_BUCKET}/${path}`, {
    method: "POST",
    headers: h,
    body: file,
  });
  await handle<unknown>(res);
  return `${SUPABASE_URL}/storage/v1/object/public/${IMAGE_BUCKET}/${path}`;
}

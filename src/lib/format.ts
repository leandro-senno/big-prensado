const brl = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

/** Formata centavos em reais: 2990 -> "R$ 29,90" (com espaço normal). */
export function formatBRL(cents: number): string {
  return brl.format(cents / 100).replace(/\u00a0/g, " ");
}

/** Converte "29,90" / "29.90" / "R$ 29,90" em centavos. Retorna null se inválido. */
export function parseBRLToCents(input: string): number | null {
  const cleaned = input.replace(/[^\d,.-]/g, "").trim();
  if (!cleaned) return null;
  let normalized = cleaned;
  if (cleaned.includes(",")) {
    normalized = cleaned.replace(/\./g, "").replace(",", ".");
  }
  const value = Number(normalized);
  if (!Number.isFinite(value) || value < 0) return null;
  return Math.round(value * 100);
}

export function slugify(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

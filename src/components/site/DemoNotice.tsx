import { Info } from "lucide-react";

/** Aviso exibido enquanto o site usa dados demonstrativos. */
export function DemoNotice({ error }: { error: string | null }) {
  return (
    <div
      className="border-y border-brand-amber/20 bg-brand-amber/10 px-4 py-3 text-center text-sm text-brand-amber"
      role="note"
    >
      <Info className="mr-1.5 inline h-4 w-4 align-[-3px]" aria-hidden="true" />
      {error ? `${error} ` : ""}
      Cardápio, preços e fotos marcados como <strong>“Exemplo”</strong> são demonstrativos e ainda
      serão confirmados pelo estabelecimento.
    </div>
  );
}

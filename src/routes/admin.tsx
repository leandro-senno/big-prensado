import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";

import { AdminApp } from "@/components/admin/AdminApp";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Painel administrativo | Big Prensado" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AdminPage,
});

/** O painel depende do navegador (sessão local), então só renderiza no cliente. */
function AdminPage() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) {
    return (
      <div
        className="flex min-h-screen items-center justify-center bg-brand-black text-brand-gray"
        role="status"
      >
        <Loader2 className="mr-2 h-5 w-5 animate-spin" aria-hidden="true" /> Carregando painel...
      </div>
    );
  }
  return <AdminApp />;
}

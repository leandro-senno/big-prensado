import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";

import { Logo } from "@/components/site/Logo";

export const Route = createFileRoute("/politica-de-privacidade")({
  head: () => ({
    meta: [
      { title: "Política de Privacidade | Big Lanche" },
      {
        name: "description",
        content: "Saiba como o site do Big Lanche trata os dados informados ao montar um pedido.",
      },
    ],
  }),
  component: PrivacyPage,
});

function PrivacyPage() {
  return (
    <div className="min-h-screen bg-brand-black text-white">
      <header className="border-b border-white/10">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-4 sm:px-6">
          <Link to="/" aria-label="Voltar ao início">
            <Logo compact />
          </Link>
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-sm text-brand-gray hover:text-brand-amber"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Voltar
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
        <h1 className="font-display text-4xl uppercase tracking-wide sm:text-5xl">
          Política de Privacidade
        </h1>
        <p className="mt-2 text-sm text-brand-gray">
          Este texto é um modelo inicial e deve ser revisado pelo responsável pelo estabelecimento
          antes da publicação.
        </p>

        <div className="mt-8 space-y-8 leading-relaxed text-brand-gray [&_h2]:mb-2 [&_h2]:font-display [&_h2]:text-2xl [&_h2]:uppercase [&_h2]:tracking-wide [&_h2]:text-white">
          <section>
            <h2>Quais dados usamos</h2>
            <p>
              Ao fazer um pedido, você informa nome, WhatsApp, endereço de entrega (quando
              aplicável), forma de pagamento e observações. Esses dados são usados somente para
              preparar, entregar e falar com você sobre o pedido.
            </p>
          </section>
          <section>
            <h2>Armazenamento</h2>
            <p>
              O pedido fica registrado no sistema da lanchonete, com acesso restrito aos
              administradores, pelo tempo necessário ao atendimento e ao cumprimento de obrigações
              legais. O conteúdo do carrinho fica salvo apenas no seu navegador até a finalização.
              Pagamentos não são feitos pelo site.
            </p>
          </section>
          <section>
            <h2>WhatsApp e serviços de terceiros</h2>
            <p>
              Ao finalizar, você é direcionado ao WhatsApp, que possui política de privacidade
              própria. O mapa da seção de localização é fornecido pelo Google Maps, e as fontes e
              imagens podem ser carregadas de serviços externos.
            </p>
          </section>
          <section>
            <h2>Seus direitos (LGPD)</h2>
            <p>
              Você pode solicitar informações, correção ou exclusão de dados compartilhados com o
              estabelecimento pelos canais de atendimento informados no site, conforme a Lei Geral
              de Proteção de Dados (Lei nº 13.709/2018).
            </p>
          </section>
        </div>
      </main>
    </div>
  );
}

import { Link } from "@tanstack/react-router";

import { formatAddress, phoneToTel, type SiteSettings } from "@/config/settings";
import { normalizeWhatsapp } from "@/lib/whatsapp";

import { FacebookIcon, InstagramIcon, TiktokIcon } from "./icons";
import { Logo } from "./Logo";
import { PendingBadge } from "./PendingBadge";

export function Footer({ settings }: { settings: SiteSettings }) {
  const year = new Date().getFullYear();
  const tel = phoneToTel(settings.phone.display);
  const whatsapp = normalizeWhatsapp(settings.whatsapp);
  const socials = [
    { url: settings.social.instagram, label: "Instagram", Icon: InstagramIcon },
    { url: settings.social.facebook, label: "Facebook", Icon: FacebookIcon },
    { url: settings.social.tiktok, label: "TikTok", Icon: TiktokIcon },
  ].filter((s) => s.url);

  const heading = "font-display text-lg uppercase tracking-wide text-white";
  const link = "text-brand-gray transition hover:text-brand-amber";

  return (
    <footer className="border-t border-white/10 bg-[#070708] pb-24 pt-14 md:pb-10">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 sm:grid-cols-2 sm:px-6 lg:grid-cols-4 lg:px-8">
        <div>
          <Logo />
          <p className="mt-4 max-w-xs text-sm text-brand-gray">{settings.shortDescription}</p>
        </div>

        <nav aria-label="Links rápidos">
          <p className={heading}>Links rápidos</p>
          <ul className="mt-4 space-y-2 text-sm">
            <li>
              <a href="#inicio" className={link}>
                Início
              </a>
            </li>
            <li>
              <a href="#cardapio" className={link}>
                Cardápio
              </a>
            </li>
            <li>
              <a href="#promocoes" className={link}>
                Promoções
              </a>
            </li>
            <li>
              <a href="#sobre" className={link}>
                Sobre nós
              </a>
            </li>
            <li>
              <a href="#localizacao" className={link}>
                Contato
              </a>
            </li>
          </ul>
        </nav>

        <div>
          <p className={heading}>Atendimento</p>
          <ul className="mt-4 space-y-2 text-sm text-brand-gray">
            {settings.phone.display && tel ? (
              <li>
                Telefone:{" "}
                <a href={`tel:${tel}`} className={link}>
                  {settings.phone.display}
                </a>
                {!settings.phone.confirmed ? <PendingBadge className="ml-2" /> : null}
              </li>
            ) : null}
            <li>
              WhatsApp:{" "}
              {whatsapp ? (
                <a
                  href={`https://wa.me/${whatsapp}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={link}
                >
                  enviar mensagem
                </a>
              ) : (
                <span>em breve</span>
              )}
            </li>
            <li>
              {formatAddress(settings.address)}
              {!settings.address.confirmed ? <PendingBadge className="ml-2" /> : null}
            </li>
            <li>
              {settings.hoursConfirmed && settings.hours.length > 0
                ? settings.hours.map((h) => `${h.label}: ${h.value}`).join(" · ")
                : "Horários em validação"}
            </li>
          </ul>
        </div>

        <div>
          <p className={heading}>Redes sociais</p>
          {socials.length > 0 ? (
            <ul className="mt-4 flex gap-3">
              {socials.map(({ url, label, Icon }) => (
                <li key={label}>
                  <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={label}
                    className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/15 text-white transition hover:border-brand-orange hover:text-brand-orange"
                  >
                    <Icon className="h-5 w-5" />
                  </a>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-4 text-sm text-brand-gray">Perfis oficiais em breve.</p>
          )}
        </div>
      </div>

      <div className="mx-auto mt-12 flex max-w-7xl flex-col gap-3 border-t border-white/10 px-4 pt-6 text-xs text-white/50 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
        <p>
          © {year} {settings.businessName}. Todos os direitos reservados.
        </p>
        <div className="flex gap-4">
          <Link to="/politica-de-privacidade" className="hover:text-brand-amber">
            Política de Privacidade
          </Link>
          <Link to="/admin" className="hover:text-brand-amber" rel="nofollow">
            Área do administrador
          </Link>
        </div>
      </div>
    </footer>
  );
}

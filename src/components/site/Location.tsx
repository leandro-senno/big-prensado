import { Bike, Clock, MapPin, Navigation, Phone, Store } from "lucide-react";

import { formatAddress, phoneToTel, type SiteSettings } from "@/config/settings";
import { formatBRL } from "@/lib/format";
import { normalizeWhatsapp } from "@/lib/whatsapp";

import { WhatsappIcon } from "./icons";
import { PendingBadge } from "./PendingBadge";
import { SectionHeading } from "./SectionHeading";

export function Location({ settings }: { settings: SiteSettings }) {
  const address = formatAddress(settings.address);
  const tel = phoneToTel(settings.phone.display);
  const whatsapp = normalizeWhatsapp(settings.whatsapp);
  const embedSrc = address
    ? `https://www.google.com/maps?q=${encodeURIComponent(address)}&output=embed`
    : "";
  const { service } = settings;

  const card = "flex gap-4 rounded-2xl border border-white/10 bg-brand-black-2 p-4 sm:p-5";
  const iconBox =
    "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-orange/15 text-brand-orange";

  return (
    <section
      id="localizacao"
      aria-labelledby="localizacao-title"
      className="bg-brand-black py-16 sm:py-24"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeading id="localizacao-title" kicker="Vem matar a fome" title="Onde estamos" />
        <div className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
          <div className="space-y-3">
            {address ? (
              <div className={card}>
                <span className={iconBox}>
                  <MapPin className="h-5 w-5" aria-hidden="true" />
                </span>
                <div>
                  <p className="flex flex-wrap items-center gap-2 font-semibold text-white">
                    Endereço {!settings.address.confirmed ? <PendingBadge /> : null}
                  </p>
                  <p className="mt-1 text-brand-gray">{address}</p>
                </div>
              </div>
            ) : null}

            {settings.phone.display ? (
              <div className={card}>
                <span className={iconBox}>
                  <Phone className="h-5 w-5" aria-hidden="true" />
                </span>
                <div>
                  <p className="flex flex-wrap items-center gap-2 font-semibold text-white">
                    Telefone {!settings.phone.confirmed ? <PendingBadge /> : null}
                  </p>
                  {tel ? (
                    <a
                      href={`tel:${tel}`}
                      className="mt-1 inline-block text-brand-gray underline-offset-4 hover:text-brand-amber hover:underline"
                    >
                      {settings.phone.display}
                    </a>
                  ) : null}
                </div>
              </div>
            ) : null}

            {whatsapp ? (
              <div className={card}>
                <span className={iconBox}>
                  <WhatsappIcon className="h-5 w-5" />
                </span>
                <div>
                  <p className="font-semibold text-white">WhatsApp</p>
                  <a
                    href={`https://wa.me/${whatsapp}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-1 inline-block text-brand-gray hover:text-brand-amber"
                  >
                    Falar no WhatsApp
                  </a>
                </div>
              </div>
            ) : null}

            <div className={card}>
              <span className={iconBox}>
                <Clock className="h-5 w-5" aria-hidden="true" />
              </span>
              <div className="flex-1">
                <p className="font-semibold text-white">Horário de funcionamento</p>
                {settings.hours.length > 0 && settings.hoursConfirmed ? (
                  <dl className="mt-1 space-y-0.5 text-brand-gray">
                    {settings.hours.map((h) => (
                      <div key={h.label} className="flex justify-between gap-4">
                        <dt>{h.label}</dt>
                        <dd>{h.value}</dd>
                      </div>
                    ))}
                  </dl>
                ) : (
                  <p className="mt-1 text-brand-gray">
                    Horários em validação. Consulte antes de ir.
                  </p>
                )}
              </div>
            </div>

            <div className={card}>
              <span className={iconBox}>
                <Bike className="h-5 w-5" aria-hidden="true" />
              </span>
              <div>
                <p className="flex flex-wrap items-center gap-2 font-semibold text-white">
                  Delivery e retirada {!service.confirmed ? <PendingBadge /> : null}
                </p>
                {service.confirmed ? (
                  <ul className="mt-1 space-y-0.5 text-brand-gray">
                    <li className="flex items-center gap-2">
                      <Bike className="h-4 w-4" aria-hidden="true" />
                      {service.delivery ? "Fazemos entrega" : "Não fazemos entrega no momento"}
                      {service.delivery && service.deliveryFeeCents !== null
                        ? ` · taxa ${formatBRL(service.deliveryFeeCents)}`
                        : ""}
                    </li>
                    <li className="flex items-center gap-2">
                      <Store className="h-4 w-4" aria-hidden="true" />
                      {service.pickup ? "Retirada no local" : "Sem retirada no local"}
                    </li>
                    {service.notes ? <li>{service.notes}</li> : null}
                  </ul>
                ) : (
                  <p className="mt-1 text-brand-gray">
                    Condições de entrega e retirada serão informadas em breve.
                  </p>
                )}
              </div>
            </div>

            {settings.mapsUrl ? (
              <a
                href={settings.mapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="glow-orange flex h-14 w-full items-center justify-center gap-2 rounded-full bg-brand-orange font-bold uppercase tracking-wide text-brand-black transition hover:bg-brand-amber"
              >
                <Navigation className="h-5 w-5" aria-hidden="true" />
                Como chegar
              </a>
            ) : null}
          </div>

          {embedSrc ? (
            <div className="overflow-hidden rounded-3xl border border-white/10 bg-brand-black-2">
              <iframe
                title="Mapa com a localização do Big Prensado"
                src={embedSrc}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                className="h-[320px] w-full grayscale-[30%] sm:h-[420px] lg:h-full lg:min-h-[520px]"
                allowFullScreen
              />
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}

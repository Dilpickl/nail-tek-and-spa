import type { CSSProperties } from "react";
import Link from "next/link";

import { AnimatedTitle } from "@/components/home/AnimatedTitle";
import { getServiceById, type Service } from "@/lib/config/salonData";
import { formatDuration } from "@/lib/utils";

function svc(id: string): Service {
  const service = getServiceById(id);
  if (!service) throw new Error(`Unknown service ${id}`);
  return service;
}

function priceLabel(service: Service, short?: string) {
  const name = short ?? service.name;
  return `${name} ${service.priceFrom ? "from " : ""}$${service.price}`;
}

const stagger = (i: number) => ({ "--rd": `${i * 110}ms` }) as CSSProperties;

export function BeyondNails() {
  const brows = [svc("wax-eyebrows"), svc("wax-lips"), svc("wax-chin")];
  const lashes = [svc("lash-tinting"), svc("lash-extensions")];
  const body = [svc("wax-underarms"), svc("wax-bikini"), svc("wax-half-legs")];
  const from = (list: Service[]) => Math.min(...list.map((s) => s.price));

  const tiles = [
    {
      kicker: "Brows & face",
      from: from(brows),
      list: [priceLabel(brows[0]), priceLabel(brows[1], "Lip"), priceLabel(brows[2])].join(" · "),
      href: "/book?service=wax-eyebrows",
      cta: "+ Add to booking",
    },
    {
      kicker: "Lashes",
      from: from(lashes),
      list: [priceLabel(lashes[0], "Tinting"), priceLabel(lashes[1], "Extensions")].join(" · "),
      href: "/book?service=lash-extensions",
      cta: "+ Add to booking",
    },
    {
      kicker: "Body waxing",
      from: from(body),
      list: [priceLabel(body[0], "Underarms"), priceLabel(body[1], "Bikini"), priceLabel(body[2])].join(" · "),
      href: "/services#waxing",
      cta: "See the waxing menu",
    },
  ];

  const brow = svc("wax-eyebrows");
  const tint = svc("lash-tinting");
  const mani = svc("mani-no-chip");

  return (
    <section className="border-t border-line bg-cream">
      <div className="container py-12 md:py-[72px] md:pb-20">
        <div className="mb-5 flex flex-col gap-3 md:mb-8 lg:flex-row lg:items-end lg:justify-between lg:gap-10">
          <div>
            <p data-reveal className="flex items-center gap-3.5 text-xs uppercase tracking-[0.3em] text-ink-muted before:h-px before:w-9 before:bg-ink before:content-['']">
              Beyond nails
            </p>
            <AnimatedTitle
              className="mt-3.5 text-4xl font-normal leading-none text-ink md:text-[52px]"
              parts={[{ text: "Same chair," }, { text: "same visit.", accent: true }]}
            />
          </div>
          <p data-reveal className="max-w-[36ch] text-ink-muted">
            Add any of these to your appointment, or come in just for them. Walk-ins
            welcome.
          </p>
        </div>

        <div className="grid gap-2 md:grid-cols-3 md:gap-3.5 lg:grid-cols-[1fr_1fr_1fr_1.25fr]">
          {tiles.map((tile, i) => (
            <Link
              key={tile.kicker}
              href={tile.href}
              data-reveal
              style={stagger(i)}
              className="group grid grid-cols-[1fr_auto] items-baseline gap-x-3 gap-y-1 bg-sand px-4 py-3.5 transition-colors hover:bg-[#E9DFD2] md:flex md:min-h-[230px] md:flex-col md:items-stretch md:gap-1.5 md:p-6"
            >
              <span className="text-xs font-bold uppercase tracking-[0.16em] text-ink">{tile.kicker}</span>
              <span className="font-serif text-2xl text-ink md:mt-1.5 md:text-[40px] md:leading-tight">
                from ${tile.from}
              </span>
              <span className="col-span-2 text-[13px] text-ink-muted md:text-sm">{tile.list}</span>
              <span className="col-span-2 mt-1.5 self-start border-b-[1.5px] border-ink pb-0.5 text-[13px] font-bold text-ink md:mt-auto md:text-sm">
                {tile.cta}
              </span>
            </Link>
          ))}

          {/* Illustration of the add-on prompt in online booking. */}
          <div data-reveal style={stagger(3)} className="flex flex-col gap-3 pt-2 md:col-span-3 lg:col-span-1 lg:pl-2.5 lg:pt-1">
            <span className="text-xs font-bold uppercase tracking-[0.16em] text-ink-muted">
              When you book online
            </span>
            <p className="sr-only">
              When you book a manicure or pedicure online, we offer a quick eyebrow wax or
              lash tint as an add-on.
            </p>
            <div aria-hidden className="pointer-events-none rounded-[14px] border border-line bg-white p-4 text-sm shadow-[0_20px_40px_-28px_rgba(21,19,18,.4)]">
              <div className="flex items-center justify-between py-2">
                <span>
                  <b>{mani.name}</b>
                  <br />
                  <small className="text-ink-muted">{formatDuration(mani.durationMinutes)}</small>
                </span>
                <span>${mani.price}</span>
              </div>
              <p className="mt-2 border-t border-line pt-2.5 font-serif text-[19px]">
                Want brows while you&apos;re here?
              </p>
              <AddonRow checked name="Eyebrow wax" minutes={brow.durationMinutes} price={brow.price} />
              <AddonRow name="Lash tinting" minutes={tint.durationMinutes} price={tint.price} />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function AddonRow({
  checked,
  name,
  minutes,
  price,
}: {
  checked?: boolean;
  name: string;
  minutes: number;
  price: number;
}) {
  return (
    <div
      className={`mt-1.5 flex items-center justify-between rounded-[10px] border-[1.5px] px-3 py-2.5 ${
        checked ? "border-ink" : "border-line"
      }`}
    >
      <span className="flex items-center">
        <span
          className={`mr-2 inline-grid size-[18px] place-items-center rounded-[5px] border-[1.5px] border-ink text-[11px] ${
            checked ? "bg-ink text-white" : ""
          }`}
        >
          {checked ? "✓" : ""}
        </span>
        {name} <small className="ml-1 text-ink-muted">+{minutes} min</small>
      </span>
      <span>+${price}</span>
    </div>
  );
}

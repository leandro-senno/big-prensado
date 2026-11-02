import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export function SectionHeading({
  kicker,
  title,
  description,
  align = "center",
  className,
  id,
}: {
  kicker?: string;
  title: ReactNode;
  description?: string;
  align?: "center" | "left";
  className?: string;
  id?: string;
}) {
  return (
    <div
      className={cn(
        "mb-8 sm:mb-12",
        align === "center" ? "mx-auto max-w-2xl text-center" : "max-w-2xl",
        className,
      )}
    >
      {kicker ? <p className="font-script text-xl text-brand-amber sm:text-2xl">{kicker}</p> : null}
      <h2
        id={id}
        className="mt-1 font-display text-4xl uppercase leading-[0.95] tracking-wide text-white sm:text-5xl lg:text-6xl"
      >
        {title}
      </h2>
      {description ? (
        <p className="mt-4 text-base text-brand-gray sm:text-lg">{description}</p>
      ) : null}
    </div>
  );
}

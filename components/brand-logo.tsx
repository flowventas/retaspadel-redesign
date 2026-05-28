"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

type BrandLogoProps = {
  className?: string;
  variant?: "hero" | "compact";
  theme?: "light" | "dark";
};

const variantClasses: Record<NonNullable<BrandLogoProps["variant"]>, string> = {
  hero: "w-[108px] sm:w-[120px] md:w-[138px] lg:w-[152px] h-auto object-contain",
  compact: "w-[88px] sm:w-[96px] md:w-[110px] h-auto object-contain",
};

export function BrandLogo({ className = "", variant = "hero", theme = "light" }: BrandLogoProps) {
  const [hasError, setHasError] = useState(false);

  if (hasError) {
    return (
      <Link href="/" className={`inline-block font-black tracking-wide text-[var(--brand-accent)] ${className}`}>
        6 loco
      </Link>
    );
  }

  return (
    <Link href="/" aria-label="Ir al inicio" className="inline-block">
      <Image
        src="/wordmark-light-674x336.png"
        alt="6 loco"
        width={674}
        height={336}
        sizes={
          variant === "hero"
            ? "(max-width: 639px) 108px, (max-width: 767px) 120px, (max-width: 1023px) 138px, 152px"
            : "(max-width: 639px) 88px, (max-width: 767px) 96px, 110px"
        }
        priority={variant === "hero"}
        onError={() => setHasError(true)}
        className={`${variantClasses[variant]} ${className}`}
      />
    </Link>
  );
}

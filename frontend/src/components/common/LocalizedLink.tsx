"use client";

import Link, { type LinkProps } from "next/link";
import { useLanguage } from "@/providers/language-provider";
import { type AnchorHTMLAttributes, type ReactNode } from "react";

type NextLinkProps = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, keyof LinkProps> &
  LinkProps & {
    children?: ReactNode;
  };

/**
 * Link component that automatically adds a language prefix to the URL based on the current locale.
 * Does not add a prefix for English (en).
 * Adds /tr prefix for Turkish (tr).
 */
export default function LocalizedLink({ href, children, ...props }: NextLinkProps) {
  const { getLocalizedPath } = useLanguage();

  const localizedHref =
    typeof href === "string" ? getLocalizedPath(href) : href;

  return (
    <Link href={localizedHref} {...props}>
      {children}
    </Link>
  );
}

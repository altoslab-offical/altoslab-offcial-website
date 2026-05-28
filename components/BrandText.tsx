import type { ReactNode } from "react";

const BRAND_PATTERN = /(ALTOS LAB)/g;

export function BrandText({ children = "ALTOS LAB", className }: { children?: ReactNode; className?: string }) {
  return <span className={["brand-text", className].filter(Boolean).join(" ")}>{children}</span>;
}

export function renderBrandText(text: string) {
  return text.split(BRAND_PATTERN).map((part, index) =>
    part === "ALTOS LAB" ? <BrandText key={`brand-${index}`} /> : part
  );
}

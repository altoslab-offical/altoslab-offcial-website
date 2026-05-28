import { BrandText, renderBrandText } from "@/components/BrandText";

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <BrandText />
      <span>{renderBrandText("© 2026 ALTOS LAB · AI implementation studio")}</span>
    </footer>
  );
}

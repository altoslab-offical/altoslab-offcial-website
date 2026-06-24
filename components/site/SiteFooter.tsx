import { BrandText, renderBrandText } from "@/components/BrandText";

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <BrandText />
      <nav aria-label="ALTOS LAB site policies">
        <a href="/about">About</a>
        <a href="/contact">Contact</a>
        <a href="/editorial-policy">Editorial Policy</a>
        <a href="/privacy">Privacy</a>
        <a href="/terms">Terms</a>
      </nav>
      <span>{renderBrandText("© 2026 ALTOS LAB · AI implementation studio")}</span>
    </footer>
  );
}

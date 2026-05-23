import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { homeNavigation } from "@/lib/site-content";

export function SiteHeader() {
  return (
    <header className="site-nav">
      <Link className="site-logo" href="/" aria-label="ALTOS LAB home">
        <span>ALTOS LAB</span>
      </Link>
      <nav aria-label="Main navigation">
        {homeNavigation.map((item) => (
          <a href={item.href} key={item.href}>
            {item.label}
          </a>
        ))}
      </nav>
      <a className="site-nav-cta" href="#contact">
        合作洽談
        <ArrowUpRight size={16} strokeWidth={2.5} />
      </a>
    </header>
  );
}

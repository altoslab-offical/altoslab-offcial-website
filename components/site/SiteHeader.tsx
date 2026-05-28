"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowUpRight } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { BrandText } from "@/components/BrandText";
import { homeNavigation } from "@/lib/site-content";
import type { BlogLanguage } from "@/lib/types";

const STORAGE_KEY = "altoslab:language";
const LANGUAGE_EVENT = "altoslab:languagechange";

function readStoredLanguage(): BlogLanguage {
  if (typeof window === "undefined") return "zh-Hant";
  const storedLanguage = window.localStorage.getItem(STORAGE_KEY);
  if (storedLanguage === "en" || storedLanguage === "ja" || storedLanguage === "ko") {
    return storedLanguage;
  }
  return "zh-Hant";
}

function languageFromPath(pathname: string | null): BlogLanguage | null {
  if (!pathname) return null;
  if (pathname.startsWith("/en")) return "en";
  if (pathname.startsWith("/ja")) return "ja";
  if (pathname.startsWith("/ko")) return "ko";
  if (pathname.startsWith("/blog")) return "zh-Hant";
  return null;
}

export function SiteHeader() {
  const pathname = usePathname();
  const isHomePage = pathname === "/";
  const routeLanguage = languageFromPath(pathname);
  const [language, setLanguage] = useState<BlogLanguage>(routeLanguage ?? "zh-Hant");

  useEffect(() => {
    setLanguage(routeLanguage ?? readStoredLanguage());
  }, [routeLanguage]);

  const navigation = useMemo(
    () =>
      homeNavigation.filter((item) => item.href !== "#contact").map((item) => {
        if (language === "en" && item.href === "#about") return { label: "About", href: item.href };
        if (language === "en" && item.href === "#services") return { label: "Services", href: item.href };
        if (language === "en" && item.href === "#portfolio") return { label: "Work", href: item.href };
        if (language === "ja" && item.href === "#about") return { label: "About", href: item.href };
        if (language === "ja" && item.href === "#services") return { label: "Services", href: item.href };
        if (language === "ja" && item.href === "#portfolio") return { label: "Work", href: item.href };
        if (language === "ko" && item.href === "#about") return { label: "About", href: item.href };
        if (language === "ko" && item.href === "#services") return { label: "Services", href: item.href };
        if (language === "ko" && item.href === "#portfolio") return { label: "Work", href: item.href };
        if (item.href !== "/blog") return item;
        if (language === "en") return { label: "Blog", href: "/en/blog" };
        if (language === "ja") return { label: "Blog", href: "/ja/blog" };
        if (language === "ko") return { label: "Blog", href: "/ko/blog" };
        return item;
      }),
    [language]
  );

  function siteHref(href: string) {
    if (!href.startsWith("#")) return href;
    return isHomePage ? href : `/${href}`;
  }

  function chooseLanguage(nextLanguage: BlogLanguage) {
    setLanguage(nextLanguage);
    window.localStorage.setItem(STORAGE_KEY, nextLanguage);
    window.dispatchEvent(new CustomEvent(LANGUAGE_EVENT, { detail: { language: nextLanguage } }));

    if (pathname === "/blog" && nextLanguage === "en") {
      window.location.assign("/en/blog");
    }
    if (pathname === "/blog" && nextLanguage === "ja") {
      window.location.assign("/ja/blog");
    }
    if (pathname === "/blog" && nextLanguage === "ko") {
      window.location.assign("/ko/blog");
    }

    if (pathname === "/en/blog" && nextLanguage === "zh-Hant") {
      window.location.assign("/blog");
    }
    if (pathname === "/en/blog" && nextLanguage === "ja") {
      window.location.assign("/ja/blog");
    }
    if (pathname === "/en/blog" && nextLanguage === "ko") {
      window.location.assign("/ko/blog");
    }
    if (pathname === "/ja/blog" && nextLanguage === "zh-Hant") {
      window.location.assign("/blog");
    }
    if (pathname === "/ja/blog" && nextLanguage === "en") {
      window.location.assign("/en/blog");
    }
    if (pathname === "/ja/blog" && nextLanguage === "ko") {
      window.location.assign("/ko/blog");
    }
    if (pathname === "/ko/blog" && nextLanguage === "zh-Hant") {
      window.location.assign("/blog");
    }
    if (pathname === "/ko/blog" && nextLanguage === "en") {
      window.location.assign("/en/blog");
    }
    if (pathname === "/ko/blog" && nextLanguage === "ja") {
      window.location.assign("/ja/blog");
    }
  }

  return (
    <header className="site-nav">
      <Link className="site-logo" href="/" aria-label="ALTOS LAB home">
        <BrandText />
      </Link>
      <nav aria-label="Main navigation">
        {navigation.map((item) => (
          <a href={siteHref(item.href)} key={item.href}>
            {item.label}
          </a>
        ))}
      </nav>
      <div className="site-nav-actions">
        <div className="site-language-toggle" aria-label="Language switcher">
          <button
            aria-pressed={language === "zh-Hant"}
            className={language === "zh-Hant" ? "is-active" : undefined}
            onClick={() => chooseLanguage("zh-Hant")}
            type="button"
          >
            中文
          </button>
          <button
            aria-pressed={language === "en"}
            className={language === "en" ? "is-active" : undefined}
            onClick={() => chooseLanguage("en")}
            type="button"
          >
            EN
          </button>
          <button
            aria-pressed={language === "ja"}
            className={language === "ja" ? "is-active" : undefined}
            onClick={() => chooseLanguage("ja")}
            type="button"
          >
            JP
          </button>
          <button
            aria-pressed={language === "ko"}
            className={language === "ko" ? "is-active" : undefined}
            onClick={() => chooseLanguage("ko")}
            type="button"
          >
            KR
          </button>
        </div>
        <a className="site-nav-cta" href={siteHref("#contact")}>
          <span className="site-nav-cta-label">{language === "zh-Hant" ? "合作洽談" : "Talk"}</span>
          <ArrowUpRight size={16} strokeWidth={2.5} />
        </a>
      </div>
    </header>
  );
}

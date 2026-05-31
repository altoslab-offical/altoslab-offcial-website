"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowUpRight, Globe } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { BrandText } from "@/components/BrandText";
import { homeNavigation } from "@/lib/site-content";
import type { BlogLanguage } from "@/lib/types";

const STORAGE_KEY = "altoslab:language";
const LANGUAGE_EVENT = "altoslab:languagechange";
const languageOptions: Array<{ label: string; shortLabel: string; value: BlogLanguage }> = [
  { label: "繁體中文", shortLabel: "中文", value: "zh-Hant" },
  { label: "English", shortLabel: "EN", value: "en" },
  { label: "日本語", shortLabel: "JP", value: "ja" },
  { label: "한국어", shortLabel: "KR", value: "ko" }
];

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
  const [isLanguageMenuOpen, setIsLanguageMenuOpen] = useState(false);
  const languageMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setLanguage(routeLanguage ?? readStoredLanguage());
  }, [routeLanguage]);

  useEffect(() => {
    if (!isLanguageMenuOpen) return;

    function closeOnOutsideClick(event: MouseEvent) {
      if (!languageMenuRef.current?.contains(event.target as Node)) {
        setIsLanguageMenuOpen(false);
      }
    }

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsLanguageMenuOpen(false);
      }
    }

    document.addEventListener("mousedown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("mousedown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [isLanguageMenuOpen]);

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
    setIsLanguageMenuOpen(false);
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
        <div className="site-language-toggle" ref={languageMenuRef}>
          <button
            aria-expanded={isLanguageMenuOpen}
            aria-haspopup="menu"
            aria-label="Open language menu"
            className="site-language-trigger"
            onClick={() => setIsLanguageMenuOpen((isOpen) => !isOpen)}
            type="button"
          >
            <Globe aria-hidden="true" size={20} strokeWidth={1.8} />
          </button>
          {isLanguageMenuOpen ? (
            <div className="site-language-menu" role="menu" aria-label="Language switcher">
              {languageOptions.map((option) => (
                <button
                  aria-checked={language === option.value}
                  className={language === option.value ? "is-active" : undefined}
                  key={option.value}
                  onClick={() => chooseLanguage(option.value)}
                  role="menuitemradio"
                  type="button"
                >
                  <span>{option.shortLabel}</span>
                  <small>{option.label}</small>
                </button>
              ))}
            </div>
          ) : null}
        </div>
        <a className="site-nav-cta" href={siteHref("#contact")}>
          <span className="site-nav-cta-label">{language === "zh-Hant" ? "合作洽談" : "Talk"}</span>
          <ArrowUpRight size={16} strokeWidth={2.5} />
        </a>
      </div>
    </header>
  );
}

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowUpRight, Globe, Menu, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { BrandText } from "@/components/BrandText";
import { blogIndexPath, blogLanguageFromPath, blogLanguageOptions, isBlogLanguage, isSiteLanguage, siteLanguageOptions } from "@/lib/blog-utils";
import { homeNavigation } from "@/lib/site-content";
import type { BlogLanguage } from "@/lib/types";

const STORAGE_KEY = "altoslab:language";
const LANGUAGE_EVENT = "altoslab:languagechange";
const siteOptions: Array<{ label: string; shortLabel: string; value: BlogLanguage }> = siteLanguageOptions();
const fullBlogOptions: Array<{ label: string; shortLabel: string; value: BlogLanguage }> = blogLanguageOptions();

function readStoredSiteLanguage(): BlogLanguage {
  if (typeof window === "undefined") return "zh-Hant";
  const storedLanguage = window.localStorage.getItem(STORAGE_KEY);
  return isSiteLanguage(storedLanguage) ? storedLanguage : "zh-Hant";
}

function readStoredBlogLanguage(): BlogLanguage {
  if (typeof window === "undefined") return "zh-Hant";
  const storedLanguage = window.localStorage.getItem(STORAGE_KEY);
  return isBlogLanguage(storedLanguage) ? storedLanguage : "zh-Hant";
}

export function SiteHeader() {
  const pathname = usePathname();
  const isHomePage = pathname === "/";
  const routeLanguage = blogLanguageFromPath(pathname);
  const isBlogPage = Boolean(routeLanguage);
  const [language, setLanguage] = useState<BlogLanguage>(routeLanguage ?? "zh-Hant");
  const [isLanguageMenuOpen, setIsLanguageMenuOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const languageMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setLanguage(routeLanguage ?? (isBlogPage ? readStoredBlogLanguage() : readStoredSiteLanguage()));
  }, [isBlogPage, routeLanguage]);

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

  useEffect(() => {
    if (!isMobileMenuOpen) return;

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsMobileMenuOpen(false);
      }
    }

    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [isMobileMenuOpen]);

  const navigation = useMemo(
    () =>
      homeNavigation.filter((item) => item.href !== "#contact").map((item) => {
        if (language !== "zh-Hant" && item.href === "#about") return { label: "About", href: item.href };
        if (language !== "zh-Hant" && item.href === "#services") return { label: "Services", href: item.href };
        if (language !== "zh-Hant" && item.href === "#portfolio") return { label: "Work", href: item.href };
        if (item.href !== "/blog") return item;
        return { label: "Blog", href: blogIndexPath(language) };
      }),
    [language]
  );

  const languageOptions = useMemo(() => (isBlogPage ? fullBlogOptions : siteOptions), [isBlogPage]);

  function siteHref(href: string) {
    if (!href.startsWith("#")) return href;
    return isHomePage ? href : `/${href}`;
  }

  function chooseLanguage(nextLanguage: BlogLanguage) {
    setIsLanguageMenuOpen(false);
    setIsMobileMenuOpen(false);
    setLanguage(nextLanguage);
    window.localStorage.setItem(STORAGE_KEY, nextLanguage);
    window.dispatchEvent(new CustomEvent(LANGUAGE_EVENT, { detail: { language: nextLanguage } }));

    if (blogLanguageFromPath(pathname)) {
      window.location.assign(blogIndexPath(nextLanguage));
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
        <button
          aria-expanded={isMobileMenuOpen}
          aria-label={isMobileMenuOpen ? "Close menu" : "Open menu"}
          className="site-mobile-menu-trigger"
          onClick={() => {
            setIsLanguageMenuOpen(false);
            setIsMobileMenuOpen((isOpen) => !isOpen);
          }}
          type="button"
        >
          {isMobileMenuOpen ? (
            <X aria-hidden="true" size={21} strokeWidth={1.8} />
          ) : (
            <Menu aria-hidden="true" size={21} strokeWidth={1.8} />
          )}
        </button>
        <a className="site-nav-cta" href={siteHref("#contact")}>
          <span className="site-nav-cta-label">{language === "zh-Hant" ? "合作洽談" : "Talk"}</span>
          <ArrowUpRight size={16} strokeWidth={2.5} />
        </a>
      </div>
      {isMobileMenuOpen ? (
        <div className="site-mobile-menu" role="dialog" aria-label="Mobile navigation">
          <div className="site-mobile-menu-links">
            {navigation.map((item, index) => (
              <a href={siteHref(item.href)} key={item.href} onClick={() => setIsMobileMenuOpen(false)}>
                <span>{item.label}</span>
                <small>{String(index + 1).padStart(2, "0")}</small>
              </a>
            ))}
          </div>
          <a className="site-mobile-menu-cta" href={siteHref("#contact")} onClick={() => setIsMobileMenuOpen(false)}>
            {language === "zh-Hant" ? "合作洽談" : "Talk"}
            <ArrowUpRight aria-hidden="true" size={16} strokeWidth={2.5} />
          </a>
        </div>
      ) : null}
    </header>
  );
}

"use client";

import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { homeNavigation } from "@/lib/site-content";
import type { BlogLanguage } from "@/lib/types";

const STORAGE_KEY = "altoslab:language";
const LANGUAGE_EVENT = "altoslab:languagechange";

function readStoredLanguage(): BlogLanguage {
  if (typeof window === "undefined") return "zh-Hant";
  return window.localStorage.getItem(STORAGE_KEY) === "en" ? "en" : "zh-Hant";
}

export function SiteHeader() {
  const [language, setLanguage] = useState<BlogLanguage>("zh-Hant");

  useEffect(() => {
    setLanguage(readStoredLanguage());
  }, []);

  const navigation = useMemo(
    () =>
      homeNavigation.filter((item) => item.href !== "#contact").map((item) => {
        if (language === "en" && item.href === "#about") return { label: "About", href: item.href };
        if (language === "en" && item.href === "#services") return { label: "Services", href: item.href };
        if (language === "en" && item.href === "#portfolio") return { label: "Work", href: item.href };
        if (item.href !== "/blog") return item;
        return language === "en" ? { label: "Blog", href: "/en/blog" } : item;
      }),
    [language]
  );

  function chooseLanguage(nextLanguage: BlogLanguage) {
    setLanguage(nextLanguage);
    window.localStorage.setItem(STORAGE_KEY, nextLanguage);
    window.dispatchEvent(new CustomEvent(LANGUAGE_EVENT, { detail: { language: nextLanguage } }));
  }

  return (
    <header className="site-nav">
      <Link className="site-logo" href="/" aria-label="ALTOS LAB home">
        <span>ALTOS LAB</span>
      </Link>
      <nav aria-label="Main navigation">
        {navigation.map((item) => (
          <a href={item.href} key={item.href}>
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
        </div>
        <a className="site-nav-cta" href="#contact">
          <span className="site-nav-cta-label">{language === "en" ? "Talk" : "合作洽談"}</span>
          <ArrowUpRight size={16} strokeWidth={2.5} />
        </a>
      </div>
    </header>
  );
}

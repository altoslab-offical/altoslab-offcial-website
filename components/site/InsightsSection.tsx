"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { SectionIntro } from "./SectionIntro";
import { stripPublicExcerptPrefix } from "@/lib/public-copy";
import type { BlogPost, PageSection } from "@/lib/types";

type HomeLanguage = "zh-Hant" | "en";

const STORAGE_KEY = "altoslab:language";
const LANGUAGE_EVENT = "altoslab:languagechange";

function readStoredLanguage(): HomeLanguage {
  if (typeof window === "undefined") return "zh-Hant";
  return window.localStorage.getItem(STORAGE_KEY) === "en" ? "en" : "zh-Hant";
}

function postHref(post: BlogPost) {
  return post.language === "en" ? `/en/blog/${post.slug}` : `/blog/${post.slug}`;
}

export function InsightsSection({ section, posts }: { section: PageSection; posts: BlogPost[] }) {
  const [language, setLanguage] = useState<HomeLanguage>("zh-Hant");

  useEffect(() => {
    setLanguage(readStoredLanguage());

    function onLanguageChange(event: Event) {
      const detail = (event as CustomEvent<{ language?: HomeLanguage }>).detail;
      setLanguage(detail?.language === "en" ? "en" : "zh-Hant");
    }

    function onStorageChange() {
      setLanguage(readStoredLanguage());
    }

    window.addEventListener(LANGUAGE_EVENT, onLanguageChange);
    window.addEventListener("storage", onStorageChange);
    return () => {
      window.removeEventListener(LANGUAGE_EVENT, onLanguageChange);
      window.removeEventListener("storage", onStorageChange);
    };
  }, []);

  const visiblePosts = useMemo(() => posts.filter((post) => post.language === language), [language, posts]);

  if (!visiblePosts.length) return null;

  return (
    <section className="site-section insights-section">
      <SectionIntro eyebrow={section.eyebrow} title={section.title} body={section.body} />
      <div className="insight-list">
        {visiblePosts.slice(0, 3).map((post) => (
          <Link className="insight-row" href={postHref(post)} key={post.id}>
            <span>{post.topic}</span>
            <strong>{post.title}</strong>
            <p>{stripPublicExcerptPrefix(post.excerpt)}</p>
          </Link>
        ))}
      </div>
    </section>
  );
}

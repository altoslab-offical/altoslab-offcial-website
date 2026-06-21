"use client";

import { useEffect } from "react";
import { sendGTMEvent } from "@next/third-parties/google";
import { blogLanguageFromPath, htmlLanguage } from "@/lib/blog-utils";

type AnalyticsEventName =
  | "cta_clicked"
  | "contact_form_submitted"
  | "blog_post_viewed"
  | "blog_post_published"
  | "ai_blog_draft_generated"
  | "ai_referral_landing"
  | "lead_created"
  | "web_vital"
  | "navigation_timing";

type AnalyticsPayload = {
  event: AnalyticsEventName;
  [key: string]: unknown;
};

declare global {
  interface Window {
    dataLayer?: Object[];
    gtag?: (command: string, eventName: string, params?: Record<string, unknown>) => void;
  }
}

function cleanPayload(payload: AnalyticsPayload) {
  const blocked = new Set(["email", "phone", "contact", "message", "name", "who"]);
  return Object.fromEntries(Object.entries(payload).filter(([key]) => !blocked.has(key))) as AnalyticsPayload;
}

export function sendAnalyticsEvent(payload: AnalyticsPayload) {
  const clean = cleanPayload(payload);
  sendGTMEvent(clean);

  if (typeof window === "undefined") return;

  window.dataLayer = window.dataLayer || [];
  window.gtag =
    window.gtag ||
    function gtag(command, eventName, params) {
      window.dataLayer?.push([command, eventName, params]);
    };

  const { event, ...params } = clean;
  window.gtag("event", event, params);
}

export function AnalyticsEvent({ payload }: { payload: AnalyticsPayload }) {
  useEffect(() => {
    sendAnalyticsEvent(payload);
  }, [payload]);

  return null;
}

export function CtaAnalytics() {
  useEffect(() => {
    const path = window.location.pathname;
    const params = new URLSearchParams(window.location.search);
    const aiReferralPattern = /(chatgpt\.com|openai\.com|perplexity\.ai|claude\.ai|gemini\.google\.com|copilot\.microsoft\.com|you\.com|phind\.com)/i;
    document.documentElement.lang = htmlLanguage(blogLanguageFromPath(path) || "zh-Hant");

    const referrer = document.referrer || "";
    const utmSource = params.get("utm_source") || "";
    if (aiReferralPattern.test(referrer) || aiReferralPattern.test(utmSource)) {
      let sourceHost = utmSource;
      try {
        sourceHost = referrer ? new URL(referrer).hostname : utmSource;
      } catch {
        sourceHost = utmSource;
      }
      sendAnalyticsEvent({
        event: "ai_referral_landing",
        source_host: sourceHost,
        page_path: window.location.pathname
      });
    }

    function onClick(event: MouseEvent) {
      const target = event.target instanceof Element ? event.target.closest("a[href], button") : null;
      if (!target) return;

      const href = target instanceof HTMLAnchorElement ? target.getAttribute("href") || "" : "";
      const label = (target.textContent || "").trim().slice(0, 80);
      const isCta = href.includes("#contact") || href.startsWith("mailto:") || /contact|合作|諮詢|開始|閱讀/i.test(label);
      if (!isCta) return;

      sendAnalyticsEvent({
        event: "cta_clicked",
        cta_label: label || href,
        cta_href: href,
        page_path: window.location.pathname
      });
    }

    function onSubmit(event: SubmitEvent) {
      const form = event.target instanceof HTMLFormElement ? event.target : null;
      if (!form) return;
      sendAnalyticsEvent({
        event: "contact_form_submitted",
        form_id: form.id || "contact",
        page_path: window.location.pathname
      });
    }

    document.addEventListener("click", onClick);
    document.addEventListener("submit", onSubmit, true);

    const navigationTiming = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined;
    if (navigationTiming) {
      sendAnalyticsEvent({
        event: "navigation_timing",
        page_path: window.location.pathname,
        ttfb_ms: Math.round(navigationTiming.responseStart),
        dom_content_loaded_ms: Math.round(navigationTiming.domContentLoadedEventEnd),
        load_ms: Math.round(navigationTiming.loadEventEnd)
      });
    }

    let cls = 0;
    const observers: PerformanceObserver[] = [];
    if ("PerformanceObserver" in window) {
      try {
        const lcpObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const lastEntry = entries[entries.length - 1] as PerformanceEntry | undefined;
          if (!lastEntry) return;
          sendAnalyticsEvent({
            event: "web_vital",
            metric_name: "LCP",
            metric_value: Math.round(lastEntry.startTime),
            page_path: window.location.pathname
          });
        });
        lcpObserver.observe({ type: "largest-contentful-paint", buffered: true });
        observers.push(lcpObserver);
      } catch {}
      try {
        const clsObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries() as Array<PerformanceEntry & { value?: number; hadRecentInput?: boolean }>) {
            if (!entry.hadRecentInput) cls += entry.value || 0;
          }
        });
        clsObserver.observe({ type: "layout-shift", buffered: true });
        observers.push(clsObserver);
      } catch {}
    }

    const onPageHide = () => {
      if (cls > 0) {
        sendAnalyticsEvent({
          event: "web_vital",
          metric_name: "CLS",
          metric_value: Number(cls.toFixed(4)),
          page_path: window.location.pathname
        });
      }
    };
    window.addEventListener("pagehide", onPageHide);

    return () => {
      document.removeEventListener("click", onClick);
      document.removeEventListener("submit", onSubmit, true);
      window.removeEventListener("pagehide", onPageHide);
      observers.forEach((observer) => observer.disconnect());
    };
  }, []);

  return null;
}

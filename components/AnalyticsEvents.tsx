"use client";

import { useEffect } from "react";
import { sendGTMEvent } from "@next/third-parties/google";

type AnalyticsEventName =
  | "cta_clicked"
  | "contact_form_submitted"
  | "blog_post_viewed"
  | "blog_post_published"
  | "ai_blog_draft_generated"
  | "lead_created";

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
    document.documentElement.lang = window.location.pathname.startsWith("/en/") ? "en" : "zh-Hant-TW";

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
    return () => {
      document.removeEventListener("click", onClick);
      document.removeEventListener("submit", onSubmit, true);
    };
  }, []);

  return null;
}

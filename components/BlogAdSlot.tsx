"use client";

import { useEffect, useRef, useState } from "react";
import { getBlogAdSlotConfig, type BlogAdPlacement } from "@/lib/blog-adsense";

declare global {
  interface Window {
    adsbygoogle?: unknown[];
  }
}

type BlogAdSlotProps = {
  placement: BlogAdPlacement;
};

export function BlogAdSlot({ placement }: BlogAdSlotProps) {
  const slot = getBlogAdSlotConfig(placement);
  const insRef = useRef<HTMLModElement | null>(null);
  const [adStatus, setAdStatus] = useState<"pending" | "filled" | "unfilled">("pending");

  useEffect(() => {
    if (!slot) return;
    setAdStatus("pending");
    try {
      window.adsbygoogle = window.adsbygoogle || [];
      window.adsbygoogle.push({});
    } catch (error) {
      if (process.env.NODE_ENV !== "production") {
        console.warn("AdSense slot initialization failed", error);
      }
    }
  }, [slot?.placement, slot?.slot]);

  useEffect(() => {
    if (!slot || !insRef.current) return;
    const element = insRef.current;
    const readStatus = () => {
      const status = element.getAttribute("data-ad-status");
      if (status === "filled" || status === "unfilled") setAdStatus(status);
    };
    readStatus();
    const observer = new MutationObserver(readStatus);
    observer.observe(element, { attributes: true, attributeFilter: ["data-ad-status"] });
    const timeout = window.setTimeout(() => {
      if (!element.getAttribute("data-ad-status")) setAdStatus("unfilled");
    }, 3500);
    return () => {
      window.clearTimeout(timeout);
      observer.disconnect();
    };
  }, [slot]);

  if (!slot) return null;

  return (
    <aside
      className={`blog-adsense-slot is-${slot.placement} is-${adStatus}`}
      data-blog-ad-placement={slot.placement}
      data-ad-container-status={adStatus}
      aria-label="Advertisement"
    >
      <ins
        ref={insRef}
        className="adsbygoogle"
        data-ad-client={slot.client}
        data-ad-format={slot.format}
        data-ad-slot={slot.slot}
        data-full-width-responsive={slot.fullWidthResponsive ? "true" : "false"}
        style={{ display: "block" }}
      />
    </aside>
  );
}

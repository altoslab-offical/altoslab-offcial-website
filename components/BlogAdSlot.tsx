"use client";

import { useEffect } from "react";
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

  useEffect(() => {
    if (!slot) return;
    try {
      window.adsbygoogle = window.adsbygoogle || [];
      window.adsbygoogle.push({});
    } catch (error) {
      if (process.env.NODE_ENV !== "production") {
        console.warn("AdSense slot initialization failed", error);
      }
    }
  }, [slot?.placement, slot?.slot]);

  if (!slot) return null;

  return (
    <aside className={`blog-adsense-slot is-${slot.placement}`} data-blog-ad-placement={slot.placement} aria-label="Advertisement">
      <ins
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

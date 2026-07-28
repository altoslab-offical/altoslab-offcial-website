import type { Metadata, Viewport } from "next";
import { GoogleAnalytics, GoogleTagManager } from "@next/third-parties/google";
import { headers } from "next/headers";
import "./globals.css";
import { CtaAnalytics } from "@/components/AnalyticsEvents";
import { WonDaWidgetScript } from "@/components/WonDaWidgetScript";
import {
  adsenseScriptSrc,
  gaMeasurementId,
  gtmId,
  isAdsenseConfigured,
  isGaConfigured,
  isGtmConfigured
} from "@/lib/analytics";
import { blogLanguageFromPath, htmlLanguage } from "@/lib/blog-utils";
import { searchVerificationMetadata, siteName, siteUrl } from "@/lib/seo";

const verification = searchVerificationMetadata();

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "ALTOS LAB｜AI 自動化、AI Agent 與 GEO 顧問工作室",
    template: `%s｜${siteName}`
  },
  description: "ALTOS LAB 協助企業導入 AI Agent、流程自動化、AI 客服、後台 CMS 與 GEO 內容系統。",
  applicationName: siteName,
  authors: [{ name: siteName }],
  creator: siteName,
  publisher: siteName,
  icons: {
    icon: [{ url: "/icon.svg", type: "image/svg+xml" }],
    shortcut: [{ url: "/icon.svg", type: "image/svg+xml" }]
  },
  alternates: {
    types: {
      "application/rss+xml": `${siteUrl}/feed.xml`,
      "text/plain": `${siteUrl}/llms.txt`
    }
  },
  openGraph: {
    title: "ALTOS LAB｜AI 自動化、AI Agent 與 GEO 顧問工作室",
    description: "ALTOS LAB 協助企業導入 AI Agent、流程自動化、AI 客服、後台 CMS 與 GEO 內容系統。",
    url: siteUrl,
    siteName,
    locale: "zh_TW",
    type: "website",
    images: [`${siteUrl}/geo-cover.png`]
  },
  twitter: {
    card: "summary_large_image",
    title: "ALTOS LAB｜AI 自動化、AI Agent 與 GEO 顧問工作室",
    description: "ALTOS LAB 協助企業導入 AI Agent、流程自動化、AI 客服、後台 CMS 與 GEO 內容系統。",
    images: [`${siteUrl}/geo-cover.png`]
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-snippet": -1,
      "max-image-preview": "large",
      "max-video-preview": -1
    }
  },
  ...(verification ? { verification } : {})
};

export const viewport: Viewport = {
  themeColor: "#030403",
  colorScheme: "dark",
  width: "device-width",
  initialScale: 1
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const pathname = (await headers()).get("x-altos-pathname") || "";
  const language = htmlLanguage(blogLanguageFromPath(pathname) || "zh-Hant");
  const adsenseSrc = isAdsenseConfigured() ? adsenseScriptSrc() : "";

  const wondaOrigin = "https://wonda-ai.altoslab-ai.workers.dev";

  return (
    <html lang={language}>
      <head>
        <link rel="preconnect" href="https://www.googletagmanager.com" />
        <link rel="preconnect" href="https://pagead2.googlesyndication.com" crossOrigin="anonymous" />
        <link rel="preconnect" href={wondaOrigin} />
        {adsenseSrc ? <script async src={adsenseSrc} crossOrigin="anonymous" /> : null}
      </head>
      <body>
        {children}
        <CtaAnalytics />
        <WonDaWidgetScript pathname={pathname} />
        {isGaConfigured() && gaMeasurementId ? <GoogleAnalytics gaId={gaMeasurementId} /> : null}
        {isGtmConfigured() && gtmId ? <GoogleTagManager gtmId={gtmId} /> : null}
      </body>
    </html>
  );
}

import type { Metadata, Viewport } from "next";
import { GoogleTagManager } from "@next/third-parties/google";
import { headers } from "next/headers";
import { Inter, Noto_Sans_TC, Space_Grotesk } from "next/font/google";
import "./globals.css";
import { CtaAnalytics } from "@/components/AnalyticsEvents";
import { gtmId, isGtmConfigured } from "@/lib/analytics";
import { searchVerificationMetadata, siteName, siteUrl } from "@/lib/seo";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap"
});

const notoSansTc = Noto_Sans_TC({
  subsets: ["latin"],
  variable: "--font-noto-tc",
  display: "swap"
});

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk",
  display: "swap"
});

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
  const language = pathname.startsWith("/en") ? "en" : "zh-Hant-TW";

  return (
    <html lang={language} className={`${inter.variable} ${notoSansTc.variable} ${spaceGrotesk.variable}`}>
      <body>
        {children}
        <CtaAnalytics />
        {isGtmConfigured() && gtmId ? <GoogleTagManager gtmId={gtmId} /> : null}
      </body>
    </html>
  );
}

import type { Metadata } from "next";
import { TrustPage } from "@/components/site/TrustPage";
import { siteName, siteUrl } from "@/lib/seo";

export const metadata: Metadata = {
  title: `Terms ${siteName}`,
  description: "ALTOS LAB website terms for content use, attribution, external links and service inquiries.",
  alternates: {
    canonical: `${siteUrl}/terms`
  }
};

export default function TermsPage() {
  return (
    <TrustPage
      eyebrow="Terms · Website Use"
      title="Terms of Use"
      intro="These terms govern use of altoslab-ai.cc, including the ALTOS LAB Journal, public resources and inquiry pages."
      updated="2026-06-24"
      sections={[
        {
          title: "Use of this site",
          body: [
            "You may read and share public ALTOS LAB pages for informational purposes. Do not misuse the site, attempt to disrupt its operation, scrape it in a way that harms availability, or use it to send spam or malicious content.",
            "The content on this site is provided for general information and product research. It is not legal, financial, medical or investment advice."
          ]
        },
        {
          title: "Content and attribution",
          body: [
            "ALTOS LAB articles, diagrams, editorial visuals and page copy are protected by copyright unless otherwise stated. You may quote short excerpts with clear attribution and a link to the original page.",
            "Market briefs may cite third-party sources. Those third-party materials remain the property of their respective owners."
          ]
        },
        {
          title: "External links",
          body: [
            "Articles may link to official announcements, research papers, company blogs, documentation and publications. External links are provided for context and verification, but ALTOS LAB is not responsible for third-party site content or availability."
          ]
        },
        {
          title: "Changes",
          body: [
            "We may update these terms, policies and editorial standards as the site, services and advertising requirements evolve. Continued use of the site means you accept the current version."
          ]
        }
      ]}
    />
  );
}

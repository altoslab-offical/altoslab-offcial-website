import type { Metadata } from "next";
import { TrustPage } from "@/components/site/TrustPage";
import { siteName, siteUrl } from "@/lib/seo";

export const metadata: Metadata = {
  title: `Editorial Policy ${siteName}`,
  description: "How ALTOS LAB researches, writes, reviews and updates its AI market briefings and columns.",
  alternates: {
    canonical: `${siteUrl}/editorial-policy`
  }
};

export default function EditorialPolicyPage() {
  return (
    <TrustPage
      eyebrow="Editorial Policy · Quality Standard"
      title="How we turn AI signals into useful public knowledge."
      intro="ALTOS LAB publishes market briefs and columns for readers making AI product, operations and adoption decisions. This page explains how we handle sources, originality, images, corrections and automation."
      updated="2026-06-24"
      sections={[
        {
          title: "Source standards",
          body: [
            "Market briefs start from an identifiable source such as an official company post, research publication, technical blog, regulatory update or reputable technology publication. We preserve source attribution and avoid presenting unverified claims as proven outcomes.",
            "Columns may combine multiple sources, but the final article must add original framing: a decision lens, implementation pattern, risk tradeoff, workflow, checklist, comparison or data-backed example."
          ]
        },
        {
          title: "Original value requirement",
          body: [
            "We do not publish source summaries as finished articles. A useful ALTOS LAB article should help a reader understand what changed, why it matters, what evidence exists, and what a team could do next.",
            "For AI topics, we prefer data-driven thinking: quoted numbers when available, named sources, visible caveats, and concrete examples that non-specialists can absorb without losing technical substance."
          ]
        },
        {
          title: "Images and rights",
          body: [
            "Market news uses source or official images when allowed and clearly attributed. Columns use ALTOS LAB editorial visuals or reviewed open-licensed images selected for topic fit, readability and originality.",
            "Generated visuals are treated as editorial assets and must pass rendered quality review before publication."
          ]
        },
        {
          title: "Automation and human review",
          body: [
            "ALTOS LAB uses AI-assisted research, drafting, translation, image planning and QA workflows. Automation helps us find sources, structure drafts and keep multilingual coverage consistent.",
            "Publication still requires editorial review for source traceability, originality, readability, image quality, SEO/GEO structure and policy safety. We correct or remove content when it falls below that standard."
          ]
        }
      ]}
    />
  );
}

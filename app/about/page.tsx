import type { Metadata } from "next";
import { TrustPage } from "@/components/site/TrustPage";
import { siteName, siteUrl } from "@/lib/seo";

export const metadata: Metadata = {
  title: `About ${siteName}`,
  description: "ALTOS LAB is an AI implementation studio publishing research, build notes and market briefings for teams adopting AI systems.",
  alternates: {
    canonical: `${siteUrl}/about`
  }
};

export default function AboutPage() {
  return (
    <TrustPage
      eyebrow="About · ALTOS LAB"
      title="An AI implementation studio that publishes what it learns."
      intro="ALTOS LAB builds AI products, agent workflows, automation systems and search-ready content operations. The public journal exists to turn our research and production experience into useful references for operators, founders and technical teams."
      updated="2026-06-24"
      sections={[
        {
          title: "What we do",
          body: [
            "We help teams design and ship practical AI systems: workflow automation, AI agent operations, content infrastructure, CMS pipelines, analytics feedback loops and multilingual publishing systems.",
            "Our work is not limited to tool setup. We focus on how AI changes daily operations: ownership, evidence, review, recovery, cost, speed and user trust."
          ]
        },
        {
          title: "Why the journal exists",
          body: [
            "The ALTOS LAB Journal is a public record of research, market signals and implementation lessons. Articles are written for readers who need to decide what to test, what to avoid and what evidence to ask for before adopting a new AI workflow.",
            "Market briefs preserve source context and attribution. Columns add original analysis, examples, decision frameworks and operational takeaways."
          ]
        },
        {
          title: "Editorial responsibility",
          body: [
            "Every published article is reviewed for source traceability, reading quality, topic fit and practical value. We use automation to scale research and production, but public content remains the responsibility of ALTOS LAB.",
            "If a factual issue, broken image or attribution problem appears, readers can contact us so we can correct the public record."
          ]
        }
      ]}
    />
  );
}

import type { Metadata } from "next";
import { TrustPage } from "@/components/site/TrustPage";
import { siteName, siteUrl } from "@/lib/seo";

export const metadata: Metadata = {
  title: `Contact ${siteName}`,
  description: "Contact ALTOS LAB for AI product, workflow automation, agent operations, GEO content systems and implementation consulting.",
  alternates: {
    canonical: `${siteUrl}/contact`
  }
};

export default function ContactPage() {
  return (
    <TrustPage
      eyebrow="Contact · Start a Conversation"
      title="Talk to ALTOS LAB about practical AI systems."
      intro="Use this page for project inquiries, article corrections, source questions, privacy requests and partnership discussions."
      updated="2026-06-24"
      sections={[
        {
          title: "Business inquiries",
          body: [
            "For AI implementation, automation, agent workflow, content operations or product strategy inquiries, email hello@altoslab.ai with a short summary of your goal, current system and timeline.",
            "We review each inquiry manually and reply when there is a clear fit for a discovery call or implementation conversation."
          ]
        },
        {
          title: "Editorial corrections",
          body: [
            "For article corrections, source attribution questions or broken media, include the article URL, the issue you found and the source that supports the correction.",
            "We prioritize corrections that affect factual accuracy, attribution, reader safety or policy compliance."
          ]
        },
        {
          title: "Privacy and account questions",
          body: [
            "For privacy requests related to contact submissions, analytics or site usage data, email hello@altoslab.ai and include enough context for us to identify the request without sending sensitive personal information."
          ]
        }
      ]}
    />
  );
}

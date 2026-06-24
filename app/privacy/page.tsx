import type { Metadata } from "next";
import { TrustPage } from "@/components/site/TrustPage";
import { siteName, siteUrl } from "@/lib/seo";

export const metadata: Metadata = {
  title: `Privacy Policy ${siteName}`,
  description: "ALTOS LAB privacy policy covering analytics, contact submissions, cookies and Google advertising disclosures.",
  alternates: {
    canonical: `${siteUrl}/privacy`
  }
};

export default function PrivacyPage() {
  return (
    <TrustPage
      eyebrow="Privacy Policy · Data Use"
      title="Privacy Policy"
      intro="This policy explains how ALTOS LAB handles site analytics, contact information, cookies and advertising-related disclosures for altoslab-ai.cc."
      updated="2026-06-24"
      sections={[
        {
          title: "Information we collect",
          body: [
            "When you visit altoslab-ai.cc, we may collect standard technical information such as pages viewed, approximate location, device type, browser type, referral source and interaction events through analytics tools.",
            "If you contact us, we collect the information you choose to provide, such as your name, email address, company, project context and message."
          ]
        },
        {
          title: "How we use information",
          body: [
            "We use analytics data to understand site performance, content quality, search visibility and which topics are useful to readers.",
            "We use contact information to reply to inquiries, evaluate project fit, correct article issues, handle privacy requests and improve our services."
          ]
        },
        {
          title: "Google advertising cookies",
          body: [
            "Third-party vendors, including Google, may use cookies to serve ads based on a user's prior visits to this website or other websites.",
            "Google's use of advertising cookies enables Google and its partners to serve ads to users based on visits to this site and other sites on the Internet.",
            "Users may opt out of personalized advertising by visiting Google Ads Settings at https://www.google.com/settings/ads. Users may also visit https://www.aboutads.info to learn about opting out of some third-party vendors' use of cookies for personalized advertising."
          ]
        },
        {
          title: "Third-party services",
          body: [
            "This site may use Google Analytics, Google Tag Manager, Google AdSense, search console verification tools, hosting infrastructure and communication tools to operate the site and measure performance.",
            "These providers may process data according to their own privacy policies. We do not sell personal information."
          ]
        },
        {
          title: "Your choices",
          body: [
            "You can use browser settings to block or delete cookies. Some site features or analytics may work differently when cookies are disabled.",
            "For questions or requests related to your information, contact hello@altoslab.ai."
          ]
        }
      ]}
    />
  );
}

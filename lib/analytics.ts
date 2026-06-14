const GTM_ID_PATTERN = /^GTM-[A-Z0-9]+$/i;
const GA_MEASUREMENT_ID_PATTERN = /^G-[A-Z0-9]+$/i;
const ADSENSE_CLIENT_PATTERN = /^ca-pub-\d+$/i;

export const gtmId = process.env.NEXT_PUBLIC_GTM_ID?.trim();
export const gaMeasurementId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID?.trim();
export const adsenseClient = process.env.NEXT_PUBLIC_ADSENSE_CLIENT?.trim();

export function isGtmConfigured() {
  return Boolean(gtmId && GTM_ID_PATTERN.test(gtmId));
}

export function isGaConfigured() {
  return Boolean(gaMeasurementId && GA_MEASUREMENT_ID_PATTERN.test(gaMeasurementId));
}

export function isAdsenseConfigured() {
  return Boolean(adsenseClient && ADSENSE_CLIENT_PATTERN.test(adsenseClient));
}

export function adsenseScriptSrc() {
  if (!isAdsenseConfigured()) return "";
  return `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${adsenseClient}`;
}

export function adsenseHeadSnippet() {
  const src = adsenseScriptSrc();
  if (!src) return "";
  return `<script async src="${src}" crossorigin="anonymous"></script>`;
}

export function gtmHeadSnippet() {
  if (!isGtmConfigured()) return "";
  return `<script>
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({ event: "site_loaded", site: "altoslab" });
    (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({"gtm.start":new Date().getTime(),event:"gtm.js"});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!="dataLayer"?"&l="+l:"";j.async=true;j.src="https://www.googletagmanager.com/gtm.js?id="+i+dl;f.parentNode.insertBefore(j,f);})(window,document,"script","dataLayer","${gtmId}");
  </script>`;
}

export function gtmNoScriptSnippet() {
  if (!isGtmConfigured()) return "";
  return `<noscript><iframe src="https://www.googletagmanager.com/ns.html?id=${gtmId}" height="0" width="0" style="display:none;visibility:hidden"></iframe></noscript>`;
}

export function gaHeadSnippet() {
  if (!isGaConfigured()) return "";
  return `<script async src="https://www.googletagmanager.com/gtag/js?id=${gaMeasurementId}"></script>
  <script>
    window.dataLayer = window.dataLayer || [];
    window.gtag = window.gtag || function(){ window.dataLayer.push(arguments); };
    window.gtag("js", new Date());
    window.gtag("config", "${gaMeasurementId}", { send_page_view: true });
  </script>`;
}

export function homepageAnalyticsSnippet() {
  return `<script>
    window.dataLayer = window.dataLayer || [];
    window.gtag = window.gtag || function(){ window.dataLayer.push(arguments); };
    window.altosTrack = function(event, payload) {
      var clean = Object.assign({ event: event }, payload || {});
      delete clean.email;
      delete clean.phone;
      delete clean.contact;
      delete clean.message;
      window.dataLayer.push(clean);
      var gaPayload = Object.assign({}, clean);
      delete gaPayload.event;
      window.gtag("event", event, gaPayload);
    };
    document.addEventListener("click", function(event) {
      var link = event.target && event.target.closest ? event.target.closest("a[href]") : null;
      if (!link) return;
      var href = link.getAttribute("href") || "";
      var label = (link.textContent || "").trim().slice(0, 80);
      if (href.indexOf("#contact") >= 0 || href.indexOf("mailto:") === 0 || /contact|合作|諮詢|開始/i.test(label)) {
        window.altosTrack("cta_clicked", { cta_label: label || href, cta_href: href, page_path: location.pathname });
      }
    }, { passive: true });
    document.addEventListener("submit", function(event) {
      var form = event.target;
      if (!form || !form.matches || !form.matches("form")) return;
      window.altosTrack("contact_form_submitted", {
        form_id: form.id || "contact",
        page_path: location.pathname
      });
    }, true);
    (function(){
      var referrer = document.referrer || "";
      var params = new URLSearchParams(location.search || "");
      var source = params.get("utm_source") || "";
      var aiPattern = /(chatgpt\\.com|openai\\.com|perplexity\\.ai|claude\\.ai|gemini\\.google\\.com|copilot\\.microsoft\\.com|you\\.com|phind\\.com)/i;
      if (aiPattern.test(referrer) || aiPattern.test(source)) {
        var sourceHost = source;
        try { sourceHost = referrer ? new URL(referrer).hostname : source; } catch (error) {}
        window.altosTrack("ai_referral_landing", {
          source_host: sourceHost,
          page_path: location.pathname
        });
      }
    })();
    if (window.fetch) {
      var originalFetch = window.fetch;
      window.fetch = function(input, init) {
        return originalFetch(input, init).then(function(response) {
          var url = typeof input === "string" ? input : input && input.url ? input.url : "";
          if (url.indexOf("/api/contact") >= 0 && response.ok) {
            window.altosTrack("lead_created", { page_path: location.pathname });
          }
          return response;
        });
      };
    }
  </script>`;
}

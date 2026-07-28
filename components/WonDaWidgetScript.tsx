import Script from "next/script";

const DEFAULT_WONDA_WIDGET_SCRIPT_SRC = "https://wonda-ai.altoslab-ai.workers.dev/widget.js";
const DEFAULT_WONDA_WIDGET_CHANNEL_ID = "cms4snnn50001l5045li1fd5h";
const DEFAULT_WONDA_WIDGET_API =
  process.env.VERCEL === "1"
    ? "https://altoslab-ai-wonda.vercel.app/api/wonda"
    : "https://altoslab-ai.cc/api/wonda";
const DEFAULT_WONDA_WIDGET_TITLE = "ALTOS LAB AI 客服";
const DEFAULT_WONDA_WIDGET_COLOR = "#B8FF3D";

function isDisabled(value: string | undefined) {
  return ["0", "false", "off", "disabled", "no"].includes(String(value || "").trim().toLowerCase());
}

function publicWidgetConfig() {
  if (isDisabled(process.env.NEXT_PUBLIC_WONDA_WIDGET_ENABLED)) return null;

  const scriptSrc = (process.env.NEXT_PUBLIC_WONDA_WIDGET_SCRIPT_SRC || DEFAULT_WONDA_WIDGET_SCRIPT_SRC).trim();
  const channelId = (process.env.NEXT_PUBLIC_WONDA_WIDGET_CHANNEL_ID || DEFAULT_WONDA_WIDGET_CHANNEL_ID).trim();
  const api = (process.env.NEXT_PUBLIC_WONDA_WIDGET_API || DEFAULT_WONDA_WIDGET_API).trim();

  if (!scriptSrc || !channelId || !api) return null;
  return { api, channelId, scriptSrc };
}

function shouldRenderOnPath(pathname: string) {
  if (!pathname) return true;
  return !pathname.startsWith("/admin") && !pathname.startsWith("/api") && !pathname.startsWith("/_next");
}

export function WonDaWidgetScript({ pathname = "" }: { pathname?: string }) {
  const config = publicWidgetConfig();
  if (!config || !shouldRenderOnPath(pathname)) return null;

  return (
    <Script
      async
      data-api={config.api}
      data-channel-id={config.channelId}
      data-color={DEFAULT_WONDA_WIDGET_COLOR}
      data-title={DEFAULT_WONDA_WIDGET_TITLE}
      id="wonda-ai-widget"
      src={config.scriptSrc}
      strategy="lazyOnload"
    />
  );
}

# ALTOS LAB WonDa Web Widget Integration

## 目的

官網先接 WonDa 的網站客服入口，讓訪客可以在 `https://altoslab-ai.cc` 上用浮動按鈕詢問 ALTOS LAB 的服務、案例、合作方式與內容資源。這次只做 web widget，不接 LINE、Telegram、WhatsApp、Facebook Messenger 或 Instagram。

## Public Widget 設定

以下三個值是前端 widget 載入所需的公開值，不是後台登入帳密。

```html
<script
  id="wonda-ai-widget"
  src="https://wonda-web-kxbpzwq4sa-de.a.run.app/widget.js"
  data-channel-id="cmqb6hynd002hs619tqxc3pe5"
  data-api="https://wonda-api-kxbpzwq4sa-de.a.run.app/api/v1"
  async
></script>
```

## 官網載入面

- `app/layout.tsx`：一般 Next route 透過 `components/WonDaWidgetScript.tsx` 載入 widget，並排除 `/admin`、`/api`、`/_next`。
- `scripts/sync-cloudflare-homepage.mjs`：首頁靜態 asset 於 build time 注入 widget script，不做 request-time HTML rewrite，也不改首頁 UI。
- `app/route.ts`：本機 fallback 首頁同樣注入 widget script，讓 local smoke 能對齊 production 行為。
- `cloudflare/blog-html-direct-worker.js`：Cloudflare D1 直出 blog index 與文章頁注入 widget script。

## 可覆蓋的環境變數

- `NEXT_PUBLIC_WONDA_WIDGET_ENABLED`：設為 `0`、`false`、`off`、`disabled` 或 `no` 會關閉 widget。
- `NEXT_PUBLIC_WONDA_WIDGET_SCRIPT_SRC`：覆蓋 widget script URL。
- `NEXT_PUBLIC_WONDA_WIDGET_CHANNEL_ID`：覆蓋 public channel id。
- `NEXT_PUBLIC_WONDA_WIDGET_API`：覆蓋 public API base。

## 驗證

- `npm run test:wonda-widget`
- `npm run test:homepage`
- `curl -sS https://altoslab-ai.cc | rg "wonda-ai-widget|wonda-web|data-channel-id"`
- `curl -sS https://altoslab-ai.cc/blog | rg "wonda-ai-widget|wonda-web|data-channel-id"`

## 安全邊界

- 不把 WonDa 後台登入帳號、密碼、JWT、channel secret 或 token 寫進 repo。
- Widget message endpoint 是公開入口；後台管理與知識庫寫入需要受保護身份。
- 客服知識只放可公開回答內容；內部部署、密鑰、GCP/Cloudflare 管線、n8n runner、Chrome profile、GitHub release 流程不提供給訪客。

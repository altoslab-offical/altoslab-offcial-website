# ALTOS LAB WonDa Web Widget Integration

## 目的

官網先接 WonDa 的網站客服入口，讓訪客可以在 `https://altoslab-ai.cc` 上用浮動按鈕詢問 ALTOS LAB 的服務、案例、合作方式與內容資源。這次只做 web widget，不接 LINE、Telegram、WhatsApp、Facebook Messenger 或 Instagram。

## Public Widget 設定

以下三個值是前端 widget 載入所需的公開值，不是後台登入帳密。

```html
<script
  id="wonda-ai-widget"
  src="https://wonda-ai.altoslab-ai.workers.dev/widget.js"
  data-channel-id="cms4snnn50001l5045li1fd5h"
  data-api="https://altoslab-ai.cc/api/wonda"
  data-title="ALTOS LAB AI 客服"
  data-color="#B8FF3D"
  async
></script>
```

## 官網載入面

- `app/layout.tsx`：一般 Next route 透過 `components/WonDaWidgetScript.tsx` 載入 widget，並排除 `/admin`、`/api`、`/_next`。
- `scripts/sync-cloudflare-homepage.mjs`：首頁靜態 asset 於 build time 注入 widget script，不做 request-time HTML rewrite，也不改首頁 UI。
- `app/route.ts`：本機 fallback 首頁同樣注入 widget script，讓 local smoke 能對齊 production 行為。
- `cloudflare/blog-html-direct-worker.js`：Cloudflare D1 直出 blog index 與文章頁注入 widget script。
- `app/api/wonda/[...path]/route.ts`：公開 proxy，轉發 WonDa widget API，並在回覆出現錯語言、後台串接教學或不適合官網訪客的內容時套用 ALTOS LAB 多語客服 guard。

## 可覆蓋的環境變數

- `NEXT_PUBLIC_WONDA_WIDGET_ENABLED`：設為 `0`、`false`、`off`、`disabled` 或 `no` 會關閉 widget。
- `NEXT_PUBLIC_WONDA_WIDGET_SCRIPT_SRC`：覆蓋 widget script URL。
- `NEXT_PUBLIC_WONDA_WIDGET_CHANNEL_ID`：覆蓋 public channel id。
- `NEXT_PUBLIC_WONDA_WIDGET_API`：覆蓋 public API base。

目前 production channel 綁定 ALTOS LAB demo tenant；前端只使用公開 channel ID，demo 登入密碼、JWT 與 DeepSeek API key 不得進入網站原始碼或 `NEXT_PUBLIC_*` 變數。

AWS/custom-domain production 使用 `https://altoslab-ai.cc/api/wonda`；Vercel production/preview backup 使用 `https://altoslab-ai-wonda.vercel.app/api/wonda`。兩者都先經過官網的多語與供應商資訊 guard，再轉送到 WonDa API，避免備援站繞回尚未更新的 AWS proxy，也不讓不同網域出現回答品質落差。

## 驗證

- `npm run test:wonda-widget`
- `npm run wonda:language-smoke`
- `npm run test:homepage`
- `curl -sS https://altoslab-ai.cc | rg "wonda-ai-widget|wonda-web|data-channel-id"`
- `curl -sS https://altoslab-ai.cc/blog | rg "wonda-ai-widget|wonda-web|data-channel-id"`

`wonda:language-smoke` 會用 public widget API 低成本測繁中、英文、日文、韓文、印尼文、越南文、泰文、馬來文與 Filipino / Tagalog。它不需要後台密鑰，只確認客服回覆是否跟訪客語言走、是否提到 ALTOS LAB、以及是否誤吐後台/API/script/channelId 等不該給訪客的內容。

## 安全邊界

- 不把 WonDa 後台登入帳號、密碼、JWT、channel secret 或 token 寫進 repo。
- Widget message endpoint 是公開入口；後台管理與知識庫寫入需要受保護身份。
- 客服知識只放可公開回答內容；內部部署、密鑰、GCP/Cloudflare 管線、n8n runner、Chrome profile、GitHub release 流程不提供給訪客。

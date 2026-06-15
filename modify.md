# ALTOS LAB Website 修改紀錄

日期：2026-06-13

## 目前目標

把 ALTOS LAB 官網首頁、Blog header / article 排版、多語言切換、Contact 表單與 Gmail 通知寄信整理到可交接狀態，讓接手者可以上 Git 並繼續部署。

## 詳細異動

## 官網修改細節

### 首頁 header

- 在首頁補上固定於頂端的 header。
- Header 參考 Blog header 的資訊架構：
  - 左側：`ALTOS LAB`
  - 中間：`關於我們`、`服務項目`、`專案介紹`、`Blog`
  - 右側：語言切換、合作洽談 CTA
- 首頁 header 使用黑色系，不使用 Blog 的白底樣式。
- 頁面位於最上方時，header 背景會更透明，避免壓住 hero 視覺。
- 使用者往下滑後，header 才顯示較明顯的黑底與分隔線。
- CTA 文案在繁中為 `合作洽談`，英文為 `Talk` / `Book a Call` 類型文案。

### 首頁 header 技術實作

- `index.html`、`altoslab-website.html`、`public/altoslab-homepage.html` 新增首頁 header enhancer script。
- 透過 `enhanceHomepageHeader()` 找到原本首頁的 `nav.fixed.top-0`，重新補上導覽連結、語言選單與 CTA。
- 使用 `data-altos-header-style="blog-black"` 避免重複插入 header。
- 使用 `data-altos-header-top` 判斷頁面是否在最上方，搭配 CSS 切換背景。
- 新增 `setElementText(element, label)`，只有文字不同時才更新，避免 MutationObserver 反覆改 DOM 導致首頁空白或卡住。
- `scripts/homepage-ui-contract-smoke.mjs` 新增檢查，確保 `setElementText` 邏輯仍存在。

### 首頁 hero

- 調整 hero 中 `ALTOS / LAB` 字級，避免桌面過巨大、mobile 過小。
- 保留原本立方體、線條背景與黑底科技感，不再使用任何先前錯誤的 fallback landing design。
- 保留原本首頁第一屏視覺結構，只做字級和 header 行為修正。

### 首頁多語言

- Landing page 只保留兩種語言：
  - `zh-Hant`
  - `en`
- 新增首頁語言切換 UI：
  - Desktop：header 右側 globe / language dropdown。
  - Mobile：menu 內顯示語言切換。
- 切換語言時會更新：
  - header links
  - CTA
  - hero / section copy
  - contact form label / placeholder / success message
  - page title / description metadata
- 語言狀態寫入 `localStorage` key：`altoslab:language`。
- 切換時會 dispatch `altoslab:languagechange` event。

### 首頁 mobile menu

- 補上 mobile menu trigger，使用 `Menu` / `X` icon。
- Mobile menu 開啟後顯示：
  - 關於 / 服務 / 專案 / Blog
  - 合作洽談 CTA
- Mobile menu 支援 Escape 關閉。
- Mobile menu 點擊連結後會自動關閉。
- 官網暗底與 Blog 白底各有對應樣式。

### Contact 表單

- 首頁 Contact 區塊保留黑底表單設計。
- 表單欄位包含：
  - 公司 / 團隊 / 姓名
  - 聯絡方式
  - 想優先解決的問題
- 表單送出後會呼叫 `/api/contact`。
- 送出成功後：
  - 表單欄位清空。
  - 顯示成功狀態盒：
    - `已送出`
    - `我們已收到你的合作需求，會盡快透過你留下的聯絡方式回覆。`
- 欄位未填完整時，顯示：
  - `請先填完欄位`
  - `我們需要公司 / 團隊 / 姓名、聯絡方式與需求內容。`
- 成功 / 錯誤訊息在中英文切換時會同步翻譯。
- React 版 `components/ContactForm.tsx` 與靜態首頁 HTML fallback 都有同步處理。

### Contact Gmail 通知

- `/api/contact` 在儲存 lead 後會呼叫 `sendContactLeadNotification()`。
- Gmail 通知會寄到：
  - `CONTACT_NOTIFY_TO`
- 寄件來源：
  - `CONTACT_NOTIFY_FROM`
- 使用 Gmail API，不使用 SMTP / Nodemailer。
- 若使用者留下 email，通知信會自動設定 `Reply-To`，方便直接回覆客戶。
- 若 env 未設定完整，lead 仍會儲存，但 terminal 會出現：
  - `[contact] Gmail notification skipped: missing-env`
- 若 Gmail API 失敗，terminal 會出現：
  - `[contact] Unable to send Gmail notification: ...`

### Contact 通知信版型

- 通知信從純文字改為 `multipart/alternative`。
- HTML 版本包含：
  - 黑底 `ALTOS LAB` header
  - `新的合作需求` 標題
  - 公司 / 團隊 / 姓名
  - 聯絡方式
  - 需求內容
  - Lead ID
  - 送出時間，格式化為台北時間 UTC+8
  - 來源 `website-contact`
- HTML email 使用 inline style，確保 Gmail 可正常顯示。
- 保留純文字 fallback，避免部分 email client 不支援 HTML 時看不到內容。

## Blog 修改細節

### Blog header

- Blog header 保留白底樣式，與官網首頁黑底 header 分開。
- Blog header 補回語言選單。
- Blog 頁語言選單保留完整 9 語系：
  - 繁中
  - English
  - 日本語
  - 한국어
  - Bahasa Indonesia
  - Tiếng Việt
  - ไทย
  - Bahasa Melayu
  - Filipino
- Blog header 使用 globe icon 作為語言切換入口。
- 語言選單使用 dropdown，不再使用 segmented control。
- `role="menuitemradio"` 與 `aria-expanded` 已保留，讓選單語意更清楚。

### Blog 與官網語言分流

- 新增 `SITE_LANGUAGES`：
  - 官網只吃 `zh-Hant` / `en`
- `BLOG_LANGUAGES` 保留 9 語系。
- `SiteHeader` 依照目前 route 判斷語言選項：
  - Blog route：使用 `blogLanguageOptions()`
  - 非 Blog route：使用 `siteLanguageOptions()`
- `lib/seo.ts` 的 organization `availableLanguage` 改為使用 `SITE_LANGUAGES`，避免官網 schema 宣告 9 個語言但 landing page 實際只有中英。

### Blog index

- Blog 首頁 header / nav 不再消失。
- Mobile blog header 也保留 menu trigger 與語言 dropdown。
- Blog 仍可使用 `/blog`、`/en/blog` 等語系入口。

### Blog article hero

- 文章頁 hero 區塊改為靠左對齊。
- 縮小文章標題桌面版字級：
  - 原本過大，容易佔滿第一屏。
  - 現在使用較收斂的 `clamp(34px, 3.25vw, 44px)`。
- 移除過度置中的 hero layout，改成較接近 editorial article 的左對齊閱讀節奏。
- 文章上方空白縮小：
  - `.blog-site-shell .blog-page` padding-top 從 `64px` 改為 `28px`。
- 文章 meta 資訊靠左，與標題對齊。

### Blog article highlight / 重點樣式

- `==highlight==` 產生的 `.rich-highlight` 改成：
  - 黑色字
  - landing page 螢光綠底線
- 原本偏紫色的重點色移除。
- `strong` 也改成黑字 + 螢光綠 underline，讓文章內重點一致。
- `blockquote` 改成黑色左線與淡螢光綠背景，不再使用紫色。
- `article-takeaways` 的重點項目使用螢光綠底線與黑字。

### Blog 測試保護

- `scripts/blog-system-smoke.mjs` 新增檢查：
  - landing page languages 只能是中 / 英。
  - Blog header 仍保留完整 blog languages。
  - Header 依 blog route / non-blog route 選擇不同語言選項。
  - highlight 樣式使用 landing page lime + black text。

## 快速摘要與相關檔案

### 1. 首頁 header 與 landing page 修復

- 將首頁頂部 header 補回，樣式對齊 Blog header 的結構，但使用黑色/透明底。
- 首頁在最上方時 header 背景會收斂成透明感，滾動後才顯示黑底與分隔線。
- 修正首頁語言切換造成重複 textContent mutation 的問題，避免首頁空白或卡住。
- 調整首頁 hero `ALTOS / LAB` 字級，避免過大或過小。
- 保留目前首頁版型，不再使用之前的錯誤 fallback 設計。

相關檔案：

- `index.html`
- `altoslab-website.html`
- `public/altoslab-homepage.html`
- `scripts/homepage-ui-contract-smoke.mjs`

### 2. 多語言規則

- 官網 landing page 僅保留繁中 / 英文。
- Blog 保留完整 9 語系選單。
- Header 會依路由判斷：
  - `/` 與一般官網頁：只顯示 `zh-Hant`、`en`
  - `/blog` 與各語系 Blog：顯示完整 Blog 語系

相關檔案：

- `components/site/SiteHeader.tsx`
- `lib/blog-utils.ts`
- `lib/seo.ts`
- `scripts/blog-system-smoke.mjs`

### 3. Mobile header / menu

- 補回 mobile header menu trigger。
- mobile menu 內容包含主要導覽與合作洽談 CTA。
- Blog 頁與官網頁分別有對應的亮色/暗色 header menu 樣式。

相關檔案：

- `components/site/SiteHeader.tsx`
- `app/globals.css`

### 4. Blog 頁面調整

- Blog 文章頁標題改為靠左對齊。
- 桌面版文章標題字級縮小，避免標題過大。
- 文章上方空白縮小。
- 本文重點 / highlight 樣式改為黑色字，底線使用 landing page 螢光綠。
- blockquote 與重點列表也改為較一致的黑字 + 螢光綠視覺。

相關檔案：

- `app/globals.css`
- `scripts/blog-system-smoke.mjs`

### 5. Contact 表單前端回饋

- 表單送出後會清空欄位。
- 成功訊息改成明確的狀態盒：
  - `已送出`
  - `我們已收到你的合作需求，會盡快透過你留下的聯絡方式回覆。`
- 錯誤訊息與成功訊息共用一致的視覺位置。
- 靜態首頁 fallback 腳本也同步成功/錯誤狀態樣式。

相關檔案：

- `components/ContactForm.tsx`
- `app/globals.css`
- `index.html`
- `altoslab-website.html`
- `public/altoslab-homepage.html`

### 6. Contact 表單 Gmail 自動寄信

- `/api/contact` 儲存 lead 後，會呼叫 Gmail API 寄通知信。
- 若 Gmail env 未設定，API 仍會正常儲存 lead，但 server log 會警告：
  - `[contact] Gmail notification skipped: missing-env`
- 若 Gmail API 失敗，server log 會顯示：
  - `[contact] Unable to send Gmail notification: ...`
- 新增 Gmail OAuth refresh token helper。

相關檔案：

- `app/api/contact/route.ts`
- `lib/contact-notification.ts`
- `scripts/gmail-oauth-token.mjs`
- `package.json`
- `.env.example`
- `.gitignore`

### 7. Email HTML 版型

- Contact 通知信從純文字改成 `multipart/alternative`。
- Gmail 會優先顯示簡單 HTML 卡片版：
  - 黑色 `ALTOS LAB` header
  - 螢光綠重點線
  - 公司 / 聯絡方式 / 需求內容分區
  - Lead ID、送出時間、來源放在底部資訊區
- 保留純文字 fallback。
- 若使用者留下 email，`Reply-To` 會自動設為使用者信箱。

相關檔案：

- `lib/contact-notification.ts`

## 新增環境變數

`.env.example` 已新增：

```env
CONTACT_NOTIFY_FROM=altoslab.offical@gmail.com
CONTACT_NOTIFY_TO=altoslab.offical@gmail.com
GMAIL_CLIENT_ID=
GMAIL_CLIENT_SECRET=
GMAIL_REFRESH_TOKEN=
```

本機 `.env.local` 已設定過可用值，但 `.env.local` 不應上 Git，也不會放進 zip。

正式部署時，需要在部署平台設定同樣的 secret。若使用 Cloudflare / OpenNext，建議用 production secret 設定，不要寫進程式碼。

## Gmail OAuth 設定方式

1. Google Cloud Console 建立 OAuth Client。
2. OAuth scope 需要：

```txt
https://www.googleapis.com/auth/gmail.send
```

3. `.env.local` 放入：

```env
GMAIL_CLIENT_ID=...
GMAIL_CLIENT_SECRET=...
CONTACT_NOTIFY_FROM=altoslab.offical@gmail.com
CONTACT_NOTIFY_TO=altoslab.offical@gmail.com
```

4. 執行：

```bash
npm run gmail:token
```

5. 用 `altoslab.offical@gmail.com` 授權後，把輸出的 `GMAIL_REFRESH_TOKEN` 放入 `.env.local` 或 production secrets。

## 安全注意事項

- 不要 commit `.env.local`。
- 不要 commit Gmail client secret / refresh token。
- 因為本次操作中 secret 曾經出現在對話內容，正式上線前建議到 Google Cloud Console 重新產生 OAuth client secret，並重新跑一次 `npm run gmail:token`。
- `.gitignore` 已加入：

```txt
gmail-credentials*.json
gmail-token*.json
.gmail*.local*
```

## 已驗證

已執行並通過：

```bash
npm run typecheck
npm run test:homepage
git diff --check
```

已實測：

- Gmail API 可成功寄出測試信。
- `/api/contact` 回傳 `ok: true`。
- Contact 表單送出後會顯示成功訊息。
- 中 / 英語言切換後，表單成功訊息會跟著翻譯。

## 上 Git 前建議

1. 確認 `.env.local` 沒有被加入 Git。
2. 確認 zip 裡沒有：
   - `.git/`
   - `.env.local`
   - `node_modules/`
   - `.next/`
   - `.open-next/`
   - `.wrangler/`
3. 接手者收到 zip 後執行：

```bash
npm install
npm run typecheck
npm run test:homepage
```

4. 若要測 Gmail 寄信，需自行設定 `.env.local` 或 production secrets。

## 本次主要修改檔案

- `.env.example`
- `.gitignore`
- `app/api/contact/route.ts`
- `lib/contact-notification.ts`
- `scripts/gmail-oauth-token.mjs`
- `package.json`
- `components/ContactForm.tsx`
- `components/site/SiteHeader.tsx`
- `app/globals.css`
- `lib/blog-utils.ts`
- `lib/seo.ts`
- `scripts/blog-system-smoke.mjs`
- `scripts/homepage-ui-contract-smoke.mjs`
- `index.html`
- `altoslab-website.html`
- `public/altoslab-homepage.html`
- `next-env.d.ts`

## 備註

- `next-env.d.ts` 是 Next dev server 自動更新的型別 reference，保留即可。
- `public/altoslab-homepage.html` 在 `.gitignore` 中，但它是 Cloudflare homepage asset 的同步檔；若接手者需要部署 Cloudflare homepage，請確認此檔案也有被同步或重新產生。

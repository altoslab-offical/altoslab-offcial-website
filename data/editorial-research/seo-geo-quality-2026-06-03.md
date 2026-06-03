# ALTOS LAB SEO/GEO Editorial Quality Sidecar (Reader-Invisible)

**版本日期**：2026-06-03  
**用途**：提供給編輯、SEO、成效分析、資料工程共用的後台品質底板。本文不作為對外稿件內容。  
**適用對象**：market news、column、feature（含欄位分數）。  
**核心限制**：不在此文件輸出「是否可發」最終裁決，僅輸出檢核結果、待修缺口與建議行動。

## 1. 讀者版：公開頁面可保留的 do / don't

### Do（公開可見）
1. 直接先回答讀者關心的決策問題，再補說明與例子。
2. 在開頭 40~80 字內先給結論，並在後面補上來源脈絡。
3. 每篇至少有一個「可採行的下一步」：要觀察什麼、怎麼驗證。
4. 用白話說明名詞，首次出現的專有名詞要加一行「這句話在文中是怎麼用的」。
5. 來源要可追朔，超連結盡量標記發佈日、版本、以及官方來源。
6. FAQ 放在正文中可視情境呈現，非為了套用 AI 結構而機械堆疊。
7. 重要聲明保持「可追責」：主張、限制、反例、未完成證明。

### Don’t（公開禁用）
1. 不在正文暗示「此為 SEO 優化」或「為了搜尋引擎」。
2. 不披露文章是否通過某套指標門檻。
3. 不使用「機器學習會怎麼看」這類含糊評語。
4. 不把術語清單（如 structured data、llms.txt、API、指標）直接拿到敘事正文。
5. 不把多語系、sitemap、canonical、schema、GSC/GA 數據直接當作正文賣點。
6. 不宣傳「AI 產出」流程或「提示詞」做為信任背書。
7. 不以「最新」「全方位」「最全面」等泛化詞代替實際證據。

## 2. 後台 SEO/GEO 檢查清單

> 這部分僅供發文前 / 發布前 QA 使用。缺陷級別：`必修`、`建議`、`增益`。

### A. 基礎可見性與技術層
1. **URL 與路徑規則（必修）**：穩定、短小、無 session 參數、避免重複內容副本。
2. **HTTP/HTTPS + 可存取性（必修）**：TLS、非 4xx/5xx、重要資源可取用。
3. **`robots.txt` / `sitemap` 對齊（必修）**：sitemap 僅包含可公開頁；禁止提交受限頁。
4. **`rel=canonical`（建議）**：同主題重複頁有穩定 canonical 聚合。
5. **站內鏈接可達（必修）**：新頁可透過內部鏈接在 2-3 次點擊可達。
6. **版面可讀性（必修）**：手機端無關鍵 CSS 阻斷、文字可讀、段落邏輯清楚。
7. **重複內容控管（必修）**：關聯頁面避免標題與主題高度重複。
8. **多版多語一致性（建議）**：多語版本有同一主題對應關係與切換機制。

### B. Content Engine/AI/GEO 取用性
1. **首段可回答實際問題（必修）**：讓 AI/人類都能先判斷該頁主張。
2. **命名實體一致（建議）**：公司/產品/人名保持單一標準中文與英文版本。
3. **`entity` 友善（建議）**：明確欄位定義「誰、什麼、何時、做了什麼」。
4. **資料可驗證（必修）**：每條斷言有時間戳與可驗證來源。
5. **LLM 友善摘要（建議）**：保留短摘要段與清晰小標，避免關鍵資訊只藏在圖片。
6. **可機器可讀輔助（建議）**：保留標題、時間、摘要、來源清單、FAQ 於正文中的明確段落。
7. **AI 視窗下脈絡不失真（建議）**：表格與列表有欄位名稱，不依賴互動效果。
8. **`llms.txt` 支援（建議）**：站台規劃啟用，保留「文章分流、作者、專有名詞、版本資訊」。

### C. 結構化資料與增益
1. **JSON-LD 規格化（必修）**：`Article/BlogPosting`、`Organization`、`Person`、`BreadcrumbList` 至少最小欄位齊全。
2. **`FAQPage` / `QAPage` 嚴格匹配（建議）**：只有單一問答對且答案有邏輯段。
3. **圖片可描述（建議）**：`alt`、`caption` 不僅是視覺修飾。
4. **同頁內部一致性（必修）**：標題、描述、JSON-LD、`canonical` 不互相矛盾。

### D. 內容品質與市場文章類型特性
1. **市場新聞（market news）可交付價值（必修）**：至少 1 條可採行影響判讀。
2. **欄目文章（column）可辯論性（建議）**：有反方、限制、反直覺論點。
3. **數據/來源可追溯（必修）**：所有關鍵圖表有資料來源與時間窗。
4. **風險揭露（建議）**：未完全驗證項目、假設、估算區間需標示。

### E. 監控與報表
1. **發稿前快照驗證（建議）**：GSC 及 GA 事件標記可收斂。
2. **發稿後 24h/72h 檢查（建議）**：觀察 index 與曝光異常。
3. **週報 KPI**：點擊/曝光/CTR（GSC）與進站品質（GA）至少有對照點。
4. **回歸池**：同主題同類標題與流量衰退 >30% 需建立模板調整。

## 3. 市場新聞 vs 欄目分數規則

### 3.1 Market News Score

**總分 100，建議建檔門檻為 82；有硬失敗項目仍不得放行。**

- 時效價值（25）
  - 事件是否與近 30 天有直接關係、是否有更新節點。
- 取證完整度（25）
  - 官方來源、時間戳、可交叉驗證鏈接。
- 決策可操作性（20）
  - 給到「下一步」並可在公司流程中實作。
- 結構可讀性（15）
  - 4~6 個 H2、小標、表格/清單邏輯完整。
- GEO/AI 友善度（15）
  - 首段摘要、FAQ、人物/公司實體一致性、結構化資料正確。

**扣分硬規則（任一觸發即不建議放行）**：
- 有不可驗證主張（>1）
- 無關鍵來源或時間戳
- 發佈後 24 小時內出現明顯 index/抓取錯誤未修

### 3.2 Column Score

**總分 100，建議建檔門檻為 80；有硬失敗項目仍不得放行。**

- 論點完整性（30）
  - 呈現問題、反例、反方觀點、邊界。
- 方法論透明度（20）
  - 解釋判斷依據、比較軸、替代假設。
- 實務轉譯（20）
  - 讀者可直接落地的行動項目與風險清單。
- 引用與溯源（15）
  - 來源鏈路完整、訊息不扭曲。
- 結構化可發現性（15）
  - 首段、章節、標題、摘要、schema、內部鏈接。

**欄目硬規則**：
- 未明確列出限制與反例，得分直接-20
- 圖、表僅做裝飾無資訊承載，得分直接-10

## 4. 禁止出現在公開文案的 15 個詞（exact-match）

1. SEO
2. GEO
3. AI 搜尋
4. AI 機會面面（避免提及此類內部流程用語）
5. 關鍵字密度
6. SERP
7. Search Console
8. 指標儀表板
9. Prompt
10. AI-generated
11. Prompt 工程
12. 內容質量門檻
13. 可見度報表
14. 結構化資料修正門檻
15. 品牌權重

## 5. 參考來源（官方）— 144 則

1. [Google Search Essentials](https://developers.google.com/search/docs/essentials)
2. [Search Engine Optimization technical requirements](https://developers.google.com/search/docs/essentials/technical)
3. [Search spam policies](https://developers.google.com/search/docs/essentials/spam-policies)
4. [SEO starter guide](https://developers.google.com/search/docs/fundamentals/seo-starter-guide)
5. [How search works](https://developers.google.com/search/docs/fundamentals/how-search-works)
6. [Creating helpful, reliable content](https://developers.google.com/search/docs/fundamentals/creating-helpful-content)
7. [AI optimization guide](https://developers.google.com/search/docs/fundamentals/ai-optimization-guide)
8. [Using generative AI content](https://developers.google.com/search/docs/fundamentals/using-gen-ai-content)
9. [Get started with Search](https://developers.google.com/search/docs/fundamentals/get-started)
10. [Developer SEO guide](https://developers.google.com/search/docs/fundamentals/get-started-developers)
11. [Do I need SEO](https://developers.google.com/search/docs/fundamentals/do-i-need-seo)
12. [Crawling and indexing overview](https://developers.google.com/search/docs/crawling-indexing)
13. [Robots introduction](https://developers.google.com/search/docs/crawling-indexing/robots/intro)
14. [Robots meta tag](https://developers.google.com/search/docs/crawling-indexing/robots-meta-tag)
15. [Indexable file types](https://developers.google.com/search/docs/crawling-indexing/indexable-file-types)
16. [URL structure](https://developers.google.com/search/docs/crawling-indexing/url-structure)
17. [Crawlable links](https://developers.google.com/search/docs/crawling-indexing/links-crawlable)
18. [Sitemaps overview](https://developers.google.com/search/docs/crawling-indexing/sitemaps/overview)
19. [Build a sitemap](https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap)
20. [Combine sitemap extensions](https://developers.google.com/search/docs/crawling-indexing/sitemaps/combine-sitemap-extensions)
21. [Image sitemaps](https://developers.google.com/search/docs/crawling-indexing/sitemaps/image-sitemaps)
22. [Video sitemaps](https://developers.google.com/search/docs/crawling-indexing/sitemaps/video-sitemaps)
23. [Canonicalization](https://developers.google.com/search/docs/crawling-indexing/canonicalization)
24. [Canonicalization troubleshooting](https://developers.google.com/search/docs/crawling-indexing/canonicalization-troubleshooting)
25. [301 redirects](https://developers.google.com/search/docs/crawling-indexing/301-redirects)
26. [Consolidate duplicate URLs](https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls)
27. [Mobile-first indexing](https://developers.google.com/search/docs/crawling-indexing/mobile/mobile-sites-mobile-first-indexing)
28. [AMP](https://developers.google.com/search/docs/crawling-indexing/amp)
29. [AMP about](https://developers.google.com/search/docs/crawling-indexing/amp/about-amp)
30. [AMP remove](https://developers.google.com/search/docs/crawling-indexing/amp/remove-amp)
31. [JavaScript SEO basics](https://developers.google.com/search/docs/crawling-indexing/javascript/javascript-seo-basics)
32. [Fix JS for search](https://developers.google.com/search/docs/crawling-indexing/javascript/fix-search-javascript)
33. [Lazy loading](https://developers.google.com/search/docs/crawling-indexing/javascript/lazy-loading)
34. [Dynamic rendering](https://developers.google.com/search/docs/crawling-indexing/javascript/dynamic-rendering)
35. [Ask Google to recrawl](https://developers.google.com/search/docs/crawling-indexing/ask-google-to-recrawl)
36. [Troubleshoot crawling errors](https://developers.google.com/search/docs/crawling-indexing/troubleshoot-crawling-errors)
37. [Site move with URL changes](https://developers.google.com/search/docs/crawling-indexing/site-move-with-url-changes)
38. [Site move without URL changes](https://developers.google.com/search/docs/crawling-indexing/site-move-no-url-changes)
39. [Block indexing](https://developers.google.com/search/docs/crawling-indexing/block-indexing)
40. [Qualify outbound links](https://developers.google.com/search/docs/crawling-indexing/qualify-outbound-links)
41. [Website testing](https://developers.google.com/search/docs/crawling-indexing/website-testing)
42. [Valid page metadata](https://developers.google.com/search/docs/crawling-indexing/valid-page-metadata)
43. [AI features in search](https://developers.google.com/search/docs/appearance/ai-features)
44. [AI overviews](https://developers.google.com/search/docs/appearance/ai-overviews)
45. [Page experience](https://developers.google.com/search/docs/appearance/page-experience)
46. [Core Web Vitals](https://developers.google.com/search/docs/appearance/core-web-vitals)
47. [Avoid intrusive interstitials](https://developers.google.com/search/docs/appearance/avoid-intrusive-interstitials)
48. [Ranking systems guide](https://developers.google.com/search/docs/appearance/ranking-systems-guide)
49. [Preferred sources](https://developers.google.com/search/docs/appearance/preferred-sources)
50. [Structured data intro](https://developers.google.com/search/docs/appearance/structured-data/intro-structured-data)
51. [Structured data policies](https://developers.google.com/search/docs/appearance/structured-data/sd-policies)
52. [Enriched search results](https://developers.google.com/search/docs/appearance/enriched-search-results)
53. [Search gallery](https://developers.google.com/search/docs/appearance/structured-data/search-gallery)
54. [Article schema](https://developers.google.com/search/docs/appearance/structured-data/article)
55. [Organization schema](https://developers.google.com/search/docs/appearance/structured-data/organization)
56. [FAQ schema](https://developers.google.com/search/docs/appearance/structured-data/faqpage)
57. [Q&A schema](https://developers.google.com/search/docs/appearance/structured-data/qapage)
58. [Product schema](https://developers.google.com/search/docs/appearance/structured-data/product)
59. [Review snippet schema](https://developers.google.com/search/docs/appearance/structured-data/review-snippet)
60. [Breadcrumb schema](https://developers.google.com/search/docs/appearance/structured-data/breadcrumb)
61. [Job posting schema](https://developers.google.com/search/docs/appearance/structured-data/job-posting)
62. [Software app schema](https://developers.google.com/search/docs/appearance/structured-data/software-app)
63. [Speakable schema](https://developers.google.com/search/docs/appearance/structured-data/speakable)
64. [Product snippet](https://developers.google.com/search/docs/appearance/structured-data/product-snippet)
65. [Carousel schema](https://developers.google.com/search/docs/appearance/structured-data/carousel)
66. [Title link](https://developers.google.com/search/docs/appearance/title-link)
67. [Snippet](https://developers.google.com/search/docs/appearance/snippet)
68. [Featured snippets](https://developers.google.com/search/docs/appearance/featured-snippets)
69. [Site names](https://developers.google.com/search/docs/appearance/site-names)
70. [Sitelinks](https://developers.google.com/search/docs/appearance/sitelinks)
71. [Translated results](https://developers.google.com/search/docs/appearance/translated-results)
72. [Core updates](https://developers.google.com/search/docs/appearance/core-updates)
73. [Generate structured data with JS](https://developers.google.com/search/docs/appearance/structured-data/generate-structured-data-with-javascript)
74. [Search operators](https://developers.google.com/search/docs/monitor-debug/search-operators)
75. [Image search operators](https://developers.google.com/search/docs/monitor-debug/search-operators/image-search)
76. [All-search operators](https://developers.google.com/search/docs/monitor-debug/search-operators/all-search-site)
77. [Search Console start](https://developers.google.com/search/docs/monitor-debug/search-console-start)
78. [Debug traffic drops](https://developers.google.com/search/docs/monitor-debug/debugging-search-traffic-drops)
79. [GA4 + GSC monitoring](https://developers.google.com/search/docs/monitor-debug/google-analytics-search-console)
80. [Trends start](https://developers.google.com/search/docs/monitor-debug/trends-start)
81. [Bubble chart analysis](https://developers.google.com/search/docs/monitor-debug/bubble-chart-analysis)
82. [Search appearance security](https://developers.google.com/search/docs/monitor-debug/security)
83. [Reports at a glance](https://support.google.com/webmasters/answer/9133276?hl=en)
84. [About Search Console](https://support.google.com/webmasters/answer/9128668?hl=en)
85. [Getting started with Search Console](https://support.google.com/webmasters/answer/10267942?hl=en)
86. [Sitemaps report](https://support.google.com/webmasters/answer/7451001)
87. [Sitemap index files](https://support.google.com/webmasters/answer/12818558)
88. [Performance report](https://support.google.com/webmasters/answer/7576553)
89. [URL inspection troubleshooting](https://support.google.com/webmasters/answer/9012289)
90. [Inspect and troubleshoot single page](https://support.google.com/webmasters/answer/12482179)
91. [Export data using Search Console API](https://support.google.com/webmasters/answer/12919192)
92. [How Google found all pages?](https://support.google.com/webmasters/answer/10264824)
93. [Page indexing report](https://support.google.com/webmasters/answer/7440203)
94. [Index overview](https://support.google.com/webmasters/answer/7643011)
95. [Security issues report](https://support.google.com/webmasters/answer/9044101)
96. [Security reasons page label](https://support.google.com/webmasters/answer/6347750)
97. [Search Console API reference](https://developers.google.com/webmaster-tools/v1/api_reference_index)
98. [Search Console v3 search analytics](https://developers.google.com/webmaster-tools/v3/searchanalytics)
99. [Search Console v3 sitemaps API](https://developers.google.com/webmaster-tools/v3/sitemaps)
100. [URL Inspection API blog](https://developers.google.com/search/blog/2022/01/url-inspection-api)
101. [GA4 Data API](https://developers.google.com/analytics/devguides/reporting/data/v1)
102. [GA4 Data API REST](https://developers.google.com/analytics/devguides/reporting/data/v1/rest)
103. [GA4 collection overview](https://developers.google.com/analytics/devguides/collection/ga4)
104. [GA4 event reference](https://developers.google.com/analytics/devguides/collection/ga4/reference/events)
105. [GA dimensions and metrics](https://support.google.com/analytics/answer/13947485)
106. [GA data collection setup](https://support.google.com/analytics/answer/9744165)
107. [GA account/data setup](https://support.google.com/analytics/answer/12159447)
108. [GA data freshness and limits](https://support.google.com/analytics/answer/9358801)
109. [GA4 transition / migration notes](https://support.google.com/analytics/answer/11583528)
110. [Google Tag Manager](https://developers.google.com/tag-platform/tag-manager)
111. [Tag Manager install reference](https://support.google.com/tagmanager/answer/6103696?hl=en)
112. [Schema.org home](https://schema.org)
113. [Schema getting started](https://schema.org/docs/gs.html)
114. [Schema vocabulary](https://schema.org/docs/about.html)
115. [Article schema](https://schema.org/Article)
116. [BlogPosting schema](https://schema.org/BlogPosting)
117. [NewsArticle schema](https://schema.org/NewsArticle)
118. [Organization schema](https://schema.org/Organization)
119. [Person schema](https://schema.org/Person)
120. [Thing schema](https://schema.org/Thing)
121. [sameAs property](https://schema.org/sameAs)
122. [QAPage schema](https://schema.org/QAPage)
123. [FAQPage schema](https://schema.org/FAQPage)
124. [JSON-LD learn](https://json-ld.org/learn.html)
125. [JSON-LD spec latest](https://json-ld.org/spec/latest/json-ld/)
126. [JSON-LD playground](https://json-ld.org/playground/)
127. [W3C JSON-LD 1.1](https://www.w3.org/TR/json-ld11/)
128. [W3C JSON-LD API](https://www.w3.org/TR/json-ld11-api/)
129. [W3C CSS Fonts Level 4](https://www.w3.org/TR/css-fonts-4/)
130. [llms.txt proposal](https://llmstxt.org/)
131. [llms.txt intro](https://llmstxt.org/intro.html)
132. [llms.txt format spec](https://llmstxt.org/intro.html#format)
133. [llms.txt GitHub repository](https://github.com/AnswerDotAI/llms-txt)
134. [llms.txt issue reporting](https://github.com/answerdotai/llms-txt/issues/new)
135. [llms.txt directory](https://llmstxt.site/)
136. [Directory cloud](https://directory.llmstxt.cloud/)
137. [Bing webmaster guidelines](https://www.bing.com/webmasters/help/bing-webmaster-guidelines-30fba23a)
138. [Bing URL submission](https://www.bing.com/webmasters/help/URL-Submission-62f2860b)
139. [Bing sitemap submission](https://www.bing.com/webmasters/help/how-to-submit-your-sitemap-30fba23a)
140. [Bing search delivery](https://support.microsoft.com/en-us/bing/how-bing-delivers-search-results)
141. [Bing Webmasters home](https://www.bing.com/webmasters/home)
142. [Bing IndexNow](https://www.bing.com/indexnow)
143. [Google Knowledge Graph](https://developers.google.com/knowledge-graph)
144. [Knowledge panel help](https://support.google.com/knowledgepanel/answer/9787176)

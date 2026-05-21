import type { CmsData } from "./types";

const timestamp = "2026-05-18T00:00:00.000Z";

export const seedData: CmsData = {
  sitePages: [
    {
      id: "page_home",
      slug: "home",
      status: "published",
      title: "ALTOS LAB Official Website",
      seoTitle: "ALTOS LAB｜AI 自動化、AI Agent 與 GEO 顧問工作室",
      seoDescription:
        "ALTOS LAB 是專注 AI Agent、流程自動化、AI 客服與 GEO 生成式搜尋優化的台灣 AI 實作團隊，協助企業把 AI 直接落地到營運流程。",
      createdAt: timestamp,
      updatedAt: timestamp,
      publishedAt: timestamp,
      sections: [
        {
          id: "sec_hero",
          pageId: "page_home",
          type: "hero",
          key: "hero",
          status: "published",
          sortOrder: 10,
          eyebrow: "AI Studio · Taiwan / APAC",
          title: "ALTOS",
          accentText: "LAB",
          subtitle: "AI 系統、智能代理與生成式搜尋能見度工作室",
          body:
            "我們替企業設計能交付結果的 AI 工作流：AI 客服、內部流程自動化、私有知識庫、AI Agent 與 GEO 內容系統，讓 AI 從展示變成真正的營運能力。",
          ctaPrimaryLabel: "預約 AI 導入討論",
          ctaPrimaryUrl: "#contact",
          ctaSecondaryLabel: "查看案例",
          ctaSecondaryUrl: "#portfolio",
          items: [],
          settings: { visualMode: "signal-grid" },
          createdAt: timestamp,
          updatedAt: timestamp,
          publishedAt: timestamp
        },
        {
          id: "sec_stats",
          pageId: "page_home",
          type: "stats",
          key: "stats",
          status: "published",
          sortOrder: 20,
          title: "Implementation Signals",
          items: [
            {
              id: "item_stat_launch",
              sectionId: "sec_stats",
              status: "published",
              sortOrder: 10,
              label: "最快 MVP 上線",
              value: "14 days",
              body: "從需求盤點到可測試的 AI 工作流",
              createdAt: timestamp,
              updatedAt: timestamp
            },
            {
              id: "item_stat_stack",
              sectionId: "sec_stats",
              status: "published",
              sortOrder: 20,
              label: "AI 導入模組",
              value: "6+",
              body: "RAG、Agent、客服、自動化、內容、監測",
              createdAt: timestamp,
              updatedAt: timestamp
            },
            {
              id: "item_stat_ops",
              sectionId: "sec_stats",
              status: "published",
              sortOrder: 30,
              label: "營運導向",
              value: "100%",
              body: "以實際轉換、節省工時與可維護性衡量",
              createdAt: timestamp,
              updatedAt: timestamp
            }
          ],
          createdAt: timestamp,
          updatedAt: timestamp,
          publishedAt: timestamp
        },
        {
          id: "sec_about",
          pageId: "page_home",
          type: "about",
          key: "about",
          status: "published",
          sortOrder: 30,
          eyebrow: "About · We Build Intelligence",
          title: "把 AI 變成企業每天會用的系統",
          accentText: "可部署、可衡量、可迭代",
          body:
            "ALTOS LAB 不是只交付簡報或 Prompt。我們從業務流程、知識資料、系統整合、權限與日常維運出發，打造能在真實團隊中持續運作的 AI 產品與自動化後台。",
          items: [],
          createdAt: timestamp,
          updatedAt: timestamp,
          publishedAt: timestamp
        },
        {
          id: "sec_services",
          pageId: "page_home",
          type: "services",
          key: "services",
          status: "published",
          sortOrder: 40,
          eyebrow: "Services · 服務項目",
          title: "What We Build",
          items: [
            {
              id: "item_service_skill",
              sectionId: "sec_services",
              status: "published",
              sortOrder: 10,
              eyebrow: "THE SKILL LAYER",
              title: "AI Skill 與企業知識庫",
              label: "01",
              body:
                "把客服、銷售、營運 SOP、產品知識轉成可查詢、可回答、可追蹤品質的 AI 技能模組。",
              createdAt: timestamp,
              updatedAt: timestamp
            },
            {
              id: "item_service_agent",
              sectionId: "sec_services",
              status: "published",
              sortOrder: 20,
              eyebrow: "THE AGENT LAYER",
              title: "AI Agent 與流程自動化",
              label: "02",
              body:
                "串接表單、CRM、試算表、內部 API 與通知工具，讓 AI 能依規則執行任務，而不是只回答問題。",
              createdAt: timestamp,
              updatedAt: timestamp
            },
            {
              id: "item_service_geo",
              sectionId: "sec_services",
              status: "published",
              sortOrder: 30,
              eyebrow: "THE VISIBILITY LAYER",
              title: "SEO / GEO 內容與搜尋能見度",
              label: "03",
              body:
                "建立可被搜尋引擎與 AI 回答系統理解的內容架構、部落格、FAQ、結構化資料與主題集群。",
              createdAt: timestamp,
              updatedAt: timestamp
            },
            {
              id: "item_service_admin",
              sectionId: "sec_services",
              status: "published",
              sortOrder: 40,
              eyebrow: "THE CONTROL LAYER",
              title: "後台 CMS 與資料管理",
              label: "04",
              body:
                "替官網、產品、案例、聯絡名單與內容工作流建立可管理的後台，讓團隊不需要改程式也能更新。",
              createdAt: timestamp,
              updatedAt: timestamp
            }
          ],
          createdAt: timestamp,
          updatedAt: timestamp,
          publishedAt: timestamp
        },
        {
          id: "sec_portfolio",
          pageId: "page_home",
          type: "portfolio",
          key: "portfolio",
          status: "published",
          sortOrder: 50,
          eyebrow: "Portfolio · AI product systems",
          title: "已驗證的 AI 產品與實作案例",
          body: "每個案例都能在後台調整標題、圖片、指標、技術標籤與產品細節頁。",
          items: [],
          createdAt: timestamp,
          updatedAt: timestamp,
          publishedAt: timestamp
        },
        {
          id: "sec_why",
          pageId: "page_home",
          type: "why-us",
          key: "why-us",
          status: "published",
          sortOrder: 60,
          eyebrow: "Why ALTOS LAB",
          title: "不是導入 AI，而是建立 AI 能力",
          items: [
            {
              id: "item_why_context",
              sectionId: "sec_why",
              status: "published",
              sortOrder: 10,
              title: "先理解流程，再決定模型",
              body: "先盤點決策、資料、權限與輸出格式，避免做出只能展示、不能營運的 AI 專案。",
              createdAt: timestamp,
              updatedAt: timestamp
            },
            {
              id: "item_why_measure",
              sectionId: "sec_why",
              status: "published",
              sortOrder: 20,
              title: "每個系統都有可衡量指標",
              body: "從回覆準確率、節省工時、轉換率到內容曝光，讓 AI 投資能被追蹤與優化。",
              createdAt: timestamp,
              updatedAt: timestamp
            },
            {
              id: "item_why_cms",
              sectionId: "sec_why",
              status: "published",
              sortOrder: 30,
              title: "交付後能由團隊持續管理",
              body: "後台、權限、內容更新與資料結構一起設計，避免每次改文案都回到工程師。",
              createdAt: timestamp,
              updatedAt: timestamp
            }
          ],
          createdAt: timestamp,
          updatedAt: timestamp,
          publishedAt: timestamp
        },
        {
          id: "sec_team",
          pageId: "page_home",
          type: "team",
          key: "team",
          status: "published",
          sortOrder: 70,
          eyebrow: "Team · Builders for AI operations",
          title: "小型高密度 AI 實作團隊",
          items: [
            {
              id: "item_team_strategy",
              sectionId: "sec_team",
              status: "published",
              sortOrder: 10,
              title: "AI Strategy",
              label: "Business",
              body: "把業務目標轉成可交付的 AI 路線圖、MVP 範圍與驗收指標。",
              createdAt: timestamp,
              updatedAt: timestamp
            },
            {
              id: "item_team_engineering",
              sectionId: "sec_team",
              status: "published",
              sortOrder: 20,
              title: "Product Engineering",
              label: "Build",
              body: "從資料層、API、前台到後台，把 AI 系統做成可部署產品。",
              createdAt: timestamp,
              updatedAt: timestamp
            },
            {
              id: "item_team_content",
              sectionId: "sec_team",
              status: "published",
              sortOrder: 30,
              title: "GEO Content Ops",
              label: "Growth",
              body: "建立面向搜尋與 AI 回答系統的內容生產、審稿與發佈流程。",
              createdAt: timestamp,
              updatedAt: timestamp
            }
          ],
          createdAt: timestamp,
          updatedAt: timestamp,
          publishedAt: timestamp
        },
        {
          id: "sec_blog",
          pageId: "page_home",
          type: "blog",
          key: "blog",
          status: "published",
          sortOrder: 80,
          eyebrow: "Insights · SEO / GEO",
          title: "AI 實作與 GEO 策略筆記",
          body: "後台可以產生 AI 主題草稿、編輯、審稿並發佈成可索引文章。",
          items: [],
          createdAt: timestamp,
          updatedAt: timestamp,
          publishedAt: timestamp
        },
        {
          id: "sec_contact",
          pageId: "page_home",
          type: "contact",
          key: "contact",
          status: "published",
          sortOrder: 90,
          eyebrow: "Contact · OPEN FOR NEW PROJECTS",
          title: "把你的 AI 想法變成可運作的系統",
          accentText: "START",
          body: "告訴我們你的產業、現有流程與想優先解決的問題。我們會回覆最適合的 MVP 範圍與下一步。",
          ctaPrimaryLabel: "送出需求",
          ctaPrimaryUrl: "mailto:hello@altoslab.com",
          items: [],
          settings: {
            email: "hello@altoslab.com",
            formEnabled: true,
            whoLabel: "公司 / 團隊 / 姓名",
            contactLabel: "Email / LINE / 電話",
            messageLabel: "想導入 AI 的場景"
          },
          createdAt: timestamp,
          updatedAt: timestamp,
          publishedAt: timestamp
        }
      ]
    }
  ],
  projects: [
    {
      id: "proj_wonda",
      slug: "wonda-ai",
      status: "published",
      sortOrder: 10,
      tag: "AI SaaS",
      title: "WonDa AI 智慧客服平台",
      titleEn: "WonDa AI Customer Service Platform",
      url: "https://wonda.ai",
      cover: "/wonda-cover.png",
      gallery: ["/wonda-cover.png", "/wonda-2.png", "/wonda-3.png"],
      desc: "可上傳企業知識、設定品牌語氣並嵌入網站的 AI 客服平台。",
      detail:
        "WonDa AI 將 FAQ、產品資料、服務政策與客服紀錄整理成可檢索知識庫，並透過管理後台追蹤回答品質與潛在客戶需求。",
      productPage: {
        heroTitle: "會成長的 AI 客服平台",
        heroSubtitle: "上傳知識、設定個性、嵌入網站。",
        heroBody: "讓客服 AI 從每次對話中學習，降低重複詢問並提升轉換。",
        primaryCtaLabel: "了解 WonDa AI",
        primaryCtaUrl: "https://wonda.ai",
        sections: [
          {
            id: "prod_wonda_section_knowledge",
            title: "企業知識轉 AI 回答",
            eyebrow: "Knowledge",
            body: "把產品、服務、政策與 SOP 統一成 AI 可引用的資料層。",
            image: "/wonda-2.png",
            sortOrder: 10
          }
        ]
      },
      metrics: [
        { label: "MVP 上線", value: "<30 min" },
        { label: "客服入口", value: "24/7" },
        { label: "知識更新", value: "No-code" }
      ],
      tech: ["RAG", "LLM", "Widget", "Knowledge Base"],
      createdAt: timestamp,
      updatedAt: timestamp,
      publishedAt: timestamp
    },
    {
      id: "proj_automation",
      slug: "workflow-automation",
      status: "published",
      sortOrder: 20,
      tag: "Workflow",
      title: "企業流程自動化平台",
      titleEn: "Enterprise Workflow Automation",
      cover: "/proj4-cover.png",
      gallery: ["/proj4-cover.png", "/proj4-2.png", "/proj4-3.png"],
      desc: "把表單、試算表、通知、審核與 CRM 任務串成可追蹤的 AI 自動化流程。",
      detail:
        "平台將跨工具的手動任務抽象成流程節點，搭配 AI 分類、摘要與建議動作，協助營運團隊降低重複操作。",
      productPage: {
        heroTitle: "讓 AI 處理重複營運流程",
        heroSubtitle: "表單、審核、通知、報表，一次串起來。",
        heroBody: "針對企業現有工具設計低摩擦的 AI 自動化工作流。",
        sections: []
      },
      metrics: [
        { label: "流程節點", value: "12+" },
        { label: "人工輸入", value: "-60%" },
        { label: "追蹤狀態", value: "Live" }
      ],
      tech: ["Automation", "CRM", "Webhooks", "Agent"],
      createdAt: timestamp,
      updatedAt: timestamp,
      publishedAt: timestamp
    },
    {
      id: "proj_geo",
      slug: "geo-hero",
      status: "published",
      sortOrder: 30,
      tag: "GEO Platform",
      title: "GEO Hero AI 能見度平台",
      titleEn: "GEO Hero Visibility Platform",
      cover: "/geo-cover.png",
      gallery: ["/geo-cover.png", "/geo-2.png", "/geo-3.png"],
      desc: "協助品牌監測生成式搜尋與 AI 回答中的曝光、引用與內容缺口。",
      detail:
        "GEO Hero 以主題集群、FAQ、結構化資料與搜尋結果監測為核心，讓企業知道 AI 回答如何描述自己與競品。",
      productPage: {
        heroTitle: "看見你的品牌在 AI 搜尋中的位置",
        heroSubtitle: "監測、產生內容、改善引用機會。",
        heroBody: "把 SEO 的基礎延伸到 AI Overviews、AI Mode 與 ChatGPT Search 的可發現性。",
        sections: []
      },
      metrics: [
        { label: "追蹤主題", value: "100+" },
        { label: "內容缺口", value: "Auto" },
        { label: "FAQ Schema", value: "Built-in" }
      ],
      tech: ["SEO", "GEO", "Schema.org", "Search Console"],
      createdAt: timestamp,
      updatedAt: timestamp,
      publishedAt: timestamp
    },
    {
      id: "proj_freelance",
      slug: "freelance-finder",
      status: "published",
      sortOrder: 40,
      tag: "Lead Mining",
      title: "接案雷達 Freelance Finder",
      titleEn: "Freelance Finder",
      cover: "/proj4-2.png",
      gallery: ["/proj4-2.png", "/proj4-3.png"],
      desc: "自動蒐集、分類與評分可合作案件，協助自由工作者與團隊更快找到機會。",
      detail:
        "系統整合資料抓取、AI 摘要、需求分類與通知流程，讓接案者能把時間放在判斷與提案。",
      productPage: {
        heroTitle: "把散落的案件變成可行動名單",
        heroSubtitle: "蒐集、摘要、評分、通知。",
        heroBody: "用 AI 協助接案者判斷案件是否值得投入。",
        sections: []
      },
      metrics: [
        { label: "資料來源", value: "Multi" },
        { label: "評分規則", value: "Custom" }
      ],
      tech: ["Crawler", "Scoring", "Notification"],
      createdAt: timestamp,
      updatedAt: timestamp,
      publishedAt: timestamp
    },
    {
      id: "proj_lobster",
      slug: "lobster-cloud",
      status: "published",
      sortOrder: 50,
      tag: "Private AI",
      title: "龍蝦雲 — 私人 AI 員工平台",
      titleEn: "Lobster Cloud Private AI Staff",
      cover: "/geo-2.png",
      gallery: ["/geo-2.png", "/geo-3.png"],
      desc: "替個人與小團隊建立可長期記憶任務、知識與偏好的私人 AI 工作台。",
      detail:
        "龍蝦雲聚焦長期上下文、個人工作流與任務協作，讓 AI 成為能延續工作記憶的私人員工。",
      productPage: {
        heroTitle: "替你的團隊配置私人 AI 員工",
        heroSubtitle: "記得上下文、理解流程、持續執行。",
        heroBody: "從個人助理到團隊任務管理，建立可信任的 AI 工作夥伴。",
        sections: []
      },
      metrics: [
        { label: "工作記憶", value: "Persistent" },
        { label: "任務模式", value: "Agentic" }
      ],
      tech: ["Memory", "Agent", "Workspace"],
      createdAt: timestamp,
      updatedAt: timestamp,
      publishedAt: timestamp
    },
    {
      id: "proj_voice",
      slug: "voice-ai-assistant",
      status: "published",
      sortOrder: 60,
      tag: "Voice AI",
      title: "即時語音 AI 助理平台",
      titleEn: "Realtime Voice AI Assistant",
      cover: "/wonda-3.png",
      gallery: ["/wonda-3.png", "/wonda-2.png"],
      desc: "讓使用者用語音與 AI 對話，完成查詢、摘要、客服與任務觸發。",
      detail:
        "平台設計低延遲語音互動、對話狀態管理與任務執行接口，適合客服、教育與現場作業情境。",
      productPage: {
        heroTitle: "低延遲語音 AI 互動",
        heroSubtitle: "說話、理解、執行。",
        heroBody: "把語音入口接到企業知識庫與任務流程。",
        sections: []
      },
      metrics: [
        { label: "互動模式", value: "Realtime" },
        { label: "場景", value: "Voice-first" }
      ],
      tech: ["Speech", "Realtime", "Tool Calling"],
      createdAt: timestamp,
      updatedAt: timestamp,
      publishedAt: timestamp
    }
  ],
  blogPosts: [
    {
      id: "post_geo_ai_visibility",
      slug: "geo-ai-search-visibility-guide",
      status: "published",
      sortOrder: 10,
      title: "GEO 是什麼？企業如何讓 AI 搜尋更容易引用你的網站",
      seoTitle: "GEO 是什麼？AI 搜尋能見度與企業官網內容架構指南",
      seoDescription:
        "GEO 不是取代 SEO，而是把可索引、可信任、結構清楚的內容延伸到 AI Overviews、AI Mode 與 ChatGPT Search。",
      excerpt:
        "GEO 的核心不是投機技巧，而是讓你的服務、案例、FAQ 與專業觀點以搜尋引擎和 AI 系統都能理解的方式公開呈現。",
      topic: "GEO for AI search",
      audience: "想提升 AI 搜尋曝光的 B2B 企業主與行銷負責人",
      geoSummary:
        "GEO 應建立在 SEO 基礎上：可爬取、可索引、文本清楚、內部連結完整、結構化資料與 FAQ 對齊頁面可見內容。",
      body:
        "## GEO 不是另一套神秘規則\nGEO（Generative Engine Optimization）常被描述成 AI 搜尋優化，但實務上它仍然依賴基本 SEO：搜尋引擎要能爬取、索引並理解你的頁面，AI 搜尋才有機會把你的內容當成支援資料。\n\n## 企業官網要先回答清楚問題\n如果網站只寫「我們提供 AI 解決方案」，AI 系統很難判斷你到底能協助什麼。更好的做法是把服務拆成具體情境，例如 AI 客服、AI Agent、流程自動化、知識庫、GEO 內容系統，並在每個頁面回答目標客戶會問的問題。\n\n## 內容要可引用\nAI 回答系統偏好清楚、具體、可驗證的段落。官網應該有案例、流程、FAQ、限制條件、比較表與明確的服務描述，而不是只有抽象標語。\n\n## 後台讓 GEO 可以持續運作\nGEO 不是一次性專案。當市場、服務與客戶問題改變，團隊需要能在後台快速新增文章、更新 FAQ、調整案例與發佈新內容。",
      keyTakeaways: [
        "GEO 以 SEO 基礎為前提，不需要把官網做成另一種特殊 AI 檔案。",
        "文章、FAQ、案例和服務頁都應該用可引用的文本回答真實問題。",
        "後台 CMS 能讓團隊持續產出、審稿與更新 AI 相關內容。"
      ],
      faqs: [
        {
          question: "GEO 和 SEO 有什麼差異？",
          answer:
            "GEO 聚焦生成式 AI 回答中的可發現性與被引用機會，但它仍建立在 SEO 的可爬取、可索引、內容品質、內部連結與結構化資料基礎上。"
        },
        {
          question: "企業需要為 AI 搜尋新增特殊 schema 嗎？",
          answer:
            "目前沒有通用的 AI 搜尋專用 schema。比較穩健的做法是讓 Article、FAQ、Organization、Breadcrumb 等結構化資料與頁面可見內容一致。"
        }
      ],
      tags: ["GEO", "SEO", "AI 搜尋", "AI Overviews"],
      author: "ALTOS LAB",
      cover: "/geo-cover.png",
      createdAt: timestamp,
      updatedAt: timestamp,
      publishedAt: timestamp,
      generatedAt: timestamp,
      generatedBy: "seed"
    }
  ],
  contactLeads: [],
  assets: [
    {
      id: "asset_wonda_cover",
      url: "/wonda-cover.png",
      folder: "projects/wonda-ai",
      filename: "wonda-cover.png",
      mimeType: "image/png",
      createdAt: timestamp,
      updatedAt: timestamp
    },
    {
      id: "asset_geo_cover",
      url: "/geo-cover.png",
      folder: "projects/geo-hero",
      filename: "geo-cover.png",
      mimeType: "image/png",
      createdAt: timestamp,
      updatedAt: timestamp
    },
    {
      id: "asset_proj4_cover",
      url: "/proj4-cover.png",
      folder: "projects/workflow",
      filename: "proj4-cover.png",
      mimeType: "image/png",
      createdAt: timestamp,
      updatedAt: timestamp
    }
  ]
};

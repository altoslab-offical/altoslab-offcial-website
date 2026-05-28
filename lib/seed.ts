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
          eyebrow: "About · 關於我們",
          title: "We Build",
          accentText: "Intelligence.",
          body:
            "ALTOS LAB 擁有一支經驗豐富的跨領域團隊，深耕互聯網產品開發與 AI 系統整合，深度參與過多個大型平台從 0 到 1 的完整建構過程。",
          items: [
            {
              id: "item_about_systems",
              sectionId: "sec_about",
              status: "published",
              sortOrder: 10,
              body:
                "我們將前沿的 AI 技術與深厚的系統整合能力結合，為各類企業提供從策略規劃到落地部署的完整 AI 解決方案，幫助客戶在智能化浪潮中建立真實競爭優勢。",
              createdAt: timestamp,
              updatedAt: timestamp
            },
            {
              id: "item_about_note",
              sectionId: "sec_about",
              status: "published",
              sortOrder: 20,
              body: "From internet infrastructure to agentic AI — we've built it, shipped it, scaled it.",
              createdAt: timestamp,
              updatedAt: timestamp
            }
          ],
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
          eyebrow: "Journal · AI Lab Notes",
          title: "AI 實驗室筆記與研究出版",
          body: "後台可以產生 AI 產品、Agent、自動化、SEO/GEO 與市場趨勢草稿，經品質審核後發布成可搜尋、可引用的實驗室知識。",
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
          eyebrow: "Contact · 聯絡我們",
          title: "Let's Build",
          accentText: "Together.",
          body: "告訴我們你的產業、現有流程與想優先解決的問題。我們會回覆最適合的 MVP 範圍與下一步。",
          ctaPrimaryLabel: "送出合作需求",
          ctaPrimaryUrl: "mailto:hello@altoslab.ai",
          items: [],
          settings: {
            email: "hello@altoslab.ai",
            formEnabled: true,
            whoLabel: "我們是誰",
            contactLabel: "聯絡方式",
            messageLabel: "希望有什麼可以協助的"
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
      url: "https://wonda-web-972183966257.asia-east1.run.app/",
      cover: "/wonda-cover.png",
      gallery: ["/wonda-official-01.png", "/wonda-official-02.png", "/wonda-official-03.png"],
      desc: "可上傳企業知識、設定品牌語氣並嵌入網站的 AI 客服平台。",
      detail:
        "WonDa AI 將 FAQ、產品資料、服務政策與客服紀錄整理成可檢索知識庫，並透過管理後台追蹤回答品質與潛在客戶需求。",
      productPage: {
        heroTitle: "會成長的 AI 客服平台",
        heroSubtitle: "上傳知識、設定個性、嵌入網站。",
        heroBody: "讓客服 AI 從每次對話中學習，降低重複詢問並提升轉換。",
        primaryCtaLabel: "了解 WonDa AI",
        primaryCtaUrl: "https://wonda-web-972183966257.asia-east1.run.app/",
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
      cover: "/orclaw-cover.png",
      gallery: ["/orclaw-cover.png", "/geo-3.png"],
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
    },
    {
      id: "proj_newsletter",
      slug: "ai-work-newsletter",
      status: "published",
      sortOrder: 70,
      tag: "Newsletter",
      title: "AltosLab AI 工作情報電子報平台",
      titleEn: "AltosLab AI Work Intelligence Newsletter",
      url: "https://linear-hypothetical-melissa-lease.trycloudflare.com/",
      cover: "/project-newsletter-cover.png",
      gallery: ["/project-newsletter-cover.png"],
      desc: "每天 5 分鐘，把 AI 變化翻成工作判斷的電子報平台。",
      detail:
        "平台以 AI 趨勢整理、工作應用拆解與可執行觀點為核心，協助讀者快速理解最新工具、產品更新與實務導入方向。",
      productPage: {
        heroTitle: "每天 5 分鐘的 AI 工作情報",
        heroSubtitle: "把 AI 變化翻成工作判斷。",
        heroBody: "整理 AI 產業變化、工具更新與實作觀點，讓內容成為可持續營運的知識入口。",
        primaryCtaLabel: "查看電子報",
        primaryCtaUrl: "https://linear-hypothetical-melissa-lease.trycloudflare.com/",
        sections: []
      },
      metrics: [
        { label: "閱讀節奏", value: "5 min" },
        { label: "內容主題", value: "AI Work" },
        { label: "發佈型態", value: "Newsletter" }
      ],
      tech: ["Newsletter", "Content CMS", "AI Curation", "Next.js"],
      createdAt: timestamp,
      updatedAt: timestamp,
      publishedAt: timestamp
    },
    {
      id: "proj_eternal_line",
      slug: "eternal-line",
      status: "published",
      sortOrder: 80,
      tag: "Care AI",
      title: "Eternal Line — 紀念親人聊天與照護系統",
      titleEn: "Eternal Line Memorial Chat and Care System",
      url: "https://eternal-line-195010457818.asia-east1.run.app/",
      cover: "/project-eternal-cover.png",
      gallery: ["/project-eternal-cover.png"],
      desc: "上傳已故家人的對話記錄與語音，讓 AI 延續珍貴的溫度，透過 LINE 持續連結。",
      detail:
        "系統支援紀念與照護兩種情境，將家人的對話、語音與個人記憶整理成可互動的 AI 角色，並透過 LINE Bot 降低使用門檻。",
      productPage: {
        heroTitle: "讓思念與照護持續在線",
        heroSubtitle: "紀念、陪伴、提醒與家庭連結。",
        heroBody: "把重要的記憶、語音與關懷流程轉成可長期互動的 LINE AI 系統。",
        primaryCtaLabel: "查看 Eternal Line",
        primaryCtaUrl: "https://eternal-line-195010457818.asia-east1.run.app/",
        sections: []
      },
      metrics: [
        { label: "互動入口", value: "LINE" },
        { label: "資料類型", value: "對話 / 語音" },
        { label: "使用模式", value: "紀念 / 照護" }
      ],
      tech: ["LINE Bot", "Memory AI", "RAG", "Care Workflow", "Google Cloud Run"],
      createdAt: timestamp,
      updatedAt: timestamp,
      publishedAt: timestamp
    },
    {
      id: "proj_fortune_master",
      slug: "ai-fortune-master",
      status: "published",
      sortOrder: 90,
      tag: "AI Fortune",
      title: "玄衡命理館 — AI 算命大師",
      titleEn: "AI Fortune Master",
      url: "https://ai-fortune-master-982174173287.asia-east1.run.app/?manual-prod-00018=1",
      cover: "/project-fortune-cover.png",
      gallery: ["/project-fortune-cover.png"],
      desc: "結合命理問答、占卜流程與 AI 對話的線上算命體驗。",
      detail:
        "產品將命理服務拆成清楚的使用流程，透過 AI 對話協助使用者描述問題、取得初步解析，並保留後續真人服務或付費升級的延伸空間。",
      productPage: {
        heroTitle: "線上 AI 命理互動體驗",
        heroSubtitle: "問事、解析、引導下一步。",
        heroBody: "以對話式體驗承接使用者問題，讓傳統命理服務更容易在線上被理解與使用。",
        primaryCtaLabel: "查看算命大師",
        primaryCtaUrl: "https://ai-fortune-master-982174173287.asia-east1.run.app/?manual-prod-00018=1",
        sections: []
      },
      metrics: [
        { label: "服務模式", value: "線上問事" },
        { label: "互動方式", value: "AI 對話" },
        { label: "產品類型", value: "命理諮詢" }
      ],
      tech: ["LLM", "Conversation UX", "Prompt Flow", "Google Cloud Run"],
      createdAt: timestamp,
      updatedAt: timestamp,
      publishedAt: timestamp
    },
    {
      id: "proj_koibito",
      slug: "koibito-dating",
      status: "published",
      sortOrder: 100,
      tag: "Dating",
      title: "Koibito 約會平台",
      titleEn: "Koibito Dating Platform",
      url: "https://koibito-dating.vercel.app/",
      cover: "/korbito-cover.png",
      gallery: [
        "/koibito-dating-01.png",
        "/koibito-dating-02.png",
        "/koibito-dating-03.png",
        "/koibito-dating-04.png"
      ],
      desc: "結合探索、個人檔案、私密內容、禮物與聊天的約會產品體驗。",
      detail:
        "Koibito 以探索與個人檔案為核心，搭配私密內容、禮物互動與聊天流程，建立可延伸會員、內容與社交互動的 dating product experience。",
      productPage: {
        heroTitle: "更完整的約會產品體驗",
        heroSubtitle: "探索、檔案、聊天、禮物與私密內容。",
        heroBody: "從使用者探索到互動轉換，建立可持續擴充的 dating platform。",
        primaryCtaLabel: "查看 Koibito",
        primaryCtaUrl: "https://koibito-dating.vercel.app/",
        sections: []
      },
      metrics: [
        { label: "核心功能", value: "配對 / 聊天" },
        { label: "互動內容", value: "禮物 / 私密" },
        { label: "體驗方向", value: "Mobile-first" }
      ],
      tech: ["Next.js", "Profile System", "Chat", "Gift Flow", "Vercel"],
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
      language: "zh-Hant",
      translationGroupId: "tg_geo_ai_visibility_seed",
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
      sourceLinks: [
        {
          title: "Google Search Central：建立實用、以人為本的內容",
          url: "https://developers.google.com/search/docs/fundamentals/creating-helpful-content",
          publisher: "Google Search Central"
        },
        {
          title: "Google Search Central：結構化資料簡介",
          url: "https://developers.google.com/search/docs/appearance/structured-data/intro-structured-data",
          publisher: "Google Search Central"
        }
      ],
      tags: ["GEO", "SEO", "AI 搜尋", "AI Overviews"],
      author: "ALTOS LAB",
      cover: "/geo-cover.png",
      coverAlt: "GEO Hero AI 搜尋能見度產品介面截圖",
      readTimeMinutes: 3,
      featured: true,
      reviewStatus: "approved",
      qualityChecks: {
        hasHumanReview: true,
        hasQualityReviewerApproval: false,
        hasVisibleSources: true,
        hasNoFabricatedClaims: true,
        hasSearchIntentAnswer: true,
        hasBilingualParity: true,
        notes: "Seed article reviewed as the first bilingual blog example."
      },
      aiDisclosure: "這篇文章為 ALTOS LAB 官網種子內容，未自動發布 AI 草稿。",
      createdAt: timestamp,
      updatedAt: timestamp,
      publishedAt: timestamp,
      generatedAt: timestamp,
      generatedBy: "seed"
    },
    {
      id: "post_geo_ai_visibility_en",
      slug: "geo-ai-search-visibility-guide",
      status: "published",
      sortOrder: 11,
      language: "en",
      translationGroupId: "tg_geo_ai_visibility_seed",
      title: "What is GEO? How companies can make AI search more likely to cite their website",
      seoTitle: "What is GEO? AI Search Visibility and Company Website Content Architecture",
      seoDescription:
        "GEO does not replace SEO. It extends crawlable, trustworthy and structured content into AI Overviews, AI Mode and ChatGPT Search.",
      excerpt:
        "The core of GEO is not a trick. It is making services, cases, FAQs and expert points of view public in a way search engines and AI systems can understand.",
      topic: "GEO for AI search",
      audience: "B2B founders and marketing leaders who want better AI search visibility",
      geoSummary:
        "GEO should build on SEO foundations: crawlable pages, indexable text, clear explanations, internal links, structured data and FAQ content aligned with visible page copy.",
      body:
        "## GEO is not a mysterious second rulebook\nGEO, or Generative Engine Optimization, is often described as AI search optimization. In practice, it still depends on SEO basics: search engines need to crawl, index and understand your pages before AI search can cite them as supporting material.\n\n## A company website must answer clear questions\nIf a site only says \"we provide AI solutions,\" AI systems have little context for what the company can actually help with. A better approach is to break services into specific situations, such as AI customer service, AI agents, workflow automation, knowledge bases and GEO content systems, then answer the questions buyers actually ask.\n\n## Content must be citable\nAI answer systems prefer clear, concrete and verifiable passages. A company website should include cases, process explanations, FAQs, constraints, comparison tables and precise service descriptions instead of only abstract slogans.\n\n## A CMS makes GEO sustainable\nGEO is not a one-time project. As markets, services and customer questions change, the team needs a CMS to add articles, update FAQs, refine cases and publish new content quickly.",
      keyTakeaways: [
        "GEO builds on SEO foundations and does not require turning the website into a special AI-only file.",
        "Articles, FAQs, cases and service pages should answer real questions in citable text.",
        "A CMS helps the team keep producing, reviewing and updating AI-related content."
      ],
      faqs: [
        {
          question: "How is GEO different from SEO?",
          answer:
            "GEO focuses on discoverability and citation opportunities inside generative AI answers, but it still depends on SEO foundations like crawlability, indexability, content quality, internal links and structured data."
        },
        {
          question: "Do companies need special schema for AI search?",
          answer:
            "There is no universal AI-search-specific schema today. A stable approach is to keep Article, FAQ, Organization and Breadcrumb structured data aligned with visible page content."
        }
      ],
      sourceLinks: [
        {
          title: "Google Search Central: Creating helpful, people-first content",
          url: "https://developers.google.com/search/docs/fundamentals/creating-helpful-content",
          publisher: "Google Search Central"
        },
        {
          title: "Google Search Central: Structured data introduction",
          url: "https://developers.google.com/search/docs/appearance/structured-data/intro-structured-data",
          publisher: "Google Search Central"
        }
      ],
      tags: ["GEO", "SEO", "AI search", "AI Overviews"],
      author: "ALTOS LAB",
      cover: "/geo-cover.png",
      coverAlt: "GEO Hero AI search visibility product interface screenshot",
      readTimeMinutes: 3,
      featured: true,
      reviewStatus: "approved",
      qualityChecks: {
        hasHumanReview: true,
        hasQualityReviewerApproval: false,
        hasVisibleSources: true,
        hasNoFabricatedClaims: true,
        hasSearchIntentAnswer: true,
        hasBilingualParity: true,
        notes: "Seed article reviewed as the first bilingual blog example."
      },
      aiDisclosure: "This is seed website content for ALTOS LAB, not an automatically published AI draft.",
      createdAt: timestamp,
      updatedAt: timestamp,
      publishedAt: timestamp,
      generatedAt: timestamp,
      generatedBy: "seed"
    },
    {
      id: "post_mock_ai_product_mvp",
      slug: "mock-ai-product-mvp-playbook",
      status: "published",
      sortOrder: 20,
      language: "zh-Hant",
      translationGroupId: "tg_mock_ai_product_mvp",
      title: "測試文章：AI 產品 MVP 要先驗證哪三件事",
      seoTitle: "AI 產品 MVP 驗證流程測試文章",
      seoDescription: "測試用文章，用來檢查 ALTOS LAB Blog 的列表、分類與卡片版型。",
      excerpt: "在真正投入開發前，先確認使用情境、資料來源與可交付的最小價值，讓 AI 產品不是只停在 demo。",
      topic: "AI Products",
      audience: "準備啟動 AI 產品的團隊",
      geoSummary: "AI MVP 應先驗證使用者情境、資料可用性與交付路徑，再擴大到完整後台與自動化。",
      body:
        "## 先驗證情境\n這是測試文章，用來檢查 Blog 列表版型。AI 產品的第一步不是堆功能，而是找到使用者每天會重複遇到的問題。\n\n## 再確認資料\n資料能不能取得、能不能更新、權限怎麼管理，會直接決定產品能不能長期運作。\n\n## 最後定義交付\nMVP 應該讓使用者完成一個清楚任務，而不是展示所有可能性。",
      keyTakeaways: ["先定義使用情境", "確認資料來源與權限", "把 MVP 收斂到一個可交付任務"],
      faqs: [],
      sourceLinks: [],
      tags: ["AI Products", "MVP", "Product Strategy"],
      author: "ALTOS LAB",
      cover: "/wonda-cover.png",
      coverAlt: "Wonda AI cover image",
      readTimeMinutes: 4,
      featured: false,
      reviewStatus: "approved",
      qualityChecks: {
        hasHumanReview: true,
        hasQualityReviewerApproval: false,
        hasVisibleSources: true,
        hasNoFabricatedClaims: true,
        hasSearchIntentAnswer: true,
        hasBilingualParity: true,
        notes: "Mock post for layout preview."
      },
      aiDisclosure: "這是版型預覽用測試文章。",
      createdAt: timestamp,
      updatedAt: timestamp,
      publishedAt: timestamp,
      generatedAt: timestamp,
      generatedBy: "seed"
    },
    {
      id: "post_mock_agent_workflow",
      slug: "mock-agent-workflow-automation",
      status: "published",
      sortOrder: 30,
      language: "zh-Hant",
      translationGroupId: "tg_mock_agent_workflow",
      title: "測試文章：把重複工作交給 AI Agent 前要整理什麼",
      seoTitle: "AI Agent 工作流整理測試文章",
      seoDescription: "測試用文章，用來檢查 Blog 的兩欄卡片與分類狀態。",
      excerpt: "Agent 專案不是先選模型，而是先把任務、權限、例外狀況與人工審核節點整理成可以被系統接住的流程。",
      topic: "Agents & Automation",
      audience: "想導入 AI Agent 的營運與技術團隊",
      geoSummary: "導入 AI Agent 前，應把任務邊界、工具權限、失敗處理與人工審核節點整理清楚。",
      body:
        "## 任務要可被描述\n這是測試文章，用來檢查 Blog 版型。Agent 最適合處理有明確輸入、輸出與判斷標準的任務。\n\n## 權限要分級\n不是每個工具都應該讓 Agent 直接執行，重要操作應保留人工確認。\n\n## 例外要有路徑\n當資料不足或判斷不確定，系統要知道什麼時候停下來。",
      keyTakeaways: ["整理任務邊界", "設定工具權限", "保留人工審核節點"],
      faqs: [],
      sourceLinks: [],
      tags: ["Agents & Automation", "Workflow", "AI Agent"],
      author: "ALTOS LAB",
      cover: "/orclaw-cover.png",
      coverAlt: "OpenCloud cover image",
      readTimeMinutes: 5,
      featured: false,
      reviewStatus: "approved",
      qualityChecks: {
        hasHumanReview: true,
        hasQualityReviewerApproval: false,
        hasVisibleSources: true,
        hasNoFabricatedClaims: true,
        hasSearchIntentAnswer: true,
        hasBilingualParity: true,
        notes: "Mock post for layout preview."
      },
      aiDisclosure: "這是版型預覽用測試文章。",
      createdAt: timestamp,
      updatedAt: timestamp,
      publishedAt: timestamp,
      generatedAt: timestamp,
      generatedBy: "seed"
    },
    {
      id: "post_mock_cms_blog_ops",
      slug: "mock-cms-blog-operations",
      status: "published",
      sortOrder: 40,
      language: "zh-Hant",
      translationGroupId: "tg_mock_cms_blog_ops",
      title: "測試文章：內容後台要怎麼支援長期營運",
      seoTitle: "內容後台與 Blog 營運測試文章",
      seoDescription: "測試用文章，用來檢查文章列表的摘要、作者與圖片比例。",
      excerpt: "好的內容後台不是只有新增文章，也要能管理草稿、審核狀態、來源、SEO 欄位與多語版本。",
      topic: "Build Notes",
      audience: "需要長期經營內容的品牌與產品團隊",
      geoSummary: "內容 CMS 應支援草稿、審核、來源、SEO、多語與發佈狀態，讓內容維護變成日常流程。",
      body:
        "## 後台要支援流程\n這是測試文章，用來檢查 Blog 版型。內容不是一次寫完，而是會不斷更新、審核與重發佈。\n\n## 欄位要對齊 SEO\n標題、描述、slug、來源與 FAQ 都應該在後台可管理。\n\n## 多語要能追蹤\n中英文內容最好有同一組 translation group，避免版本分岔。",
      keyTakeaways: ["內容需要審核流程", "SEO 欄位要可管理", "多語版本要能追蹤"],
      faqs: [],
      sourceLinks: [],
      tags: ["Build Notes", "CMS", "Content Ops"],
      author: "ALTOS LAB",
      cover: "/project-newsletter-cover.png",
      coverAlt: "Newsletter platform cover image",
      readTimeMinutes: 4,
      featured: false,
      reviewStatus: "approved",
      qualityChecks: {
        hasHumanReview: true,
        hasQualityReviewerApproval: false,
        hasVisibleSources: true,
        hasNoFabricatedClaims: true,
        hasSearchIntentAnswer: true,
        hasBilingualParity: true,
        notes: "Mock post for layout preview."
      },
      aiDisclosure: "這是版型預覽用測試文章。",
      createdAt: timestamp,
      updatedAt: timestamp,
      publishedAt: timestamp,
      generatedAt: timestamp,
      generatedBy: "seed"
    },
    {
      id: "post_mock_geo_content_map",
      slug: "mock-geo-content-map",
      status: "published",
      sortOrder: 50,
      language: "zh-Hant",
      translationGroupId: "tg_mock_geo_content_map",
      title: "測試文章：讓 AI 搜尋看懂服務頁的內容地圖",
      seoTitle: "GEO 內容地圖測試文章",
      seoDescription: "測試用文章，用來檢查 Blog 分類與卡片資訊層級。",
      excerpt: "服務頁、案例、FAQ 與 Blog 應該彼此連接，讓搜尋引擎和 AI 回答系統更容易理解品牌能解決什麼問題。",
      topic: "Search & GEO",
      audience: "想整理官網內容架構的 B2B 團隊",
      geoSummary: "GEO 內容地圖應把服務頁、案例、FAQ 與文章連成同一套可引用的知識結構。",
      body:
        "## 內容要互相支援\n這是測試文章，用來檢查 Blog 版型。服務頁回答你能做什麼，案例證明你怎麼做，Blog 補充判斷觀點。\n\n## FAQ 要在頁面可見\n結構化資料最好對齊使用者真的看得到的內容。\n\n## 內部連結是路徑\n清楚的內部連結能幫助搜尋系統理解主題關係。",
      keyTakeaways: ["服務頁、案例與文章要串起來", "FAQ 要對齊可見內容", "內部連結要有主題邏輯"],
      faqs: [],
      sourceLinks: [],
      tags: ["Search & GEO", "GEO", "SEO"],
      author: "ALTOS LAB",
      cover: "/geo-cover.png",
      coverAlt: "GEO product cover image",
      readTimeMinutes: 3,
      featured: false,
      reviewStatus: "approved",
      qualityChecks: {
        hasHumanReview: true,
        hasQualityReviewerApproval: false,
        hasVisibleSources: true,
        hasNoFabricatedClaims: true,
        hasSearchIntentAnswer: true,
        hasBilingualParity: true,
        notes: "Mock post for layout preview."
      },
      aiDisclosure: "這是版型預覽用測試文章。",
      createdAt: timestamp,
      updatedAt: timestamp,
      publishedAt: timestamp,
      generatedAt: timestamp,
      generatedBy: "seed"
    },
    {
      id: "post_mock_product_story",
      slug: "mock-product-story-from-demo-to-system",
      status: "published",
      sortOrder: 60,
      language: "zh-Hant",
      translationGroupId: "tg_mock_product_story",
      title: "測試文章：從 Demo 到可維護系統的產品筆記",
      seoTitle: "從 Demo 到可維護系統測試文章",
      seoDescription: "測試用文章，用來確認 Blog 卡片在多篇內容下的排列。",
      excerpt: "AI demo 可以很快做出來，但要變成可靠產品，還需要資料維護、權限、監控、後台與交付節奏。",
      topic: "Product Systems",
      audience: "想把 AI demo 產品化的團隊",
      geoSummary: "AI demo 產品化時，需要補上資料維護、權限、監控、後台與交付節奏，才能長期運作。",
      body:
        "## Demo 不是終點\n這是測試文章，用來檢查 Blog 版型。Demo 證明方向，但產品要能被團隊維護。\n\n## 系統要有後台\n資料、專案、文章、聯絡需求都應該可以在後台更新。\n\n## 交付要可迭代\n好的系統會保留下一階段擴充空間。",
      keyTakeaways: ["Demo 之後要補維護機制", "後台是產品化關鍵", "交付節奏要能迭代"],
      faqs: [],
      sourceLinks: [],
      tags: ["AI Products", "Build Notes", "System Design"],
      author: "ALTOS LAB",
      cover: "/korbito-cover.png",
      coverAlt: "Koibito platform cover image",
      readTimeMinutes: 4,
      featured: false,
      reviewStatus: "approved",
      qualityChecks: {
        hasHumanReview: true,
        hasQualityReviewerApproval: false,
        hasVisibleSources: true,
        hasNoFabricatedClaims: true,
        hasSearchIntentAnswer: true,
        hasBilingualParity: true,
        notes: "Mock post for layout preview."
      },
      aiDisclosure: "這是版型預覽用測試文章。",
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
      id: "asset_wonda_official_02",
      url: "/wonda-official-02.png",
      folder: "projects/wonda-ai",
      filename: "wonda-official-02.png",
      mimeType: "image/png",
      createdAt: timestamp,
      updatedAt: timestamp
    },
    {
      id: "asset_wonda_official_03",
      url: "/wonda-official-03.png",
      folder: "projects/wonda-ai",
      filename: "wonda-official-03.png",
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
      id: "asset_orclaw_cover",
      url: "/orclaw-cover.png",
      folder: "projects/lobster-cloud",
      filename: "orclaw-cover.png",
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
    },
    {
      id: "asset_project_newsletter_cover",
      url: "/project-newsletter-cover.png",
      folder: "projects/ai-work-newsletter",
      filename: "project-newsletter-cover.png",
      mimeType: "image/png",
      createdAt: timestamp,
      updatedAt: timestamp
    },
    {
      id: "asset_project_eternal_cover",
      url: "/project-eternal-cover.png",
      folder: "projects/eternal-line",
      filename: "project-eternal-cover.png",
      mimeType: "image/png",
      createdAt: timestamp,
      updatedAt: timestamp
    },
    {
      id: "asset_project_fortune_cover",
      url: "/project-fortune-cover.png",
      folder: "projects/ai-fortune-master",
      filename: "project-fortune-cover.png",
      mimeType: "image/png",
      createdAt: timestamp,
      updatedAt: timestamp
    },
    {
      id: "asset_project_koibito_cover",
      url: "/korbito-cover.png",
      folder: "projects/koibito-dating",
      filename: "korbito-cover.png",
      mimeType: "image/png",
      createdAt: timestamp,
      updatedAt: timestamp
    },
    {
      id: "asset_koibito_dating_01",
      url: "/koibito-dating-01.png",
      folder: "projects/koibito-dating",
      filename: "koibito-dating-01.png",
      mimeType: "image/png",
      createdAt: timestamp,
      updatedAt: timestamp
    },
    {
      id: "asset_koibito_dating_02",
      url: "/koibito-dating-02.png",
      folder: "projects/koibito-dating",
      filename: "koibito-dating-02.png",
      mimeType: "image/png",
      createdAt: timestamp,
      updatedAt: timestamp
    },
    {
      id: "asset_koibito_dating_03",
      url: "/koibito-dating-03.png",
      folder: "projects/koibito-dating",
      filename: "koibito-dating-03.png",
      mimeType: "image/png",
      createdAt: timestamp,
      updatedAt: timestamp
    },
    {
      id: "asset_koibito_dating_04",
      url: "/koibito-dating-04.png",
      folder: "projects/koibito-dating",
      filename: "koibito-dating-04.png",
      mimeType: "image/png",
      createdAt: timestamp,
      updatedAt: timestamp
    }
  ]
};

import type { CmsData } from "./types";
import { marketBlogPosts } from "./market-blog-seed";

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
  blogPosts: marketBlogPosts,
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

# ALTOS LAB Website Admin SPEC

Version: 0.2
Owner: ALTOS LAB
Scope: Official website full CMS/admin management

## Goal

ALTOS LAB needs a website admin interface where every public website page section and every portfolio/product item can be created, updated, reordered, published, archived, deleted, and displayed on the public website without editing the built `index.html` bundle manually.

The public website should read all published page content from an API. The admin interface should manage the same content through authenticated CRUD endpoints.

The contact section should also support collecting cooperation inquiries. In the temporary static version, the form can open a `mailto:` message. In the backend version, it should create a contact lead record.

## Full CMS Requirement

The whole one-page website must be manageable from the admin backend. No public website copy, section title, portfolio item, product detail content, image, metric, tech tag, CTA, YouTube embed, or contact form setting should remain permanently hard-coded in the frontend.

Admin users must be able to:

- Create, edit, delete, archive, publish, and reorder page sections.
- Create, edit, delete, archive, publish, and reorder portfolio/product projects.
- Add, edit, delete, and reorder repeated items inside a section, such as stats, service rows, team cards, portfolio cards, metrics, tech tags, gallery images, and product detail sections.
- Upload, replace, delete, and reorder media assets.
- Preview draft content before publishing.
- Save incomplete drafts without exposing them on the public website.
- Publish only valid content to the public API.
- Roll back or restore archived content where possible.

Deletion rules:

- Prefer soft delete or archive for business content.
- Hard delete can be supported for drafts, mistakenly created items, and unused media.
- Hard delete of published content should require confirmation in the admin UI.

Public website rendering rule:

- Public users only see `published` pages, sections, projects, and section items.
- Draft, archived, and deleted records must never be returned by public APIs.

## Current State

The current website is a static built artifact:

- Main public site: `index.html`
- Duplicate built copies: `altoslab-website.html`, `public/index.html`
- Portfolio data is currently hard-coded inside the bundled JavaScript as `rp=[...]`
- Project images are in `public/`
- Brand/design rules are documented in `DESIGN.md` and `design/`

This means backend integration should not be done directly inside the current minified bundle. The recommended next step is to rebuild the source app and move project data into a clean data layer.

## Recommended Stack Boundary

Frontend/design owner:

- Public website UI
- Admin UI
- Data model TypeScript types
- API client wrapper
- Loading, empty, error, and preview states

Backend owner:

- Database schema
- Authentication and authorization
- CRUD API
- Image upload/storage
- Audit timestamps
- Deployment secrets and environment variables

## Core Entity: Project

```ts
type ProjectStatus = "draft" | "published" | "archived";

type ProjectMetric = {
  label: string;
  value: string;
};

type Project = {
  id: string;
  slug: string;
  status: ProjectStatus;
  sortOrder: number;

  tag: string;
  title: string;
  titleEn: string;
  url?: string;
  youtubeUrl?: string;

  cover: string;
  gallery: string[];

  desc: string;
  detail: string;
  productPage: ProductPageContent;
  metrics: ProjectMetric[];
  tech: string[];

  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
};

type ProductPageContent = {
  heroTitle: string;
  heroSubtitle?: string;
  heroBody?: string;
  primaryCtaLabel?: string;
  primaryCtaUrl?: string;
  secondaryCtaLabel?: string;
  secondaryCtaUrl?: string;
  youtubeUrl?: string;
  sections: ProductContentSection[];
};

type ProductContentSection = {
  id: string;
  title: string;
  eyebrow?: string;
  body: string;
  image?: string;
  sortOrder: number;
};
```

## Core Entity: Page Content

The website is currently one long page, but the model should support multiple pages later. For now, create one page with `slug = "home"`.

```ts
type PublishStatus = "draft" | "published" | "archived" | "deleted";

type SitePage = {
  id: string;
  slug: string; // "home"
  status: PublishStatus;
  title: string;
  seoTitle?: string;
  seoDescription?: string;
  sections: PageSection[];
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
};

type PageSectionType =
  | "hero"
  | "stats"
  | "about"
  | "services"
  | "portfolio"
  | "why-us"
  | "team"
  | "contact"
  | "custom";

type PageSection = {
  id: string;
  pageId: string;
  type: PageSectionType;
  key: string; // stable frontend key, e.g. "hero", "services"
  status: PublishStatus;
  sortOrder: number;
  title?: string;
  eyebrow?: string;
  subtitle?: string;
  body?: string;
  accentText?: string;
  ctaPrimaryLabel?: string;
  ctaPrimaryUrl?: string;
  ctaSecondaryLabel?: string;
  ctaSecondaryUrl?: string;
  mediaUrl?: string;
  items: PageSectionItem[];
  settings?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
};

type PageSectionItem = {
  id: string;
  sectionId: string;
  status: PublishStatus;
  sortOrder: number;
  title?: string;
  eyebrow?: string;
  label?: string;
  value?: string;
  body?: string;
  icon?: string;
  mediaUrl?: string;
  url?: string;
  settings?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
};
```

Page content rules:

- `SitePage.slug = "home"` is the current official website page.
- Each visible website area is a `PageSection`.
- Repeating content inside a section is stored as `PageSectionItem`.
- Sections and items must support create, edit, delete/archive, publish, and reorder.
- The admin UI should hide complex JSON by default, but `settings` can be used by backend/frontend for future layout options.

Required home page sections:

- `hero`: ALTOS LAB first viewport, tagline, intro copy, CTA buttons.
- `stats`: three KPI/stat blocks.
- `about`: "We Build Intelligence" section copy.
- `services`: service rows such as AI Skill, AI Agent, integration, strategy.
- `portfolio`: project/product grid. This section references `Project` records.
- `why-us`: reason/feature rows.
- `team`: team cards.
- `contact`: contact heading, availability label, email, and contact form settings.

Admin edit examples:

- Hero section: edit eyebrow, main title, outline/accent title, body, primary CTA, secondary CTA.
- Stats section: add/edit/delete stat cards, edit label/value/background/accent.
- Services section: add/edit/delete service rows, edit number/title/English label/body.
- Portfolio section: add/edit/delete/reorder project cards and choose which published projects are visible.
- Team section: add/edit/delete team cards, edit icon/label/title/body/accent.
- Contact section: edit heading, accent word, email address, availability text, and contact form labels/placeholders.

## Core Entity: Contact Lead

```ts
type ContactLeadStatus = "new" | "contacted" | "qualified" | "closed" | "spam";

type ContactLead = {
  id: string;
  status: ContactLeadStatus;
  who: string;
  contact: string;
  message: string;
  source: "website-contact";
  createdAt: string;
  updatedAt: string;
};
```

## Core Entity: Blog Post

Blog posts are required for SEO and GEO content operations. Blog content is managed by the admin backend, can be saved as draft, reviewed, published, archived, and rendered as public indexable pages.

```ts
type BlogPost = {
  id: string;
  slug: string;
  status: PublishStatus;
  sortOrder: number;

  title: string;
  seoTitle?: string;
  seoDescription?: string;
  excerpt: string;
  topic: string;
  audience: string;
  geoSummary: string;
  body: string;
  keyTakeaways: string[];
  faqs: { question: string; answer: string }[];
  tags: string[];
  author: string;
  cover?: string;

  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
  generatedAt?: string;
  generatedBy?: string;
};
```

Blog/GEO rules:

- Public users only see `published` blog posts.
- Each published article must have a descriptive slug, SEO title, SEO description, excerpt, visible article body, GEO answer summary, and FAQ content.
- Blog detail pages should render `BlogPosting` structured data.
- Blog FAQ content should render `FAQPage` structured data and match the visible FAQ text.
- AI-generated articles must be saved as drafts first. Human review is required before publish.
- AI-generated articles must not invent unverifiable client names, numbers, claims, or citations.
- Articles should answer concrete business questions in visible text, not only in metadata.
- Blog URLs should be included in `sitemap.xml` and linked internally from `/blog` and the home page.

Field rules:

- `who`: required. Company, team, or sender name.
- `contact`: required. Email, LINE, phone, or preferred contact method.
- `message`: required. What the sender wants help with.
- `status`: backend/admin workflow state.
- `source`: fixed to `website-contact` for this form.

## Field Rules

- `id`: backend-generated stable ID.
- `slug`: URL-safe unique string, e.g. `wonda-ai`, `geo-hero`.
- `status`: controls public visibility.
- `sortOrder`: lower numbers appear earlier on the website.
- `tag`: short category label, e.g. `AI SaaS`, `Workflow`, `GEO Platform`.
- `title`: Traditional Chinese project title.
- `titleEn`: English display title / metadata label.
- `url`: optional external project link.
- `youtubeUrl`: optional YouTube URL for the product detail embed area.
- `cover`: required image URL for the portfolio grid.
- `gallery`: optional array of image URLs for the product detail modal/page. Maximum 15 images.
- `desc`: short overview for project modal.
- `detail`: longer execution detail for project modal.
- `productPage`: editable product detail page content. This is managed by the admin UI, not hard-coded in the frontend.
- `metrics`: 1-6 KPI rows.
- `tech`: 1-12 tech stack labels.

## Product Detail Page Requirements

Every project should support a backend-managed product detail experience. The current visual can remain a modal-style detail view, but the content must come from project data and be editable from the admin.

Managed content:

- Gallery photos: up to 15 images per project.
- Hero/title area: title, English title, tag, optional subtitle/body.
- CTA fields: optional primary and secondary CTA labels/URLs.
- YouTube embed: optional `youtubeUrl`, rendered as a 16:9 embedded video section below the main product detail content.
- Overview copy: `desc`.
- Execution/detail copy: `detail`.
- Metrics: editable KPI rows.
- Tech stack: editable labels.
- Optional content sections: repeated text/image sections for richer product pages.

Visual rules:

- Do not use gradients on product detail pages or product modals.
- Use solid backgrounds, image opacity, borders, dividers, spacing, and typography for hierarchy.
- If text needs readability over an image, use a solid or translucent overlay instead of a gradient overlay.
- Gallery thumbnails should show image order and active state clearly.
- Overview and execution/detail body copy should use the same color token and align to the same left edge.
- The YouTube section should be a full-width row below the overview/detail and metric columns.
- Product detail pages must remain readable on mobile, especially long Traditional Chinese content.

## Initial Seed Data

The current hard-coded projects should be migrated as seed data:

1. WonDa AI 智慧客服平台
2. 企業流程自動化平台
3. GEO Hero AI 能見度平台
4. 接案雷達 Freelance Finder
5. 龍蝦雲 — 私人 AI 員工平台
6. 即時語音 AI 助理平台

## Public API

### Get Published Home Page

```http
GET /api/pages/home
```

Returns only published page, sections, and section items.

Response:

```json
{
  "page": {
    "id": "page_home",
    "slug": "home",
    "status": "published",
    "title": "ALTOS LAB Official Website",
    "seoTitle": "ALTOS LAB",
    "seoDescription": "AI studio and system integration team.",
    "sections": [
      {
        "id": "sec_hero",
        "type": "hero",
        "key": "hero",
        "status": "published",
        "sortOrder": 10,
        "eyebrow": "AI Studio · 人工智慧工作室",
        "title": "ALTOS",
        "accentText": "LAB",
        "body": "打造下一代 AI 技能與智能代理...",
        "ctaPrimaryLabel": "開始合作",
        "ctaPrimaryUrl": "#contact",
        "ctaSecondaryLabel": "了解更多",
        "ctaSecondaryUrl": "#about",
        "items": []
      }
    ]
  }
}
```

### Create Contact Lead

```http
POST /api/contact
Content-Type: application/json
```

Body:

```json
{
  "who": "Acme Co.",
  "contact": "hello@example.com",
  "message": "我們想導入 AI 客服與內部流程自動化。"
}
```

Response:

```json
{
  "ok": true,
  "leadId": "lead_123"
}
```

Validation:

- `who`, `contact`, and `message` are required.
- Rate limit by IP/session.
- Add spam protection before public launch.

### List Published Projects

```http
GET /api/projects?status=published
```

Response:

```json
{
  "projects": [
    {
      "id": "proj_wonda",
      "slug": "wonda-ai",
      "status": "published",
      "sortOrder": 10,
      "tag": "AI SaaS",
      "title": "WonDa AI 智慧客服平台",
      "titleEn": "WonDa AI — Growing Customer Service Platform",
      "url": "https://example.com",
      "cover": "https://cdn.example.com/wonda-cover.png",
      "gallery": ["https://cdn.example.com/wonda-2.png"],
      "desc": "Short overview",
      "detail": "Longer project detail",
      "productPage": {
        "heroTitle": "會成長的 AI 客服平台",
        "heroSubtitle": "上傳知識、設定個性、嵌入網站。",
        "heroBody": "WonDa AI 讓客服 AI 從每次對話中學習。",
        "primaryCtaLabel": "免費試用 14 天",
        "primaryCtaUrl": "https://example.com",
        "secondaryCtaLabel": "了解更多",
        "secondaryCtaUrl": "https://example.com/about",
        "sections": []
      },
      "metrics": [{ "label": "上線時間", "value": "<30min" }],
      "tech": ["RAG", "LLM", "Next.js"],
      "createdAt": "2026-05-18T00:00:00.000Z",
      "updatedAt": "2026-05-18T00:00:00.000Z",
      "publishedAt": "2026-05-18T00:00:00.000Z"
    }
  ]
}
```

### Get Project By Slug

```http
GET /api/projects/:slug
```

Only published projects should be publicly returned.

### List Published Blog Posts

```http
GET /api/blog
```

Returns only published blog posts ordered by `sortOrder`.

### Get Blog Post By Slug

```http
GET /api/blog/:slug
```

Only published blog posts should be publicly returned.

## Admin API

All admin endpoints require authentication.

### List Pages

```http
GET /api/admin/pages
```

Returns all pages, including draft, published, archived, and deleted if the admin has permission.

### Get Page

```http
GET /api/admin/pages/:id
```

Returns page metadata, sections, and nested section items.

### Create Page

```http
POST /api/admin/pages
Content-Type: application/json
```

Body:

```json
{
  "slug": "home",
  "status": "draft",
  "title": "ALTOS LAB Official Website",
  "seoTitle": "ALTOS LAB",
  "seoDescription": "",
  "sections": []
}
```

### Update Page

```http
PATCH /api/admin/pages/:id
Content-Type: application/json
```

Editable fields:

- `slug`
- `status`
- `title`
- `seoTitle`
- `seoDescription`

### Delete Or Archive Page

Preferred behavior is archive, not hard delete.

```http
PATCH /api/admin/pages/:id
Content-Type: application/json
```

```json
{ "status": "archived" }
```

Hard delete, if supported:

```http
DELETE /api/admin/pages/:id
```

### Create Page Section

```http
POST /api/admin/pages/:pageId/sections
Content-Type: application/json
```

Body:

```json
{
  "type": "services",
  "key": "services",
  "status": "draft",
  "sortOrder": 30,
  "eyebrow": "Services · 服務項目",
  "title": "What We Do",
  "items": []
}
```

### Update Page Section

```http
PATCH /api/admin/sections/:id
Content-Type: application/json
```

Body can include any editable `PageSection` fields except `id`, `pageId`, `createdAt`, and system-managed timestamps.

### Delete Or Archive Page Section

```http
PATCH /api/admin/sections/:id
Content-Type: application/json
```

```json
{ "status": "archived" }
```

Hard delete, if supported:

```http
DELETE /api/admin/sections/:id
```

### Reorder Page Sections

```http
PATCH /api/admin/pages/:pageId/sections/reorder
Content-Type: application/json
```

Body:

```json
{
  "items": [
    { "id": "sec_hero", "sortOrder": 10 },
    { "id": "sec_about", "sortOrder": 20 }
  ]
}
```

### Create Section Item

```http
POST /api/admin/sections/:sectionId/items
Content-Type: application/json
```

Body:

```json
{
  "status": "draft",
  "sortOrder": 10,
  "title": "AI Skill 開發",
  "eyebrow": "THE SKILL LAYER",
  "body": "針對業務場景量身打造高效能 AI 技能模組..."
}
```

### Update Section Item

```http
PATCH /api/admin/section-items/:id
Content-Type: application/json
```

Body can include any editable `PageSectionItem` fields except `id`, `sectionId`, `createdAt`, and system-managed timestamps.

### Delete Or Archive Section Item

```http
PATCH /api/admin/section-items/:id
Content-Type: application/json
```

```json
{ "status": "archived" }
```

Hard delete, if supported:

```http
DELETE /api/admin/section-items/:id
```

### Reorder Section Items

```http
PATCH /api/admin/sections/:sectionId/items/reorder
Content-Type: application/json
```

Body:

```json
{
  "items": [
    { "id": "item_service_ai_skill", "sortOrder": 10 },
    { "id": "item_service_agent", "sortOrder": 20 }
  ]
}
```

### List All Projects

```http
GET /api/admin/projects
```

Returns draft, published, and archived projects.

### Create Project

```http
POST /api/admin/projects
Content-Type: application/json
```

Body:

```json
{
  "status": "draft",
  "tag": "AI SaaS",
  "title": "New Project",
  "titleEn": "New Project",
  "cover": "",
  "gallery": [],
  "desc": "",
  "detail": "",
  "productPage": {
    "heroTitle": "",
    "sections": []
  },
  "metrics": [],
  "tech": []
}
```

### Update Project

```http
PATCH /api/admin/projects/:id
Content-Type: application/json
```

Body can include any editable `Project` fields except `id`, `createdAt`, and system-managed timestamps.

### Delete Or Archive Project

Preferred behavior is archive, not hard delete.

```http
PATCH /api/admin/projects/:id
Content-Type: application/json
```

```json
{ "status": "archived" }
```

Hard delete, if supported:

```http
DELETE /api/admin/projects/:id
```

### Duplicate Project

```http
POST /api/admin/projects/:id/duplicate
```

Creates a draft copy of a project, including gallery references, metrics, tech tags, product detail content, and YouTube URL.

### Publish Project

```http
POST /api/admin/projects/:id/publish
```

Sets `status = "published"` and updates `publishedAt`.

### Unpublish Project

```http
POST /api/admin/projects/:id/unpublish
```

Sets `status = "draft"` or `archived`, depending on admin choice.

### Reorder Projects

```http
PATCH /api/admin/projects/reorder
Content-Type: application/json
```

Body:

```json
{
  "items": [
    { "id": "proj_wonda", "sortOrder": 10 },
    { "id": "proj_geo", "sortOrder": 20 }
  ]
}
```

### Upload Asset

```http
POST /api/admin/assets
Content-Type: multipart/form-data
```

Fields:

- `file`: image file
- `folder`: optional, e.g. `projects/wonda-ai`

Response:

```json
{
  "url": "https://cdn.example.com/projects/wonda-ai/cover.png",
  "width": 1600,
  "height": 1200,
  "mimeType": "image/png",
  "size": 245000
}
```

### Delete Asset

```http
DELETE /api/admin/assets/:id
```

Rules:

- Allow delete only if the asset is unused, or require admin confirmation.
- If an asset is used by a published page/project, the admin UI should warn which records reference it.

## Admin UI Requirements

Routes:

- `/admin/login`
- `/admin`
- `/admin/pages`
- `/admin/pages/:id`
- `/admin/pages/:id/sections/:sectionId`
- `/admin/projects`
- `/admin/projects/new`
- `/admin/projects/:id`
- `/admin/assets`
- `/admin/contact-leads`

Dashboard:

- Show quick counts for pages, published projects, drafts, contact leads, and unused assets.
- Show recently updated content.
- Show validation issues blocking publish.

Page list:

- List all pages by title, slug, status, updated date.
- Create new page.
- Duplicate page.
- Archive/delete page.
- Quick publish/unpublish page.
- Public preview link for published page.

Page editor:

- Edit page title, slug, SEO title, SEO description, status.
- See all sections in page order.
- Add new section.
- Edit section.
- Duplicate section.
- Delete/archive section.
- Drag reorder sections.
- Save draft.
- Publish page.
- Preview page before publish.

Section editor:

- Edit section type, key, status, sort order.
- Edit section-level fields: eyebrow, title, subtitle, body, accent text, CTA labels/URLs, media URL.
- Add/edit/delete/archive/reorder section items.
- Upload/replace section media.
- Preview section in public website style.
- Hide advanced `settings` unless needed.

Section item editor:

- Edit title, eyebrow, label, value, body, icon, media URL, URL, status, sort order.
- Add item.
- Duplicate item.
- Delete/archive item.
- Drag reorder items.
- Save item without publishing.

Home page section requirements:

- Hero editor:
  - Eyebrow
  - Main title
  - Accent/outline title
  - Body copy
  - Primary CTA label/URL
  - Secondary CTA label/URL
  - Optional background/media setting
- Stats editor:
  - Add/edit/delete/reorder stat cards
  - Each stat card: label, value, sub label, background/accent setting
- About editor:
  - Eyebrow
  - Heading lines
  - Accent word
  - Main body paragraphs
  - Small mono note
- Services editor:
  - Add/edit/delete/reorder service rows
  - Each service row: number, title, English label, body
- Portfolio editor:
  - Select which published projects appear
  - Drag reorder visible projects
  - Toggle project visibility on homepage
  - Create new project from this section
- Why Us editor:
  - Add/edit/delete/reorder feature rows
  - Each row: icon, title, body
- Team editor:
  - Add/edit/delete/reorder team cards
  - Each card: icon, label, title, body, accent color/token
- Contact editor:
  - Eyebrow
  - Heading text
  - Accent word
  - Availability label, e.g. `OPEN FOR NEW PROJECTS`
  - Email address
  - Contact form field labels/placeholders
  - Submit button label
  - Enable/disable contact form

Project list:

- Search by title/tag/tech
- Filter by status
- Drag or numeric sort order
- Quick publish/archive action
- Preview public card
- Create project
- Duplicate project
- Delete/archive project

Project editor:

- Title, English title, tag, URL, YouTube URL
- Status: draft/published/archived
- Cover image upload/URL
- Gallery image list with upload/reorder/delete, maximum 15 images
- Short description
- Detail text
- Product detail page editor
- Metrics editor
- Tech tag editor
- Save draft
- Publish
- Preview
- Duplicate
- Archive/delete

States:

- Loading skeleton
- Empty state
- Save success toast
- Validation error messages
- Network failure message

Contact leads list:

- New/contacted/qualified/closed/spam filters
- Search by sender, contact, and message
- Detail drawer or page
- Status update
- Optional internal note field in future version

Product detail page editor:

- Hero title/subtitle/body fields
- Primary CTA label/URL
- Secondary CTA label/URL
- YouTube URL field for product detail embed
- Gallery manager with up to 15 uploaded photos
- Gallery drag reorder
- Add/remove/reorder content sections
- Section title, eyebrow, body, optional image
- Preview product modal/page before publish
- No gradient controls or gradient presets

Assets manager:

- Upload image assets.
- List uploaded assets.
- Search/filter by filename, folder, mime type, used/unused.
- Copy asset URL.
- Replace asset.
- Delete unused asset.
- Show usage references before deleting used assets.

Blog manager:

- Search and filter posts by status, topic, tag, and keyword.
- Create blank draft posts.
- Generate AI blog drafts from topic, keyword, audience, and search intent.
- Edit title, slug, status, SEO title, SEO description, excerpt, GEO answer summary, body, takeaways, FAQ, tags, cover image, and author.
- Preview the public article page before publishing.
- Publish only after required SEO/GEO fields are valid.
- Archive posts without deleting their historical content.

Publishing workflow:

- Editors can save drafts at any time.
- Publish action validates required fields.
- Published content updates public API response.
- Archive hides content from public API without permanent deletion.
- Hard delete should be reserved for drafts or unused records.

## Validation

Required for publish:

Page:

- `slug`
- `title`
- At least one published section

Page section:

- `type`
- `key`
- `sortOrder`

Page section item:

- At least one of `title`, `label`, `value`, `body`, `mediaUrl`, or `url`

Project:

- `slug`
- `title`
- `titleEn`
- `tag`
- `cover`
- `desc`
- At least one `metric`
- At least one `tech`

Blog post:

- `slug`
- `title`
- `excerpt`
- `body`
- `geoSummary`
- At least one FAQ item

Drafts may be incomplete.

Recommended limits:

- Page `title`: 100 chars
- Page `seoTitle`: 70 chars
- Page `seoDescription`: 160 chars
- Section `title`: 120 chars
- Section `eyebrow`: 80 chars
- Section `body`: 1200 chars
- Section items per section: max 20 unless otherwise agreed
- `title`: 80 chars
- `titleEn`: 120 chars
- `tag`: 32 chars
- `desc`: 600 chars
- `detail`: 1600 chars
- `gallery`: max 15 images
- `productPage.sections`: max 10 sections
- `metrics`: max 6
- `tech`: max 12

## Auth Requirements

Minimum:

- Only authenticated admins can access `/admin`
- Only authenticated admins can call `/api/admin/*`
- Public API must not expose draft or archived projects

Recommended roles:

- `admin`: full access
- `editor`: create/update drafts, cannot delete

## Database Notes

Any database is acceptable as long as it supports the schema cleanly.

Recommended simple options:

- Supabase Postgres + Storage
- Firebase Firestore + Firebase Storage
- PostgreSQL + S3-compatible storage

Relational shape:

```sql
site_pages (
  id text primary key,
  slug text unique not null,
  status text not null,
  title text not null,
  seo_title text,
  seo_description text,
  created_at timestamptz not null,
  updated_at timestamptz not null,
  published_at timestamptz
)

page_sections (
  id text primary key,
  page_id text references site_pages(id),
  type text not null,
  key text not null,
  status text not null,
  sort_order int not null,
  title text,
  eyebrow text,
  subtitle text,
  body text,
  accent_text text,
  cta_primary_label text,
  cta_primary_url text,
  cta_secondary_label text,
  cta_secondary_url text,
  media_url text,
  settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null,
  updated_at timestamptz not null,
  published_at timestamptz
)

page_section_items (
  id text primary key,
  section_id text references page_sections(id),
  status text not null,
  sort_order int not null,
  title text,
  eyebrow text,
  label text,
  value text,
  body text,
  icon text,
  media_url text,
  url text,
  settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null,
  updated_at timestamptz not null
)

projects (
  id text primary key,
  slug text unique not null,
  status text not null,
  sort_order int not null,
  tag text not null,
  title text not null,
  title_en text not null,
  url text,
  youtube_url text,
  cover text not null,
  desc text not null,
  detail text not null,
  product_page jsonb not null default '{}'::jsonb,
  created_at timestamptz not null,
  updated_at timestamptz not null,
  published_at timestamptz
)

project_gallery (
  id text primary key,
  project_id text references projects(id),
  url text not null,
  sort_order int not null
)

project_metrics (
  id text primary key,
  project_id text references projects(id),
  label text not null,
  value text not null,
  sort_order int not null
)

project_tech (
  id text primary key,
  project_id text references projects(id),
  label text not null,
  sort_order int not null
)

assets (
  id text primary key,
  url text not null,
  folder text,
  filename text not null,
  mime_type text not null,
  width int,
  height int,
  size int,
  created_at timestamptz not null,
  updated_at timestamptz not null
)

contact_leads (
  id text primary key,
  status text not null,
  who text not null,
  contact text not null,
  message text not null,
  source text not null,
  created_at timestamptz not null,
  updated_at timestamptz not null
)
```

JSON-friendly shape is also acceptable if using Firestore:

```json
{
  "sitePages/home": {
    "slug": "home",
    "status": "published",
    "title": "ALTOS LAB Official Website",
    "seoTitle": "ALTOS LAB",
    "seoDescription": "...",
    "sections": [
      {
        "id": "sec_hero",
        "type": "hero",
        "key": "hero",
        "status": "published",
        "sortOrder": 10,
        "eyebrow": "AI Studio · 人工智慧工作室",
        "title": "ALTOS",
        "accentText": "LAB",
        "body": "...",
        "items": []
      }
    ]
  },
  "projects/{id}": {
    "slug": "wonda-ai",
    "status": "published",
    "sortOrder": 10,
    "tag": "AI SaaS",
    "title": "WonDa AI 智慧客服平台",
    "titleEn": "WonDa AI — Growing Customer Service Platform",
    "url": "https://example.com",
    "youtubeUrl": "https://www.youtube.com/watch?v=...",
    "cover": "https://cdn.example.com/cover.png",
    "gallery": [],
    "desc": "...",
    "detail": "...",
    "productPage": {
      "heroTitle": "...",
      "heroSubtitle": "...",
      "heroBody": "...",
      "primaryCtaLabel": "...",
      "primaryCtaUrl": "...",
      "secondaryCtaLabel": "...",
      "secondaryCtaUrl": "...",
      "youtubeUrl": "https://www.youtube.com/watch?v=...",
      "sections": []
    },
    "metrics": [],
    "tech": [],
    "createdAt": "...",
    "updatedAt": "...",
    "publishedAt": "..."
  }
}
```

## Frontend Integration Contract

The frontend should not know which database is used.

Create one API client layer:

```ts
export async function getPublishedProjects(): Promise<Project[]>;
export async function getPage(slug: string): Promise<SitePage>;
export async function getAdminPages(): Promise<SitePage[]>;
export async function getAdminPage(id: string): Promise<SitePage>;
export async function createPage(input: Partial<SitePage>): Promise<SitePage>;
export async function updatePage(id: string, input: Partial<SitePage>): Promise<SitePage>;
export async function archivePage(id: string): Promise<SitePage>;
export async function createPageSection(pageId: string, input: Partial<PageSection>): Promise<PageSection>;
export async function updatePageSection(id: string, input: Partial<PageSection>): Promise<PageSection>;
export async function archivePageSection(id: string): Promise<PageSection>;
export async function reorderPageSections(pageId: string, items: { id: string; sortOrder: number }[]): Promise<void>;
export async function createSectionItem(sectionId: string, input: Partial<PageSectionItem>): Promise<PageSectionItem>;
export async function updateSectionItem(id: string, input: Partial<PageSectionItem>): Promise<PageSectionItem>;
export async function archiveSectionItem(id: string): Promise<PageSectionItem>;
export async function reorderSectionItems(sectionId: string, items: { id: string; sortOrder: number }[]): Promise<void>;
export async function getAdminProjects(): Promise<Project[]>;
export async function createProject(input: Partial<Project>): Promise<Project>;
export async function updateProject(id: string, input: Partial<Project>): Promise<Project>;
export async function archiveProject(id: string): Promise<Project>;
export async function reorderProjects(items: { id: string; sortOrder: number }[]): Promise<void>;
```

When backend is ready, only this client layer should change.

## Deployment Notes

Current repo has both Vercel and Firebase static hosting configs. For admin/API work, choose one primary deployment target:

- Recommended: Next.js on Vercel if API routes and admin UI live together.
- Alternative: Firebase Hosting + Cloud Functions if Firebase is selected for auth/database.

Do not maintain three separate built HTML copies long term. Keep one source app and generate deploy output from it.

## Confirmed Product Detail Decisions

- Product detail pages/modals are managed from the admin backend.
- Each project can upload up to 15 gallery photos.
- Product detail pages must not use gradients.
- Each product can have an optional YouTube URL shown in a 16:9 embedded section.

## Confirmed Full Admin Decisions

- The whole one-page website must be editable through the admin backend.
- Page sections can be created, edited, deleted/archived, published, and reordered.
- Repeated section items can be created, edited, deleted/archived, published, and reordered.
- Portfolio/product projects can be created, edited, deleted/archived, published, and reordered.
- Media assets can be uploaded, replaced, and deleted if unused or confirmed.
- Public APIs return only published content.

## Open Questions

- Which backend will be used: Supabase, Firebase, or custom API?
- Who manages image storage and CDN?
- Should admins be email/password only, or Google login?
- Should updates require preview approval before publish?

# PromptForge - Production AI Prompt Library Website

PromptForge is a fast, SEO-optimized, production-ready **AI Prompt Library Website** where users can discover, search, copy, rate, and share high-performing prompts for ChatGPT, Claude, Midjourney, and AI agents.

The entire site is managed via a **Google Sheets CMS** and **Google Apps Script backend API**, with **static HTML pre-rendering** for Google Search ranking.

---

## 🌟 Key Features

1. **Permanent, Crawlable SEO Pages for Every Prompt**
   - Each prompt has its own unique, permanent URL: `/prompt/<slug>/`
   - Complete pre-rendered HTML content for Googlebot (not client-side-only rendering).
   - Unique `<title>`, `<meta description>`, and `<link rel="canonical">` on every page.
   - Rich JSON-LD Structured Data: `CreativeWork` / `SoftwareApplication` and `BreadcrumbList`.
   - Open Graph & Twitter Card social meta tags.

2. **Google Sheets Content Management System (CMS)**
   - Managed across 6 dedicated tabs:
     - `PROMPTS`: Core prompt repository with slug, title, content, SEO, categories, views, and copy counts.
     - `CATEGORIES`: 36 initial categories with slugs, descriptions, and ordering.
     - `TAGS`: Search and filter tags.
     - `SITE_SETTINGS`: Global site branding, hero headlines, announcement bar, and admin secret.
     - `PAGES`: Custom static page content.
     - `NAVIGATION`: Dynamic header navigation items.
   - One-click initialization function `setupSpreadsheet()` auto-formats tabs, colors, frozen rows, and seed data.

3. **Secure Admin Dashboard (`/admin/`)**
   - Password-protected authentication with SHA-256 session tokens.
   - Metric overview cards (Total Prompts, Published, Drafts, Total Views, Total Copies).
   - Full CRUD operations for prompts and categories.
   - **Live Google SERP Preview**: See exactly how your prompt snippet will appear on Google as you type!
   - Auto-slug generator, character/word counters, and draft/publish status toggles.
   - Google Apps Script Web App connection tester with a live `ping` status check.

4. **Multi-Platform Viral Sharing & Copying**
   - **One-Click Prompt Copy**: Copies the entire multi-paragraph prompt (with variables), updates button state to "Copied!", and fires an asynchronous telemetry increment to Google Sheets.
   - **Native Web Share API**: Direct mobile sharing into system apps.
   - **Social Share Integrations**: WhatsApp, Telegram, X (Twitter), Facebook, and Copy Link.
   - **Interactive User Ratings & Issue Reporting**: 5-star community feedback and report modal.

5. **Search & Discovery Engine**
   - Instant search autocomplete dropdown with keyboard navigation (`↑`, `↓`, `Enter`, `Esc`).
   - Search across prompt titles, descriptions, content, categories, and tags.
   - Full filter directory (`prompts.html`) with category selector, tag chips, and sorting (Newest, Most Copied, Most Viewed).

6. **Automated XML Sitemap & Robots.txt**
   - Dynamically generated `sitemap.xml` listing homepage, all 36 categories, all published prompt URLs, and legal pages.
   - Automatically excludes draft, unpublished, and `/admin/` paths.
   - `robots.txt` disallows sensitive admin folders and points crawlers to `sitemap.xml`.

---

## 📂 Project Structure

```
/ai-prompt-website
├── assets/
│   ├── images/              # Clean SVG graphics & prompt badges
│   └── icons/
├── css/
│   ├── style.css            # Modern design system, themes, cards, breadcrumbs
│   ├── responsive.css       # Mobile & tablet breakpoints
│   └── admin.css            # Admin dashboard, data tables, and SERP preview
├── js/
│   ├── config.js            # Configuration & local storage keys
│   ├── api.js               # Data client (Google Apps Script API + offline fallback)
│   ├── main.js              # Theme engine, mobile menu, quick copy, and homepage loader
│   ├── search.js            # Autocomplete suggestions & full directory filter engine
│   ├── prompt.js            # Single prompt page logic & variable highlighter
│   ├── sharing.js           # WhatsApp, Telegram, X, Facebook, and Web Share API
│   └── admin.js             # Admin dashboard, CRUD, and live SERP preview
├── admin/
│   └── index.html           # Secure administrator portal
├── backend/
│   ├── Code.gs              # Master API router (doGet, doPost)
│   ├── config.gs            # Sheet tab names, constants, and CORS helpers
│   ├── auth.gs              # SHA-256 password hashing & session token validator
│   ├── prompts.gs           # Prompt CRUD & atomic telemetry incrementers
│   ├── categories.gs        # Category & tag management
│   ├── settings.gs          # Site settings & admin analytics overview
│   ├── sitemap.gs           # Dynamic XML sitemap generator
│   └── setup.gs             # One-click spreadsheet initialization script
├── templates/
│   ├── prompt-template.html   # Pre-render template for single prompt pages
│   └── category-template.html # Pre-render template for category landing pages
├── data/
│   └── initial-data.json    # Turnkey seed database (36 categories + prompts)
├── prompt/                  # Pre-rendered permanent SEO pages
│   ├── chatgpt-seo-blog-writer/index.html
│   ├── instagram-caption-generator/index.html
│   ├── professional-email-writer/index.html
│   ├── youtube-script-generator/index.html
│   └── ...
├── category/                # Pre-rendered permanent category landing pages
│   ├── chatgpt-prompts/index.html
│   ├── seo/index.html
│   ├── programming/index.html
│   └── ... (all 36 categories)
├── index.html               # Main homepage
├── prompts.html             # Full search and filter catalog
├── categories.html          # Browse all 36 categories
├── about.html               # About page
├── contact.html             # Contact page
├── privacy.html             # Privacy policy
├── terms.html               # Terms of service
├── 404.html                 # Custom 404 error page
├── robots.txt               # Crawler instructions
├── sitemap.xml              # XML Sitemap for search engines
├── build.js                 # Static Site Generator (SSG) pre-renderer
├── server.js                # Zero-dependency local development server
├── test.js                  # Automated verification test suite
└── package.json
```

---

## 🚀 Quick Start (Local Development)

### 1. Run the Development Server
No third-party npm packages required! Simply run:

```bash
npm start
```
Or:
```bash
node server.js
```

Open your browser to:
- **Public Homepage**: [http://localhost:3000](http://localhost:3000)
- **Explore Prompts**: [http://localhost:3000/prompts.html](http://localhost:3000/prompts.html)
- **Permanent Prompt Page**: [http://localhost:3000/prompt/chatgpt-seo-blog-writer/](http://localhost:3000/prompt/chatgpt-seo-blog-writer/)
- **Category Page**: [http://localhost:3000/category/seo/](http://localhost:3000/category/seo/)
- **Admin Dashboard**: [http://localhost:3000/admin/](http://localhost:3000/admin/)
  - **Default Password**: `admin123`

### 2. Run Automated Verification Tests
```bash
npm test
```
Or:
```bash
node test.js
```

---

## 📊 Google Sheets CMS & Google Apps Script Setup Guide

Follow these steps to connect your website to Google Sheets:

### Step 1: Create a Google Spreadsheet
1. Go to [Google Sheets](https://sheets.new) and create a new blank spreadsheet.
2. Title it: **PromptForge Database**.

### Step 2: Open Google Apps Script
1. In your new Google Sheet, click **Extensions > Apps Script** in the top menu.
2. In the Apps Script editor, delete any existing boilerplate in `Code.gs`.

### Step 3: Add Backend Files
Create 8 script files matching the code in the `/backend` folder:
- `Code.gs`
- `config.gs`
- `auth.gs`
- `prompts.gs`
- `categories.gs`
- `settings.gs`
- `sitemap.gs`
- `setup.gs`

Copy the exact content from each corresponding file in `/backend/` and paste it into Apps Script.

### Step 4: Run One-Click Initialization
1. In the Apps Script toolbar, select the function **`setupSpreadsheet`** from the dropdown.
2. Click **Run**.
3. Authorize the permissions requested by Google.
4. Go back to your Google Sheet: All 6 tabs (`PROMPTS`, `CATEGORIES`, `TAGS`, `SITE_SETTINGS`, `PAGES`, `NAVIGATION`) will be automatically created with styled headers, frozen rows, all 36 initial categories, and starter prompts!

### Step 5: Deploy as a Web App
1. In the Apps Script editor, click the blue **Deploy > New deployment** button (top right).
2. Click the gear icon next to "Select type" and choose **Web app**.
3. Configure the deployment settings:
   - **Description**: `PromptForge Production API`
   - **Execute as**: `Me (your email)`
   - **Who has access**: `Anyone` *(Crucial: allows frontend visitors to read published prompts and count views/copies)*
4. Click **Deploy**.
5. Copy the generated **Web App URL** (e.g., `https://script.google.com/macros/s/AKfycb.../exec`).

### Step 6: Link to Website
1. Go to your Admin Dashboard at `http://localhost:3000/admin/` (or your deployed site URL).
2. Log in (default password: `admin123`).
3. Click **Settings & Sheets** in the sidebar.
4. Paste your Web App URL into the **Google Apps Script Web App URL** input.
5. Click **Test Connection**. You will see a green confirmation: `Connection SUCCESSFUL! Google Apps Script is active. 🟢`.
6. Click **Save Settings**.

---

## 🔐 Admin Authentication & Security

- **Initial Default Password**: `admin123`
- **Session Tokens**: Protected via SHA-256 signature and timestamp expiration (valid for 7 days).
- **No Credentials Exposed**: Frontend code contains zero Google API secret keys or service account credentials. All database writes are authenticated and sanitized on the backend in `auth.gs` and `Code.gs`.
- **Changing Password**:
  - Update `admin_secret_hash` in your `SITE_SETTINGS` sheet tab, or
  - Update `ADMIN_PASSWORD_HASH` inside Google Apps Script under **Project Settings > Script Properties**.

---

## ⚡ Static Site Generation & Pre-Rendering

Whenever you add or update prompts in Google Sheets or via the Admin Dashboard, regenerate the static HTML pages to ensure Googlebot crawls the latest rendered content:

```bash
node build.js
```

What `build.js` does:
1. Generates permanent directories under `/prompt/<slug>/index.html` with static HTML, schema, and meta tags.
2. Generates permanent category pages under `/category/<slug>/index.html`.
3. Compiles a fresh `sitemap.xml` with `<lastmod>` timestamps.

---

## 🌐 Google Search Console & SEO Verification

### 1. Verify Ownership
1. Go to [Google Search Console](https://search.google.com/search-console).
2. Choose **URL prefix** (e.g., `https://yourdomain.com`).
3. Select **HTML tag** verification and paste the meta tag into `<head>` in `index.html`, or upload the verification HTML file to your site root.

### 2. Submit the Sitemap
1. In Google Search Console, navigate to **Sitemaps** on the left menu.
2. In the "Add a new sitemap" box, type:
   ```
   sitemap.xml
   ```
3. Click **Submit**.

> **Note on Indexing**: Submitting a sitemap tells Googlebot where to find your URLs. Indexing is determined by Google's crawl schedule and content quality evaluation.

### 3. Verify Rich Results & Schema
Test any prompt URL (e.g., `https://yourdomain.com/prompt/chatgpt-seo-blog-writer/`) in the [Google Rich Results Test](https://search.google.com/test/rich-results) to verify `CreativeWork` and `BreadcrumbList` structured data.

---

## 🚢 Production Deployment Options

You can host PromptForge on any static web host or CDN:

### Option A: GitHub Pages
1. Push your repository to GitHub.
2. Go to **Settings > Pages**.
3. Select branch: `main`, folder: `/ (root)`.
4. Click **Save**.

### Option B: Cloudflare Pages / Netlify / Vercel
1. Link your repository.
2. Set Build Command: `node build.js`
3. Set Output Directory: `.` (root)
4. Deploy!


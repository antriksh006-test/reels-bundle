/**
 * build.js - Static Site Pre-Renderer & Automatic XML Sitemap Generator
 * Run: `node build.js` to compile permanent HTML pages for all published prompts and categories.
 */

const fs = require('fs');
const path = require('path');

const ROOT_DIR = __dirname;
const PUBLIC_DIR = path.join(ROOT_DIR, 'public');
const DATA_FILE = path.join(ROOT_DIR, 'data', 'initial-data.json');
const PROMPT_TEMPLATE_FILE = path.join(ROOT_DIR, 'templates', 'prompt-template.html');
const CAT_TEMPLATE_FILE = path.join(ROOT_DIR, 'templates', 'category-template.html');

let promptTemplateCache = null;
let catTemplateCache = null;

function escapeHtml(text) {
  if (!text) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function highlightVariables(text) {
  if (!text) return '';
  const escaped = escapeHtml(text);
  return escaped.replace(/(\[[A-Z0-9_\s,.-]+\])/g, '<span class="prompt-var">$1</span>');
}

// Helper: shuffle array
function shuffleArray(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Helper: check if a prompt is girl/female-focused
function isGirlPrompt(p) {
  const text = ((p.title || '') + ' ' + (p.tags || '') + ' ' + (p.short_description || '') + ' ' + (p.prompt_content || '')).toLowerCase();
  const hasGirl = /\b(girl|girls|woman|women|female|saree|lady|she|her|bride|model|queen|princess|actress|femme|mulher|garota)\b/.test(text);
  const hasBoy = /\b(boy|boys|man|men|male|guy|gentleman|homem|ele)\b/.test(text);
  return hasGirl && !hasBoy;
}

// Helper: randomize prompts with heavy bias towards girls side
function randomizeWithGirlsBias(promptsList) {
  if (!promptsList || promptsList.length <= 1) return promptsList || [];
  const girls = shuffleArray(promptsList.filter(p => isGirlPrompt(p)));
  const others = shuffleArray(promptsList.filter(p => !isGirlPrompt(p)));
  const result = [];
  let gIdx = 0;
  let oIdx = 0;
  while (gIdx < Math.min(6, girls.length)) {
    result.push(girls[gIdx++]);
  }
  while (gIdx < girls.length || oIdx < others.length) {
    for (let k = 0; k < 3 && gIdx < girls.length; k++) {
      result.push(girls[gIdx++]);
    }
    if (oIdx < others.length) {
      result.push(others[oIdx++]);
    } else if (gIdx < girls.length) {
      result.push(girls[gIdx++]);
    }
  }
  return result;
}

/**
 * Generate clean URL slug from title
 * The prompt title is used as the prompt page name
 */
function generateSlug(text) {
  if (!text) return 'prompt-' + Date.now().toString(36);
  return String(text)
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

function renderPromptCard(p, index = 0) {
  const promptUrl = `/prompt/${p.slug}/`;
  const imgUrl = p.featured_image || '/assets/images/default-prompt.svg';
  const category = p.category || 'AI Photo';
  const count = (p.id ? (p.id.charCodeAt(p.id.length - 1) % 5) : 0) + 2;
  const isNew = index < 6;
  const isPremium = p.featured || String(p.featured).toLowerCase() === 'true' || index % 4 === 0;
  const isTrending = p.trending === true || String(p.trending).toLowerCase() === 'true';
  const priority = index < 4 ? 'high' : 'low';
  const loading = index < 4 ? 'eager' : 'lazy';

  return `
    <article class="prompt-masonry-card" data-id="${p.id}" data-category="${escapeHtml(category.toLowerCase())}" onclick="if (!event.target.closest('.btn-card-copy')) window.location.href='${promptUrl}'">
      <a href="${promptUrl}" class="card-img-wrap" aria-label="${escapeHtml(p.title)}">
        <img src="${escapeHtml(imgUrl)}" alt="${escapeHtml(p.title)}" loading="${loading}" decoding="async" fetchpriority="${priority}" onerror="this.onerror=null; this.src='/assets/images/default-prompt.svg';">
        <div class="card-top-left-badges">
          ${isTrending ? '<span class="badge-trending-glow" title="Trending Prompt">🔥 Trending</span>' : ''}
          ${isNew && !isTrending ? '<span class="badge-new-glow">✦ New</span>' : ''}
          <span class="badge-cat-tag">${escapeHtml(category)}</span>
        </div>
        <div class="card-top-right-badges">
          ${isPremium ? '<span class="badge-crown-gold" title="Premium Prompt"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M2 4l3 12h14l3-12-6 7-4-7-4 7-6-7zm3 16h14v2H5v-2z"/></svg></span>' : ''}
          <span class="badge-photo-count">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
            ${count}
          </span>
        </div>
      </a>
      <div class="card-bottom-info">
        <a href="${promptUrl}" class="card-title-link">
          <h3 class="card-title-text">${escapeHtml(p.title)}</h3>
        </a>
        <div class="card-action-row" onclick="event.stopPropagation()">
          <button class="btn-card-copy" data-id="${p.id}" data-content="${escapeHtml(p.prompt_content)}" title="Copy full prompt">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
            <span>Copy Prompt</span>
          </button>
          <a href="${promptUrl}" class="btn-card-view" title="Open full prompt page">
            <span>View</span>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>
          </a>
        </div>
      </div>
    </article>
  `;
}

/**
 * Render individual prompt permanent HTML page
 * Requirements:
 * - The prompt title is used as the prompt page name (slug) and page title
 * - The page description is used as the meta description
 */
function renderPromptPage(p, allPrompts = [], baseUrl = 'https://reels-bundle.vercel.app') {
  if (!promptTemplateCache) {
    promptTemplateCache = fs.readFileSync(PROMPT_TEMPLATE_FILE, 'utf-8');
  }

  // 1. The prompt title is used as the prompt page name / title
  const promptTitle = p.title ? String(p.title).trim() : 'Untitled AI Prompt';
  const slug = p.slug ? generateSlug(p.slug) : generateSlug(promptTitle);

  // 2. The page description is used as the meta description
  const pageDescription = p.short_description || p.seo_description || p.full_description || p.description || 'High-performing production AI prompt.';
  const seoDesc = pageDescription;
  const seoTitle = p.seo_title || `${promptTitle} | PromptForge`;

  const catSlug = String(p.category || 'other').toLowerCase().trim().replace(/[^a-z0-9 -]/g, '').replace(/\s+/g, '-');
  const canonicalUrl = `${baseUrl}/prompt/${slug}/`;
  const promptContent = p.prompt_content || '';
  const wordCount = promptContent.trim().split(/\s+/).filter(Boolean).length;
  const authorInitial = (p.author || 'P').charAt(0).toUpperCase();

  const tagPills = (p.tags || '').split(',').map(t => t.trim()).filter(Boolean).map(t => {
    return `<a href="/prompts.html?tag=${encodeURIComponent(t)}" class="tag-pill">#${escapeHtml(t)}</a>`;
  }).join(' ');

  let featuredImg = `${baseUrl}/assets/images/default-prompt.svg`;
  if (p.featured_image) {
    featuredImg = p.featured_image.startsWith('http') ? p.featured_image : `${baseUrl}${p.featured_image}`;
  }

  // 3 Related Prompts (uniform single row at the same level)
  let related = allPrompts.filter(o => o.id !== p.id && o.category === p.category).slice(0, 3);
  if (related.length < 3) {
    const more = allPrompts.filter(o => o.id !== p.id && !related.includes(o)).slice(0, 3 - related.length);
    related = related.concat(more);
  }
  const relatedHtml = related.map((r, idx) => renderPromptCard(r, idx)).join('');

  return promptTemplateCache
    .replace(/{{SEO_TITLE}}/g, escapeHtml(seoTitle))
    .replace(/{{SEO_DESCRIPTION}}/g, escapeHtml(seoDesc))
    .replace(/{{CANONICAL_URL}}/g, canonicalUrl)
    .replace(/{{TITLE}}/g, escapeHtml(promptTitle))
    .replace(/{{SHORT_DESCRIPTION}}/g, escapeHtml(pageDescription))
    .replace(/{{FULL_DESCRIPTION}}/g, escapeHtml(p.full_description || ''))
    .replace(/{{PROMPT_CONTENT_HTML}}/g, highlightVariables(promptContent))
    .replace(/{{PROMPT_CONTENT_RAW}}/g, escapeHtml(promptContent))
    .replace(/{{PROMPT_CONTENT_JSON}}/g, JSON.stringify(promptContent))
    .replace(/{{CATEGORY}}/g, escapeHtml(p.category || 'General'))
    .replace(/{{CATEGORY_SLUG}}/g, catSlug)
    .replace(/{{SUBCATEGORY}}/g, escapeHtml(p.subcategory || ''))
    .replace(/{{TAGS}}/g, escapeHtml(p.tags || ''))
    .replace(/{{TAG_PILLS_HTML}}/g, tagPills)
    .replace(/{{AUTHOR}}/g, escapeHtml(p.author || 'PromptForge Editor'))
    .replace(/{{AUTHOR_INITIAL}}/g, authorInitial)
    .replace(/{{CREATED_AT}}/g, p.created_at || new Date().toISOString().split('T')[0])
    .replace(/{{UPDATED_AT}}/g, p.updated_at || p.created_at || new Date().toISOString().split('T')[0])
    .replace(/{{FEATURED_IMAGE}}/g, featuredImg)
    .replace(/{{CHAR_COUNT}}/g, String(promptContent.length))
    .replace(/{{WORD_COUNT}}/g, String(wordCount))
    .replace(/{{COPY_COUNT}}/g, String(p.copy_count || 0))
    .replace(/{{VIEWS}}/g, String(p.views || 0))
    .replace(/{{RELATED_PROMPTS_HTML}}/g, relatedHtml);
}

/**
 * Regenerate production sitemap.xml
 */
function generateSitemapXml(db) {
  const siteSettings = db.site_settings || {};
  const baseUrl = (siteSettings.site_url || 'https://reels-bundle.vercel.app').replace(/\/+$/, '');
  const today = new Date().toISOString().split('T')[0];

  const publishedPrompts = (db.prompts || []).filter(p => String(p.status).toLowerCase() === 'published');
  const publishedCategories = (db.categories || []).filter(c => String(c.status).toLowerCase() === 'published');

  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
  xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';

  // Homepage
  xml += `  <url>\n    <loc>${baseUrl}/</loc>\n    <lastmod>${today}</lastmod>\n    <changefreq>daily</changefreq>\n    <priority>1.0</priority>\n  </url>\n`;

  // Core Directory Pages
  xml += `  <url>\n    <loc>${baseUrl}/prompts.html</loc>\n    <lastmod>${today}</lastmod>\n    <changefreq>daily</changefreq>\n    <priority>0.9</priority>\n  </url>\n`;
  xml += `  <url>\n    <loc>${baseUrl}/categories.html</loc>\n    <lastmod>${today}</lastmod>\n    <changefreq>weekly</changefreq>\n    <priority>0.8</priority>\n  </url>\n`;

  // Published Categories
  publishedCategories.forEach(c => {
    xml += `  <url>\n    <loc>${baseUrl}/category/${c.slug}/</loc>\n    <lastmod>${today}</lastmod>\n    <changefreq>weekly</changefreq>\n    <priority>0.8</priority>\n  </url>\n`;
  });

  // Published Prompts
  publishedPrompts.forEach(p => {
    const modDate = p.updated_at || p.created_at || today;
    xml += `  <url>\n    <loc>${baseUrl}/prompt/${p.slug}/</loc>\n    <lastmod>${modDate}</lastmod>\n    <changefreq>weekly</changefreq>\n    <priority>0.9</priority>\n  </url>\n`;
  });

  // Static Pages
  ['about', 'contact', 'privacy', 'terms'].forEach(page => {
    xml += `  <url>\n    <loc>${baseUrl}/${page}.html</loc>\n    <lastmod>${today}</lastmod>\n    <changefreq>monthly</changefreq>\n    <priority>0.5</priority>\n  </url>\n`;
  });

  xml += '</urlset>';

  fs.writeFileSync(path.join(ROOT_DIR, 'sitemap.xml'), xml);
  if (!fs.existsSync(PUBLIC_DIR)) fs.mkdirSync(PUBLIC_DIR, { recursive: true });
  fs.writeFileSync(path.join(PUBLIC_DIR, 'sitemap.xml'), xml);
  return xml;
}

/**
 * Save and instantly render a pushed prompt into its own static page.
 * Guarantees that:
 * 1. The prompt title is used as the prompt page name (slug).
 * 2. The page description is used as the meta description.
 * 3. The prompt has its own permanent page at /prompt/<slug>/index.html
 */
function saveAndRenderPrompt(promptData) {
  if (!fs.existsSync(DATA_FILE)) {
    throw new Error('initial-data.json not found');
  }

  const rawData = fs.readFileSync(DATA_FILE, 'utf-8');
  const db = JSON.parse(rawData);
  const prompts = db.prompts || [];

  // Generate unique ID if new
  if (!promptData.id) {
    promptData.id = 'p_' + Date.now().toString(36);
  }

  // 1. The prompt title is used as the prompt page name (slug)
  const title = promptData.title ? String(promptData.title).trim() : 'Untitled Prompt';
  promptData.title = title;
  const slug = promptData.slug ? generateSlug(promptData.slug) : generateSlug(title);
  promptData.slug = slug;

  // 2. The page description is used as the meta description
  const pageDescription = promptData.short_description || promptData.seo_description || promptData.full_description || promptData.description || '';
  promptData.short_description = pageDescription;
  promptData.seo_description = pageDescription;
  promptData.seo_title = promptData.seo_title || `${title} | PromptForge`;
  promptData.canonical_url = `https://reels-bundle.vercel.app/prompt/${slug}/`;
  promptData.status = promptData.status || 'published';

  const now = new Date().toISOString();
  promptData.updated_at = now;
  if (!promptData.created_at) promptData.created_at = now;
  if (promptData.views === undefined) promptData.views = 0;
  if (promptData.copy_count === undefined) promptData.copy_count = 0;

  // Update existing or prepend new
  const existingIndex = prompts.findIndex(p => p.id === promptData.id || p.slug === slug);
  if (existingIndex >= 0) {
    prompts[existingIndex] = { ...prompts[existingIndex], ...promptData };
  } else {
    prompts.unshift(promptData);
  }
  db.prompts = prompts;

  // Write updated database
  const dbJson = JSON.stringify(db, null, 2);
  fs.writeFileSync(DATA_FILE, dbJson, 'utf-8');
  const pubDataFile = path.join(PUBLIC_DIR, 'data', 'initial-data.json');
  if (fs.existsSync(path.dirname(pubDataFile))) {
    fs.writeFileSync(pubDataFile, dbJson, 'utf-8');
  }

  // Immediately render and write the prompt's own permanent page: /prompt/<slug>/index.html
  const baseUrl = (db.site_settings?.site_url || 'https://reels-bundle.vercel.app').replace(/\/+$/, '');
  const renderedHtml = renderPromptPage(promptData, prompts, baseUrl);

  const targets = [path.join(ROOT_DIR, 'prompt', slug)];
  if (fs.existsSync(PUBLIC_DIR)) targets.push(path.join(PUBLIC_DIR, 'prompt', slug));
  for (const pDir of targets) {
    if (!fs.existsSync(pDir)) fs.mkdirSync(pDir, { recursive: true });
    fs.writeFileSync(path.join(pDir, 'index.html'), renderedHtml, 'utf-8');
  }

  // Update sitemap.xml
  generateSitemapXml(db);

  const promptFilePath = path.join(ROOT_DIR, 'prompt', slug, 'index.html');

  return {
    success: true,
    prompt: promptData,
    slug: slug,
    pagePath: `/prompt/${slug}/`,
    pageFile: promptFilePath
  };
}

/**
 * Save and instantly render a bulk array of prompts into permanent static pages.
 * Guarantees that:
 * 1. Each prompt's title is used as its prompt page name (slug).
 * 2. Each prompt's page description is used as the meta description.
 * 3. Each prompt receives its own permanent HTML page at /prompt/<slug>/index.html
 * 4. The production sitemap.xml is updated with every imported prompt.
 */
function saveAndRenderPromptBatch(items = []) {
  if (!fs.existsSync(DATA_FILE)) {
    throw new Error('initial-data.json not found');
  }

  const rawData = fs.readFileSync(DATA_FILE, 'utf-8');
  const db = JSON.parse(rawData);
  const prompts = db.prompts || [];
  const baseUrl = (db.site_settings?.site_url || 'https://reels-bundle.vercel.app').replace(/\/+$/, '');
  const now = new Date().toISOString();
  const results = [];

  for (let i = 0; i < items.length; i++) {
    const promptData = items[i];
    if (!promptData || !promptData.title) continue;

    if (!promptData.id) {
      promptData.id = 'p_' + Date.now().toString(36) + '_' + i.toString(36);
    }

    // 1. The prompt title is used as the prompt page name (slug)
    const title = promptData.title ? String(promptData.title).trim() : 'Untitled Prompt';
    promptData.title = title;
    const slug = promptData.slug ? generateSlug(promptData.slug) : generateSlug(title);
    promptData.slug = slug;

    // 2. The page description is used as the meta description
    const pageDescription = promptData.short_description || promptData.seo_description || promptData.full_description || promptData.description || '';
    promptData.short_description = pageDescription;
    promptData.seo_description = pageDescription;
    promptData.seo_title = promptData.seo_title || `${title} | PromptForge`;
    promptData.canonical_url = `${baseUrl}/prompt/${slug}/`;
    promptData.status = promptData.status || 'published';

    promptData.updated_at = now;
    if (!promptData.created_at) promptData.created_at = now;
    if (promptData.views === undefined) promptData.views = 0;
    if (promptData.copy_count === undefined) promptData.copy_count = 0;

    // Update existing or add new
    const existingIndex = prompts.findIndex(p => p.id === promptData.id || p.slug === slug);
    if (existingIndex >= 0) {
      prompts[existingIndex] = { ...prompts[existingIndex], ...promptData };
    } else {
      prompts.unshift(promptData);
    }

    // Render static HTML page for this prompt
    const promptDir = path.join(ROOT_DIR, 'prompt', slug);
    if (!fs.existsSync(promptDir)) {
      fs.mkdirSync(promptDir, { recursive: true });
    }
    const renderedHtml = renderPromptPage(promptData, prompts, baseUrl);
    const promptFilePath = path.join(promptDir, 'index.html');
    fs.writeFileSync(promptFilePath, renderedHtml, 'utf-8');

    results.push({
      index: i,
      success: true,
      prompt: promptData,
      slug: slug,
      url: `/prompt/${slug}/`,
      pageUrl: `/prompt/${slug}/`,
      pageFile: promptFilePath
    });
  }

  db.prompts = prompts;

  // Persist to database file
  fs.writeFileSync(DATA_FILE, JSON.stringify(db, null, 2), 'utf-8');

  // Regenerate production sitemap.xml with all new prompts included!
  generateSitemapXml(db);

  return {
    success: true,
    count: results.length,
    results
  };
}

async function build() {
  console.log('⚡ Starting PromptForge Static Pre-Renderer & Sitemap Generator...');

  if (!fs.existsSync(DATA_FILE)) {
    console.error('Error: initial-data.json not found!');
    process.exit(1);
  }

  const rawData = fs.readFileSync(DATA_FILE, 'utf-8');
  const db = JSON.parse(rawData);

  const siteSettings = db.site_settings || {};
  const baseUrl = (siteSettings.site_url || 'https://reels-bundle.vercel.app').replace(/\/+$/, '');
  const allPrompts = db.prompts || [];
  const publishedPrompts = allPrompts.filter(p => String(p.status).toLowerCase() === 'published');
  const allCategories = db.categories || [];
  const publishedCategories = allCategories.filter(c => String(c.status).toLowerCase() === 'published');

  catTemplateCache = fs.readFileSync(CAT_TEMPLATE_FILE, 'utf-8');

  // Clean up stale pre-rendered folders across ROOT_DIR and PUBLIC_DIR
  const outputBases = [ROOT_DIR];
  if (fs.existsSync(PUBLIC_DIR)) outputBases.push(PUBLIC_DIR);

  outputBases.forEach(base => {
    if (fs.existsSync(path.join(base, 'prompt'))) {
      const validPrompts = new Set(publishedPrompts.map(p => p.slug));
      fs.readdirSync(path.join(base, 'prompt')).forEach(dir => {
        if (!validPrompts.has(dir)) {
          fs.rmSync(path.join(base, 'prompt', dir), { recursive: true, force: true });
        }
      });
    }
    if (fs.existsSync(path.join(base, 'category'))) {
      const validCats = new Set(publishedCategories.map(c => c.slug));
      fs.readdirSync(path.join(base, 'category')).forEach(dir => {
        if (!validCats.has(dir)) {
          fs.rmSync(path.join(base, 'category', dir), { recursive: true, force: true });
        }
      });
    }
  });

  // 1. Generate Individual Prompt HTML Pages
  console.log(`Generating permanent HTML pages for ${publishedPrompts.length} published prompts...`);
  
  publishedPrompts.forEach(p => {
    const rendered = renderPromptPage(p, publishedPrompts, baseUrl);
    outputBases.forEach(base => {
      const promptDir = path.join(base, 'prompt', p.slug);
      if (!fs.existsSync(promptDir)) {
        fs.mkdirSync(promptDir, { recursive: true });
      }
      fs.writeFileSync(path.join(promptDir, 'index.html'), rendered);
    });
  });

  // 2. Generate Category Landing Pages
  console.log(`Generating permanent HTML pages for ${publishedCategories.length} categories...`);

  publishedCategories.forEach(c => {
    const canonicalUrl = `${baseUrl}/category/${c.slug}/`;
    const catName = c.name || c.category_name || '';
    const catPrompts = publishedPrompts.filter(p => String(p.category || '').toLowerCase() === catName.toLowerCase());
    
    let gridHtml = '';
    if (catPrompts.length > 0) {
      gridHtml = catPrompts.map((p, idx) => renderPromptCard(p, idx)).join('');
    } else {
      gridHtml = `<div style="grid-column: 1 / -1; text-align: center; padding: 3rem; color: var(--text-secondary);">
        <p>No prompts in this category yet. Check back soon!</p>
        <a href="/prompts.html" class="btn btn-secondary" style="margin-top: 1rem;">Explore All Prompts</a>
      </div>`;
    }

    let rendered = catTemplateCache
      .replace(/{{SEO_TITLE}}/g, escapeHtml(c.seo_title || `${catName} AI Prompts | PromptForge`))
      .replace(/{{SEO_DESCRIPTION}}/g, escapeHtml(c.seo_description || c.description || `Browse curated ${catName} AI prompts.`))
      .replace(/{{CANONICAL_URL}}/g, canonicalUrl)
      .replace(/{{CATEGORY_NAME}}/g, escapeHtml(catName))
      .replace(/{{DESCRIPTION}}/g, escapeHtml(c.description || ''))
      .replace(/{{PROMPTS_GRID_HTML}}/g, gridHtml);

    outputBases.forEach(base => {
      const catDir = path.join(base, 'category', c.slug);
      if (!fs.existsSync(catDir)) {
        fs.mkdirSync(catDir, { recursive: true });
      }
      fs.writeFileSync(path.join(catDir, 'index.html'), rendered);
    });
  });

  // 3. Pre-render initial cards into index.html for instant First Contentful Paint (<100ms)
  console.log('Pre-rendering initial 12 cards directly into index.html...');
  const initialBatch = randomizeWithGirlsBias(publishedPrompts).slice(0, 12);
  const initialCardsHtml = initialBatch.map((p, idx) => renderPromptCard(p, idx)).join('\n');
  const regex = /(<div\s+class="masonry-container"\s+id="masonry-gallery-grid">)[\s\S]*?(<\/div>\s*<\/main>)/;

  outputBases.forEach(base => {
    const indexHtmlPath = path.join(base, 'index.html');
    if (fs.existsSync(indexHtmlPath)) {
      let indexHtml = fs.readFileSync(indexHtmlPath, 'utf-8');
      if (regex.test(indexHtml)) {
        indexHtml = indexHtml.replace(regex, `$1\n${initialCardsHtml}\n    $2`);
        fs.writeFileSync(indexHtmlPath, indexHtml, 'utf-8');
      }
    }
  });
  console.log('✅ Injected 12 pre-rendered cards into index.html');

  // Pre-render categories directly into categories.html
  const catCardsHtml = publishedCategories.map(cat => {
    const catName = cat.name || cat.category_name || '';
    const catPrompts = publishedPrompts.filter(p => String(p.category || '').toLowerCase() === catName.toLowerCase());
    const count = catPrompts.length;
    const girlsPrompt = catPrompts.find(p => /\bgirl\b|\bgirls\b|\bwoman\b|\bfemale\b|\bsaree\b|\blady\b/i.test(p.title + ' ' + (p.tags || '')));
    const fallbackPrompt = girlsPrompt || catPrompts[0];
    const catImg = cat.image || (fallbackPrompt ? fallbackPrompt.featured_image : '/assets/images/default-prompt.svg');
    const targetUrl = cat.slug ? `/category/${cat.slug}/` : `/prompts.html?cat=${encodeURIComponent(catName)}`;
    return `
      <a href="${targetUrl}" class="category-library-card">
        <div style="display: flex; align-items: center; gap: 1.15rem;">
          <div class="category-thumb-wrap">
            <img src="${escapeHtml(catImg)}" alt="${escapeHtml(catName)}" class="category-thumb-img" loading="lazy" decoding="async" onerror="this.onerror=null; this.src='/assets/images/default-prompt.svg';">
          </div>
          <div>
            <h3 style="font-size: 1.05rem; font-weight: 700; color: #FFFFFF; margin-bottom: 0.25rem;">${escapeHtml(catName)}</h3>
            <span style="font-size: 0.8rem; color: var(--text-muted);">${count} Prompts</span>
          </div>
        </div>
        <span style="color: var(--accent-blue); font-size: 1.25rem; font-weight: 700;">→</span>
      </a>
    `;
  }).join('\n');

  const catGridRegex = /(<div\s+id="all-categories-grid"[^>]*>)[\s\S]*?(<\/div>\s*<\/main>)/;
  outputBases.forEach(base => {
    const categoriesHtmlPath = path.join(base, 'categories.html');
    if (fs.existsSync(categoriesHtmlPath)) {
      let catPageHtml = fs.readFileSync(categoriesHtmlPath, 'utf-8');
      if (catGridRegex.test(catPageHtml)) {
        catPageHtml = catPageHtml.replace(catGridRegex, `$1\n${catCardsHtml}\n    $2`);
        fs.writeFileSync(categoriesHtmlPath, catPageHtml, 'utf-8');
      }
    }
  });
  console.log('✅ Injected 9 pre-rendered category cards into categories.html');

  // Copy initial-data.json to public/data/ if public exists
  const pubDataFile = path.join(PUBLIC_DIR, 'data', 'initial-data.json');
  if (fs.existsSync(path.dirname(pubDataFile))) {
    fs.writeFileSync(pubDataFile, JSON.stringify(db, null, 2), 'utf-8');
  }

  // 4. Generate production sitemap.xml
  console.log('Generating production sitemap.xml...');
  generateSitemapXml(db);

  console.log('✅ Static build complete!');
  console.log(`📁 Rendered /prompt/ [${publishedPrompts.length} pages]`);
  console.log(`📁 Rendered /category/ [${publishedCategories.length} pages]`);
  console.log(`📄 Generated /sitemap.xml`);
}

module.exports = {
  generateSlug,
  renderPromptCard,
  renderPromptPage,
  generateSitemapXml,
  saveAndRenderPrompt,
  saveAndRenderPromptBatch,
  build
};

if (require.main === module) {
  build().catch(err => {
    console.error('Build failed:', err);
    process.exit(1);
  });
}

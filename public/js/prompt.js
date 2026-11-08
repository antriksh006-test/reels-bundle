/**
 * prompt.js - Single Prompt Detail Page Controller, Variable Highlighter & SEO Injector
 */

async function initSinglePromptPage() {
  // Determine slug from either pathname (/prompt/<slug>/) or query param (?slug=...)
  let slug = '';
  const pathname = window.location.pathname;
  const match = pathname.match(/\/prompt\/([^/]+)\/?/);
  
  if (match && match[1]) {
    slug = match[1];
  } else {
    const urlParams = new URLSearchParams(window.location.search);
    slug = urlParams.get('slug') || '';
  }

  // If already statically rendered, we read prompt data from data attributes or API
  const promptData = await API.getPromptBySlug(slug);

  if (!promptData) {
    console.warn('Prompt not found for slug:', slug);
    return;
  }

  // Increment view counter
  API.trackPromptView(promptData.id);

  // Format prompt content by highlighting [VARIABLES]
  const promptContentEl = document.getElementById('prompt-content-target');
  if (promptContentEl) {
    const rawContent = promptData.prompt_content || '';
    const formattedHtml = highlightPromptVariables(rawContent);
    promptContentEl.innerHTML = formattedHtml;
  }

  // Update prompt stats (word count, character count)
  const charCountEl = document.getElementById('prompt-char-count');
  const wordCountEl = document.getElementById('prompt-word-count');
  if (charCountEl) charCountEl.textContent = `${(promptData.prompt_content || '').length} chars`;
  if (wordCountEl) {
    const words = (promptData.prompt_content || '').trim().split(/\s+/).filter(Boolean).length;
    wordCountEl.textContent = `${words} words`;
  }

  // Update Page Metadata & JSON-LD dynamically if needed
  updateDynamicMetadata(promptData);

  // Initialize Sharing & Copy triggers
  Sharing.init(promptData);

  // Render Related Prompts
  renderRelatedPrompts(promptData);

  // Render Previous & Next Links
  renderPrevNextLinks(promptData);
}

/**
 * Highlights [PLACEHOLDER] tokens inside the prompt content
 */
function highlightPromptVariables(text) {
  if (!text) return '';
  const escaped = escapeHtml(text);
  // Match [WORDS_AND_SPACES]
  return escaped.replace(/(\[[A-Z0-9_\s,.-]+\])/g, '<span class="prompt-var">$1</span>');
}

/**
 * Injects Google JSON-LD schema dynamically
 */
function updateDynamicMetadata(p) {
  if (!p) return;

  const siteUrl = window.location.origin;
  const canonicalUrl = `${siteUrl}/prompt/${p.slug}/`;

  // Check or create BreadcrumbList JSON-LD
  let breadcrumbScript = document.getElementById('breadcrumb-jsonld');
  if (!breadcrumbScript) {
    breadcrumbScript = document.createElement('script');
    breadcrumbScript.id = 'breadcrumb-jsonld';
    breadcrumbScript.type = 'application/ld+json';
    document.head.appendChild(breadcrumbScript);
  }

  breadcrumbScript.textContent = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      { "@type": "ListItem", "position": 1, "name": "Home", "item": siteUrl },
      { "@type": "ListItem", "position": 2, "name": p.category || "Categories", "item": `${siteUrl}/category/${String(p.category || 'other').toLowerCase().replace(/\s+/g, '-')}/` },
      { "@type": "ListItem", "position": 3, "name": p.title, "item": canonicalUrl }
    ]
  });

  // CreativeWork / SoftwareApplication Schema
  let promptScript = document.getElementById('prompt-jsonld');
  if (!promptScript) {
    promptScript = document.createElement('script');
    promptScript.id = 'prompt-jsonld';
    promptScript.type = 'application/ld+json';
    document.head.appendChild(promptScript);
  }

  promptScript.textContent = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "CreativeWork",
    "name": p.title,
    "description": p.short_description,
    "text": p.prompt_content,
    "url": canonicalUrl,
    "author": {
      "@type": "Person",
      "name": p.author || "PromptForge Editor"
    },
    "datePublished": p.created_at || "2026-11-01",
    "dateModified": p.updated_at || p.created_at || "2026-11-01",
    "keywords": p.tags
  });
}

/**
 * Renders up to 3 related prompts from the same category
 */
async function renderRelatedPrompts(currentPrompt) {
  const container = document.getElementById('related-prompts-grid');
  if (!container) return;

  const publicData = await API.getPublicData();
  const allPrompts = (publicData.prompts || []).filter(p => String(p.status).toLowerCase() === 'published' && p.id !== currentPrompt.id);

  // Match same category first
  let related = allPrompts.filter(p => String(p.category || '').toLowerCase() === String(currentPrompt.category || '').toLowerCase());
  if (related.length < 3) {
    const additional = allPrompts.filter(p => !related.includes(p));
    related = related.concat(additional);
  }

  const selected = related.slice(0, 3);
  if (selected.length === 0) {
    container.parentElement.style.display = 'none';
    return;
  }

  container.innerHTML = selected.map(p => renderPromptCard(p)).join('');
}

/**
 * Renders previous and next navigation links
 */
async function renderPrevNextLinks(currentPrompt) {
  const container = document.getElementById('prev-next-container');
  if (!container) return;

  const publicData = await API.getPublicData();
  const prompts = (publicData.prompts || []).filter(p => String(p.status).toLowerCase() === 'published');
  
  const currentIndex = prompts.findIndex(p => p.id === currentPrompt.id);
  if (currentIndex === -1) return;

  const prev = currentIndex > 0 ? prompts[currentIndex - 1] : prompts[prompts.length - 1];
  const next = currentIndex < prompts.length - 1 ? prompts[currentIndex + 1] : prompts[0];

  container.innerHTML = `
    <a href="/prompt/${prev.slug}/" class="prev-next-card">
      <span class="prev-next-label">← Previous Prompt</span>
      <span class="prev-next-title">${escapeHtml(prev.title)}</span>
    </a>
    <a href="/prompt/${next.slug}/" class="prev-next-card" style="text-align: right;">
      <span class="prev-next-label">Next Prompt →</span>
      <span class="prev-next-title">${escapeHtml(next.title)}</span>
    </a>
  `;
}

// Auto init on prompt pages
document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('prompt-content-target') || window.location.pathname.includes('/prompt/')) {
    initSinglePromptPage();
  }
});


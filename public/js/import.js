/**
 * import.js — Fully Automatic Bulk Prompt Import for PromptForge Admin
 *
 * Zero manual input needed. Paste scraped data or JSON → import.
 * Everything (title, slug, category, image, description) is auto-detected.
 */

const ImportTool = {

  queue: [],
  activeTab: 'scraped',

  // ─── Category map: URL path segment → Category name ──────────────────────
  // Covers promptpin.in and similar sites automatically
  CATEGORY_MAP: {
    'cinematic':       'Cinematic',
    'portrait':        'Portrait',
    'aesthetic':       'Aesthetic',
    'selfie':          'Selfie',
    'festival':        'Festival',
    'birthday':        'Birthday',
    'couple':          'Couple',
    'travel':          'Travel',
    'ai-photo':        'AI Photo',
    'photo':           'AI Photo',
    'templates':       'Templates',
    'template':        'Templates',
    'chatgpt':         'ChatGPT Prompts',
    'marketing':       'Marketing',
    'seo':             'SEO',
    'copywriting':     'Copywriting',
    'business':        'Business',
    'programming':     'Programming',
    'writing':         'Writing',
    'social-media':    'Social Media',
    'instagram':       'Instagram',
    'youtube':         'YouTube',
    'midjourney':      'Midjourney',
    'image-generation':'Image Generation',
    'productivity':    'Productivity',
    'education':       'Education',
    'research':        'Research',
    'email':           'Email Marketing',
    'sales':           'Sales',
    'career':          'Career Development',
    'design':          'Graphic Design',
    'web':             'Web Development',
    'automation':      'Automation',
    'finance':         'Finance',
    'health':          'Health and Fitness',
    'fitness':         'Health and Fitness',
    'real-estate':     'Real Estate',
    'ecommerce':       'E-commerce',
    'video':           'Video Generation',
  },

  // ─── Tab switcher ─────────────────────────────────────────────────────────
  showTab(tab) {
    this.activeTab = tab;
    document.getElementById('import-panel-scraped').style.display = tab === 'scraped' ? '' : 'none';
    document.getElementById('import-panel-json').style.display    = tab === 'json'    ? '' : 'none';
    document.getElementById('import-tab-scraped').className = 'btn btn-sm ' + (tab === 'scraped' ? 'btn-primary' : 'btn-secondary');
    document.getElementById('import-tab-json').className    = 'btn btn-sm ' + (tab === 'json'    ? 'btn-primary' : 'btn-secondary');
  },

  // ─── Slug generator ───────────────────────────────────────────────────────
  makeSlug(text) {
    return (text || '')
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .trim()
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .substring(0, 80);
  },

  // ─── Auto-detect category from URL path ──────────────────────────────────
  // e.g. https://promptpin.in/cinematic/anime-flashlight/ → "Cinematic"
  detectCategory(url) {
    if (!url) return 'Other';
    try {
      const segments = new URL(url).pathname
        .replace(/^\/|\/$/g, '')
        .split('/')
        .filter(Boolean);

      // First segment is usually the category
      for (const seg of segments.slice(0, 2)) {
        const lower = seg.toLowerCase();
        if (this.CATEGORY_MAP[lower]) return this.CATEGORY_MAP[lower];
        // Try partial match
        for (const [key, val] of Object.entries(this.CATEGORY_MAP)) {
          if (lower.includes(key) || key.includes(lower)) return val;
        }
        // Capitalize as fallback
        if (seg && seg !== segments[segments.length - 1]) {
          return seg.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
        }
      }
    } catch (e) {}
    return 'Other';
  },

  // ─── Auto-detect slug from URL ────────────────────────────────────────────
  slugFromUrl(url, title) {
    if (url) {
      try {
        const parts = new URL(url).pathname.replace(/^\/|\/$/g, '').split('/').filter(Boolean);
        const last = parts[parts.length - 1];
        if (last && last.length > 2) return last;
      } catch (e) {}
    }
    return this.makeSlug(title || '');
  },

  // ─── Auto-generate short description from title if missing ───────────────
  autoDescription(title, category) {
    if (!title) return '';
    const cat = category || '';
    return `Free ${title}${cat ? ' for ' + cat.toLowerCase() : ''} — copy the exact prompt and use it in ChatGPT, Midjourney, or any AI tool.`;
  },

  // ─── Parse scraped text format ────────────────────────────────────────────
  parseScrapedText(raw) {
    // Split on separator lines (10+ = signs or dashes)
    const blocks = raw.split(/[=\-]{8,}/).map(b => b.trim()).filter(Boolean);
    const results = [];

    for (const block of blocks) {
      const lines = block.split('\n');
      const obj = { url: '', title: '', description: '', image: '', content: '' };
      let inContent = false;
      const contentLines = [];

      for (const line of lines) {
        if (!inContent) {
          if (/^URL\s*:/i.test(line)) {
            obj.url = line.replace(/^URL\s*:\s*/i, '').trim();
          } else if (/^Title\s*:/i.test(line)) {
            obj.title = line.replace(/^Title\s*:\s*/i, '').trim();
          } else if (/^Description\s*:/i.test(line)) {
            obj.description = line.replace(/^Description\s*:\s*/i, '').trim();
          } else if (/^Image\s*(Link|URL|Url)?\s*:/i.test(line)) {
            obj.image = line.replace(/^Image\s*(Link|URL|Url)?\s*:\s*/i, '').trim();
          } else if (/^Prompt\s*(\/\s*Details?|Details?|Content)?\s*:/i.test(line.trim())) {
            // Everything after this is the prompt
            inContent = true;
            // Check if there's content on the same line after the colon
            const afterColon = line.replace(/^Prompt\s*(\/\s*Details?|Details?|Content)?\s*:\s*/i, '').trim();
            if (afterColon) contentLines.push(afterColon);
          }
        } else {
          contentLines.push(line);
        }
      }

      obj.content = contentLines.join('\n').trim();

      // Skip empty blocks
      if (!obj.title && !obj.content) continue;

      const category    = this.detectCategory(obj.url);
      const slug        = this.slugFromUrl(obj.url, obj.title);
      const description = obj.description || this.autoDescription(obj.title, category);

      results.push({
        title:             obj.title || slug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
        slug,
        short_description: description,
        prompt_content:    obj.content,
        featured_image:    obj.image,
        category,
        subcategory:       '',
        tags:              this._autoTags(obj.title, category),
        author:            'PromptForge Editor',
        status:            'published',
        featured:          false,
      });
    }

    return results;
  },

  // ─── Auto-generate tags from title + category ─────────────────────────────
  _autoTags(title, category) {
    const tags = [];
    if (category && category !== 'Other') tags.push(category.toLowerCase().replace(/\s+/g, '-'));
    // Extract meaningful words from title
    const stopWords = new Set(['for','the','a','an','and','or','of','in','on','at','to','with','by','from','ai','photo','prompt']);
    (title || '').toLowerCase().split(/\s+/).forEach(w => {
      const clean = w.replace(/[^a-z0-9]/g, '');
      if (clean.length > 3 && !stopWords.has(clean)) tags.push(clean);
    });
    return [...new Set(tags)].slice(0, 6).join(', ');
  },

  // ─── Parse & show preview ─────────────────────────────────────────────────
  parseScraped() {
    const raw = (document.getElementById('import-scraped-input').value || '').trim();
    if (!raw) { window.showToast('Paste some data first.', 'error'); return; }

    const parsed = this.parseScrapedText(raw);
    const countEl = document.getElementById('import-scraped-count');

    if (!parsed.length) {
      countEl.textContent = '⚠ No valid prompts found. Check format.';
      countEl.style.color = '#FCA5A5';
      return;
    }

    countEl.textContent = `✓ ${parsed.length} prompt(s) parsed`;
    countEl.style.color = '#34D399';
    this.queue = parsed;
    this.renderPreview();
  },

  // ─── Parse JSON ───────────────────────────────────────────────────────────
  parseJSON() {
    const raw = (document.getElementById('import-json-input').value || '').trim();
    const countEl = document.getElementById('import-json-count');
    if (!raw) { window.showToast('Paste JSON first.', 'error'); return; }

    let arr;
    try { arr = JSON.parse(raw); }
    catch (e) {
      countEl.textContent = '✗ Invalid JSON: ' + e.message;
      countEl.style.color = '#FCA5A5';
      return;
    }
    if (!Array.isArray(arr)) {
      countEl.textContent = '✗ Must be a JSON array [ ... ]';
      countEl.style.color = '#FCA5A5';
      return;
    }

    const parsed = arr.map(item => {
      const title    = item.title || item.name || '';
      const category = item.category || this.detectCategory(item.url || '') || 'Other';
      return {
        title,
        slug:              item.slug || this.slugFromUrl(item.url, title),
        short_description: item.short_description || item.description || this.autoDescription(title, category),
        prompt_content:    item.prompt_content || item.content || item.prompt || '',
        featured_image:    item.featured_image || item.image || item.image_url || '',
        category,
        subcategory:       item.subcategory || '',
        tags:              Array.isArray(item.tags) ? item.tags.join(', ') : (item.tags || this._autoTags(title, category)),
        author:            item.author || 'PromptForge Editor',
        status:            item.status || 'published',
        featured:          !!item.featured,
      };
    }).filter(p => p.title || p.prompt_content);

    if (!parsed.length) {
      countEl.textContent = '⚠ No valid prompts found.';
      countEl.style.color = '#FCA5A5';
      return;
    }
    countEl.textContent = `✓ ${parsed.length} prompt(s) parsed`;
    countEl.style.color = '#34D399';
    this.queue = parsed;
    this.renderPreview();
  },

  // ─── Parse & import directly (no preview step) ───────────────────────────
  async parseAndImport() {
    const raw = (document.getElementById('import-scraped-input').value || '').trim();
    if (!raw) { window.showToast('Paste some data first.', 'error'); return; }
    this.queue = this.parseScrapedText(raw);
    if (!this.queue.length) { window.showToast('No valid prompts found.', 'error'); return; }
    document.getElementById('import-scraped-count').textContent = `✓ ${this.queue.length} parsed — importing now...`;
    document.getElementById('import-scraped-count').style.color = '#FBBF24';
    await this.doImport();
  },

  async parseAndImportJSON() {
    this.parseJSON();
    if (!this.queue.length) return;
    await this.doImport();
  },

  // ─── Render preview table ─────────────────────────────────────────────────
  renderPreview() {
    const section = document.getElementById('import-preview-section');
    const tbody   = document.getElementById('import-preview-tbody');
    document.getElementById('import-preview-count').textContent = this.queue.length;
    section.style.display = this.queue.length ? '' : 'none';

    tbody.innerHTML = this.queue.map((p, i) => `
      <tr id="import-row-${i}">
        <td style="color:#64748B;">${i + 1}</td>
        <td>
          <strong style="color:#E2E8F0;">${escapeHtml(p.title || '—')}</strong>
          ${p.short_description ? `<div style="font-size:0.72rem;color:#64748B;margin-top:2px;">${escapeHtml(p.short_description.substring(0,80))}...</div>` : ''}
        </td>
        <td><code style="font-size:0.73rem;color:#A5B4FC;">${escapeHtml(p.slug)}</code></td>
        <td><span style="font-size:0.78rem;color:#34D399;">${escapeHtml(p.category)}</span></td>
        <td>
          ${p.featured_image
            ? `<img src="${escapeHtml(p.featured_image)}" style="width:44px;height:33px;object-fit:cover;border-radius:4px;" loading="lazy" onerror="this.style.display='none'">`
            : '<span style="color:#475569;font-size:0.72rem;">—</span>'}
        </td>
        <td style="font-size:0.75rem;color:#94A3B8;">${p.prompt_content.length.toLocaleString()} chars</td>
        <td>
          <button onclick="ImportTool.removeItem(${i})"
            style="background:rgba(239,68,68,0.15);color:#FCA5A5;border:none;border-radius:6px;padding:3px 8px;cursor:pointer;font-size:0.8rem;">✕</button>
        </td>
      </tr>
    `).join('');
  },

  removeItem(i) {
    this.queue.splice(i, 1);
    this.renderPreview();
  },

  clearPreview() {
    this.queue = [];
    document.getElementById('import-preview-section').style.display = 'none';
    document.getElementById('import-scraped-count').textContent = '';
    document.getElementById('import-json-count').textContent    = '';
  },

  // ─── Do the actual import ─────────────────────────────────────────────────
  async doImport() {
    if (!this.queue.length) { window.showToast('Nothing to import.', 'error'); return; }

    const btn      = document.getElementById('btn-do-import');
    const progBar  = document.getElementById('import-progress-bar');
    const progFill = document.getElementById('import-progress-fill');
    const progText = document.getElementById('import-progress-text');

    if (btn) { btn.disabled = true; btn.textContent = 'Importing Bulk Data…'; }
    if (progBar) progBar.style.display = '';

    const total = this.queue.length;
    const now = new Date().toISOString();

    const preparedBatch = this.queue.map(p => ({
      title:             p.title,
      slug:              p.slug || this.makeSlug(p.title),
      short_description: p.short_description || '',
      full_description:  '',
      prompt_content:    p.prompt_content || '',
      category:          p.category || 'Other',
      subcategory:       p.subcategory || '',
      tags:              p.tags || '',
      featured_image:    p.featured_image || '',
      author:            p.author || 'PromptForge Editor',
      seo_title:         p.title + ' | PromptForge',
      seo_description:   p.short_description || '',
      canonical_url:     '',
      status:            p.status || 'published',
      featured:          p.featured ? 'true' : 'false',
      created_at:        now,
      updated_at:        now,
      views:             0,
      copy_count:        0,
    }));

    let success = 0, failed = 0;

    // Fast Batch Processing via API
    try {
      if (progText) progText.textContent = `Processing bulk batch of ${total} prompts...`;
      if (progFill) progFill.style.width = '45%';

      const batchRes = await API.batchImportPrompts(preparedBatch);
      if (batchRes && batchRes.success) {
        success = batchRes.count || total;
        if (progFill) progFill.style.width = '100%';
        if (progText) {
          progText.textContent = `✓ Done! ${success} prompts imported with individual pages & sitemap updated.`;
          progText.style.color = '#34D399';
        }
        for (let i = 0; i < total; i++) {
          const row = document.getElementById(`import-row-${i}`);
          if (row) row.style.background = 'rgba(52,211,153,0.08)';
        }
        if (btn) { btn.disabled = false; btn.textContent = 'Import More Prompts'; }
        window.showToast(`Bulk import complete! ${success} pages generated & sitemap updated 🚀`);
        if (window.AdminApp) AdminApp.loadDashboardData();
        return;
      }
    } catch (batchErr) {
      console.warn('Batch import fallback to sequential:', batchErr);
    }

    // Sequential fallback if batch failed
    for (let i = 0; i < total; i++) {
      const promptObj = preparedBatch[i];
      const row = document.getElementById(`import-row-${i}`);

      if (progFill) progFill.style.width = `${Math.round((i / total) * 100)}%`;
      if (progText) progText.textContent = `Importing ${i + 1} / ${total}: "${promptObj.title}"`;

      try {
        const result = await API.savePrompt(promptObj);
        if (result && result.success) {
          success++;
          if (row) row.style.background = 'rgba(52,211,153,0.08)';
        } else {
          failed++;
          if (row) row.style.background = 'rgba(239,68,68,0.08)';
        }
      } catch (e) {
        failed++;
        if (row) row.style.background = 'rgba(239,68,68,0.08)';
        console.error('Import error:', promptObj.title, e);
      }

      await new Promise(r => setTimeout(r, 200));
    }

    if (progFill) progFill.style.width = '100%';
    if (progText) {
      progText.textContent = `✓ Done! ${success} imported${failed ? ', ' + failed + ' failed' : ''}.`;
      progText.style.color = failed ? '#FBBF24' : '#34D399';
    }
    if (btn) { btn.disabled = false; btn.textContent = 'Import More Prompts'; }

    window.showToast(`Import complete: ${success} saved${failed ? ', ' + failed + ' failed' : ''}.`);

    // Refresh prompts list in background
    if (window.AdminApp) AdminApp.loadDashboardData();
  },
};

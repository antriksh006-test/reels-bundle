/**
 * main.js - PromptForge Core Controller
 * Premium Dark Mode UI, Pinterest-Style Masonry Grid, Category Filters & Full-Screen Search Modal
 */

// Animated Toast Notification Engine (Luxury Micro-Feedback)
window.showToast = function(message, subtitleOrType, customType = 'success') {
  let subtitle = '';
  let type = customType;

  if (typeof subtitleOrType === 'string') {
    if (['success', 'info', 'error'].includes(subtitleOrType.toLowerCase())) {
      type = subtitleOrType.toLowerCase();
    } else {
      subtitle = subtitleOrType;
    }
  }

  // Sensible default subtitle for prompt copying
  if (!subtitle && typeof message === 'string' && message.toLowerCase().includes('copi')) {
    subtitle = 'Ready to paste into ChatGPT, Gemini, or Midjourney';
  }

  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    container.className = 'toast-container';
    document.body.appendChild(container);
  }

  // Clear previous toasts so only 1 prominent message displays at a time
  container.innerHTML = '';

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;

  const iconSvg = type === 'error'
    ? `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>`
    : type === 'info'
    ? `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>`
    : `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.8"><polyline points="20 6 9 17 4 12"/></svg>`;

  toast.innerHTML = `
    <div class="toast-icon-circle">
      ${iconSvg}
    </div>
    <div class="toast-body">
      <div class="toast-title-line">
        <span>${escapeHtml(message)}</span>
        <span class="toast-sparkle-icon">✨</span>
      </div>
      ${subtitle ? `<div class="toast-subtitle-line">${escapeHtml(subtitle)}</div>` : ''}
    </div>
    <div class="toast-progress-track">
      <div class="toast-progress-bar"></div>
    </div>
  `;

  // Dismiss on click
  toast.addEventListener('click', () => {
    dismissToast(toast);
  });

  container.appendChild(toast);

  const timer = setTimeout(() => {
    dismissToast(toast);
  }, 4500);

  function dismissToast(el) {
    clearTimeout(timer);
    el.classList.add('toast-hiding');
    setTimeout(() => el.remove(), 320);
  }
};

// HTML Escaping Utility
function escapeHtml(text) {
  if (!text) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// Dark / Light Theme Controller
function initTheme() {
  const savedTheme = localStorage.getItem(APP_CONFIG.STORAGE_KEYS.THEME) || APP_CONFIG.DEFAULT_THEME;
  document.documentElement.setAttribute('data-theme', savedTheme);

  document.querySelectorAll('.theme-toggle').forEach(btn => {
    btn.addEventListener('click', () => {
      const current = document.documentElement.getAttribute('data-theme');
      const next = current === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', next);
      localStorage.setItem(APP_CONFIG.STORAGE_KEYS.THEME, next);
      window.showToast(`Switched to ${next} mode`);
    });
  });
}

// Global Card Quick-Copy Handler
function initCopyDelegation() {
  document.addEventListener('click', async (e) => {
    const copyBtn = e.target.closest('.btn-card-copy, .btn-copy');
    if (!copyBtn) return;

    // Detail page buttons have dedicated handlers
    if (copyBtn.id === 'master-copy-prompt-btn' || copyBtn.id === 'secondary-copy-prompt-btn') {
      return;
    }

    e.preventDefault();
    e.stopPropagation();

    const promptId = copyBtn.dataset.id;
    let contentToCopy = copyBtn.dataset.content;

    if (!contentToCopy && promptId) {
      const publicData = await API.getPublicData();
      const item = (publicData.prompts || []).find(p => p.id === promptId);
      if (item) contentToCopy = item.prompt_content;
    }

    if (contentToCopy) {
      try {
        await navigator.clipboard.writeText(contentToCopy);
        const originalHtml = copyBtn.innerHTML;
        copyBtn.classList.add('copied');
        copyBtn.innerHTML = `
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>
          <span>Copied!</span>
        `;
        window.showToast('Prompt Copied to Clipboard!', 'Ready to paste into ChatGPT, Gemini, or Midjourney', 'success');

        if (promptId && typeof API !== 'undefined' && API.trackPromptCopy) {
          API.trackPromptCopy(promptId);
        }

        setTimeout(() => {
          copyBtn.classList.remove('copied');
          copyBtn.innerHTML = originalHtml;
        }, 2200);
      } catch (err) {
        window.showToast('Please copy the prompt manually.', 'info');
      }
    }
  }, true);
}

// Masonry Card Renderer (Reference Screenshot 2)
function renderMasonryCard(p, index) {
  const promptUrl = `/prompt/${p.slug}/`;
  const imgUrl = p.featured_image || '/assets/images/default-prompt.svg';
  const category = p.category || 'AI Photo';

  // Photo count indicator: simulate realistic count (e.g. 2, 4, 7 as in screenshot)
  const count = (p.id.charCodeAt(p.id.length - 1) % 5) + 2;
  const isNew = index < 6;
  const isPremium = p.featured || String(p.featured).toLowerCase() === 'true' || index % 4 === 0;
  const isTrending = p.trending === true || String(p.trending).toLowerCase() === 'true';
  const priority = index < 4 ? 'high' : 'low';

  return `
    <article class="prompt-masonry-card" data-id="${p.id}" data-category="${escapeHtml(category.toLowerCase())}" onclick="if (!event.target.closest('.btn-card-copy')) window.location.href='${promptUrl}'">
      <a href="${promptUrl}" class="card-img-wrap" aria-label="${escapeHtml(p.title)}">
        <img src="${escapeHtml(imgUrl)}" alt="${escapeHtml(p.title)}" loading="lazy" decoding="async" fetchpriority="${priority}" onerror="this.onerror=null; this.src='/assets/images/default-prompt.svg';">

        <!-- Top Left Badges: Trending / New / Category -->
        <div class="card-top-left-badges">
          ${isTrending ? '<span class="badge-trending-glow" title="Trending Prompt">🔥 Trending</span>' : ''}
          ${isNew && !isTrending ? '<span class="badge-new-glow">✦ New</span>' : ''}
          <span class="badge-cat-tag">${escapeHtml(category)}</span>
        </div>

        <!-- Top Right Badges: Photo count indicator [🖼️ count] & optional crown -->
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

// Homepage Controller with Progressive Rendering & Infinite Scroll
let homeAllPrompts = [];
let homeAllCategories = [];
const GALLERY_BATCH_SIZE = 12;
const MAX_AUTO_SCROLL_BATCHES = 2; // Automatically load up to 2 scroll batches, then ask the user
let autoScrollBatchCount = 0;
let currentDisplayedCount = 0;
let currentFilterPrompts = [];
let galleryObserver = null;

async function initHomePage() {
  const data = await API.getPublicData();

  // Filter out dummy/sample prompts (like p_001) so only user's prompts show
  const rawPrompts = (data.prompts || []).filter(p =>
    String(p.status).toLowerCase() === 'published' &&
    p.id !== 'p_001' &&
    !p.title.includes('ChatGPT SEO Blog Writer')
  );

  // Randomize all prompts with high bias towards girls side on every visit/refresh
  homeAllPrompts = randomizeWithGirlsBias(rawPrompts);
  currentFilterPrompts = homeAllPrompts;

  homeAllCategories = data.categories || [];

  const galleryGrid = document.getElementById('masonry-gallery-grid');
  if (galleryGrid) {
    // Dynamically render the freshly randomized, girls-biased gallery on every visit
    renderGallery(homeAllPrompts, true);
  }

  // Populate Libraries in the Full-Screen Search Modal (Screenshot 4)
  populateLibrariesModal(homeAllPrompts);

  // Initialize Category Pill Filter (Screenshot 2)
  initCategoryPills();

  // Popular search keywords click handler
  initPopularSearchClicks();

  // Full-screen Search Modal Handlers (Screenshot 4)
  initSearchModal();

  // Floating Back to Top Button
  initBackToTop();

  // Listen for background data updates
  window.addEventListener('promptforge:data-updated', (e) => {
    if (e.detail && Array.isArray(e.detail.prompts)) {
      const updated = e.detail.prompts.filter(p =>
        String(p.status).toLowerCase() === 'published' &&
        p.id !== 'p_001' &&
        !p.title.includes('ChatGPT SEO Blog Writer')
      );
      homeAllPrompts = randomizeWithGirlsBias(updated);
      homeAllCategories = e.detail.categories || homeAllCategories;
      populateLibrariesModal(homeAllPrompts);
    }
  });
}

function renderGallery(promptsToDisplay, reset = true) {
  const galleryGrid = document.getElementById('masonry-gallery-grid');
  if (!galleryGrid) return;

  if (reset) {
    currentFilterPrompts = promptsToDisplay;
    currentDisplayedCount = 0;
    autoScrollBatchCount = 0; // Reset auto-scroll counter on filter or search reset
    galleryGrid.innerHTML = '';
    removeSentinelAndButtons();
  }

  if (currentFilterPrompts.length === 0) {
    galleryGrid.innerHTML = `
      <div style="grid-column: 1 / -1; text-align: center; padding: 4rem 1rem; color: var(--text-secondary);">
        <p style="font-size: 1.1rem; font-weight: 600; margin-bottom: 0.5rem;">No prompts found</p>
        <p style="font-size: 0.88rem; color: var(--text-muted);">Try a different search term or category filter.</p>
      </div>
    `;
    removeSentinelAndButtons();
    return;
  }

  const nextBatch = currentFilterPrompts.slice(currentDisplayedCount, currentDisplayedCount + GALLERY_BATCH_SIZE);
  if (nextBatch.length > 0) {
    const html = nextBatch.map((p, i) => renderMasonryCard(p, currentDisplayedCount + i)).join('');
    galleryGrid.insertAdjacentHTML('beforeend', html);
    currentDisplayedCount += nextBatch.length;
  }

  setupSentinel();
}

function removeSentinelAndButtons() {
  const sentinel = document.getElementById('gallery-scroll-sentinel');
  if (sentinel) sentinel.remove();
  const loadMore = document.getElementById('gallery-load-more-wrap');
  if (loadMore) loadMore.remove();

  if (galleryObserver) {
    galleryObserver.disconnect();
    galleryObserver = null;
  }
}

function setupSentinel() {
  removeSentinelAndButtons();

  // If all items in this filter are displayed, show completion pill
  if (currentDisplayedCount >= currentFilterPrompts.length) {
    showAllLoadedIndicator();
    return;
  }

  // After 2 automatic scrolls (e.g. 12 + 12 + 12 = 36 prompts), pause and ASK the user
  if (autoScrollBatchCount >= MAX_AUTO_SCROLL_BATCHES) {
    showLoadMoreButton();
    return;
  }

  // Automatic infinite scroll sentinel (active for the first 2 scrolls)
  let sentinel = document.createElement('div');
  sentinel.id = 'gallery-scroll-sentinel';
  sentinel.className = 'gallery-scroll-sentinel';
  sentinel.innerHTML = `
    <div class="sentinel-loader" title="Loading more prompts...">
      <span class="sentinel-dot"></span>
      <span class="sentinel-dot"></span>
      <span class="sentinel-dot"></span>
    </div>
  `;
  const galleryGrid = document.getElementById('masonry-gallery-grid');
  if (galleryGrid && galleryGrid.parentElement) {
    galleryGrid.parentElement.appendChild(sentinel);
  }

  galleryObserver = new IntersectionObserver((entries) => {
    if (entries[0].isIntersecting) {
      if (currentDisplayedCount < currentFilterPrompts.length) {
        autoScrollBatchCount++;
        requestAnimationFrame(() => {
          renderGallery(currentFilterPrompts, false);
        });
      }
    }
  }, {
    rootMargin: '400px'
  });

  galleryObserver.observe(sentinel);
}

function showLoadMoreButton() {
  removeSentinelAndButtons();

  const total = currentFilterPrompts.length;
  const wrap = document.createElement('div');
  wrap.id = 'gallery-load-more-wrap';
  wrap.className = 'gallery-load-more-wrap';
  wrap.innerHTML = `
    <div class="load-more-box">
      <button class="btn-load-more-prompts" id="btn-manual-load-more" title="Click to view more prompts">
        <span>Load More Prompts</span>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
          <polyline points="6 9 12 15 18 9"/>
        </svg>
      </button>
      <p class="load-more-status-text">Showing <strong>${currentDisplayedCount}</strong> of <strong>${total}</strong> prompts</p>
    </div>
  `;

  const galleryGrid = document.getElementById('masonry-gallery-grid');
  if (galleryGrid && galleryGrid.parentElement) {
    galleryGrid.parentElement.appendChild(wrap);
  }

  const btn = document.getElementById('btn-manual-load-more');
  if (btn) {
    btn.addEventListener('click', () => {
      btn.innerHTML = `<span>Loading...</span>`;
      btn.style.opacity = '0.7';
      btn.disabled = true;
      setTimeout(() => {
        // Increment count so user can choose to load another batch on next click
        renderGallery(currentFilterPrompts, false);
      }, 150);
    });
  }
}

function showAllLoadedIndicator() {
  removeSentinelAndButtons();

  const total = currentFilterPrompts.length;
  if (total <= 6) return; // Don't show footer pill if very few items

  const wrap = document.createElement('div');
  wrap.id = 'gallery-load-more-wrap';
  wrap.className = 'gallery-load-more-wrap';
  wrap.innerHTML = `
    <div class="all-loaded-box">
      <span class="all-loaded-pill">✓ You've viewed all ${total} prompts</span>
    </div>
  `;

  const galleryGrid = document.getElementById('masonry-gallery-grid');
  if (galleryGrid && galleryGrid.parentElement) {
    galleryGrid.parentElement.appendChild(wrap);
  }
}

// Fisher-Yates array shuffle utility
function shuffleArray(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Check if a prompt is girl/female-focused
function isGirlPrompt(p) {
  const text = ((p.title || '') + ' ' + (p.tags || '') + ' ' + (p.short_description || '') + ' ' + (p.prompt_content || '')).toLowerCase();
  const hasGirl = /\b(girl|girls|woman|women|female|saree|lady|she|her|bride|model|queen|princess|actress|femme|mulher|garota)\b/.test(text);
  const hasBoy = /\b(boy|boys|man|men|male|guy|gentleman|homem|ele)\b/.test(text);
  return hasGirl && !hasBoy;
}

function getGenderScore(p) {
  if (isGirlPrompt(p)) return 3;
  const text = ((p.title || '') + ' ' + (p.tags || '') + ' ' + (p.short_description || '')).toLowerCase();
  const isCouple = /\bcouple\b|\bromantic\b|\bwedding\b/.test(text);
  if (isCouple) return 2;
  return 1;
}

// Randomize prompts with heavy bias towards girls side (~80% girls, fresh shuffle on every visit)
function randomizeWithGirlsBias(promptsList) {
  if (!promptsList || promptsList.length <= 1) return promptsList || [];

  const girls = shuffleArray(promptsList.filter(p => isGirlPrompt(p)));
  const others = shuffleArray(promptsList.filter(p => !isGirlPrompt(p)));

  const result = [];
  let gIdx = 0;
  let oIdx = 0;

  // The first 6 items are ALWAYS stunning randomly selected girls prompts
  while (gIdx < Math.min(6, girls.length)) {
    result.push(girls[gIdx++]);
  }

  // Interleave remaining: 3 girls prompts for every 1 other prompt (75-80% girls bias)
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

// Helper to prioritize Girls prompts across feeds and views
function prioritizeGirlsPrompts(list) {
  return randomizeWithGirlsBias(list);
}

// Category Navigation Pill Handler (Screenshot 2: Latest, Trending, Popular, Premium)
function initCategoryPills() {
  const pillButtons = document.querySelectorAll('.cat-pill-item');
  pillButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      pillButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      const tab = btn.dataset.tab;
      let filtered = [...homeAllPrompts];

      if (tab === 'latest') {
        filtered = prioritizeGirlsPrompts(filtered);
      } else if (tab === 'trending') {
        filtered.sort((a, b) => {
          const aTrend = (a.trending === true || String(a.trending).toLowerCase() === 'true') ? 1 : 0;
          const bTrend = (b.trending === true || String(b.trending).toLowerCase() === 'true') ? 1 : 0;
          if (bTrend !== aTrend) return bTrend - aTrend;
          const gDiff = getGenderScore(b) - getGenderScore(a);
          if (gDiff !== 0) return gDiff;
          return (Number(b.copy_count) || 0) - (Number(a.copy_count) || 0);
        });
      } else if (tab === 'popular') {
        filtered = filtered.filter(p => ['portrait', 'cinematic', 'aesthetic'].includes((p.category || '').toLowerCase()));
        if (filtered.length === 0) filtered = [...homeAllPrompts];
        filtered = prioritizeGirlsPrompts(filtered);
      } else if (tab === 'premium') {
        filtered = filtered.filter(p => p.featured || String(p.featured).toLowerCase() === 'true' || (p.prompt_content && p.prompt_content.length > 1000));
        if (filtered.length === 0) filtered = [...homeAllPrompts];
        filtered = prioritizeGirlsPrompts(filtered);
      }

      renderGallery(filtered);
    });
  });

  // Premium Header Button click shortcut
  const headerPremBtn = document.getElementById('btn-header-premium');
  if (headerPremBtn) {
    headerPremBtn.addEventListener('click', () => {
      const premPill = document.querySelector('.cat-pill-item.pill-premium');
      if (premPill) premPill.click();
      const gallery = document.getElementById('gallery-section');
      if (gallery) gallery.scrollIntoView({ behavior: 'smooth' });
    });
  }
}

// Popular Search Keywords Handler
function initPopularSearchClicks() {
  document.querySelectorAll('[data-filter-tag]').forEach(el => {
    el.addEventListener('click', () => {
      const tag = el.dataset.filterTag.toLowerCase();
      const filtered = homeAllPrompts.filter(p => {
        const title = (p.title || '').toLowerCase();
        const desc = (p.short_description || '').toLowerCase();
        const cat = (p.category || '').toLowerCase();
        const tags = (p.tags || '').toLowerCase();
        return title.includes(tag) || desc.includes(tag) || cat.includes(tag) || tags.includes(tag);
      });
      renderGallery(filtered);
      const gallery = document.getElementById('gallery-section');
      if (gallery) gallery.scrollIntoView({ behavior: 'smooth' });
      window.showToast(`Showing prompts for "${el.dataset.filterTag}"`);
    });
  });
}

// Full-Screen Search & Library Modal (Screenshot 4)
function initSearchModal() {
  const modal = document.getElementById('search-fullscreen-modal');
  const openBtn = document.getElementById('btn-open-search-modal');
  const closeBtn = document.getElementById('btn-close-search-modal');
  const closeBtnBottom = document.getElementById('btn-close-search-modal-bottom');
  const heroTrigger = document.getElementById('hero-search-trigger');
  const heroInput = document.getElementById('hero-quick-search-input');
  const modalInput = document.getElementById('modal-library-search-input');
  const headerSearchWrap = document.getElementById('header-search-wrap');
  const headerSearchInput = document.getElementById('header-search-input');

  function openModal(initialQuery = '') {
    if (!modal) return;
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
    if (modalInput) {
      modalInput.value = initialQuery;
      setTimeout(() => modalInput.focus(), 100);
      handleModalSearch(initialQuery);
    }
  }

  function closeModal() {
    if (!modal) return;
    modal.classList.remove('active');
    document.body.style.overflow = '';
    if (headerSearchInput) headerSearchInput.blur();
  }

  if (openBtn) openBtn.addEventListener('click', () => openModal(''));
  if (closeBtn) closeBtn.addEventListener('click', closeModal);
  if (closeBtnBottom) closeBtnBottom.addEventListener('click', closeModal);

  // Center Header Search Pill Handlers
  if (headerSearchWrap) {
    headerSearchWrap.addEventListener('click', () => {
      if (modal) {
        openModal(headerSearchInput ? headerSearchInput.value : '');
      } else {
        window.location.href = '/prompts.html';
      }
    });
  }

  if (headerSearchInput) {
    headerSearchInput.addEventListener('focus', () => {
      if (modal) {
        openModal(headerSearchInput.value);
      } else {
        window.location.href = '/prompts.html';
      }
    });
    headerSearchInput.addEventListener('input', () => {
      if (modal) openModal(headerSearchInput.value);
    });
    headerSearchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        const q = headerSearchInput.value.trim();
        window.location.href = q ? `/prompts.html?q=${encodeURIComponent(q)}` : '/prompts.html';
      }
    });
  }

  // Ctrl+K / Cmd+K Global Shortcut
  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      if (modal) {
        openModal(headerSearchInput ? headerSearchInput.value : '');
      } else {
        window.location.href = '/prompts.html';
      }
    }
  });

  // Trigger modal when user clicks or types in hero search bar
  if (heroTrigger) {
    heroTrigger.addEventListener('click', (e) => {
      if (e.target.id === 'hero-quick-search-input') return;
      openModal(heroInput ? heroInput.value : '');
    });
  }
  if (heroInput) {
    heroInput.addEventListener('focus', () => openModal(heroInput.value));
    heroInput.addEventListener('input', () => openModal(heroInput.value));
  }

  // Click outside card to close
  if (modal) {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeModal();
    });
  }

  // ESC to close
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal && modal.classList.contains('active')) {
      closeModal();
    }
  });

  // Live Search in Modal
  if (modalInput) {
    modalInput.addEventListener('input', () => {
      handleModalSearch(modalInput.value.trim());
    });
  }
}

function handleModalSearch(query) {
  const liveResults = document.getElementById('modal-search-live-results');
  const librariesList = document.getElementById('modal-libraries-list');
  if (!liveResults || !librariesList) return;

  const q = query.toLowerCase();

  // If query is empty, show full library list and hide live prompt results
  if (q.length === 0) {
    liveResults.style.display = 'none';
    liveResults.innerHTML = '';
    librariesList.querySelectorAll('.library-item-row').forEach(row => {
      row.style.display = 'flex';
    });
    return;
  }

  // Filter libraries list
  librariesList.querySelectorAll('.library-item-row').forEach(row => {
    const name = (row.dataset.libraryName || '').toLowerCase();
    row.style.display = name.includes(q) ? 'flex' : 'none';
  });

  // Search prompts
  const matches = homeAllPrompts.filter(p => {
    const title = (p.title || '').toLowerCase();
    const desc = (p.short_description || '').toLowerCase();
    const cat = (p.category || '').toLowerCase();
    const tags = (p.tags || '').toLowerCase();
    return title.includes(q) || desc.includes(q) || cat.includes(q) || tags.includes(q);
  }).slice(0, 5);

  if (matches.length > 0) {
    liveResults.style.display = 'block';
    liveResults.innerHTML = `
      <div style="font-size: 0.72rem; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase; color: var(--accent-blue); margin-bottom: 0.5rem;">
        Matching Prompts (${matches.length})
      </div>
      <div style="display: flex; flex-direction: column; gap: 0.35rem;">
        ${matches.map(m => `
          <a href="/prompt/${m.slug}/" style="display: flex; align-items: center; justify-content: space-between; padding: 0.55rem 0.75rem; background: rgba(0,0,0,0.25); border-radius: 8px; border: 1px solid var(--border-subtle); font-size: 0.85rem; color: #FFFFFF;">
            <div style="display: flex; align-items: center; gap: 0.5rem; overflow: hidden;">
              <span style="color: var(--accent-blue);">✦</span>
              <span style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${escapeHtml(m.title)}</span>
            </div>
            <span style="font-size: 0.75rem; color: var(--text-muted); flex-shrink: 0; margin-left: 0.5rem;">${escapeHtml(m.category || '')} →</span>
          </a>
        `).join('')}
      </div>
    `;
  } else {
    liveResults.style.display = 'none';
    liveResults.innerHTML = '';
  }
}

// Populate Libraries in Full-Screen Modal (Reference Screenshot 4)
function populateLibrariesModal(prompts) {
  const container = document.getElementById('modal-libraries-list');
  if (!container) return;

  // Group prompts by category
  const counts = {};
  prompts.forEach(p => {
    const cat = p.category || 'Other';
    counts[cat] = (counts[cat] || 0) + 1;
  });

  // Standard libraries ordered exactly as in Reference Screenshot 4
  const referenceLibraries = [
    { name: '3D Animation', count: 62 },
    { name: '3D Caricature', count: 35 },
    { name: '3D Hologram', count: 1 },
    { name: '3D Illustration', count: 21 },
    { name: '3D Render', count: 58 },
    { name: 'AI Art', count: 82 },
    { name: 'AI Photo Editing', count: counts['AI Photo Editing'] || counts['Portrait'] || 39 },
    { name: 'AI Retouching', count: 9 },
    { name: 'Cinematic', count: counts['Cinematic'] || 12 },
    { name: 'Portrait', count: counts['Portrait'] || 8 },
    { name: 'Festive Days', count: counts['Festive Days'] || counts['Festival'] || 4 },
    { name: 'Aesthetic', count: counts['Aesthetic'] || 6 },
    { name: 'Selfie & Mirror', count: counts['Selfie'] || 3 },
    { name: 'Templates', count: counts['Templates'] || 4 },
    { name: 'Birthday', count: counts['Birthday'] || 2 },
    { name: 'Couple', count: counts['Couple'] || 2 }
  ];

  container.innerHTML = referenceLibraries.map(lib => {
    const libLower = lib.name.toLowerCase();
    const match = homeAllPrompts.find(p => {
      const cat = (p.category || '').toLowerCase();
      const tags = (p.tags || '').toLowerCase();
      return (cat.includes(libLower) || libLower.includes(cat) || tags.includes(libLower)) && p.featured_image;
    });
    const libImg = match ? match.featured_image : (homeAllPrompts[0]?.featured_image || '/assets/images/default-prompt.svg');
    return `
      <div class="library-item-row" data-library-name="${escapeHtml(lib.name)}" onclick="filterByLibrary('${escapeHtml(lib.name)}')">
        <div class="library-left">
          <div class="library-square-badge" style="overflow: hidden; padding: 0;">
            <img src="${escapeHtml(libImg)}" alt="${escapeHtml(lib.name)}" style="width: 100%; height: 100%; object-fit: cover; display: block;" onerror="this.onerror=null; this.src='/assets/images/default-prompt.svg';">
          </div>
          <div class="library-info">
            <span class="library-name">${escapeHtml(lib.name)}</span>
            <span class="library-sub">Library</span>
          </div>
        </div>
        <span class="library-count-badge">${lib.count}</span>
      </div>
    `;
  }).join('');
}

window.filterByLibrary = function(libraryName) {
  const modal = document.getElementById('search-fullscreen-modal');
  if (modal) {
    modal.classList.remove('active');
    document.body.style.overflow = '';
  }

  const libLower = libraryName.toLowerCase();
  const filtered = homeAllPrompts.filter(p => {
    const cat = (p.category || '').toLowerCase();
    const title = (p.title || '').toLowerCase();
    const tags = (p.tags || '').toLowerCase();
    return cat.includes(libLower) || libLower.includes(cat) || title.includes(libLower) || tags.includes(libLower);
  });

  renderGallery(filtered.length > 0 ? filtered : homeAllPrompts);
  const gallery = document.getElementById('gallery-section');
  if (gallery) gallery.scrollIntoView({ behavior: 'smooth' });
  window.showToast(`Filtered by ${libraryName}`);
};

// Scroll to Top Button
function initBackToTop() {
  const topBtn = document.getElementById('btn-scroll-top');
  if (topBtn) {
    window.addEventListener('scroll', () => {
      if (window.scrollY > 300) {
        topBtn.classList.add('visible');
      } else {
        topBtn.classList.remove('visible');
      }
    }, { passive: true });
    topBtn.addEventListener('click', () => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  // Header scroll appearance
  const header = document.querySelector('.site-header');
  window.addEventListener('scroll', () => {
    if (header) {
      if (window.scrollY > 30) header.classList.add('scrolled');
      else header.classList.remove('scrolled');
    }
  });
}

// Auto Initialize
document.addEventListener('DOMContentLoaded', () => {
  // Prune any deleted prompts from pre-rendered HTML on client
  try {
    const rawDeleted = localStorage.getItem('promptforge_deleted_prompts');
    if (rawDeleted) {
      const delArr = JSON.parse(rawDeleted);
      if (Array.isArray(delArr)) {
        delArr.forEach(id => {
          document.querySelectorAll(`article[data-id="${id}"], [href*="/prompt/${id}/"]`).forEach(el => {
            const card = el.closest('.prompt-masonry-card') || el;
            card.remove();
          });
        });
      }
    }
  } catch (e) {}

  initTheme();
  initCopyDelegation();
  if (document.getElementById('masonry-gallery-grid')) {
    initHomePage();
  }
});

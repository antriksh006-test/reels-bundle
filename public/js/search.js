/**
 * search.js - Instant Autocomplete Suggestions & Full Directory Search/Filtering Engine
 */

// 1. Instant Autocomplete Search System
function initInstantSearch(inputId, suggestionsId) {
  const input = document.getElementById(inputId);
  const container = document.getElementById(suggestionsId);
  if (!input || !container) return;

  let allPrompts = [];
  let activeIndex = -1;

  // Pre-load prompt index
  API.getPublicData().then(data => {
    allPrompts = (data.prompts || []).filter(p => String(p.status).toLowerCase() === 'published');
  });

  input.addEventListener('input', () => {
    const query = input.value.trim().toLowerCase();
    activeIndex = -1;

    if (query.length < 2) {
      container.classList.remove('active');
      container.innerHTML = '';
      return;
    }

    const matches = allPrompts.filter(p => {
      const title = (p.title || '').toLowerCase();
      const desc = (p.short_description || '').toLowerCase();
      const cat = (p.category || '').toLowerCase();
      const tags = (p.tags || '').toLowerCase();
      return title.includes(query) || desc.includes(query) || cat.includes(query) || tags.includes(query);
    }).slice(0, 6);

    if (matches.length === 0) {
      container.innerHTML = `
        <div class="suggestion-item">
          <span style="color: var(--text-muted); font-size: 0.85rem;">No prompts found matching "${escapeHtml(query)}"</span>
        </div>
      `;
      container.classList.add('active');
      return;
    }

    container.innerHTML = matches.map(m => `
      <a href="/prompt/${m.slug}/" class="suggestion-item">
        <div class="suggestion-content">
          <span class="suggestion-title">${highlightMatch(m.title, query)}</span>
          <span class="suggestion-meta">in ${escapeHtml(m.category || 'General')} • ${m.copy_count || 0} copies</span>
        </div>
        <span style="color: var(--brand-primary); font-size: 0.8rem; font-weight: 700;">View →</span>
      </a>
    `).join('');

    container.classList.add('active');
  });

  // Keyboard navigation
  input.addEventListener('keydown', (e) => {
    const items = container.querySelectorAll('.suggestion-item');
    if (!items.length || !container.classList.contains('active')) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      activeIndex = (activeIndex + 1) % items.length;
      updateActiveItem(items, activeIndex);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      activeIndex = (activeIndex - 1 + items.length) % items.length;
      updateActiveItem(items, activeIndex);
    } else if (e.key === 'Enter') {
      if (activeIndex >= 0 && items[activeIndex]) {
        e.preventDefault();
        items[activeIndex].click();
      } else {
        // Navigate to full search page
        window.location.href = `/prompts.html?q=${encodeURIComponent(input.value.trim())}`;
      }
    } else if (e.key === 'Escape') {
      container.classList.remove('active');
    }
  });

  // Click outside to dismiss
  document.addEventListener('click', (e) => {
    if (!input.contains(e.target) && !container.contains(e.target)) {
      container.classList.remove('active');
    }
  });
}

function updateActiveItem(items, index) {
  items.forEach((item, i) => {
    if (i === index) item.classList.add('highlighted');
    else item.classList.remove('highlighted');
  });
}

function highlightMatch(text, query) {
  if (!query) return escapeHtml(text);
  const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
  return escapeHtml(text).replace(regex, '<mark style="background: rgba(99,102,241,0.3); color: inherit; padding: 0 2px; border-radius: 2px;">$1</mark>');
}

// 2. Full Browse / Search Page Directory Logic (`prompts.html`)
async function initPromptsDirectory() {
  const grid = document.getElementById('prompts-list-grid');
  if (!grid) return;

  const data = await API.getPublicData();
  const allPrompts = (data.prompts || []).filter(p =>
    String(p.status).toLowerCase() === 'published' &&
    p.id !== 'p_001' &&
    !p.title.includes('ChatGPT SEO Blog Writer')
  );
  const categories = data.categories || [];
  const tags = data.tags || [];

  // Parse URL search parameters
  const urlParams = new URLSearchParams(window.location.search);
  let currentSearch = urlParams.get('q') || '';
  let currentCategory = urlParams.get('cat') || '';
  let currentTag = urlParams.get('tag') || '';
  let currentSort = urlParams.get('sort') || 'newest';
  let currentPage = 1;
  const pageSize = APP_CONFIG.DEFAULT_PAGE_SIZE;

  // Setup Category Dropdown options
  const catSelect = document.getElementById('filter-category');
  if (catSelect) {
    catSelect.innerHTML = '<option value="">All Categories</option>' + 
      categories.map(c => {
        const catName = c.name || c.category_name || '';
        return `<option value="${escapeHtml(catName)}">${escapeHtml(catName)}</option>`;
      }).join('');
    if (currentCategory) catSelect.value = currentCategory;
  }

  // Setup Tag Pills
  const tagFiltersWrap = document.getElementById('directory-tag-filters');
  if (tagFiltersWrap) {
    tagFiltersWrap.innerHTML = `
      <button class="tag-pill ${!currentTag ? 'active' : ''}" data-tag="">All Tags</button>
      ${tags.map(t => `
        <button class="tag-pill ${currentTag === t.slug ? 'active' : ''}" data-tag="${escapeHtml(t.slug)}">#${escapeHtml(t.slug)}</button>
      `).join('')}
    `;
  }

  // Populate input values
  const searchInput = document.getElementById('directory-search-input');
  if (searchInput && currentSearch) {
    searchInput.value = currentSearch;
  }

  const sortSelect = document.getElementById('filter-sort');
  if (sortSelect && currentSort) {
    sortSelect.value = currentSort;
  }

  // Render function
  function renderFilteredResults() {
    let filtered = allPrompts.filter(p => {
      // Search text match across title, description, content, category, tags
      if (currentSearch) {
        const q = currentSearch.toLowerCase();
        const matches = (p.title || '').toLowerCase().includes(q) ||
                        (p.short_description || '').toLowerCase().includes(q) ||
                        (p.prompt_content || '').toLowerCase().includes(q) ||
                        (p.category || '').toLowerCase().includes(q) ||
                        (p.tags || '').toLowerCase().includes(q);
        if (!matches) return false;
      }

      // Category match
      if (currentCategory) {
        if (String(p.category || '').toLowerCase() !== currentCategory.toLowerCase()) {
          return false;
        }
      }

      // Tag match
      if (currentTag) {
        const promptTags = (p.tags || '').toLowerCase();
        if (!promptTags.includes(currentTag.toLowerCase())) {
          return false;
        }
      }

      return true;
    });

    // Helper to score gender priority (girls prompts first)
    function getGenderScore(p) {
      const text = ((p.title || '') + ' ' + (p.tags || '') + ' ' + (p.short_description || '')).toLowerCase();
      const isGirl = /\bgirl\b|\bgirls\b|\bwoman\b|\bwomen\b|\bfemale\b|\bsaree\b|\blady\b/.test(text);
      const isBoy = /\bboy\b|\bboys\b|\bman\b|\bmen\b|\bmale\b|\bguy\b/.test(text);
      const isCouple = /\bcouple\b|\bromantic\b|\bwedding\b/.test(text);
      if (isGirl && !isBoy) return 3;
      if (isCouple || (isGirl && isBoy)) return 2;
      if (!isGirl && !isBoy) return 1;
      return 0;
    }

    // Sorting (prioritizing girls prompts)
    if (currentSort === 'most-copied') {
      filtered.sort((a, b) => {
        const gDiff = getGenderScore(b) - getGenderScore(a);
        if (gDiff !== 0) return gDiff;
        return (Number(b.copy_count) || 0) - (Number(a.copy_count) || 0);
      });
    } else if (currentSort === 'most-viewed') {
      filtered.sort((a, b) => {
        const gDiff = getGenderScore(b) - getGenderScore(a);
        if (gDiff !== 0) return gDiff;
        return (Number(b.views) || 0) - (Number(a.views) || 0);
      });
    } else {
      // Default: prioritize girls prompts
      filtered.sort((a, b) => {
        const gDiff = getGenderScore(b) - getGenderScore(a);
        if (gDiff !== 0) return gDiff;
        return new Date(b.created_at || 0) - new Date(a.created_at || 0);
      });
    }

    // Update Result Counter
    const countEl = document.getElementById('results-count');
    if (countEl) {
      countEl.textContent = `Showing ${Math.min(currentPage * pageSize, filtered.length)} of ${filtered.length} prompts`;
    }

    if (filtered.length === 0) {
      grid.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; padding: 4rem 1rem;">
          <div style="font-size: 3rem; margin-bottom: 1rem;">🔍</div>
          <h3 style="font-size: 1.5rem; font-weight: 700; margin-bottom: 0.5rem;">No prompts found</h3>
          <p style="color: var(--text-secondary); margin-bottom: 1.5rem;">Try adjusting your keyword, category, or tag filter.</p>
          <button id="reset-filters-btn" class="btn btn-secondary">Clear All Filters</button>
        </div>
      `;
      const resetBtn = document.getElementById('reset-filters-btn');
      if (resetBtn) {
        resetBtn.addEventListener('click', () => {
          currentSearch = '';
          currentCategory = '';
          currentTag = '';
          if (searchInput) searchInput.value = '';
          if (catSelect) catSelect.value = '';
          updateTagActiveState('');
          currentPage = 1;
          renderFilteredResults();
        });
      }
      const loadMoreBtn = document.getElementById('btn-load-more');
      if (loadMoreBtn) loadMoreBtn.style.display = 'none';
      return;
    }

    // Paginate
    const paginated = filtered.slice(0, currentPage * pageSize);
    grid.innerHTML = paginated.map((p, i) => (typeof renderMasonryCard === 'function' ? renderMasonryCard(p, i) : renderPromptCard(p))).join('');

    // Load More Button visibility
    const loadMoreBtn = document.getElementById('btn-load-more');
    if (loadMoreBtn) {
      loadMoreBtn.style.display = (currentPage * pageSize < filtered.length) ? 'inline-flex' : 'none';
    }
  }

  // Event Listeners
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      currentSearch = e.target.value.trim();
      currentPage = 1;
      renderFilteredResults();
    });
  }

  if (catSelect) {
    catSelect.addEventListener('change', (e) => {
      currentCategory = e.target.value;
      currentPage = 1;
      renderFilteredResults();
    });
  }

  if (sortSelect) {
    sortSelect.addEventListener('change', (e) => {
      currentSort = e.target.value;
      renderFilteredResults();
    });
  }

  if (tagFiltersWrap) {
    tagFiltersWrap.addEventListener('click', (e) => {
      const btn = e.target.closest('.tag-pill');
      if (!btn) return;
      currentTag = btn.dataset.tag || '';
      updateTagActiveState(currentTag);
      currentPage = 1;
      renderFilteredResults();
    });
  }

  function updateTagActiveState(tag) {
    tagFiltersWrap.querySelectorAll('.tag-pill').forEach(b => {
      if ((b.dataset.tag || '') === tag) b.classList.add('active');
      else b.classList.remove('active');
    });
  }

  const loadMoreBtn = document.getElementById('btn-load-more');
  if (loadMoreBtn) {
    loadMoreBtn.addEventListener('click', () => {
      currentPage++;
      renderFilteredResults();
    });
  }

  // Initial render
  renderFilteredResults();
}


/**
 * admin.js - Secure Admin Dashboard Controller with Google Sheets CRUD & SERP Preview
 */

const AdminApp = {
  activeTab: 'overview',
  currentView: localStorage.getItem('promptforge_admin_view') || 'table',
  allPrompts: [],
  allCategories: [],
  allSettings: {},
  editingPromptId: null,
  editingCategoryId: null,

  async init() {
    this.initAuthGate();
    this.initNavigation();
    this.initPromptEditorEvents();
    this.initCategoryEditorEvents();
    this.initSettingsEvents();
    this.initLightboxEvents();
  },

  // 1. Authentication Gatekeeper
  initAuthGate() {
    const authWrapper = document.getElementById('auth-wrapper');
    const authForm = document.getElementById('admin-login-form');
    const authError = document.getElementById('auth-error-msg');

    // Check existing session
    const token = API.getAuthToken();
    if (token) {
      API.verifyAuth().then(valid => {
        if (valid) {
          if (authWrapper) authWrapper.style.display = 'none';
          this.loadDashboardData();
        } else {
          API.setAuthToken('');
          if (authWrapper) authWrapper.style.display = 'flex';
        }
      });
    } else {
      if (authWrapper) authWrapper.style.display = 'flex';
    }

    if (authForm) {
      authForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const pwdInput = document.getElementById('admin-password-input');
        const submitBtn = document.getElementById('admin-login-btn');
        const password = pwdInput ? pwdInput.value : '';

        if (!password) return;

        submitBtn.disabled = true;
        submitBtn.textContent = 'Verifying...';
        if (authError) authError.style.display = 'none';

        const result = await API.adminLogin(password);
        submitBtn.disabled = false;
        submitBtn.textContent = 'Sign In to Dashboard';

        if (result.success) {
          if (authWrapper) authWrapper.style.display = 'none';
          window.showToast('Authentication successful. Welcome, Admin!');
          this.loadDashboardData();
        } else {
          if (authError) {
            authError.textContent = result.error || 'Invalid credentials';
            authError.style.display = 'block';
          }
        }
      });
    }

    // Logout
    const logoutBtn = document.getElementById('btn-admin-logout');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', () => {
        API.setAuthToken('');
        window.location.reload();
      });
    }
  },

  // 2. Navigation Tabs & View Mode
  initNavigation() {
    const navItems = document.querySelectorAll('.admin-nav-item');
    navItems.forEach(item => {
      item.addEventListener('click', () => {
        const tab = item.dataset.tab;
        if (!tab) return;
        this.switchTab(tab);
      });
    });

    // View Mode Toggle (Table vs Cards)
    const btnTable = document.getElementById('btn-prompts-view-table');
    const btnGrid = document.getElementById('btn-prompts-view-grid');
    if (btnTable && btnGrid) {
      btnTable.addEventListener('click', () => this.switchPromptsView('table'));
      btnGrid.addEventListener('click', () => this.switchPromptsView('grid'));
    }
  },

  switchPromptsView(view) {
    this.currentView = view;
    localStorage.setItem('promptforge_admin_view', view);
    const tableWrap = document.getElementById('admin-prompts-table-wrap');
    const gridView = document.getElementById('admin-prompts-grid-view');
    const btnTable = document.getElementById('btn-prompts-view-table');
    const btnGrid = document.getElementById('btn-prompts-view-grid');

    if (btnTable) btnTable.classList.toggle('active', view === 'table');
    if (btnGrid) btnGrid.classList.toggle('active', view === 'grid');

    if (view === 'table') {
      if (tableWrap) tableWrap.style.display = 'block';
      if (gridView) gridView.style.display = 'none';
    } else {
      if (tableWrap) tableWrap.style.display = 'none';
      if (gridView) gridView.style.display = 'grid';
    }

    this.applyPromptFilter();
  },

  switchTab(tab) {
    this.activeTab = tab;
    document.querySelectorAll('.admin-nav-item').forEach(el => {
      el.classList.toggle('active', el.dataset.tab === tab);
    });

    // The import tab is fixed-positioned (overlays the main area)
    // All other tabs live inside <main>
    const importPane = document.getElementById('tab-import');
    const mainEl     = document.querySelector('.admin-main');

    if (tab === 'import') {
      // Show import overlay, hide main content
      if (importPane) importPane.style.display = '';
      if (mainEl)     mainEl.style.visibility  = 'hidden';
    } else {
      // Hide import overlay, show main content
      if (importPane) importPane.style.display = 'none';
      if (mainEl)     mainEl.style.visibility  = 'visible';

      // Show correct pane inside main
      document.querySelectorAll('.admin-tab-pane').forEach(pane => {
        if (pane.id === 'tab-import') return; // skip import, handled above
        pane.style.display = pane.id === `tab-${tab}` ? 'block' : 'none';
      });
    }

    // Update topbar title
    const titles = {
      overview:   'Dashboard Overview',
      prompts:    'Prompts Management',
      categories: 'Categories Management',
      settings:   'Settings & Google Sheets',
      import:     'Bulk Import Prompts',
    };
    const titleEl = document.querySelector('.admin-page-title');
    if (titleEl && titles[tab]) titleEl.textContent = titles[tab];
  },

  // 3. Load All Data
  async loadDashboardData() {
    const overview = await API.getAdminOverview();
    const data = await API.getPublicData(true);

    this.allPrompts = data.prompts || [];
    this.allCategories = data.categories || [];
    this.allSettings = data.settings || {};

    // Populate category filter dropdown
    const catFilter = document.getElementById('admin-filter-category');
    if (catFilter) {
      const currentVal = catFilter.value || 'all';
      catFilter.innerHTML = '<option value="all">All Categories</option>' +
        this.allCategories.map(c => {
          const name = c.name || c.category_name;
          return `<option value="${escapeHtml(name)}">${escapeHtml(name)}</option>`;
        }).join('');
      catFilter.value = currentVal;
    }

    this.renderOverviewMetrics(overview.metrics);
    this.applyPromptFilter();
    this.renderCategoriesTable(this.allCategories);
    this.populateSettingsForm(this.allSettings);
  },

  // 4. Overview Metrics Rendering
  renderOverviewMetrics(metrics = {}) {
    const trendingCount = this.allPrompts.filter(p => p.trending === true || String(p.trending).toLowerCase() === 'true').length;
    document.getElementById('metric-total-prompts').textContent = metrics.total_prompts || this.allPrompts.length;
    document.getElementById('metric-published-prompts').textContent = metrics.published_prompts || this.allPrompts.filter(p => String(p.status).toLowerCase() === 'published').length;
    document.getElementById('metric-draft-prompts').textContent = metrics.draft_prompts || this.allPrompts.filter(p => String(p.status).toLowerCase() !== 'published').length;
    document.getElementById('metric-total-views').textContent = (metrics.total_views || 0).toLocaleString();
    document.getElementById('metric-total-copies').textContent = (metrics.total_copies || 0).toLocaleString();
    const trendEl = document.getElementById('metric-trending-prompts');
    if (trendEl) trendEl.textContent = trendingCount.toLocaleString();
  },

  // Trigger Full Static Build (SEO Pages & Sitemap) Directly from Admin
  async triggerStaticBuild(btn) {
    const originalContent = btn ? btn.innerHTML : '';
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = `<span style="display:inline-block; animation:spin 1s linear infinite;">⚡</span> Building Static SEO Pages...`;
    }

    try {
      const res = await fetch('/api/build', { method: 'POST' });
      const json = await res.json();
      if (json.success) {
        window.showToast('✅ All permanent SEO pages & sitemap.xml generated successfully! 🚀');
        this.loadDashboardData();
      } else {
        window.showToast('Build failed: ' + (json.error || 'Unknown error'), 'error');
      }
    } catch (err) {
      window.showToast('Build failed: ' + err.message, 'error');
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = originalContent;
      }
    }
  },

  // 5. Prompts Table, Grid & Filtering
  renderPromptsTable(prompts) {
    const tbody = document.getElementById('admin-prompts-tbody');
    if (!tbody) return;

    if (prompts.length === 0) {
      tbody.innerHTML = `<tr><td colspan="8" style="text-align:center; padding: 3rem; color: #94A3B8;">No prompts match your filter criteria.</td></tr>`;
      return;
    }

    tbody.innerHTML = prompts.map(p => {
      const isPublished = String(p.status).toLowerCase() === 'published';
      const isTrending = p.trending === true || String(p.trending).toLowerCase() === 'true';
      const imgUrl = p.featured_image || '/assets/images/default-prompt.svg';
      return `
        <tr data-id="${p.id}">
          <td style="width: 65px; padding: 0.6rem 0.75rem; text-align: center;">
            <div class="admin-prompt-thumb-wrap" data-id="${p.id}" title="Click to view image in full-res preview">
              <img src="${escapeHtml(imgUrl)}" alt="${escapeHtml(p.title)}" class="admin-prompt-thumb" loading="lazy" onerror="this.onerror=null; this.src='/assets/images/default-prompt.svg';">
              <span class="thumb-zoom-icon">🔍</span>
            </div>
          </td>
          <td style="font-weight:700; max-width: 320px;">
            <div style="display:flex; align-items:center; gap:0.4rem; flex-wrap:wrap;">
              <span class="prompt-title-cell" style="cursor:pointer;" data-id="${p.id}" title="Click to preview">${escapeHtml(p.title)}</span>
              ${isTrending ? '<span class="badge-trending-glow" style="font-size:0.68rem; padding:1px 6px;">🔥 Trending</span>' : ''}
            </div>
            <div style="font-size:0.75rem; color:#64748B; font-family:var(--font-mono); margin-top:2px;">${escapeHtml(p.slug)}</div>
          </td>
          <td style="white-space: nowrap;"><span class="card-category-badge" style="font-size:0.75rem;">${escapeHtml(p.category || 'General')}</span></td>
          <td style="white-space: nowrap;">
            <span class="status-badge ${isPublished ? 'published' : 'draft'}">${p.status || 'draft'}</span>
            ${p.featured ? '<span style="font-size:0.75rem; color:#F59E0B; margin-left:4px;" title="Featured">★</span>' : ''}
          </td>
          <td style="white-space: nowrap;">${(p.views || 0).toLocaleString()}</td>
          <td style="white-space: nowrap;">${(p.copy_count || 0).toLocaleString()}</td>
          <td style="font-size:0.8rem; color:#94A3B8; white-space: nowrap;">${p.updated_at ? p.updated_at.split('T')[0] : (p.created_at ? p.created_at.split('T')[0] : '-')}</td>
          <td style="text-align: right; white-space: nowrap; min-width: 330px;">
            <div class="table-actions" style="justify-content: flex-end;">
              <a href="/prompt/${escapeHtml(p.slug)}/" target="_blank" class="btn-tbl btn-tbl-view" title="View permanent public page">Page ↗</a>
              <button class="btn-tbl btn-toggle-trending ${isTrending ? 'active-trending' : ''}" data-id="${p.id}" title="${isTrending ? 'Remove from Trending' : 'Mark as Trending'}">
                ${isTrending ? '🔥 Trending' : '+ Trending'}
              </button>
              <button class="btn-tbl btn-edit-prompt" data-id="${p.id}">Edit</button>
              <button class="btn-tbl btn-toggle-status" data-id="${p.id}" data-status="${p.status}">
                ${isPublished ? 'Unpublish' : 'Publish'}
              </button>
              <button class="btn-tbl danger btn-delete-prompt" data-id="${p.id}">Delete</button>
            </div>
          </td>
        </tr>
      `;
    }).join('');

    this.wirePromptTableActions();
  },

  renderPromptsGrid(prompts) {
    const gridView = document.getElementById('admin-prompts-grid-view');
    if (!gridView) return;

    if (prompts.length === 0) {
      gridView.innerHTML = `<div style="grid-column: 1 / -1; text-align:center; padding: 4rem; color: #94A3B8;">No prompts match your filter criteria.</div>`;
      return;
    }

    gridView.innerHTML = prompts.map(p => {
      const isPublished = String(p.status).toLowerCase() === 'published';
      const isTrending = p.trending === true || String(p.trending).toLowerCase() === 'true';
      const imgUrl = p.featured_image || '/assets/images/default-prompt.svg';
      return `
        <div class="admin-prompt-card" data-id="${p.id}">
          <div class="admin-card-img-wrap" data-id="${p.id}" title="Click to view image in full-res preview">
            <img src="${escapeHtml(imgUrl)}" alt="${escapeHtml(p.title)}" loading="lazy" onerror="this.onerror=null; this.src='/assets/images/default-prompt.svg';">
            <div class="admin-card-badges">
              <span class="card-category-badge" style="font-size:0.75rem;">${escapeHtml(p.category || 'General')}</span>
              <div style="display:flex; gap:0.3rem;">
                ${isTrending ? '<span class="badge-trending-glow" style="font-size:0.68rem; padding:1px 6px;">🔥 Trending</span>' : ''}
                <span class="status-badge ${isPublished ? 'published' : 'draft'}">${p.status || 'draft'}</span>
              </div>
            </div>
          </div>
          <div class="admin-card-body">
            <h3 class="admin-card-title" title="${escapeHtml(p.title)}">${escapeHtml(p.title)}</h3>
            <div class="admin-card-stats">
              <span>👁 ${(p.views || 0).toLocaleString()}</span>
              <span>📋 ${(p.copy_count || 0).toLocaleString()}</span>
              <span>🕒 ${p.updated_at ? p.updated_at.split('T')[0] : (p.created_at ? p.created_at.split('T')[0] : '-')}</span>
            </div>
            <div class="table-actions" style="margin-top: auto; justify-content: space-between; flex-wrap: wrap;">
              <button class="btn-tbl btn-toggle-trending ${isTrending ? 'active-trending' : ''}" data-id="${p.id}">
                ${isTrending ? '🔥 Trending' : '+ Trending'}
              </button>
              <button class="btn-tbl btn-edit-prompt" data-id="${p.id}">Edit</button>
              <button class="btn-tbl btn-toggle-status" data-id="${p.id}">${isPublished ? 'Draft' : 'Publish'}</button>
              <a href="/prompt/${escapeHtml(p.slug)}/" target="_blank" class="btn-tbl" title="Open Public Page">↗</a>
            </div>
          </div>
        </div>
      `;
    }).join('');

    this.wirePromptTableActions();
  },

  wirePromptTableActions() {
    // Quick toggle Trending
    document.querySelectorAll('.btn-toggle-trending').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.dataset.id;
        const item = this.allPrompts.find(p => p.id === id);
        if (!item) return;
        const isTrending = item.trending === true || String(item.trending).toLowerCase() === 'true';
        item.trending = !isTrending;
        btn.disabled = true;
        btn.textContent = 'Updating...';
        try {
          await API.savePrompt(item);
          window.showToast(`"${item.title}" ${item.trending ? 'marked as Trending 🔥' : 'removed from Trending'}`);
          this.loadDashboardData();
        } catch (err) {
          window.showToast('Failed to update trending: ' + err.message, 'error');
          btn.disabled = false;
        }
      });
    });

    // Lightbox image preview triggers
    document.querySelectorAll('.admin-prompt-thumb-wrap, .admin-card-img-wrap, .prompt-title-cell').forEach(el => {
      el.addEventListener('click', (e) => {
        if (e.target.closest('button') || e.target.closest('a')) return;
        const id = el.dataset.id;
        const item = this.allPrompts.find(p => p.id === id);
        if (item) this.openLightbox(item);
      });
    });

    // Edit prompt
    document.querySelectorAll('.btn-edit-prompt').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.id;
        const item = this.allPrompts.find(p => p.id === id);
        if (item) this.openPromptEditor(item);
      });
    });

    // Toggle publish/draft
    document.querySelectorAll('.btn-toggle-status').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.dataset.id;
        const item = this.allPrompts.find(p => p.id === id);
        if (!item) return;
        const nextStatus = String(item.status).toLowerCase() === 'published' ? 'draft' : 'published';
        item.status = nextStatus;
        try {
          await API.savePrompt(item);
          window.showToast(`Prompt marked as ${nextStatus}!`);
          this.loadDashboardData();
        } catch (err) {
          window.showToast('Error: ' + err.message, 'info');
        }
      });
    });

    // Delete prompt
    document.querySelectorAll('.btn-delete-prompt').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.dataset.id;
        if (!confirm('Are you sure you want to permanently delete this prompt?')) return;
        try {
          btn.disabled = true;
          btn.textContent = 'Deleting...';
          await API.deletePrompt(id);

          // Instantly remove row and card from DOM
          const row = btn.closest('tr');
          if (row) row.remove();
          const card = document.querySelector(`.admin-prompt-card[data-id="${id}"]`);
          if (card) card.remove();

          // Update in-memory prompt list & metrics immediately
          this.allPrompts = this.allPrompts.filter(p => p.id !== id && p.slug !== id);
          this.renderOverviewMetrics();

          window.showToast('Prompt deleted successfully', 'success');
        } catch (err) {
          window.showToast('Delete failed: ' + err.message, 'info');
          btn.disabled = false;
          btn.textContent = 'Delete';
        }
      });
    });
  },

  // 6. Lightbox Preview Modal
  initLightboxEvents() {
    const modal = document.getElementById('admin-lightbox-modal');
    const closeBtn = document.getElementById('btn-close-admin-lightbox');
    if (closeBtn) closeBtn.addEventListener('click', () => this.closeLightbox());
    if (modal) {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) this.closeLightbox();
      });
    }
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') this.closeLightbox();
    });
  },

  openLightbox(prompt) {
    const modal = document.getElementById('admin-lightbox-modal');
    if (!modal) return;

    const imgEl = document.getElementById('admin-lightbox-img');
    const titleEl = document.getElementById('admin-lightbox-title');
    const catEl = document.getElementById('admin-lightbox-category');
    const statusEl = document.getElementById('admin-lightbox-status');
    const slugEl = document.getElementById('admin-lightbox-slug');
    const descEl = document.getElementById('admin-lightbox-desc');
    const snippetEl = document.getElementById('admin-lightbox-snippet');
    const viewBtn = document.getElementById('admin-lightbox-view-btn');
    const editBtn = document.getElementById('admin-lightbox-edit-btn');

    const imgUrl = prompt.featured_image || '/assets/images/default-prompt.svg';
    if (imgEl) imgEl.src = imgUrl;
    if (titleEl) titleEl.textContent = prompt.title;
    if (catEl) catEl.textContent = prompt.category || 'General';
    if (statusEl) {
      const isPub = String(prompt.status).toLowerCase() === 'published';
      statusEl.className = `status-badge ${isPub ? 'published' : 'draft'}`;
      statusEl.textContent = prompt.status || 'draft';
    }
    if (slugEl) slugEl.textContent = `/prompt/${prompt.slug}/`;
    if (descEl) descEl.textContent = prompt.short_description || prompt.full_description || 'No description provided.';
    if (snippetEl) snippetEl.textContent = prompt.prompt_content || '';
    if (viewBtn) viewBtn.href = `/prompt/${prompt.slug}/`;
    if (editBtn) {
      editBtn.onclick = () => {
        this.closeLightbox();
        this.openPromptEditor(prompt);
      };
    }

    modal.style.display = 'flex';
  },

  closeLightbox() {
    const modal = document.getElementById('admin-lightbox-modal');
    if (modal) modal.style.display = 'none';
  },

  // 7. Prompt Add/Edit Modal & SERP Preview
  initPromptEditorEvents() {
    const modal = document.getElementById('prompt-editor-modal');
    const openBtn = document.getElementById('btn-add-prompt');
    const closeBtn = document.getElementById('modal-close-prompt-editor');
    const cancelBtn = document.getElementById('btn-cancel-prompt-edit');
    const form = document.getElementById('prompt-editor-form');

    if (openBtn) {
      openBtn.addEventListener('click', () => this.openPromptEditor(null));
    }
    if (closeBtn) closeBtn.addEventListener('click', () => modal.classList.remove('active'));
    if (cancelBtn) cancelBtn.addEventListener('click', () => modal.classList.remove('active'));

    // Live Auto Slug & SERP Preview bindings
    const titleInput = document.getElementById('edit-prompt-title');
    const slugInput = document.getElementById('edit-prompt-slug');
    const descInput = document.getElementById('edit-prompt-short-desc');

    if (titleInput && slugInput) {
      titleInput.addEventListener('input', () => {
        if (!this.editingPromptId) {
          slugInput.value = this.generateSlug(titleInput.value);
        }
        this.updateSerpPreview();
      });
    }

    if (slugInput) slugInput.addEventListener('input', () => this.updateSerpPreview());
    if (descInput) descInput.addEventListener('input', () => this.updateSerpPreview());

    // Prompt Image live preview
    const imgInput = document.getElementById('edit-prompt-image');
    const imgPreview = document.getElementById('edit-image-preview-img');
    if (imgInput && imgPreview) {
      imgInput.addEventListener('input', () => {
        imgPreview.src = imgInput.value.trim() || '/assets/images/default-prompt.svg';
      });
    }

    // Prompt content counter
    const contentArea = document.getElementById('edit-prompt-content');
    const charCounter = document.getElementById('edit-content-stats');
    if (contentArea && charCounter) {
      contentArea.addEventListener('input', () => {
        const val = contentArea.value || '';
        const words = val.trim().split(/\s+/).filter(Boolean).length;
        charCounter.textContent = `${val.length} chars | ${words} words`;
      });
    }

    // Trending & status filter dropdown
    const filterTrendingSelect = document.getElementById('admin-filter-trending');
    if (filterTrendingSelect) {
      filterTrendingSelect.addEventListener('change', () => this.applyPromptFilter());
    }

    // Category filter dropdown
    const filterCatSelect = document.getElementById('admin-filter-category');
    if (filterCatSelect) {
      filterCatSelect.addEventListener('change', () => this.applyPromptFilter());
    }

    // Prompts live search input
    const searchInput = document.getElementById('admin-search-prompts');
    if (searchInput) {
      searchInput.addEventListener('input', () => this.applyPromptFilter());
    }

    // Submit Prompt Form
    if (form) {
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const submitBtn = document.getElementById('btn-save-prompt');
        submitBtn.disabled = true;
        submitBtn.textContent = 'Saving & Building Page...';

        const titleVal = document.getElementById('edit-prompt-title').value.trim();
        const customSlug = document.getElementById('edit-prompt-slug').value.trim();
        // 1. The prompt title is used as the prompt page name (slug)
        const slugVal = customSlug || this.generateSlug(titleVal);

        // 2. The page description is used as the meta description
        const shortDescVal = document.getElementById('edit-prompt-short-desc').value.trim();
        const fullDescVal = document.getElementById('edit-prompt-full-desc').value.trim();
        const metaDescVal = shortDescVal || fullDescVal;
        const imgVal = document.getElementById('edit-prompt-image')?.value.trim() || '/assets/images/default-prompt.svg';

        const promptObj = {
          id: this.editingPromptId || '',
          title: titleVal,
          slug: slugVal,
          featured_image: imgVal,
          category: document.getElementById('edit-prompt-category').value,
          subcategory: document.getElementById('edit-prompt-subcategory').value.trim(),
          tags: document.getElementById('edit-prompt-tags').value.trim(),
          short_description: shortDescVal,
          full_description: fullDescVal,
          seo_title: `${titleVal} | PromptForge`,
          seo_description: metaDescVal,
          prompt_content: document.getElementById('edit-prompt-content').value,
          author: document.getElementById('edit-prompt-author').value.trim() || 'PromptForge Editor',
          status: document.getElementById('edit-prompt-status').value,
          featured: document.getElementById('edit-prompt-featured').checked,
          trending: document.getElementById('edit-prompt-trending').checked
        };

        try {
          const result = await API.savePrompt(promptObj);
          modal.classList.remove('active');
          const pagePath = result.pageUrl || `/prompt/${result.slug || slugVal}/`;
          window.showToast(`Prompt saved & page built at ${pagePath} 🚀`);
          this.loadDashboardData();
        } catch (err) {
          window.showToast('Save failed: ' + err.message, 'info');
        } finally {
          submitBtn.disabled = false;
          submitBtn.textContent = 'Save Prompt';
        }
      });
    }
  },

  applyPromptFilter() {
    const filterTrendingEl = document.getElementById('admin-filter-trending');
    const filterCatEl = document.getElementById('admin-filter-category');
    const searchEl = document.getElementById('admin-search-prompts');
    const filterVal = filterTrendingEl ? filterTrendingEl.value : 'all';
    const catVal = filterCatEl ? filterCatEl.value : 'all';
    const query = (searchEl ? searchEl.value : '').toLowerCase().trim();

    let filtered = [...this.allPrompts];

    // Status / Trending filter
    if (filterVal === 'trending') {
      filtered = filtered.filter(p => p.trending === true || String(p.trending).toLowerCase() === 'true');
    } else if (filterVal === 'published') {
      filtered = filtered.filter(p => String(p.status).toLowerCase() === 'published');
    } else if (filterVal === 'draft') {
      filtered = filtered.filter(p => String(p.status).toLowerCase() !== 'published');
    }

    // Category filter
    if (catVal !== 'all') {
      filtered = filtered.filter(p => (p.category || '').toLowerCase() === catVal.toLowerCase());
    }

    // Search query
    if (query) {
      filtered = filtered.filter(p => {
        const title = (p.title || '').toLowerCase();
        const cat = (p.category || '').toLowerCase();
        const slug = (p.slug || '').toLowerCase();
        const tags = (p.tags || '').toLowerCase();
        const content = (p.prompt_content || '').toLowerCase();
        return title.includes(query) || cat.includes(query) || slug.includes(query) || tags.includes(query) || content.includes(query);
      });
    }

    // Update count badge
    const countBadge = document.getElementById('admin-prompts-count-badge');
    if (countBadge) {
      countBadge.textContent = `Showing ${filtered.length} of ${this.allPrompts.length} Prompts`;
    }

    // Render based on current view mode
    const tableWrap = document.getElementById('admin-prompts-table-wrap');
    const gridView = document.getElementById('admin-prompts-grid-view');

    if (this.currentView === 'grid') {
      if (tableWrap) tableWrap.style.display = 'none';
      if (gridView) gridView.style.display = 'grid';
      this.renderPromptsGrid(filtered);
    } else {
      if (tableWrap) tableWrap.style.display = 'block';
      if (gridView) gridView.style.display = 'none';
      this.renderPromptsTable(filtered);
    }
  },

  openPromptEditor(prompt) {
    const modal = document.getElementById('prompt-editor-modal');
    const titleEl = document.getElementById('prompt-editor-title');
    const catSelect = document.getElementById('edit-prompt-category');
    const imgInput = document.getElementById('edit-prompt-image');
    const imgPreview = document.getElementById('edit-image-preview-img');

    // Populate category dropdown
    if (catSelect) {
      catSelect.innerHTML = this.allCategories.map(c => {
        const catName = c.name || c.category_name || '';
        return `<option value="${escapeHtml(catName)}">${escapeHtml(catName)}</option>`;
      }).join('');
    }

    if (prompt) {
      this.editingPromptId = prompt.id;
      if (titleEl) titleEl.textContent = 'Edit Prompt';
      document.getElementById('edit-prompt-title').value = prompt.title || '';
      document.getElementById('edit-prompt-slug').value = prompt.slug || '';
      if (imgInput) imgInput.value = prompt.featured_image || '';
      if (imgPreview) imgPreview.src = prompt.featured_image || '/assets/images/default-prompt.svg';
      if (catSelect) catSelect.value = prompt.category || '';
      document.getElementById('edit-prompt-subcategory').value = prompt.subcategory || '';
      document.getElementById('edit-prompt-tags').value = prompt.tags || '';
      document.getElementById('edit-prompt-short-desc').value = prompt.short_description || '';
      document.getElementById('edit-prompt-full-desc').value = prompt.full_description || '';
      document.getElementById('edit-prompt-content').value = prompt.prompt_content || '';
      document.getElementById('edit-prompt-author').value = prompt.author || 'PromptForge Editor';
      document.getElementById('edit-prompt-status').value = prompt.status || 'published';
      document.getElementById('edit-prompt-featured').checked = (prompt.featured === true || String(prompt.featured).toLowerCase() === 'true');
      const trendBox = document.getElementById('edit-prompt-trending');
      if (trendBox) trendBox.checked = (prompt.trending === true || String(prompt.trending).toLowerCase() === 'true');
    } else {
      this.editingPromptId = null;
      if (titleEl) titleEl.textContent = 'Add New Prompt';
      document.getElementById('prompt-editor-form').reset();
      if (imgInput) imgInput.value = '';
      if (imgPreview) imgPreview.src = '/assets/images/default-prompt.svg';
      document.getElementById('edit-prompt-status').value = 'published';
      document.getElementById('edit-prompt-author').value = 'PromptForge Editor';
      document.getElementById('edit-prompt-featured').checked = false;
      const trendBox = document.getElementById('edit-prompt-trending');
      if (trendBox) trendBox.checked = false;
    }

    this.updateSerpPreview();
    modal.classList.add('active');
  },

  updateSerpPreview() {
    const titleVal = document.getElementById('edit-prompt-title').value.trim() || 'Prompt Title';
    const slugVal = document.getElementById('edit-prompt-slug').value.trim() || 'prompt-slug';
    const descVal = document.getElementById('edit-prompt-short-desc').value.trim() || 'Prompt description preview will appear here on Google Search Console and search results.';

    const serpTitle = document.getElementById('serp-preview-title');
    const serpUrl = document.getElementById('serp-preview-url');
    const serpDesc = document.getElementById('serp-preview-desc');

    if (serpTitle) serpTitle.textContent = `${titleVal} | PromptForge`;
    if (serpUrl) serpUrl.textContent = `https://promptforge.dev/prompt/${slugVal}/`;
    if (serpDesc) serpDesc.textContent = descVal;
  },

  generateSlug(text) {
    return text.toString().toLowerCase().trim()
      .replace(/[^a-z0-9 -]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-');
  },

  // 7. Categories Management
  renderCategoriesTable(categories) {
    const tbody = document.getElementById('admin-categories-tbody');
    if (!tbody) return;

    tbody.innerHTML = categories.map(c => `
      <tr>
        <td style="font-weight:700;">${escapeHtml(c.name || c.category_name)}</td>
        <td style="font-family:var(--font-mono); font-size:0.8rem; color:#94A3B8;">${escapeHtml(c.slug)}</td>
        <td style="font-size:0.85rem; color:#CBD5E1;">${escapeHtml(c.description || '-')}</td>
        <td><span class="card-category-badge">${c.prompt_count || 0}</span></td>
        <td><span class="status-badge ${String(c.status).toLowerCase() === 'published' ? 'published' : 'draft'}">${c.status || 'published'}</span></td>
        <td>
          <div class="table-actions">
            <button class="btn-tbl btn-edit-category" data-id="${c.id}">Edit</button>
            <button class="btn-tbl danger btn-delete-category" data-id="${c.id}">Delete</button>
          </div>
        </td>
      </tr>
    `).join('');

    // Wire Category Actions
    document.querySelectorAll('.btn-edit-category').forEach(btn => {
      btn.addEventListener('click', () => {
        const item = this.allCategories.find(c => c.id === btn.dataset.id);
        if (item) this.openCategoryEditor(item);
      });
    });

    document.querySelectorAll('.btn-delete-category').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (!confirm('Are you sure you want to delete this category?')) return;
        try {
          await API.deleteCategory(btn.dataset.id);
          window.showToast('Category deleted successfully');
          this.loadDashboardData();
        } catch (e) {
          window.showToast('Error: ' + e.message, 'info');
        }
      });
    });
  },

  initCategoryEditorEvents() {
    const modal = document.getElementById('category-editor-modal');
    const openBtn = document.getElementById('btn-add-category');
    const closeBtn = document.getElementById('modal-close-category-editor');
    const form = document.getElementById('category-editor-form');

    if (openBtn) openBtn.addEventListener('click', () => this.openCategoryEditor(null));
    if (closeBtn) closeBtn.addEventListener('click', () => modal.classList.remove('active'));

    const nameInput = document.getElementById('edit-cat-name');
    const slugInput = document.getElementById('edit-cat-slug');
    if (nameInput && slugInput) {
      nameInput.addEventListener('input', () => {
        if (!this.editingCategoryId) slugInput.value = this.generateSlug(nameInput.value);
      });
    }

    if (form) {
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const catObj = {
          id: this.editingCategoryId || '',
          category_name: document.getElementById('edit-cat-name').value.trim(),
          slug: document.getElementById('edit-cat-slug').value.trim(),
          description: document.getElementById('edit-cat-desc').value.trim(),
          display_order: parseInt(document.getElementById('edit-cat-order').value, 10) || 10,
          status: document.getElementById('edit-cat-status').value
        };

        try {
          await API.saveCategory(catObj);
          modal.classList.remove('active');
          window.showToast('Category saved successfully! ✨');
          this.loadDashboardData();
        } catch (err) {
          window.showToast('Save failed: ' + err.message, 'info');
        }
      });
    }
  },

  openCategoryEditor(category) {
    const modal = document.getElementById('category-editor-modal');
    const titleEl = document.getElementById('category-editor-title');

    if (category) {
      this.editingCategoryId = category.id;
      if (titleEl) titleEl.textContent = 'Edit Category';
      document.getElementById('edit-cat-name').value = category.name || category.category_name || '';
      document.getElementById('edit-cat-slug').value = category.slug || '';
      document.getElementById('edit-cat-desc').value = category.description || '';
      document.getElementById('edit-cat-order').value = category.display_order || 10;
      document.getElementById('edit-cat-status').value = category.status || 'published';
    } else {
      this.editingCategoryId = null;
      if (titleEl) titleEl.textContent = 'Add New Category';
      document.getElementById('category-editor-form').reset();
      document.getElementById('edit-cat-order').value = this.allCategories.length + 1;
      document.getElementById('edit-cat-status').value = 'published';
    }

    modal.classList.add('active');
  },

  // 8. Site Settings & Google Apps Script Connection
  populateSettingsForm(settings) {
    const gasInput = document.getElementById('setting-gas-url');
    if (gasInput) gasInput.value = getGasApiUrl();

    const siteName = document.getElementById('setting-site-name');
    if (siteName) siteName.value = settings.site_name || 'PromptForge';

    const headline = document.getElementById('setting-hero-headline');
    if (headline) headline.value = settings.hero_headline || '';

    const subtitle = document.getElementById('setting-hero-subtitle');
    if (subtitle) subtitle.value = settings.hero_subtitle || '';

    const announcement = document.getElementById('setting-announcement');
    if (announcement) announcement.value = settings.announcement_text || '';

    const email = document.getElementById('setting-contact-email');
    if (email) email.value = settings.contact_email || '';
  },

  initSettingsEvents() {
    const form = document.getElementById('site-settings-form');
    if (form) {
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const gasUrl = document.getElementById('setting-gas-url').value.trim();
        setGasApiUrl(gasUrl);

        const newSettings = {
          site_name: document.getElementById('setting-site-name').value.trim(),
          hero_headline: document.getElementById('setting-hero-headline').value.trim(),
          hero_subtitle: document.getElementById('setting-hero-subtitle').value.trim(),
          announcement_text: document.getElementById('setting-announcement').value.trim(),
          contact_email: document.getElementById('setting-contact-email').value.trim()
        };

        window.showToast('Settings saved successfully!');
        this.loadDashboardData();
      });
    }

    // Test GAS Connection Button
    const testGasBtn = document.getElementById('btn-test-gas-conn');
    if (testGasBtn) {
      testGasBtn.addEventListener('click', async () => {
        const url = document.getElementById('setting-gas-url').value.trim();
        if (!url) {
          window.showToast('Please enter your Google Apps Script URL first', 'info');
          return;
        }

        testGasBtn.textContent = 'Testing...';
        try {
          const res = await fetch(`${url}?action=ping`);
          const json = await res.json();
          if (json && json.status === 'ok') {
            window.showToast('Connection SUCCESSFUL! Google Apps Script is active. 🟢');
          } else {
            window.showToast('Connected, but unexpected response: ' + JSON.stringify(json), 'info');
          }
        } catch (err) {
          window.showToast('Connection failed: ' + err.message, 'info');
        } finally {
          testGasBtn.textContent = 'Test Connection';
        }
      });
    }
  }
};

// Initialize Admin on load
document.addEventListener('DOMContentLoaded', () => {
  AdminApp.init();
});


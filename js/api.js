/**
 * api.js - Data Client and API Connector for Google Apps Script & Local Cache
 */

const API = {
  // In-memory cache
  cachedData: null,

  /**
   * Fetches public site data (settings, categories, prompts, tags, navigation)
   * High-Performance Cache-First Architecture (0ms First Paint)
   */
  async getPublicData(forceRefresh = false) {
    if (this.cachedData && !forceRefresh) {
      return this.cachedData;
    }

    // 1. Instant Memory/LocalStorage Cache (0ms)
    const localCached = this.loadLocalCache();
    if (localCached && !forceRefresh) {
      this.cachedData = localCached;
      // Revalidate in background without blocking UI
      this.revalidateGasInBackground();
      return localCached;
    }

    // 2. Local bundled JSON fallback (instant <10ms)
    let localData = null;
    try {
      const response = await fetch(APP_CONFIG.LOCAL_DATA_URL + '?v=' + (APP_CONFIG.CACHE_VERSION || 'v2.2'));
      if (response.ok) {
        const initialData = await response.json();
        localData = {
          success: true,
          settings: initialData.site_settings || {},
          navigation: initialData.navigation || [],
          categories: initialData.categories || [],
          tags: initialData.tags || [],
          prompts: initialData.prompts || []
        };
        this.cachedData = localData;
        this.saveLocalCache(localData);
      }
    } catch (err) {
      console.warn('Local data fetch failed:', err);
    }

    // If we have local data, return it immediately!
    if (localData && !forceRefresh) {
      this.revalidateGasInBackground();
      return localData;
    }

    // 3. Fallback to Google Apps Script if forceRefresh is true or local data was missing
    const gasUrl = getGasApiUrl();
    if (gasUrl) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3500); // 3.5s timeout

        const response = await fetch(`${gasUrl}?action=getPublicData`, {
          method: 'GET',
          cache: 'no-cache',
          signal: controller.signal
        });
        clearTimeout(timeoutId);

        if (response.ok) {
          const data = await response.json();
          if (data && data.success) {
            this.cachedData = data;
            this.saveLocalCache(data);
            return data;
          }
        }
      } catch (err) {
        console.warn('Google Apps Script request timed out or failed:', err);
      }
    }

    return localData || { success: false, prompts: [], categories: [], settings: {} };
  },

  /**
   * Revalidates data from Google Apps Script silently in the background
   */
  async revalidateGasInBackground() {
    const gasUrl = getGasApiUrl();
    if (!gasUrl) return;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);

      const response = await fetch(`${gasUrl}?action=getPublicData`, {
        method: 'GET',
        cache: 'no-cache',
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (response.ok) {
        const data = await response.json();
        if (data && data.success && Array.isArray(data.prompts) && data.prompts.length > 0) {
          this.cachedData = data;
          this.saveLocalCache(data);
          // If the page has an active gallery listener, notify it
          window.dispatchEvent(new CustomEvent('promptforge:data-updated', { detail: data }));
        }
      }
    } catch (e) {
      // Background revalidation failures are silent
    }
  },

  /**
   * Fetches all published prompts
   */
  async getPrompts() {
    const data = await this.getPublicData();
    return data.prompts || [];
  },

  /**
   * Fetches a single prompt by its unique slug
   */
  async getPromptBySlug(slug) {
    if (!slug) return null;
    const cleanSlug = String(slug).toLowerCase().trim();
    const data = await this.getPublicData();
    const prompts = data.prompts || [];
    return prompts.find(p => String(p.slug).toLowerCase().trim() === cleanSlug) || null;
  },

  /**
   * Fetches all categories with active counts
   */
  async getCategories() {
    const data = await this.getPublicData();
    const categories = data.categories || [];
    const prompts = (data.prompts || []).filter(p => String(p.status).toLowerCase() === 'published');

    // Dynamically recalculate prompt count per category
    return categories.map(cat => {
      const catName = cat.name || cat.category_name || '';
      const count = prompts.filter(p => String(p.category || '').toLowerCase() === catName.toLowerCase()).length;
      return { ...cat, name: catName, category_name: catName, prompt_count: count };
    });
  },

  /**
   * Increments prompt copy count (Public Telemetry)
   */
  async trackPromptCopy(promptId) {
    if (!promptId) return;

    // Optimistically update local cache
    if (this.cachedData && this.cachedData.prompts) {
      const found = this.cachedData.prompts.find(p => p.id === promptId);
      if (found) {
        found.copy_count = (Number(found.copy_count) || 0) + 1;
        this.saveLocalCache(this.cachedData);
      }
    }

    const gasUrl = getGasApiUrl();
    if (gasUrl) {
      try {
        fetch(gasUrl, {
          method: 'POST',
          mode: 'no-cors',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'trackCopy', id: promptId })
        }).catch(() => {});
      } catch (e) {}
    }
  },

  /**
   * Increments prompt view count (Public Telemetry)
   */
  async trackPromptView(promptId) {
    if (!promptId) return;

    // Optimistically update local cache
    if (this.cachedData && this.cachedData.prompts) {
      const found = this.cachedData.prompts.find(p => p.id === promptId);
      if (found) {
        found.views = (Number(found.views) || 0) + 1;
        this.saveLocalCache(this.cachedData);
      }
    }

    const gasUrl = getGasApiUrl();
    if (gasUrl) {
      try {
        fetch(gasUrl, {
          method: 'POST',
          mode: 'no-cors',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'trackView', id: promptId })
        }).catch(() => {});
      } catch (e) {}
    }
  },

  // ==========================================================================
  // Admin Operations (Protected)
  // ==========================================================================

  getAuthToken() {
    return localStorage.getItem(APP_CONFIG.STORAGE_KEYS.AUTH_TOKEN) || '';
  },

  setAuthToken(token) {
    if (token) {
      localStorage.setItem(APP_CONFIG.STORAGE_KEYS.AUTH_TOKEN, token);
    } else {
      localStorage.removeItem(APP_CONFIG.STORAGE_KEYS.AUTH_TOKEN);
    }
  },

  async adminLogin(password) {
    const gasUrl = getGasApiUrl();
    
    // If connected to Google Apps Script
    if (gasUrl) {
      try {
        const res = await fetch(gasUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain' }, // Avoid CORS preflight in GAS
          body: JSON.stringify({ action: 'adminLogin', password: password })
        });
        const result = await res.json();
        if (result && result.success && result.token) {
          this.setAuthToken(result.token);
          return { success: true };
        }
        return { success: false, error: result.error || 'Invalid credentials' };
      } catch (err) {
        return { success: false, error: 'Network error connecting to Apps Script: ' + err.message };
      }
    }

    // Offline / Local development fallback: default password is 'admin123'
    if (password === 'admin123') {
      const mockToken = 'mock_admin_token_' + Date.now();
      this.setAuthToken(mockToken);
      return { success: true };
    }

    return { success: false, error: 'Incorrect password. (Default is admin123)' };
  },

  async verifyAuth() {
    const token = this.getAuthToken();
    if (!token) return false;

    const gasUrl = getGasApiUrl();
    if (gasUrl) {
      try {
        const res = await fetch(gasUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain' },
          body: JSON.stringify({ action: 'adminVerify', token: token })
        });
        const data = await res.json();
        return !!(data && data.valid);
      } catch (e) {
        return false;
      }
    }

    // Offline mode: valid if token exists
    return token.startsWith('mock_admin_token_');
  },

  async getAdminOverview() {
    const gasUrl = getGasApiUrl();
    const token = this.getAuthToken();

    if (gasUrl) {
      try {
        const res = await fetch(`${gasUrl}?action=adminOverview&token=${encodeURIComponent(token)}`);
        const data = await res.json();
        if (data.success) return data;
      } catch (e) {}
    }

    // Local calculation
    const publicData = await this.getPublicData();
    const prompts = publicData.prompts || [];
    let views = 0, copies = 0, pubCount = 0, draftCount = 0;

    prompts.forEach(p => {
      if (String(p.status).toLowerCase() === 'published') pubCount++;
      else draftCount++;
      views += Number(p.views) || 0;
      copies += Number(p.copy_count) || 0;
    });

    return {
      success: true,
      metrics: {
        total_prompts: prompts.length,
        published_prompts: pubCount,
        draft_prompts: draftCount,
        total_categories: (publicData.categories || []).length,
        total_views: views,
        total_copies: copies
      },
      recent_prompts: prompts.slice(0, 5)
    };
  },

  /**
   * Cleanly generate URL slug from text
   * The prompt title is used as the prompt page name
   */
  generateSlug(text) {
    if (!text) return 'prompt-' + Date.now().toString(36);
    return String(text)
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .trim()
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-');
  },

  async savePrompt(promptData) {
    // 1. Ensure prompt title is used as the prompt page name (slug)
    const title = promptData.title ? String(promptData.title).trim() : 'Untitled Prompt';
    promptData.title = title;
    promptData.slug = promptData.slug ? this.generateSlug(promptData.slug) : this.generateSlug(title);

    // 2. The page description should be the meta description
    const pageDescription = promptData.short_description || promptData.seo_description || promptData.full_description || promptData.description || '';
    promptData.short_description = pageDescription;
    promptData.seo_description = pageDescription;
    promptData.seo_title = promptData.seo_title || (title + ' | PromptForge');

    const gasUrl = getGasApiUrl();
    const token = this.getAuthToken();

    // 3. Try saving to local Node server API (saves to initial-data.json and builds permanent static HTML page)
    try {
      const localRes = await fetch('/api/savePrompt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(promptData)
      });
      if (localRes.ok) {
        const localJson = await localRes.json();
        if (localJson.success) {
          // If GAS is also connected, sync to GAS
          if (gasUrl) {
            fetch(gasUrl, {
              method: 'POST',
              headers: { 'Content-Type': 'text/plain' },
              body: JSON.stringify({ action: 'savePrompt', token: token, data: promptData })
            }).catch(e => console.warn('GAS background sync failed:', e));
          }
          await this.getPublicData(true); // refresh cache
          return localJson;
        }
      }
    } catch (e) {
      console.warn('Local API savePrompt call skipped or unavailable:', e.message);
    }

    // 4. Try Google Apps Script if connected
    if (gasUrl) {
      try {
        const res = await fetch(gasUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain' },
          body: JSON.stringify({
            action: 'savePrompt',
            token: token,
            data: promptData
          })
        });
        const result = await res.json();
        if (result.success) {
          await this.getPublicData(true); // refresh cache
          return result;
        }
        throw new Error(result.error || 'Failed to save prompt on backend');
      } catch (err) {
        throw err;
      }
    }

    // 5. Local state / offline fallback
    const data = await this.getPublicData();
    const prompts = data.prompts || [];
    let isNew = !promptData.id;

    if (isNew) {
      promptData.id = 'p_' + Date.now().toString(36);
      promptData.created_at = new Date().toISOString().split('T')[0];
      promptData.updated_at = promptData.created_at;
      promptData.views = 0;
      promptData.copy_count = 0;
      prompts.unshift(promptData);
    } else {
      const idx = prompts.findIndex(p => p.id === promptData.id || p.slug === promptData.slug);
      if (idx !== -1) {
        promptData.updated_at = new Date().toISOString().split('T')[0];
        prompts[idx] = { ...prompts[idx], ...promptData };
      } else {
        prompts.unshift(promptData);
      }
    }

    data.prompts = prompts;
    this.saveLocalCache(data);
    this.cachedData = data;
    return { success: true, id: promptData.id, slug: promptData.slug, pageUrl: `/prompt/${promptData.slug}/` };
  },

  /**
   * Batch Import Prompts - Fast bulk saving, creates dedicated pages and updates sitemap
   */
  async batchImportPrompts(promptsArray) {
    if (!Array.isArray(promptsArray) || !promptsArray.length) {
      return { success: false, error: 'No prompts provided' };
    }

    const gasUrl = getGasApiUrl();
    const token = this.getAuthToken();

    // 1. Try local node server batch API (instant page generation & sitemap update)
    try {
      const localRes = await fetch('/api/batchImportPrompts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompts: promptsArray })
      });
      if (localRes.ok) {
        const localJson = await localRes.json();
        if (localJson.success) {
          // If GAS is also connected, sync to GAS in background
          if (gasUrl) {
            fetch(gasUrl, {
              method: 'POST',
              headers: { 'Content-Type': 'text/plain' },
              body: JSON.stringify({ action: 'batchImportPrompts', token: token, prompts: promptsArray })
            }).catch(() => {});
          }
          await this.getPublicData(true);
          return localJson;
        }
      }
    } catch (e) {
      console.warn('Local batch API call skipped:', e.message);
    }

    // 2. Try Google Apps Script batch import
    if (gasUrl) {
      try {
        const res = await fetch(gasUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain' },
          body: JSON.stringify({
            action: 'batchImportPrompts',
            token: token,
            prompts: promptsArray
          })
        });
        const result = await res.json();
        if (result.success) {
          await this.getPublicData(true);
          return result;
        }
        throw new Error(result.error || 'Failed to import on Google Sheets');
      } catch (err) {
        throw err;
      }
    }

    // 3. Fallback sequential savePrompt
    const results = [];
    for (let i = 0; i < promptsArray.length; i++) {
      try {
        const res = await this.savePrompt(promptsArray[i]);
        results.push({ index: i, success: true, prompt: promptsArray[i], slug: res.slug });
      } catch (err) {
        results.push({ index: i, success: false, error: err.message });
      }
    }
    return { success: true, count: results.length, results };
  },

  async deletePrompt(promptId) {
    const gasUrl = getGasApiUrl();
    const token = this.getAuthToken();

    // 1. Try local node server first
    try {
      const localRes = await fetch('/api/deletePrompt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: promptId })
      });
      if (localRes.ok) {
        if (gasUrl) {
          fetch(gasUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain' },
            body: JSON.stringify({ action: 'deletePrompt', token: token, id: promptId })
          }).catch(() => {});
        }
        await this.getPublicData(true);
        return { success: true };
      }
    } catch (e) {}

    // 2. Try Google Apps Script if connected
    if (gasUrl) {
      try {
        const res = await fetch(gasUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain' },
          body: JSON.stringify({ action: 'deletePrompt', token: token, id: promptId })
        });
        const result = await res.json();
        if (result.success) {
          await this.getPublicData(true);
          return result;
        }
        throw new Error(result.error || 'Failed to delete on Google Sheets');
      } catch (e) {
        throw e;
      }
    }

    // Local fallback
    const data = await this.getPublicData();
    data.prompts = (data.prompts || []).filter(p => p.id !== promptId);
    this.saveLocalCache(data);
    this.cachedData = data;
    return { success: true };
  },

  async saveCategory(catData) {
    const gasUrl = getGasApiUrl();
    const token = this.getAuthToken();

    if (gasUrl) {
      try {
        const res = await fetch(gasUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain' },
          body: JSON.stringify({ action: 'saveCategory', token: token, data: catData })
        });
        const result = await res.json();
        if (result.success) {
          await this.getPublicData(true);
          return result;
        }
        throw new Error(result.error || 'Failed to save category');
      } catch (e) {
        throw e;
      }
    }

    // Local fallback
    const data = await this.getPublicData();
    const categories = data.categories || [];
    if (!catData.id) {
      catData.id = 'cat_' + Date.now().toString(36);
      categories.push(catData);
    } else {
      const idx = categories.findIndex(c => c.id === catData.id);
      if (idx !== -1) categories[idx] = { ...categories[idx], ...catData };
    }
    data.categories = categories;
    this.saveLocalCache(data);
    this.cachedData = data;
    return { success: true, id: catData.id };
  },

  async deleteCategory(catId) {
    const gasUrl = getGasApiUrl();
    const token = this.getAuthToken();

    if (gasUrl) {
      try {
        const res = await fetch(gasUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain' },
          body: JSON.stringify({ action: 'deleteCategory', token: token, id: catId })
        });
        const result = await res.json();
        if (result.success) {
          await this.getPublicData(true);
          return result;
        }
        throw new Error(result.error);
      } catch (e) {
        throw e;
      }
    }

    const data = await this.getPublicData();
    data.categories = (data.categories || []).filter(c => c.id !== catId);
    this.saveLocalCache(data);
    this.cachedData = data;
    return { success: true };
  },

  // Cache persistence helpers
  saveLocalCache(data) {
    try {
      localStorage.setItem(APP_CONFIG.STORAGE_KEYS.LOCAL_DATA_CACHE, JSON.stringify(data));
      localStorage.setItem(APP_CONFIG.STORAGE_KEYS.LOCAL_DATA_CACHE + '_ver', APP_CONFIG.CACHE_VERSION || 'v2.2');
    } catch (e) {}
  },

  loadLocalCache() {
    try {
      const ver = localStorage.getItem(APP_CONFIG.STORAGE_KEYS.LOCAL_DATA_CACHE + '_ver');
      if (ver !== (APP_CONFIG.CACHE_VERSION || 'v2.2')) {
        localStorage.removeItem(APP_CONFIG.STORAGE_KEYS.LOCAL_DATA_CACHE);
        return null;
      }
      const cached = localStorage.getItem(APP_CONFIG.STORAGE_KEYS.LOCAL_DATA_CACHE);
      if (cached) return JSON.parse(cached);
    } catch (e) {}
    return null;
  }
};


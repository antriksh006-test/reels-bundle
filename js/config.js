/**
 * config.js - Global Frontend Configuration for PromptForge
 */

const APP_CONFIG = {
  CACHE_VERSION: 'v2.2',
  SITE_NAME: 'PromptForge',
  SITE_URL: window.location.origin,
  
  // Storage Keys
  STORAGE_KEYS: {
    THEME: 'promptforge_theme',
    AUTH_TOKEN: 'promptforge_admin_token',
    GAS_API_URL: 'promptforge_gas_api_url',
    LOCAL_DATA_CACHE: 'promptforge_data_cache'
  },

  // Default Google Apps Script Web App URL
  // Empty by default so local curated data loads instantly. Enter deployed URL in Admin Settings or here.
  DEFAULT_GAS_URL: '',

  // Fallback data file when GAS is not connected or offline
  LOCAL_DATA_URL: '/data/initial-data.json',

  // Defaults
  DEFAULT_PAGE_SIZE: 9,
  DEFAULT_THEME: 'dark'
};

// Allow runtime override of GAS URL via localStorage if set in Admin
function getGasApiUrl() {
  const customUrl = localStorage.getItem(APP_CONFIG.STORAGE_KEYS.GAS_API_URL);
  if (customUrl && customUrl.trim().length > 0) {
    return customUrl.trim();
  }
  return APP_CONFIG.DEFAULT_GAS_URL;
}

function setGasApiUrl(url) {
  if (url) {
    localStorage.setItem(APP_CONFIG.STORAGE_KEYS.GAS_API_URL, url.trim());
  } else {
    localStorage.removeItem(APP_CONFIG.STORAGE_KEYS.GAS_API_URL);
  }
}


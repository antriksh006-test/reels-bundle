/**
 * prompts.gs - CRUD, Retrieval, and Metric Tracking for PROMPTS sheet
 */

const PROMPT_HEADERS = [
  'id', 'title', 'slug', 'short_description', 'full_description',
  'prompt_content', 'category', 'subcategory', 'tags', 'featured_image',
  'author', 'seo_title', 'seo_description', 'canonical_url', 'status',
  'featured', 'created_at', 'updated_at', 'views', 'copy_count'
];

/**
 * Returns all prompts, optionally filtering out drafts for public views
 */
function getAllPrompts(includeDrafts) {
  const sheet = getSheetByName(CONFIG.SHEET_NAMES.PROMPTS);
  const rows = sheetToObjects(sheet);
  
  if (includeDrafts) {
    return rows;
  }
  return rows.filter(r => String(r.status).toLowerCase() === 'published');
}

/**
 * Finds a single prompt by slug
 */
function getPromptBySlug(slug) {
  if (!slug) return null;
  const cleanSlug = String(slug).trim().toLowerCase();
  const sheet = getSheetByName(CONFIG.SHEET_NAMES.PROMPTS);
  const rows = sheetToObjects(sheet);
  
  const found = rows.find(r => String(r.slug).trim().toLowerCase() === cleanSlug);
  return found || null;
}

/**
 * Saves a prompt (creates new or updates existing)
 */
function savePrompt(data) {
  if (!data.title || !data.prompt_content) {
    throw new Error('Title and prompt content are required.');
  }

  const sheet = getSheetByName(CONFIG.SHEET_NAMES.PROMPTS);
  const allData = sheet.getDataRange().getValues();
  const headers = allData[0].map(h => String(h).trim());
  
  const now = new Date().toISOString().split('T')[0];
  let id = data.id;
  let isNew = false;
  
  // Generate or sanitize slug
  let slug = data.slug ? sanitizeSlug(data.slug) : sanitizeSlug(data.title);
  
  // Find row if ID is provided
  let rowIndex = -1;
  if (id) {
    for (let i = 1; i < allData.length; i++) {
      if (String(allData[i][headers.indexOf('id')]) === String(id)) {
        rowIndex = i + 1; // 1-indexed for Sheets
        break;
      }
    }
  }
  
  if (rowIndex === -1) {
    isNew = true;
    id = 'p_' + Utilities.getUuid().substring(0, 8);
  }
  
  // Ensure unique slug
  slug = ensureUniqueSlug(sheet, slug, id, headers);
  
  const canonicalUrl = '/prompt/' + slug + '/';
  const seoTitle = data.seo_title || (data.title + ' | PromptForge');
  const seoDescription = data.seo_description || (data.short_description ? data.short_description.substring(0, 160) : '');
  
  // Preserve or initialize metrics
  let views = 0;
  let copyCount = 0;
  let createdAt = now;
  
  if (!isNew && rowIndex > 0) {
    const existingRow = allData[rowIndex - 1];
    const viewsIdx = headers.indexOf('views');
    const copyIdx = headers.indexOf('copy_count');
    const createdIdx = headers.indexOf('created_at');
    if (viewsIdx !== -1) views = Number(existingRow[viewsIdx]) || 0;
    if (copyIdx !== -1) copyCount = Number(existingRow[copyIdx]) || 0;
    if (createdIdx !== -1 && existingRow[createdIdx]) createdAt = existingRow[createdIdx];
  }

  const rowValues = [];
  headers.forEach(h => {
    switch (h) {
      case 'id': rowValues.push(id); break;
      case 'title': rowValues.push(data.title || ''); break;
      case 'slug': rowValues.push(slug); break;
      case 'short_description': rowValues.push(data.short_description || ''); break;
      case 'full_description': rowValues.push(data.full_description || ''); break;
      case 'prompt_content': rowValues.push(data.prompt_content || ''); break;
      case 'category': rowValues.push(data.category || 'Other'); break;
      case 'subcategory': rowValues.push(data.subcategory || ''); break;
      case 'tags': rowValues.push(data.tags || ''); break;
      case 'featured_image': rowValues.push(data.featured_image || ''); break;
      case 'author': rowValues.push(data.author || 'PromptForge Editor'); break;
      case 'seo_title': rowValues.push(seoTitle); break;
      case 'seo_description': rowValues.push(seoDescription); break;
      case 'canonical_url': rowValues.push(canonicalUrl); break;
      case 'status': rowValues.push((data.status || 'published').toLowerCase()); break;
      case 'featured': rowValues.push(data.featured === true || String(data.featured).toLowerCase() === 'true'); break;
      case 'created_at': rowValues.push(createdAt); break;
      case 'updated_at': rowValues.push(now); break;
      case 'views': rowValues.push(views); break;
      case 'copy_count': rowValues.push(copyCount); break;
      default: rowValues.push(data[h] !== undefined ? data[h] : '');
    }
  });

  if (isNew) {
    sheet.appendRow(rowValues);
  } else {
    sheet.getRange(rowIndex, 1, 1, rowValues.length).setValues([rowValues]);
  }

  return {
    success: true,
    id: id,
    slug: slug,
    canonical_url: canonicalUrl,
    message: isNew ? 'Prompt created successfully' : 'Prompt updated successfully'
  };
}

/**
 * Deletes a prompt by ID
 */
function deletePrompt(id) {
  if (!id) throw new Error('Prompt ID is required for deletion');
  const sheet = getSheetByName(CONFIG.SHEET_NAMES.PROMPTS);
  const data = sheet.getDataRange().getValues();
  const idCol = data[0].map(h => String(h).trim()).indexOf('id');
  
  if (idCol === -1) throw new Error('ID column not found in sheet');
  
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][idCol]) === String(id)) {
      sheet.deleteRow(i + 1);
      return { success: true, message: 'Prompt deleted successfully' };
    }
  }
  return { success: false, error: 'Prompt not found with id: ' + id };
}

/**
 * Increments prompt view or copy counter atomically
 */
function incrementPromptMetric(id, metricType) {
  if (!id) return { success: false, error: 'Missing prompt ID' };
  const targetColName = metricType === 'copy' ? 'copy_count' : 'views';
  
  const sheet = getSheetByName(CONFIG.SHEET_NAMES.PROMPTS);
  const data = sheet.getDataRange().getValues();
  const headers = data[0].map(h => String(h).trim());
  const idCol = headers.indexOf('id');
  const targetCol = headers.indexOf(targetColName);
  
  if (idCol === -1 || targetCol === -1) return { success: false, error: 'Target column missing' };
  
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][idCol]) === String(id)) {
      const cell = sheet.getRange(i + 1, targetCol + 1);
      const currentVal = Number(cell.getValue()) || 0;
      cell.setValue(currentVal + 1);
      return { success: true, current_count: currentVal + 1 };
    }
  }
  return { success: false, error: 'Prompt not found' };
}

/**
 * Helper to sanitize string into url-safe slug
 */
function sanitizeSlug(text) {
  return String(text || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9 -]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

/**
 * Ensures a slug is unique in the prompt table
 */
function ensureUniqueSlug(sheet, baseSlug, currentId, headers) {
  const data = sheet.getDataRange().getValues();
  const idCol = headers.indexOf('id');
  const slugCol = headers.indexOf('slug');
  if (slugCol === -1) return baseSlug;
  
  let candidate = baseSlug;
  let counter = 1;
  let exists = true;
  
  while (exists) {
    exists = false;
    for (let i = 1; i < data.length; i++) {
      const rowId = data[i][idCol];
      const rowSlug = data[i][slugCol];
      if (String(rowSlug).toLowerCase() === candidate.toLowerCase() && String(rowId) !== String(currentId)) {
        exists = true;
        candidate = baseSlug + '-' + counter;
        counter++;
        break;
      }
    }
  }
  return candidate;
}


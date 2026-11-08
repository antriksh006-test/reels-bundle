/**
 * categories.gs - Category & Tag Management for Google Apps Script Backend
 */

const CATEGORY_HEADERS = [
  'id', 'category_name', 'slug', 'description', 'parent_category',
  'category_image', 'seo_title', 'seo_description', 'status', 'display_order'
];

const TAG_HEADERS = ['id', 'tag_name', 'slug', 'description', 'status'];

/**
 * Returns all categories with active prompt counts
 */
function getAllCategories(includeDrafts) {
  const catSheet = getSheetByName(CONFIG.SHEET_NAMES.CATEGORIES);
  const categories = sheetToObjects(catSheet);
  
  // Calculate prompt counts per category
  let promptSheet;
  let promptRows = [];
  try {
    promptSheet = getSheetByName(CONFIG.SHEET_NAMES.PROMPTS);
    promptRows = sheetToObjects(promptSheet);
  } catch (e) {
    // prompts sheet might be empty
  }
  
  const countsMap = {};
  promptRows.forEach(p => {
    if (!includeDrafts && String(p.status).toLowerCase() !== 'published') return;
    const catName = String(p.category || '').trim().toLowerCase();
    if (catName) {
      countsMap[catName] = (countsMap[catName] || 0) + 1;
    }
  });

  const result = categories
    .filter(c => includeDrafts || String(c.status).toLowerCase() === 'published')
    .map(c => {
      const matchKey = String(c.category_name || '').trim().toLowerCase();
      return {
        ...c,
        prompt_count: countsMap[matchKey] || 0
      };
    });

  // Sort by display_order
  result.sort((a, b) => (Number(a.display_order) || 99) - (Number(b.display_order) || 99));
  return result;
}

/**
 * Saves a category (create or update)
 */
function saveCategory(data) {
  if (!data.category_name) throw new Error('Category name is required.');
  
  const sheet = getSheetByName(CONFIG.SHEET_NAMES.CATEGORIES);
  const allData = sheet.getDataRange().getValues();
  const headers = allData[0].map(h => String(h).trim());
  
  let id = data.id;
  let rowIndex = -1;
  let isNew = false;
  
  if (id) {
    for (let i = 1; i < allData.length; i++) {
      if (String(allData[i][headers.indexOf('id')]) === String(id)) {
        rowIndex = i + 1;
        break;
      }
    }
  }
  
  if (rowIndex === -1) {
    isNew = true;
    id = 'cat_' + Utilities.getUuid().substring(0, 8);
  }
  
  const slug = data.slug ? sanitizeSlug(data.slug) : sanitizeSlug(data.category_name);
  const seoTitle = data.seo_title || (data.category_name + ' AI Prompts | PromptForge');
  const seoDesc = data.seo_description || (data.description ? data.description.substring(0, 160) : '');

  const rowValues = [];
  headers.forEach(h => {
    switch (h) {
      case 'id': rowValues.push(id); break;
      case 'category_name': rowValues.push(data.category_name || ''); break;
      case 'slug': rowValues.push(slug); break;
      case 'description': rowValues.push(data.description || ''); break;
      case 'parent_category': rowValues.push(data.parent_category || ''); break;
      case 'category_image': rowValues.push(data.category_image || ''); break;
      case 'seo_title': rowValues.push(seoTitle); break;
      case 'seo_description': rowValues.push(seoDesc); break;
      case 'status': rowValues.push((data.status || 'published').toLowerCase()); break;
      case 'display_order': rowValues.push(Number(data.display_order) || 10); break;
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
    message: isNew ? 'Category created' : 'Category updated'
  };
}

/**
 * Deletes a category by ID
 */
function deleteCategory(id) {
  if (!id) throw new Error('Category ID required');
  const sheet = getSheetByName(CONFIG.SHEET_NAMES.CATEGORIES);
  const data = sheet.getDataRange().getValues();
  const idCol = data[0].map(h => String(h).trim()).indexOf('id');
  
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][idCol]) === String(id)) {
      sheet.deleteRow(i + 1);
      return { success: true, message: 'Category deleted' };
    }
  }
  return { success: false, error: 'Category not found' };
}

/**
 * Gets all tags
 */
function getAllTags() {
  try {
    const sheet = getSheetByName(CONFIG.SHEET_NAMES.TAGS);
    return sheetToObjects(sheet);
  } catch (e) {
    return [];
  }
}


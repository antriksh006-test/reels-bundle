/**
 * sitemap.gs - Dynamic XML Sitemap Generator for Google Apps Script Backend
 */

function generateSitemapXml() {
  const settings = getSiteSettings();
  const baseUrl = (settings.site_url || 'https://promptforge.dev').replace(/\/+$/, '');
  
  const prompts = getAllPrompts(false); // Only published
  const categories = getAllCategories(false); // Only published
  const pages = getAllPages(false); // Only published
  
  const today = new Date().toISOString().split('T')[0];
  
  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
  xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';
  
  // 1. Homepage
  xml += '  <url>\n';
  xml += '    <loc>' + escapeXml(baseUrl + '/') + '</loc>\n';
  xml += '    <lastmod>' + today + '</lastmod>\n';
  xml += '    <changefreq>daily</changefreq>\n';
  xml += '    <priority>1.0</priority>\n';
  xml += '  </url>\n';
  
  // 2. Main Directory Pages
  const mainPages = [
    { url: '/prompts.html', priority: '0.9', freq: 'daily' },
    { url: '/categories.html', priority: '0.8', freq: 'weekly' }
  ];
  mainPages.forEach(p => {
    xml += '  <url>\n';
    xml += '    <loc>' + escapeXml(baseUrl + p.url) + '</loc>\n';
    xml += '    <lastmod>' + today + '</lastmod>\n';
    xml += '    <changefreq>' + p.freq + '</changefreq>\n';
    xml += '    <priority>' + p.priority + '</priority>\n';
    xml += '  </url>\n';
  });

  // 3. Published Category Pages
  categories.forEach(cat => {
    if (!cat.slug) return;
    xml += '  <url>\n';
    xml += '    <loc>' + escapeXml(baseUrl + '/category/' + cat.slug + '/') + '</loc>\n';
    xml += '    <lastmod>' + today + '</lastmod>\n';
    xml += '    <changefreq>weekly</changefreq>\n';
    xml += '    <priority>0.8</priority>\n';
    xml += '  </url>\n';
  });

  // 4. Published Prompt Pages
  prompts.forEach(prompt => {
    if (!prompt.slug) return;
    const modDate = prompt.updated_at || prompt.created_at || today;
    xml += '  <url>\n';
    xml += '    <loc>' + escapeXml(baseUrl + '/prompt/' + prompt.slug + '/') + '</loc>\n';
    xml += '    <lastmod>' + escapeXml(String(modDate).split('T')[0]) + '</lastmod>\n';
    xml += '    <changefreq>weekly</changefreq>\n';
    xml += '    <priority>0.9</priority>\n';
    xml += '  </url>\n';
  });

  // 5. Static Content Pages
  pages.forEach(pg => {
    if (!pg.slug) return;
    xml += '  <url>\n';
    xml += '    <loc>' + escapeXml(baseUrl + '/' + pg.slug + '.html') + '</loc>\n';
    xml += '    <lastmod>' + today + '</lastmod>\n';
    xml += '    <changefreq>monthly</changefreq>\n';
    xml += '    <priority>0.5</priority>\n';
    xml += '  </url>\n';
  });

  xml += '</urlset>';
  return xml;
}

function escapeXml(unsafe) {
  return String(unsafe).replace(/[<>&'"]/g, function (c) {
    switch (c) {
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '&': return '&amp;';
      case '\'': return '&apos;';
      case '"': return '&quot;';
    }
  });
}


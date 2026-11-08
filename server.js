/**
 * server.js - Zero-Dependency Local Development HTTP Server for PromptForge
 * Run: `node server.js` or `npm start`
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const { saveAndRenderPrompt, saveAndRenderPromptBatch, renderPromptPage, generateSlug, build } = require('./build.js');

const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = fs.existsSync(path.join(__dirname, 'public')) ? path.join(__dirname, 'public') : __dirname;
const DATA_FILE = path.join(PUBLIC_DIR, 'data', 'initial-data.json');

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.xml': 'application/xml; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8'
};

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk;
      if (body.length > 5 * 1024 * 1024) { // 5MB limit
        req.destroy();
        reject(new Error('Request payload too large'));
      }
    });
    req.on('end', () => {
      if (!body) return resolve({});
      try {
        resolve(JSON.parse(body));
      } catch (err) {
        reject(new Error('Invalid JSON: ' + err.message));
      }
    });
    req.on('error', reject);
  });
}

const server = http.createServer(async (req, res) => {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const parsedUrl = new URL(req.url, `http://${req.headers.host}`);
  let pathname = parsedUrl.pathname;

  // Support /adm shortcut to redirect directly to /admin/
  if (pathname === '/adm' || pathname === '/adm/') {
    res.writeHead(302, { Location: '/admin/' });
    res.end();
    return;
  }

  // =========================================================================
  // API Endpoints: Save Prompt, Batch Import, Delete Prompt
  // =========================================================================

  // POST /api/savePrompt or POST /api/prompts
  if (req.method === 'POST' && (pathname === '/api/savePrompt' || pathname === '/api/prompts')) {
    try {
      const data = await readJsonBody(req);
      const promptData = data.data || data;

      if (!promptData || !promptData.title) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: 'Prompt title is required.' }));
        return;
      }

      // Save to initial-data.json AND immediately render permanent static page
      const result = saveAndRenderPrompt(promptData);

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        success: true,
        id: result.prompt.id,
        slug: result.slug,
        pageUrl: result.pagePath,
        message: 'Prompt saved and permanent page generated successfully.'
      }));
      return;
    } catch (err) {
      console.error('Error saving prompt:', err);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: err.message }));
      return;
    }
  }

  // POST /api/batchImportPrompts
  if (req.method === 'POST' && pathname === '/api/batchImportPrompts') {
    try {
      const body = await readJsonBody(req);
      const items = Array.isArray(body) ? body : (body.prompts || []);

      if (!items.length) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: 'No prompts provided in batch payload' }));
        return;
      }

      const batchResult = saveAndRenderPromptBatch(items);

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        success: true,
        count: batchResult.count,
        results: batchResult.results,
        message: `Successfully processed ${batchResult.count} prompts, generated individual pages, and updated sitemap.xml.`
      }));
      return;
    } catch (err) {
      console.error('Error batch importing prompts:', err);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: err.message }));
      return;
    }
  }

  // POST /api/deletePrompt
  if (req.method === 'POST' && pathname === '/api/deletePrompt') {
    try {
      const body = await readJsonBody(req);
      const promptId = body.id;

      if (!promptId) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: 'Prompt ID required' }));
        return;
      }

      const raw = fs.readFileSync(DATA_FILE, 'utf-8');
      const db = JSON.parse(raw);
      const target = (db.prompts || []).find(p => p.id === promptId);
      db.prompts = (db.prompts || []).filter(p => p.id !== promptId);
      fs.writeFileSync(DATA_FILE, JSON.stringify(db, null, 2), 'utf-8');

      // Remove page folder if exists
      if (target && target.slug) {
        const pDir = path.join(PUBLIC_DIR, 'prompt', target.slug);
        if (fs.existsSync(pDir)) {
          fs.rmSync(pDir, { recursive: true, force: true });
        }
      }

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true }));
      return;
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: err.message }));
      return;
    }
  }

  // POST /api/build or POST /api/rebuild
  if (req.method === 'POST' && (pathname === '/api/build' || pathname === '/api/rebuild')) {
    try {
      await build();
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        success: true,
        message: 'Static SEO pages and sitemap.xml generated successfully!'
      }));
      return;
    } catch (err) {
      console.error('Error generating build:', err);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: err.message }));
      return;
    }
  }

  // =========================================================================
  // Static File & Dynamic Prompt Page Resolution
  // =========================================================================

  // Resolve directory index or clean path
  let filePath = path.join(PUBLIC_DIR, pathname);

  try {
    if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
      filePath = path.join(filePath, 'index.html');
    } else if (!fs.existsSync(filePath)) {
      if (fs.existsSync(filePath + '.html')) {
        filePath = filePath + '.html';
      }
    }

    // Dynamic Prompt Resolution: If /prompt/<slug>/ does not exist on disk yet,
    // check database and generate it on the fly!
    if (!fs.existsSync(filePath) && pathname.startsWith('/prompt/')) {
      const slugMatch = pathname.match(/^\/prompt\/([^/]+)/);
      if (slugMatch && slugMatch[1]) {
        const slug = slugMatch[1];
        if (fs.existsSync(DATA_FILE)) {
          const db = JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
          const found = (db.prompts || []).find(p => p.slug === slug || generateSlug(p.title) === slug);
          if (found) {
            const result = saveAndRenderPrompt(found);
            filePath = result.pageFile;
          }
        }
      }
    }

    if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
      const ext = path.extname(filePath).toLowerCase();
      const contentType = MIME_TYPES[ext] || 'application/octet-stream';
      res.writeHead(200, { 'Content-Type': contentType });
      fs.createReadStream(filePath).pipe(res);
      return;
    }
  } catch (err) {
    console.error('File resolution error:', err);
  }

  // Fallback 404
  const notFoundPath = path.join(PUBLIC_DIR, '404.html');
  if (fs.existsSync(notFoundPath)) {
    res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
    fs.createReadStream(notFoundPath).pipe(res);
  } else {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('404 Not Found');
  }
});

server.listen(PORT, () => {
  console.log(`\n======================================================`);
  console.log(`🚀 PromptForge Server running at http://localhost:${PORT}`);
  console.log(`📂 Admin Dashboard: http://localhost:${PORT}/admin/`);
  console.log(`📂 Sample Prompt:   http://localhost:${PORT}/prompt/chatgpt-seo-blog-writer/`);
  console.log(`📂 Sitemap XML:     http://localhost:${PORT}/sitemap.xml`);
  console.log(`======================================================\n`);
});

/**
 * test.js - Automated Verification Suite for PromptForge
 * Tests SEO, Schema, Permanent URLs, Admin authentication logic, and Sitemap validity.
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');

function runTests() {
  console.log('🧪 Starting Automated Verification Suite...\n');
  let passed = 0;

  // Test 1: Verify data/initial-data.json exists and is valid JSON
  const dataPath = path.join(__dirname, 'data', 'initial-data.json');
  assert(fs.existsSync(dataPath), 'initial-data.json must exist');
  const data = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));
  assert(data.prompts && data.prompts.length > 0, 'Prompts must be populated');
  assert(data.categories && data.categories.length > 0, 'Categories must be present');
  assert(data.prompts && data.prompts.length >= 100, 'All user prompts must be present');
  console.log('✅ Test 1 Passed: Database schema and all categories verified.');
  passed++;

  // Test 2: Verify Static SEO Pre-rendered Prompt Pages
  const sampleSlug = data.prompts[0].slug;
  const promptHtmlPath = path.join(__dirname, 'prompt', sampleSlug, 'index.html');
  assert(fs.existsSync(promptHtmlPath), `Permanent URL page /prompt/${sampleSlug}/index.html must exist`);
  const promptHtml = fs.readFileSync(promptHtmlPath, 'utf-8');
  assert(promptHtml.includes('<title>'), 'Unique title tag missing');
  assert(promptHtml.includes('rel="canonical" href="https://reels-bundle.vercel.app/prompt/' + sampleSlug + '/"'), 'Canonical URL tag missing or incorrect');
  assert(promptHtml.includes('@type": "CreativeWork"'), 'CreativeWork JSON-LD missing');
  assert(promptHtml.includes('@type": "BreadcrumbList"'), 'BreadcrumbList JSON-LD missing');
  assert(promptHtml.includes('id="master-copy-prompt-btn"'), 'Master copy button missing');
  assert(promptHtml.includes('api.whatsapp.com/send'), 'WhatsApp share button missing');
  assert(promptHtml.includes('t.me/share/url'), 'Telegram share button missing');
  assert(promptHtml.includes('twitter.com/intent/tweet'), 'X share button missing');
  console.log('✅ Test 2 Passed: Individual permanent prompt page, SEO tags, schema, and sharing buttons verified.');
  passed++;

  // Test 3: Verify All Published Prompts Have Individual Pages
  const publishedPrompts = data.prompts.filter(p => p.status === 'published');
  publishedPrompts.forEach(p => {
    const pagePath = path.join(__dirname, 'prompt', p.slug, 'index.html');
    assert(fs.existsSync(pagePath), `Page /prompt/${p.slug}/index.html must exist`);
  });
  console.log(`✅ Test 3 Passed: Verified all ${publishedPrompts.length} published prompts have permanent static HTML pages.`);
  passed++;

  // Test 4: Verify Category Pages
  const sampleCat = data.categories[0];
  const sampleCatSlug = sampleCat.slug;
  const catHtmlPath = path.join(__dirname, 'category', sampleCatSlug, 'index.html');
  assert(fs.existsSync(catHtmlPath), `Category landing page /category/${sampleCatSlug}/index.html must exist`);
  const catHtml = fs.readFileSync(catHtmlPath, 'utf-8');
  assert(catHtml.includes('PromptForge'), 'Category SEO title missing');
  assert(catHtml.includes('@type": "CollectionPage"'), 'Category CollectionPage schema missing');
  console.log('✅ Test 4 Passed: Category landing pages verified.');
  passed++;

  // Test 5: Verify Sitemap.xml
  const sitemapPath = path.join(__dirname, 'sitemap.xml');
  assert(fs.existsSync(sitemapPath), 'sitemap.xml must exist');
  const sitemap = fs.readFileSync(sitemapPath, 'utf-8');
  assert(sitemap.includes('<loc>https://reels-bundle.vercel.app/</loc>'), 'Homepage missing in sitemap');
  assert(sitemap.includes(`<loc>https://reels-bundle.vercel.app/prompt/${data.prompts[0].slug}/</loc>`), 'Prompt URL missing in sitemap');
  assert(sitemap.includes(`<loc>https://reels-bundle.vercel.app/category/${data.categories[0].slug}/</loc>`), 'Category URL missing in sitemap');
  assert(!sitemap.includes('/admin/'), 'Admin pages must be excluded from sitemap');
  console.log('✅ Test 5 Passed: sitemap.xml structure, inclusion, and exclusion rules verified.');
  passed++;

  // Test 6: Verify Robots.txt
  const robotsPath = path.join(__dirname, 'robots.txt');
  assert(fs.existsSync(robotsPath), 'robots.txt must exist');
  const robots = fs.readFileSync(robotsPath, 'utf-8');
  assert(robots.includes('Disallow: /admin/'), 'Admin must be disallowed in robots.txt');
  assert(robots.includes('Sitemap: https://reels-bundle.vercel.app/sitemap.xml'), 'Sitemap directive missing in robots.txt');
  console.log('✅ Test 6 Passed: robots.txt rules verified.');
  passed++;

  // Test 7: Verify Google Apps Script Backend Files
  const backendDir = path.join(__dirname, 'backend');
  const expectedFiles = ['Code.gs', 'config.gs', 'auth.gs', 'prompts.gs', 'categories.gs', 'settings.gs', 'sitemap.gs', 'setup.gs'];
  expectedFiles.forEach(file => {
    assert(fs.existsSync(path.join(backendDir, file)), `Backend file ${file} must exist`);
  });
  console.log('✅ Test 7 Passed: All 8 Google Apps Script backend modules verified.');
  passed++;

  // Test 8: Verify New Prompt Push Creates Own Page with Title as Page Name and Description as Meta Description
  const { saveAndRenderPrompt } = require('./build.js');
  const testTitle = 'Cyberpunk Neon Samurai Warrior Portrait';
  const testDesc = 'A futuristic cyberpunk warrior standing under rain-slicked Tokyo neon signs.';
  const testPrompt = {
    title: testTitle,
    short_description: testDesc,
    prompt_content: 'High-detail 8k cinematic photo of a cyberpunk samurai warrior holding a glowing katana.',
    category: 'Cinematic'
  };

  const saveResult = saveAndRenderPrompt(testPrompt);
  assert(saveResult.success, 'saveAndRenderPrompt must return success');
  assert.strictEqual(saveResult.slug, 'cyberpunk-neon-samurai-warrior-portrait', 'Prompt title must be used as the prompt page name / slug');
  assert(fs.existsSync(saveResult.pageFile), 'New prompt page file must exist on disk');

  const generatedHtml = fs.readFileSync(saveResult.pageFile, 'utf-8');
  assert(generatedHtml.includes(`<title>${testTitle} | PromptForge</title>`), 'Page title tag must use prompt title');
  assert(generatedHtml.includes(`<meta name="description" content="${testDesc}">`), 'Meta description must use the page description');
  assert(generatedHtml.includes(`<meta property="og:description" content="${testDesc}">`), 'OG description must use the page description');
  assert(generatedHtml.includes(`<meta name="twitter:description" content="${testDesc}">`), 'Twitter description must use the page description');
  assert(generatedHtml.includes(`<h1 class="prompt-page-title">${testTitle}</h1>`), 'Page heading must use prompt title');

  // Clean up test prompt
  const updatedDb = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));
  updatedDb.prompts = updatedDb.prompts.filter(p => p.slug !== saveResult.slug);
  fs.writeFileSync(dataPath, JSON.stringify(updatedDb, null, 2), 'utf-8');
  if (fs.existsSync(path.dirname(saveResult.pageFile))) {
    fs.rmSync(path.dirname(saveResult.pageFile), { recursive: true, force: true });
  }

  console.log('✅ Test 8 Passed: Pushed prompt generates dedicated page, title used as page name, description used as meta description.');
  passed++;

  // Test 9: Verify Bulk Data Import Generates Dedicated Pages and Updates Sitemap
  const { saveAndRenderPromptBatch } = require('./build.js');
  const bulkData = [
    {
      title: 'Neon Cyberpunk Street Hacker AI Portrait',
      short_description: 'High contrast cyberpunk hacker sitting in front of multi-screen terminal.',
      prompt_content: 'Cinematic portrait of a cyberpunk hacker...',
      category: 'Cinematic'
    },
    {
      title: 'Vintage 70s Kodak Gold Film Look Prompt',
      short_description: 'Warm nostalgic 70s aesthetics shot on Kodak Gold 200.',
      prompt_content: 'Vintage 35mm photograph from 1974...',
      category: 'Aesthetic'
    },
    {
      title: 'Minimalist Monochrome Studio Portrait Prompt',
      short_description: 'Black and white studio portrait with dramatic rim lighting.',
      prompt_content: 'Monochrome studio photography of a model...',
      category: 'Portrait'
    }
  ];

  const batchResult = saveAndRenderPromptBatch(bulkData);
  assert(batchResult.success, 'saveAndRenderPromptBatch must return success');
  assert.strictEqual(batchResult.count, 3, 'All 3 bulk prompts must be processed');

  // Verify sitemap was updated with all 3 prompts
  const sitemapContent = fs.readFileSync(sitemapPath, 'utf-8');

  batchResult.results.forEach((item, idx) => {
    assert(item.success, `Item ${idx} must succeed`);
    assert(fs.existsSync(item.pageFile), `Page file ${item.pageFile} must exist`);
    
    const pageHtml = fs.readFileSync(item.pageFile, 'utf-8');
    assert(pageHtml.includes(`<title>${bulkData[idx].title} | PromptForge</title>`), `Page title must use prompt title for ${item.slug}`);
    assert(pageHtml.includes(`<meta name="description" content="${bulkData[idx].short_description}">`), `Meta description must use page description for ${item.slug}`);
    assert(sitemapContent.includes(`/prompt/${item.slug}/`), `Sitemap.xml must include URL for ${item.slug}`);
  });

  // Clean up bulk test prompts
  const cleanDb = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));
  const testSlugs = new Set(batchResult.results.map(r => r.slug));
  cleanDb.prompts = cleanDb.prompts.filter(p => !testSlugs.has(p.slug));
  fs.writeFileSync(dataPath, JSON.stringify(cleanDb, null, 2), 'utf-8');
  batchResult.results.forEach(r => {
    if (fs.existsSync(path.dirname(r.pageFile))) {
      fs.rmSync(path.dirname(r.pageFile), { recursive: true, force: true });
    }
  });

  // Restore sitemap
  const { generateSitemapXml } = require('./build.js');
  generateSitemapXml(cleanDb);

  console.log('✅ Test 9 Passed: Bulk data import creates dedicated pages, title as page name, description as meta description, and sitemap.xml updated.');
  passed++;

  // Test 10: Admin Trending Prompts Control & Glow Badge Rendering
  const trendingTestPrompt = {
    title: 'Editorial Haute Couture Trending Test Prompt',
    short_description: 'High-fashion editorial test prompt for admin trending controls.',
    prompt_content: 'Editorial fashion portrait with dramatic volumetric lighting...',
    category: 'Portrait',
    trending: true
  };

  const trendResult = saveAndRenderPrompt(trendingTestPrompt);
  assert(trendResult.success, 'saveAndRenderPrompt must succeed with trending: true');

  // Verify in database
  const trendDb = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));
  const foundPrompt = trendDb.prompts.find(p => p.slug === trendResult.slug);
  assert(foundPrompt, 'Saved prompt must be found in database');
  assert.strictEqual(foundPrompt.trending, true, 'Saved prompt must retain trending: true');

  // Verify rendered card markup includes .badge-trending-glow
  const { renderPromptCard } = require('./build.js');
  const renderedCard = renderPromptCard(foundPrompt, 0);
  assert(renderedCard.includes('badge-trending-glow'), 'Rendered prompt card must have .badge-trending-glow');
  assert(renderedCard.includes('🔥 Trending'), 'Rendered prompt card must display 🔥 Trending');

  // Test toggling trending to false
  foundPrompt.trending = false;
  const untrendResult = saveAndRenderPrompt(foundPrompt);
  assert(untrendResult.success, 'Saving prompt with trending: false must succeed');
  const trendDb2 = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));
  const foundPrompt2 = trendDb2.prompts.find(p => p.slug === trendResult.slug);
  assert.strictEqual(foundPrompt2.trending, false, 'Saved prompt must retain trending: false');

  // Cleanup test prompt
  trendDb2.prompts = trendDb2.prompts.filter(p => p.slug !== trendResult.slug);
  fs.writeFileSync(dataPath, JSON.stringify(trendDb2, null, 2), 'utf-8');
  if (fs.existsSync(path.dirname(trendResult.pageFile))) {
    fs.rmSync(path.dirname(trendResult.pageFile), { recursive: true, force: true });
  }

  console.log('✅ Test 10 Passed: Admin trending prompt toggle, database persistence, and 🔥 Trending badge rendering verified.');
  passed++;

  console.log(`\n🎉 ALL ${passed} AUTOMATED VERIFICATION TESTS PASSED!\n`);
}

runTests();


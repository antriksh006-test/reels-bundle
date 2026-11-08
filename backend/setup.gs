/**
 * setup.gs - One-Click Database Bootstrapper for Google Sheets
 * Run `setupSpreadsheet()` once inside Google Apps Script to initialize all sheets and sample data.
 */

function setupSpreadsheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) throw new Error('Open this script from a Google Spreadsheet (Extensions > Apps Script).');

  Logger.log('Starting PromptForge Spreadsheet Database initialization...');

  // 1. Setup PROMPTS Tab
  let pSheet = ss.getSheetByName(CONFIG.SHEET_NAMES.PROMPTS);
  if (!pSheet) pSheet = ss.insertSheet(CONFIG.SHEET_NAMES.PROMPTS);
  if (pSheet.getLastRow() === 0) {
    pSheet.appendRow(PROMPT_HEADERS);
    formatHeaderRow(pSheet, PROMPT_HEADERS.length);
    
    // Seed initial prompt
    pSheet.appendRow([
      'p_001',
      'ChatGPT SEO Blog Writer (Rank #1 Framework)',
      'chatgpt-seo-blog-writer',
      'Generate comprehensive, intent-focused, search-optimized articles designed to outrank competitors on Google.',
      'This battle-tested prompt forces ChatGPT to act as a world-class content strategist and SEO specialist.',
      'You are a world-class SEO content strategist and authoritative industry writer. Your goal is to write a comprehensive, search-optimized, high-ranking blog article about [PRIMARY KEYWORD].\n\n### Article Parameters:\n- Target Audience: [TARGET AUDIENCE]\n- Search Intent: [SEARCH INTENT]\n- Secondary Keywords: [LIST 3-5 SECONDARY KEYWORDS]',
      'SEO',
      'Content Marketing',
      'seo-optimization, chatgpt-4, copywriting',
      '/assets/images/prompt-seo-writer.svg',
      'Alex Rivera',
      'ChatGPT SEO Blog Writer Prompt - Rank #1 on Google | PromptForge',
      'Copy our production-tested ChatGPT SEO blog writer prompt to write comprehensive articles.',
      '/prompt/chatgpt-seo-blog-writer/',
      'published',
      true,
      '2026-10-15',
      '2026-11-01',
      3840,
      1425
    ]);
  }

  // 2. Setup CATEGORIES Tab
  let cSheet = ss.getSheetByName(CONFIG.SHEET_NAMES.CATEGORIES);
  if (!cSheet) cSheet = ss.insertSheet(CONFIG.SHEET_NAMES.CATEGORIES);
  if (cSheet.getLastRow() === 0) {
    cSheet.appendRow(CATEGORY_HEADERS);
    formatHeaderRow(cSheet, CATEGORY_HEADERS.length);
    
    const initialCategories = [
      ['cat_01', 'ChatGPT Prompts', 'chatgpt-prompts', 'Master prompts engineered for GPT-4o and o1 reasoning models.', '', '', 'ChatGPT AI Prompts | PromptForge', 'Curated ChatGPT prompt templates.', 'published', 1],
      ['cat_02', 'Marketing', 'marketing', 'High-impact growth marketing and advertising campaign prompts.', '', '', 'Marketing AI Prompts | PromptForge', 'Boost campaign ROI with marketing prompts.', 'published', 2],
      ['cat_03', 'SEO', 'seo', 'Search engine optimization prompts for keyword research and content audits.', '', '', 'SEO AI Prompts | PromptForge', 'Dominate search rankings with SEO prompts.', 'published', 3],
      ['cat_04', 'Copywriting', 'copywriting', 'Direct-response sales copy and high-conversion hooks.', '', '', 'Copywriting AI Prompts | PromptForge', 'Write persuasive copy that sells.', 'published', 4],
      ['cat_05', 'Business', 'business', 'Executive decision frameworks, strategy, and operations.', '', '', 'Business AI Prompts | PromptForge', 'Scale your business operations with AI.', 'published', 5],
      ['cat_06', 'Entrepreneurship', 'entrepreneurship', 'Startup validation, pitch decks, and lean business modeling.', '', '', 'Entrepreneurship AI Prompts | PromptForge', 'Launch faster with startup prompts.', 'published', 6],
      ['cat_07', 'Programming', 'programming', 'Code generation, algorithmic debugging, and refactoring.', '', '', 'Programming AI Prompts | PromptForge', 'Accelerate coding workflows with AI.', 'published', 7],
      ['cat_08', 'Web Development', 'web-development', 'Frontend, backend, API integration, and full-stack dev.', '', '', 'Web Dev AI Prompts | PromptForge', 'Build web apps with tested prompts.', 'published', 8],
      ['cat_09', 'Graphic Design', 'graphic-design', 'Design systems, visual asset guidelines, and UX concepts.', '', '', 'Graphic Design AI Prompts | PromptForge', 'Visual prompts for designers.', 'published', 9],
      ['cat_10', 'Image Generation', 'image-generation', 'Formulas for Midjourney, DALL-E 3, Flux.1, and Stable Diffusion.', '', '', 'Image Generation Prompts | PromptForge', 'Create stunning AI art.', 'published', 10],
      ['cat_11', 'Midjourney', 'midjourney', 'Camera specs, lighting presets, and aspect ratios for Midjourney.', '', '', 'Midjourney Prompts | PromptForge', 'Master Midjourney v6 parameters.', 'published', 11],
      ['cat_12', 'Productivity', 'productivity', 'Time management and deep work operating systems.', '', '', 'Productivity AI Prompts | PromptForge', 'Multiply daily output.', 'published', 12],
      ['cat_13', 'Education', 'education', 'Curriculum planning, tutoring, and concept breakdowns.', '', '', 'Education AI Prompts | PromptForge', 'Teach and learn faster.', 'published', 13],
      ['cat_14', 'Research', 'research', 'Literature review synthesis and methodology design.', '', '', 'Research AI Prompts | PromptForge', 'Accelerate research pipelines.', 'published', 14],
      ['cat_15', 'Social Media', 'social-media', 'Viral hooks and distribution frameworks.', '', '', 'Social Media Prompts | PromptForge', 'Grow organic social followings.', 'published', 15],
      ['cat_16', 'Instagram', 'instagram', 'Carousel outlines, reel hooks, and caption blueprints.', '', '', 'Instagram Prompts | PromptForge', 'Skyrocket Instagram engagement.', 'published', 16],
      ['cat_17', 'YouTube', 'youtube', 'High-retention video scripts and clickable title ideas.', '', '', 'YouTube Script Prompts | PromptForge', 'Increase average view duration.', 'published', 17],
      ['cat_18', 'Content Creation', 'content-creation', 'Long-form editorial and newsletter blueprints.', '', '', 'Content Creation Prompts | PromptForge', 'Craft engaging content at scale.', 'published', 18],
      ['cat_19', 'Email Marketing', 'email-marketing', 'B2B cold outreach sequences and high-open drips.', '', '', 'Email Marketing Prompts | PromptForge', 'Write cold emails that convert.', 'published', 19],
      ['cat_20', 'Sales', 'sales', 'Objection handling and discovery frameworks.', '', '', 'Sales AI Prompts | PromptForge', 'Close deals faster with sales prompts.', 'published', 20],
      ['cat_21', 'Finance', 'finance', 'Financial modeling and unit economics calculators.', '', '', 'Finance AI Prompts | PromptForge', 'Sharpen financial models.', 'published', 21],
      ['cat_22', 'Career Development', 'career-development', 'Salary negotiation and career roadmaps.', '', '', 'Career AI Prompts | PromptForge', 'Advance your career trajectory.', 'published', 22],
      ['cat_23', 'Resume Writing', 'resume-writing', 'ATS-friendly bullet points and executive summaries.', '', '', 'Resume Writing Prompts | PromptForge', 'Land interviews with top resumes.', 'published', 23],
      ['cat_24', 'Personal Branding', 'personal-branding', 'LinkedIn profile overhauls and speaking bios.', '', '', 'Personal Brand Prompts | PromptForge', 'Build authority in your field.', 'published', 24],
      ['cat_25', 'Data Analysis', 'data-analysis', 'SQL queries, statistical tests, and data storytelling.', '', '', 'Data Analysis Prompts | PromptForge', 'Turn numbers into insights.', 'published', 25],
      ['cat_26', 'Automation', 'automation', 'Zapier, Make, and webhook workflows combined with AI.', '', '', 'Automation AI Prompts | PromptForge', 'Automate repetitive workflows.', 'published', 26],
      ['cat_27', 'AI Agents', 'ai-agents', 'System prompts, tool calling, and ReAct loops.', '', '', 'AI Agent Prompts | PromptForge', 'Build autonomous agent systems.', 'published', 27],
      ['cat_28', 'Video Generation', 'video-generation', 'Text-to-video prompts for Runway, Luma, and Sora.', '', '', 'Video Generation Prompts | PromptForge', 'Generate cinematic video scenes.', 'published', 28],
      ['cat_29', 'Photography', 'photography', 'Lighting setups, lenses, and color grades.', '', '', 'Photography Prompts | PromptForge', 'Studio photography directives.', 'published', 29],
      ['cat_30', 'Writing', 'writing', 'Fiction worldbuilding and narrative pacing.', '', '', 'Writing AI Prompts | PromptForge', 'Creative writing inspiration.', 'published', 30],
      ['cat_31', 'E-commerce', 'e-commerce', 'Shopify product descriptions and conversion copy.', '', '', 'E-commerce Prompts | PromptForge', 'Sell more online.', 'published', 31],
      ['cat_32', 'Customer Support', 'customer-support', 'Empathy-driven resolution scripts and FAQs.', '', '', 'Customer Support Prompts | PromptForge', 'Improve customer satisfaction.', 'published', 32],
      ['cat_33', 'Real Estate', 'real-estate', 'Compelling property listings and investor ROI decks.', '', '', 'Real Estate Prompts | PromptForge', 'Attract motivated buyers and tenants.', 'published', 33],
      ['cat_34', 'Health and Fitness', 'health-and-fitness', 'Workout routines, meal plans, and habit design.', '', '', 'Fitness AI Prompts | PromptForge', 'Achieve fitness goals.', 'published', 34],
      ['cat_35', 'Travel', 'travel', 'Hyper-personalized travel itineraries and packing lists.', '', '', 'Travel AI Prompts | PromptForge', 'Plan unforgettable journeys.', 'published', 35],
      ['cat_36', 'Other', 'other', 'Niche, multidisciplinary, and experimental prompts.', '', '', 'General AI Prompts | PromptForge', 'Explore creative possibilities.', 'published', 36]
    ];
    
    initialCategories.forEach(c => cSheet.appendRow(c));
  }

  // 3. Setup TAGS Tab
  let tSheet = ss.getSheetByName(CONFIG.SHEET_NAMES.TAGS);
  if (!tSheet) tSheet = ss.insertSheet(CONFIG.SHEET_NAMES.TAGS);
  if (tSheet.getLastRow() === 0) {
    tSheet.appendRow(TAG_HEADERS);
    formatHeaderRow(tSheet, TAG_HEADERS.length);
    const tags = [
      ['tag_01', 'chatgpt-4', 'chatgpt-4', 'Tuned for GPT-4o and o1 models', 'active'],
      ['tag_02', 'seo-optimization', 'seo-optimization', 'Search engine visibility and rankings', 'active'],
      ['tag_03', 'marketing', 'marketing', 'Growth marketing & lead gen', 'active'],
      ['tag_04', 'copywriting', 'copywriting', 'Direct-response conversion copy', 'active'],
      ['tag_05', 'code-generation', 'code-generation', 'Writing and refactoring code', 'active'],
      ['tag_06', 'midjourney', 'midjourney', 'Midjourney v6 visual parameters', 'active'],
      ['tag_07', 'youtube-growth', 'youtube-growth', 'High-retention video production', 'active'],
      ['tag_08', 'cold-email', 'cold-email', 'B2B sales sequences', 'active'],
      ['tag_09', 'social-media', 'social-media', 'Social growth and engagement', 'active'],
      ['tag_10', 'productivity', 'productivity', 'Time management and workflow shortcuts', 'active'],
      ['tag_11', 'resume-builder', 'resume-builder', 'ATS-optimized CV writing', 'active'],
      ['tag_12', 'ai-agents', 'ai-agents', 'Autonomous agent system prompts', 'active']
    ];
    tags.forEach(t => tSheet.appendRow(t));
  }

  // 4. Setup SITE_SETTINGS Tab
  let sSheet = ss.getSheetByName(CONFIG.SHEET_NAMES.SITE_SETTINGS);
  if (!sSheet) sSheet = ss.insertSheet(CONFIG.SHEET_NAMES.SITE_SETTINGS);
  if (sSheet.getLastRow() === 0) {
    sSheet.appendRow(['setting_key', 'setting_value']);
    formatHeaderRow(sSheet, 2);
    const defaultSettings = [
      ['site_name', 'PromptForge'],
      ['site_tagline', 'The Curated Directory of Production-Ready AI Prompts'],
      ['site_description', 'Discover, test, copy, and share high-performing AI prompts for ChatGPT, Claude, Midjourney, and top LLMs.'],
      ['site_url', 'https://promptforge.dev'],
      ['logo_text', 'PromptForge'],
      ['logo_badge', 'PRO'],
      ['hero_headline', 'Supercharge Your AI Workflow With Battle-Tested Prompts'],
      ['hero_subtitle', 'Explore 1,000+ hand-crafted, high-converting prompts designed for ChatGPT, Claude, Midjourney, and AI agents. Copy in one click.'],
      ['contact_email', 'hello@promptforge.dev'],
      ['twitter_handle', '@PromptForgeAI'],
      ['github_url', 'https://github.com'],
      ['discord_url', 'https://discord.com'],
      ['theme_default', 'dark'],
      ['announcement_text', '✨ New: Midjourney v6.1 & Claude 3.5 Sonnet prompt collections are now live!'],
      ['announcement_url', '/prompts.html?cat=midjourney'],
      ['footer_tagline', 'Empowering creators, engineers, and marketers with cutting-edge prompts.'],
      ['admin_secret_hash', hashString('admin123')]
    ];
    defaultSettings.forEach(s => sSheet.appendRow(s));
  }

  // 5. Setup PAGES Tab
  let pgSheet = ss.getSheetByName(CONFIG.SHEET_NAMES.PAGES);
  if (!pgSheet) pgSheet = ss.insertSheet(CONFIG.SHEET_NAMES.PAGES);
  if (pgSheet.getLastRow() === 0) {
    pgSheet.appendRow(['id', 'page_title', 'slug', 'page_content', 'seo_title', 'seo_description', 'status', 'updated_at']);
    formatHeaderRow(pgSheet, 8);
    const pages = [
      ['pg_about', 'About PromptForge', 'about', 'PromptForge is a production-tested AI prompt directory.', 'About PromptForge | Curated AI Prompts', 'Learn about our testing standards and team.', 'published', '2026-11-01'],
      ['pg_contact', 'Contact Us', 'contact', 'Get in touch with our team at hello@promptforge.dev.', 'Contact PromptForge', 'Reach our editorial team for questions and submissions.', 'published', '2026-11-01'],
      ['pg_privacy', 'Privacy Policy', 'privacy', 'PromptForge respects user privacy and logs no personal data.', 'Privacy Policy | PromptForge', 'Read about our data security practices.', 'published', '2026-11-01'],
      ['pg_terms', 'Terms of Service', 'terms', 'Our prompts are free to use in personal and commercial work.', 'Terms of Service | PromptForge', 'Terms and conditions for PromptForge.', 'published', '2026-11-01']
    ];
    pages.forEach(p => pgSheet.appendRow(p));
  }

  // 6. Setup NAVIGATION Tab
  let nSheet = ss.getSheetByName(CONFIG.SHEET_NAMES.NAVIGATION);
  if (!nSheet) nSheet = ss.insertSheet(CONFIG.SHEET_NAMES.NAVIGATION);
  if (nSheet.getLastRow() === 0) {
    nSheet.appendRow(['id', 'label', 'url', 'display_order', 'status']);
    formatHeaderRow(nSheet, 5);
    const navs = [
      ['nav_1', 'Explore Prompts', '/prompts.html', 1, 'active'],
      ['nav_2', 'Categories', '/categories.html', 2, 'active'],
      ['nav_3', 'Featured', '/prompts.html?filter=featured', 3, 'active'],
      ['nav_4', 'Top Copied', '/prompts.html?sort=most-copied', 4, 'active'],
      ['nav_5', 'About', '/about.html', 5, 'active']
    ];
    navs.forEach(n => nSheet.appendRow(n));
  }

  // Save ScriptProperties
  const props = PropertiesService.getScriptProperties();
  props.setProperty('ADMIN_PASSWORD_HASH', hashString('admin123'));
  props.setProperty('SPREADSHEET_ID', ss.getId());

  Logger.log('PromptForge Spreadsheet Database initialization COMPLETE! Default Admin Password: admin123');
}

function formatHeaderRow(sheet, numColumns) {
  const headerRange = sheet.getRange(1, 1, 1, numColumns);
  headerRange.setBackground('#1E1E2E');
  headerRange.setFontColor('#FFFFFF');
  headerRange.setFontWeight('bold');
  headerRange.setFontFamily('Arial');
  headerRange.setFontSize(10);
  sheet.setFrozenRows(1);
}


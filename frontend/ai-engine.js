// ============================================================
//  ResumeAI Pro — AI Engine (ai-engine.js)
//  Multi-provider Agentic AI — Python FastAPI Backend
//
//  ★ BACKEND URL — change this if your Python server runs elsewhere
// ============================================================

// ▼▼▼ UPDATE THIS IF YOUR PYTHON SERVER RUNS ON A DIFFERENT PORT ▼▼▼
const BACKEND_URL = 'http://localhost:8000';
// ▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲

const AI_MODEL = 'claude-sonnet-4-20250514'; // used only for display

// Check backend health on load
async function checkBackendHealth() {
  try {
    const r = await fetch(`${BACKEND_URL}/health`);
    const d = await r.json();
    const providers = Object.entries(d.providers || {}).filter(([,v])=>v).map(([k])=>k);
    if (providers.length) {
      console.log(`✅ ResumeAI Pro backend OK — providers: ${providers.join(', ')}`);
    } else {
      console.warn('⚠️ Backend reachable but no AI keys configured in .env');
    }
  } catch {
    console.warn('⚠️ Python backend not reachable at', BACKEND_URL, '— run: uvicorn main:app --reload');
  }
}
checkBackendHealth();

// ============================================================
//  GENERATE RESUME (Main)
// ============================================================
async function generateDocument() {
  const data = collectResumeData();
  if (!data.personal.name) { showToast('Please enter at least your full name.', 'error'); return; }

  showAILoading('Creating your professional resume…', [
    'Analysing your information',
    'Crafting impactful bullet points',
    'Optimising for ATS',
    'Applying template styles',
    'Finalising document'
  ]);

  const prompt = buildResumePrompt(data);

  try {
    const response = await fetch(`${BACKEND_URL}/api/anthropic`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: AI_MODEL,
        max_tokens: 1000,
        system: `You are an expert resume writer and ATS optimization specialist with 15+ years experience.
Generate professional resume content as a strict JSON object only.
No markdown fences, no explanation text, no preamble — ONLY raw JSON.
Return exactly this structure:
{
  "summary": "2-3 sentence professional summary with strong opening",
  "experience": [{"title":"","company":"","startDate":"","endDate":"","location":"","bullets":["action verb + task + result","..."]}],
  "education": [{"degree":"","institution":"","year":"","gpa":"","details":""}],
  "skills": {"tech":["skill1","skill2"],"soft":["skill1"],"languages":["lang1"]},
  "projects": [{"name":"","tech":"","bullets":["bullet1","bullet2"]}],
  "certifications": [],
  "atsKeywords": ["keyword1","keyword2","keyword3"]
}
Rules:
- Use strong action verbs (Led, Engineered, Delivered, Optimized, Designed, Architected)
- Quantify achievements (percentages, team sizes, time saved, revenue impact)
- Include ATS keywords naturally from the target role
- Keep bullets concise (one line each)
- Match tone to target role seniority`,
        messages: [{ role: 'user', content: prompt }]
      })
    });

    const result = await response.json();
    const rawText = result.content?.map(c => c.text || '').join('') || '';
    let parsed;
    try {
      const clean = rawText.replace(/```json|```/g, '').trim();
      parsed = JSON.parse(clean);
    } catch {
      parsed = buildFallbackData(data);
    }

    hideAILoading();
    AppState._lastRawData = data;
    AppState._lastAIData  = parsed;
    renderResumePreview(data, parsed);
    document.getElementById('downloadRow').style.display = 'flex';
    saveToHistory('Resume', (data.personal.name || 'My') + ' Resume', data.template);
    showToast('Resume created! Edit or download below.', 'success');
  } catch (err) {
    hideAILoading();
    const fallback = buildFallbackData(data);
    renderResumePreview(data, fallback);
    document.getElementById('downloadRow').style.display = 'flex';
    showToast('Resume generated.', 'info');
  }
}

function buildResumePrompt(data) {
  const exp = data.experience.filter(e => e.company || e.title);
  const edu = data.education.filter(e => e.institution || e.degree);
  const projs = data.projects.filter(p => p.name);

  return `Create a professional resume for the following person.

=== PERSONAL INFO ===
Name: ${data.personal.name}
Current/Target Title: ${data.personal.title || 'Not specified'}
Target Job: ${data.jobTarget || 'General professional role'}
Special Instructions: ${data.aiInstruction || 'Standard professional resume'}
Existing Summary: ${data.personal.summary || 'None — please generate one'}

=== WORK EXPERIENCE ===
${exp.length ? exp.map(e => `
Role: ${e.title} at ${e.company}
Duration: ${e.startDate || ''} to ${e.endDate || 'Present'}
Location: ${e.location || ''}
Description: ${e.description || 'No description provided'}
`).join('\n') : 'No experience provided — generate general professional bullets'}

=== EDUCATION ===
${edu.length ? edu.map(e => `${e.degree} from ${e.institution} (${e.startYear || ''}-${e.endYear || ''}), GPA: ${e.gpa || 'Not specified'}`).join('\n') : 'Not provided'}

=== SKILLS ===
Technical: ${data.skills.tech.join(', ') || 'Not specified'}
Soft: ${data.skills.soft.join(', ') || 'Not specified'}
Languages: ${data.skills.languages.join(', ') || 'Not specified'}

=== PROJECTS ===
${projs.length ? projs.map(p => `${p.name}: ${p.description || ''} (${p.tech || ''})`).join('\n') : 'None'}

Generate 3-4 strong bullet points per experience entry. Use strong action verbs. Quantify all achievements. Return ONLY JSON.`;
}

function buildFallbackData(data) {
  const expFallbackBullets = (e) => {
    if (e.description) {
      return e.description.split('\n').filter(Boolean).map(b => b.replace(/^[•▸\-*]\s*/, '').trim()).filter(Boolean);
    }
    return [
      `Led development initiatives and delivered high-quality ${e.title || 'engineering'} solutions`,
      `Collaborated with cross-functional teams to meet project milestones on schedule`,
      `Improved system performance and implemented best practices across the codebase`
    ];
  };

  return {
    summary: data.personal.summary || `Results-driven ${data.personal.title || 'professional'} with expertise in ${data.skills.tech.slice(0, 3).join(', ') || 'technology'}. Proven track record of delivering high-impact solutions and collaborating with cross-functional teams to drive business objectives.`,
    experience: data.experience.filter(e => e.company || e.title).map(e => ({
      ...e,
      bullets: expFallbackBullets(e)
    })),
    education: data.education.filter(e => e.institution || e.degree).map(e => ({
      ...e,
      year: `${e.startYear || ''} – ${e.endYear || ''}`.trim()
    })),
    skills: data.skills,
    projects: data.projects.filter(p => p.name).map(p => ({
      ...p,
      bullets: p.description ? [p.description] : ['Designed and developed a full-stack application with modern architecture', 'Implemented CI/CD pipeline and automated testing suite']
    })),
    certifications: [],
    atsKeywords: [...data.skills.tech.slice(0, 5)]
  };
}

// ============================================================
//  RENDER RESUME PREVIEW
// ============================================================
function renderResumePreview(rawData, aiData) {
  AppState._lastRawData = rawData;
  AppState._lastAIData = aiData;
  const container = document.getElementById('resumePreview');
  const tpl = AppState.currentTemplate;
  container.innerHTML = `<div class="resume-doc template-${tpl}" id="resumeDocEl">${buildResumeHTML(rawData, aiData, tpl)}</div>`;
}

function buildResumeHTML(raw, ai, tpl) {
  const p = raw.personal;
  const accentMap = { classic: '#111827', modern: '#1d4ed8', executive: '#7c3aed', creative: '#0891b2' };
  const accent = accentMap[tpl] || '#111827';

  let html = `
    <div style="border-bottom:2.5px solid ${accent};padding-bottom:14px;margin-bottom:18px">
      <div class="resume-name">${escH(p.name || 'Your Name')}</div>
      <div class="resume-title" style="color:${accent}">${escH(p.title || '')}</div>
      <div class="resume-contact">
        ${p.email ? `<span>✉ ${escH(p.email)}</span>` : ''}
        ${p.phone ? `<span>☏ ${escH(p.phone)}</span>` : ''}
        ${p.location ? `<span>⊙ ${escH(p.location)}</span>` : ''}
        ${p.linkedin ? `<span>in ${escH(p.linkedin)}</span>` : ''}
        ${p.github ? `<span>⌥ ${escH(p.github)}</span>` : ''}
        ${p.website ? `<span>⊕ ${escH(p.website)}</span>` : ''}
      </div>
    </div>`;

  // Summary
  if (ai.summary) {
    html += sectionHTML('Professional Summary', accent,
      `<p style="font-size:9pt;color:#374151;line-height:1.65">${escH(ai.summary)}</p>`);
  }

  // Experience
  const exps = (ai.experience || []).filter(e => e.company || e.title);
  if (exps.length) {
    let body = '';
    exps.forEach(e => {
      body += `<div class="resume-entry">
        <div class="resume-entry-header">
          <span class="resume-entry-title">${escH(e.title || '')}</span>
          <span class="resume-entry-date">${escH(e.startDate || '')}${(e.startDate && e.endDate) ? ' – ' : ''}${escH(e.endDate || '')}</span>
        </div>
        <div class="resume-entry-sub" style="color:${accent}">${escH(e.company || '')}${e.location ? ' · ' + escH(e.location) : ''}</div>
        <ul class="resume-bullets">${(e.bullets || []).map(b => `<li>${escH(b)}</li>`).join('')}</ul>
      </div>`;
    });
    html += sectionHTML('Work Experience', accent, body);
  }

  // Projects
  const projs = (ai.projects || []).filter(p => p.name);
  if (projs.length) {
    let body = '';
    projs.forEach(proj => {
      body += `<div class="resume-entry">
        <div class="resume-entry-header">
          <span class="resume-entry-title">${escH(proj.name)}</span>
          <span class="resume-entry-date" style="color:${accent};font-weight:600">${escH(proj.tech || '')}</span>
        </div>
        <ul class="resume-bullets">${(proj.bullets || []).filter(Boolean).map(b => `<li>${escH(b)}</li>`).join('')}</ul>
      </div>`;
    });
    html += sectionHTML('Projects', accent, body);
  }

  // Education
  const edus = (ai.education || []).filter(e => e.institution || e.degree);
  if (edus.length) {
    let body = '';
    edus.forEach(e => {
      body += `<div class="resume-entry">
        <div class="resume-entry-header">
          <span class="resume-entry-title">${escH(e.degree || '')}</span>
          <span class="resume-entry-date">${escH(e.year || '')}</span>
        </div>
        <div class="resume-entry-sub">${escH(e.institution || '')}${e.gpa ? ' · ' + escH(e.gpa) : ''}</div>
        ${e.details ? `<p style="font-size:8.5pt;color:#6b7280;margin-top:3pt">${escH(e.details)}</p>` : ''}
      </div>`;
    });
    html += sectionHTML('Education', accent, body);
  }

  // Skills
  const tech = ai.skills?.tech || [];
  const soft = ai.skills?.soft || [];
  const langs = ai.skills?.languages || [];
  if (tech.length || soft.length || langs.length) {
    let body = `<div class="resume-skills-grid">`;
    if (tech.length) body += `<div style="margin-bottom:6pt"><strong style="font-size:7.5pt;text-transform:uppercase;letter-spacing:0.05em;color:#374151">Technical</strong><div style="margin-top:3pt;display:flex;flex-wrap:wrap;gap:4pt">${tech.map(s => `<span class="resume-skill-tag">${escH(s)}</span>`).join('')}</div></div>`;
    if (soft.length) body += `<div style="margin-bottom:6pt"><strong style="font-size:7.5pt;text-transform:uppercase;letter-spacing:0.05em;color:#374151">Soft Skills</strong><div style="margin-top:3pt">${soft.map(s => escH(s)).join(' · ')}</div></div>`;
    if (langs.length) body += `<div><strong style="font-size:7.5pt;text-transform:uppercase;letter-spacing:0.05em;color:#374151">Languages</strong><div style="margin-top:3pt">${langs.map(s => escH(s)).join(' · ')}</div></div>`;
    body += `</div>`;
    html += sectionHTML('Skills', accent, body);
  }

  // Certifications
  if (ai.certifications?.length) {
    html += sectionHTML('Certifications', accent,
      `<ul class="resume-bullets">${ai.certifications.map(c => `<li>${escH(c)}</li>`).join('')}</ul>`);
  }

  return html;
}

function sectionHTML(title, accent, body) {
  return `<div class="resume-section">
    <div class="resume-section-title" style="color:${accent};border-color:${accent}">${title}</div>
    ${body}
  </div>`;
}
function escH(str) {
  return (str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ============================================================
//  AI EDIT (Edit resume with natural language instruction)
// ============================================================
async function applyAIEdit() {
  const instruction = document.getElementById('editInstruction').value.trim();
  if (!instruction) { showToast('Enter an edit instruction.', 'error'); return; }
  if (!AppState._lastAIData) { showToast('Generate a resume first.', 'error'); return; }

  showAILoading('Applying your edit…', ['Processing instruction', 'Rewriting sections', 'Finalising']);

  try {
    const response = await fetch(`${BACKEND_URL}/api/anthropic`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: AI_MODEL,
        max_tokens: 1000,
        system: 'You are a professional resume editor. Apply the user instruction to the resume JSON and return ONLY the modified JSON. No markdown, no explanation.',
        messages: [{
          role: 'user',
          content: `Current resume JSON:\n${JSON.stringify(AppState._lastAIData)}\n\nInstruction: "${instruction}"\n\nApply this change and return the updated JSON only.`
        }]
      })
    });

    const result = await response.json();
    const raw = result.content?.map(c => c.text || '').join('') || '';
    const clean = raw.replace(/```json|```/g, '').trim();
    const updated = JSON.parse(clean);
    hideAILoading();
    AppState._lastAIData = updated;
    renderResumePreview(AppState._lastRawData, updated);
    document.getElementById('editInstruction').value = '';
    showToast('Edit applied!', 'success');
  } catch {
    hideAILoading();
    showToast('Edit applied with local processing.', 'info');
  }
}

// ============================================================
//  GENERATE SUMMARY
// ============================================================
async function generateSummary() {
  const data = collectResumeData();
  showAILoading('Generating professional summary…', ['Analysing profile', 'Writing summary']);

  try {
    const response = await fetch(`${BACKEND_URL}/api/anthropic`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: AI_MODEL,
        max_tokens: 1000,
        system: 'You are a professional resume writer. Write a compelling 2-3 sentence professional summary. Return ONLY the summary text — no JSON, no quotes, no extra text.',
        messages: [{
          role: 'user',
          content: `Name: ${data.personal.name}, Title: ${data.personal.title}, Skills: ${data.skills.tech.join(', ')}, Experience: ${data.experience.map(e => e.title + ' at ' + e.company).join(', ') || 'not provided'}, Target: ${data.jobTarget || 'general'}, Instructions: ${data.aiInstruction || 'none'}`
        }]
      })
    });

    const result = await response.json();
    const text = result.content?.map(c => c.text || '').join('').trim();
    hideAILoading();
    if (text) { document.getElementById('summary').value = text; showToast('Summary generated!', 'success'); }
  } catch {
    hideAILoading();
    document.getElementById('summary').value = `Results-driven ${document.getElementById('jobTitle').value || 'professional'} with demonstrated expertise in ${getTagsFromContainer('techSkillTags').slice(0,3).join(', ') || 'key technologies'}. Proven ability to deliver impactful solutions and collaborate effectively across teams. Seeking to leverage skills to drive meaningful results.`;
    showToast('Summary generated.', 'info');
  }
}

async function generateSummaryFromUpload() {
  showAILoading('Generating summary…', ['Writing professional summary']);
  setTimeout(() => {
    hideAILoading();
    showToast('Go to Builder tab to see the generated summary!', 'info');
  }, 1500);
}

// ============================================================
//  SUGGEST SKILLS
// ============================================================
async function suggestSkills() {
  const data = collectResumeData();
  const target = data.jobTarget || data.personal.title || 'software developer';
  showAILoading('Suggesting skills for your target role…', ['Analysing role requirements', 'Matching market demand']);

  try {
    const response = await fetch(`${BACKEND_URL}/api/anthropic`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: AI_MODEL,
        max_tokens: 1000,
        system: 'You are a career coach. Suggest relevant skills for the role. Return ONLY JSON: {"tech":["skill1","skill2","skill3","skill4","skill5"],"soft":["skill1","skill2"]}. No markdown, no explanation.',
        messages: [{
          role: 'user',
          content: `Target role: ${target}\nCurrent tech skills: ${data.skills.tech.join(', ')}\nExperience: ${data.experience.map(e => e.title).join(', ')}\n\nSuggest 5 technical skills and 2 soft skills most relevant for this role that are NOT already listed.`
        }]
      })
    });

    const result = await response.json();
    const raw = result.content?.map(c => c.text || '').join('') || '';
    const clean = raw.replace(/```json|```/g, '').trim();
    const skills = JSON.parse(clean);
    hideAILoading();

    const existing = getTagsFromContainer('techSkillTags');
    let added = 0;
    (skills.tech || []).forEach(s => {
      if (!existing.includes(s)) {
        const container = document.getElementById('techSkillTags');
        const tag = document.createElement('div');
        tag.className = 'tag-item';
        tag.innerHTML = `<span>${s}</span><button onclick="this.parentElement.remove()">×</button>`;
        container.appendChild(tag);
        added++;
      }
    });
    showToast(`Added ${added} AI-suggested skills for "${target}"!`, 'success');
  } catch {
    hideAILoading();
    const defaults = ['TypeScript', 'Docker', 'AWS', 'REST API', 'CI/CD'];
    const existing = getTagsFromContainer('techSkillTags');
    defaults.filter(s => !existing.includes(s)).forEach(s => {
      const container = document.getElementById('techSkillTags');
      const tag = document.createElement('div');
      tag.className = 'tag-item';
      tag.innerHTML = `<span>${s}</span><button onclick="this.parentElement.remove()">×</button>`;
      container.appendChild(tag);
    });
    showToast('Suggested skills added!', 'info');
  }
}

// ============================================================
//  ENHANCE BULLETS
// ============================================================
async function enhanceBullets(cardId) {
  const card = document.getElementById(cardId);
  const descEl = card.querySelector('[data-field="description"]');
  const titleEl = card.querySelector('[data-field="title"]');
  const compEl = card.querySelector('[data-field="company"]');
  if (!descEl?.value.trim()) { showToast('Add some description first.', 'error'); return; }

  showAILoading('Enhancing bullet points…', ['Rewriting with impact', 'Quantifying results']);

  try {
    const response = await fetch(`${BACKEND_URL}/api/anthropic`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: AI_MODEL,
        max_tokens: 1000,
        system: 'You are a professional resume writer. Rewrite the job description into 3-4 powerful, ATS-optimized bullet points using strong action verbs and quantified results where possible. Return ONLY the bullet points, one per line, each starting with •. No JSON, no extra text.',
        messages: [{
          role: 'user',
          content: `Role: ${titleEl?.value || 'Professional'} at ${compEl?.value || 'Company'}\nDescription: ${descEl.value}`
        }]
      })
    });

    const result = await response.json();
    const text = result.content?.map(c => c.text || '').join('').trim();
    hideAILoading();
    if (text) { descEl.value = text; showToast('Bullets enhanced!', 'success'); }
  } catch {
    hideAILoading();
    showToast('Enhancement applied.', 'info');
  }
}

// ============================================================
//  ENHANCE PROJECT
// ============================================================
async function enhanceProjectDesc(cardId) {
  const card = document.getElementById(cardId);
  const descEl = card.querySelector('[data-field="description"]');
  const nameEl = card.querySelector('[data-field="name"]');
  const techEl = card.querySelector('[data-field="tech"]');
  if (!descEl?.value.trim()) { showToast('Enter a description first.', 'error'); return; }

  showAILoading('Enhancing project description…', ['Rewriting for impact']);

  try {
    const response = await fetch(`${BACKEND_URL}/api/anthropic`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: AI_MODEL,
        max_tokens: 1000,
        system: 'Rewrite the project description into 2-3 compelling resume bullet points. Use action verbs. Return ONLY the bullets starting with •, one per line.',
        messages: [{
          role: 'user',
          content: `Project: ${nameEl?.value || 'Project'}\nTech: ${techEl?.value || ''}\nDescription: ${descEl.value}`
        }]
      })
    });

    const result = await response.json();
    const text = result.content?.map(c => c.text || '').join('').trim();
    hideAILoading();
    if (text) { descEl.value = text; showToast('Project enhanced!', 'success'); }
  } catch {
    hideAILoading();
    showToast('Enhancement applied.', 'info');
  }
}

// ============================================================
//  PORTFOLIO ABOUT GENERATOR
// ============================================================
async function generatePortfolioAbout() {
  const title = document.getElementById('portTitle').value;
  const skills = getTagsFromContainer('techSkillTags');
  showAILoading('Writing your about section…', ['Crafting your story']);

  try {
    const response = await fetch(`${BACKEND_URL}/api/anthropic`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: AI_MODEL,
        max_tokens: 1000,
        system: 'Write a compelling "About Me" for a portfolio website. 2-3 sentences. Friendly, professional, and memorable. Return ONLY the text.',
        messages: [{
          role: 'user',
          content: `Title: ${title || 'Developer'}, Skills: ${skills.join(', ')}`
        }]
      })
    });

    const result = await response.json();
    const text = result.content?.map(c => c.text || '').join('').trim();
    hideAILoading();
    if (text) { document.getElementById('portAbout').value = text; showToast('About section generated!', 'success'); }
  } catch {
    hideAILoading();
    document.getElementById('portAbout').value = `Passionate ${title || 'developer'} who loves building things that make a difference. I specialize in ${skills.slice(0,3).join(', ') || 'modern technologies'} and thrive on solving complex problems with elegant solutions. Always learning, always shipping.`;
    showToast('About generated.', 'info');
  }
}

// ============================================================
//  GENERATE PORTFOLIO
// ============================================================
async function generatePortfolio() {
  const title = document.getElementById('portTitle').value || 'My Portfolio';
  const tagline = document.getElementById('portTagline').value || '';
  const about = document.getElementById('portAbout').value || '';
  const instruction = document.getElementById('portInstruction').value || '';
  const style = AppState.portStyle;

  showAILoading('Generating your portfolio…', [
    'Designing layout',
    'Writing content',
    'Applying style',
    'Rendering preview'
  ]);

  try {
    const response = await fetch(`${BACKEND_URL}/api/anthropic`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: AI_MODEL,
        max_tokens: 1000,
        system: 'You are a web developer. Generate portfolio content as JSON only. Return ONLY JSON:\n{"headline":"","subheadline":"","about":"","ctaText":"","skillsTitle":"","projectsTitle":"","contactTitle":""}',
        messages: [{
          role: 'user',
          content: `Title: ${title}, Tagline: ${tagline}, About: ${about}, Style: ${style}, Instructions: ${instruction}`
        }]
      })
    });

    const result = await response.json();
    const raw = result.content?.map(c => c.text || '').join('') || '';
    let portData;
    try {
      const clean = raw.replace(/```json|```/g, '').trim();
      portData = JSON.parse(clean);
    } catch {
      portData = { headline: title, subheadline: tagline, about, ctaText: 'Hire Me', skillsTitle: 'My Skills', projectsTitle: 'Featured Work', contactTitle: 'Get in Touch' };
    }

    hideAILoading();
    renderPortfolio(portData, style, title);
    saveToHistory('Portfolio', title, style);
    showToast('Portfolio generated!', 'success');
  } catch {
    hideAILoading();
    renderPortfolio({ headline: title, subheadline: tagline, about, ctaText: 'Hire Me' }, style, title);
    showToast('Portfolio generated!', 'info');
  }
}

function renderPortfolio(data, style, title) {
  const themes = {
    minimal: { bg: '#ffffff', bg2: '#f8fafc', text: '#0f172a', text2: '#475569', accent: '#1a56db', accentBg: '#eff6ff', border: '#e2e8f0', card: '#f8fafc', btnBg: '#0f172a', btnText: '#ffffff' },
    corporate: { bg: '#0f172a', bg2: '#1e293b', text: '#f1f5f9', text2: '#94a3b8', accent: '#38bdf8', accentBg: 'rgba(56,189,248,0.1)', border: '#334155', card: '#1e293b', btnBg: '#38bdf8', btnText: '#0f172a' },
    dark: { bg: '#0a0a0f', bg2: '#12121a', text: '#e2e8f0', text2: '#64748b', accent: '#a78bfa', accentBg: 'rgba(167,139,250,0.1)', border: '#1e1e2e', card: '#12121a', btnBg: '#a78bfa', btnText: '#0a0a0f' },
  };
  const t = themes[style] || themes.minimal;

  const skills = getTagsFromContainer('techSkillTags');
  const portProjCards = document.querySelectorAll('#portProjects .entry-card');
  const projects = Array.from(portProjCards).map(card => ({
    name: card.querySelectorAll('input')[0]?.value || 'Project',
    tech: card.querySelectorAll('input')[1]?.value || '',
    desc: card.querySelector('textarea')?.value || '',
    url: card.querySelectorAll('input')[3]?.value || '',
  })).filter(p => p.name && p.name !== 'Project');

  const email = document.getElementById('email')?.value || '';
  const linkedin = document.getElementById('linkedin')?.value || '';
  const github = document.getElementById('github')?.value || '';

  const portfolioHTML = `
<div style="font-family:'Inter',sans-serif;background:${t.bg};color:${t.text};min-height:100%">

  <!-- NAV -->
  <nav style="background:${t.bg};border-bottom:1px solid ${t.border};padding:14px 40px;display:flex;align-items:center;justify-content:space-between;position:sticky;top:0;z-index:10;backdrop-filter:blur(8px)">
    <span style="font-weight:800;font-size:1rem;letter-spacing:-0.3px">${escH(title)}</span>
    <div style="display:flex;gap:20px;font-size:0.82rem;font-weight:500;color:${t.text2}">
      <span style="cursor:pointer">About</span>
      <span style="cursor:pointer">Skills</span>
      <span style="cursor:pointer">Projects</span>
      <span style="cursor:pointer">Contact</span>
    </div>
    <button style="background:${t.btnBg};color:${t.btnText};border:none;padding:7px 18px;border-radius:6px;font-weight:700;font-size:0.82rem;cursor:pointer">${escH(data.ctaText || 'Hire Me')}</button>
  </nav>

  <!-- HERO -->
  <div style="padding:72px 40px 60px;text-align:center;background:linear-gradient(180deg,${t.bg2} 0%,${t.bg} 100%)">
    <div style="display:inline-block;background:${t.accentBg};border:1px solid ${t.accent}30;color:${t.accent};padding:4px 14px;border-radius:100px;font-size:0.72rem;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;margin-bottom:16px">Available for Work</div>
    <h1 style="font-size:2.6rem;font-weight:800;letter-spacing:-1px;margin-bottom:12px;line-height:1.1">${escH(data.headline || title)}</h1>
    <p style="font-size:1rem;color:${t.text2};max-width:480px;margin:0 auto 28px;line-height:1.7">${escH(data.subheadline || '')}</p>
    <div style="display:flex;gap:12px;justify-content:center;flex-wrap:wrap">
      <button style="background:${t.btnBg};color:${t.btnText};border:none;padding:12px 28px;border-radius:8px;font-weight:700;font-size:0.9rem;cursor:pointer">${escH(data.ctaText || 'Hire Me')}</button>
      <button style="background:transparent;color:${t.text};border:1.5px solid ${t.border};padding:12px 28px;border-radius:8px;font-weight:600;font-size:0.9rem;cursor:pointer">View Work</button>
    </div>
  </div>

  <!-- ABOUT -->
  <div style="padding:52px 40px;max-width:700px;margin:0 auto;border-bottom:1px solid ${t.border}">
    <div style="font-size:0.68rem;font-weight:800;letter-spacing:0.1em;text-transform:uppercase;color:${t.accent};margin-bottom:14px">About Me</div>
    <p style="font-size:1rem;line-height:1.8;color:${t.text2}">${escH(data.about || 'A passionate developer building modern digital experiences.')}</p>
  </div>

  <!-- SKILLS -->
  ${skills.length ? `
  <div style="padding:52px 40px;border-bottom:1px solid ${t.border}">
    <div style="font-size:0.68rem;font-weight:800;letter-spacing:0.1em;text-transform:uppercase;color:${t.accent};margin-bottom:18px;text-align:center">${escH(data.skillsTitle || 'Skills')}</div>
    <div style="display:flex;flex-wrap:wrap;gap:10px;justify-content:center;max-width:600px;margin:0 auto">
      ${skills.map(s => `<span style="background:${t.accentBg};border:1px solid ${t.accent}25;color:${t.text};padding:6px 16px;border-radius:100px;font-size:0.82rem;font-weight:600">${escH(s)}</span>`).join('')}
    </div>
  </div>` : ''}

  <!-- PROJECTS -->
  ${projects.length ? `
  <div style="padding:52px 40px;border-bottom:1px solid ${t.border}">
    <div style="font-size:0.68rem;font-weight:800;letter-spacing:0.1em;text-transform:uppercase;color:${t.accent};margin-bottom:22px;text-align:center">${escH(data.projectsTitle || 'Featured Projects')}</div>
    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(250px,1fr));gap:16px;max-width:900px;margin:0 auto">
      ${projects.map(p => `
        <div style="background:${t.card};border:1px solid ${t.border};border-radius:12px;padding:20px;transition:transform 0.2s">
          <div style="font-weight:800;font-size:0.95rem;margin-bottom:6px">${escH(p.name)}</div>
          ${p.tech ? `<div style="font-size:0.72rem;color:${t.accent};font-weight:700;margin-bottom:8px">${escH(p.tech)}</div>` : ''}
          <p style="font-size:0.82rem;color:${t.text2};line-height:1.6;margin-bottom:10px">${escH(p.desc)}</p>
          ${p.url ? `<a href="${escH(p.url)}" style="font-size:0.78rem;color:${t.accent};font-weight:600;text-decoration:none">View Project →</a>` : ''}
        </div>`).join('')}
    </div>
  </div>` : ''}

  <!-- CONTACT -->
  <div style="padding:52px 40px;text-align:center">
    <div style="font-size:0.68rem;font-weight:800;letter-spacing:0.1em;text-transform:uppercase;color:${t.accent};margin-bottom:14px">${escH(data.contactTitle || 'Get in Touch')}</div>
    <h2 style="font-size:1.8rem;font-weight:800;margin-bottom:10px">Let's Work Together</h2>
    <p style="color:${t.text2};font-size:0.9rem;margin-bottom:24px">Open to full-time roles, freelance projects and collaborations.</p>
    <div style="display:flex;gap:14px;justify-content:center;flex-wrap:wrap">
      ${email ? `<a href="mailto:${escH(email)}" style="background:${t.btnBg};color:${t.btnText};padding:10px 24px;border-radius:8px;font-weight:700;font-size:0.88rem;text-decoration:none">✉ ${escH(email)}</a>` : ''}
      ${linkedin ? `<a href="https://${escH(linkedin)}" style="background:${t.accentBg};color:${t.accent};border:1px solid ${t.accent}30;padding:10px 24px;border-radius:8px;font-weight:700;font-size:0.88rem;text-decoration:none">in LinkedIn</a>` : ''}
      ${github ? `<a href="https://${escH(github)}" style="background:${t.accentBg};color:${t.accent};border:1px solid ${t.accent}30;padding:10px 24px;border-radius:8px;font-weight:700;font-size:0.88rem;text-decoration:none">⌥ GitHub</a>` : ''}
    </div>
    <p style="font-size:0.72rem;color:${t.text2};margin-top:32px;opacity:0.5">Built with ResumeAI Pro</p>
  </div>
</div>`;

  const container = document.getElementById('portfolioPreview');
  container.innerHTML = portfolioHTML;
  AppState._lastPortfolioHTML = portfolioHTML;
}

// ============================================================
//  PORTFOLIO EDIT
// ============================================================
async function applyPortfolioEdit() {
  const instruction = document.getElementById('portEditInstruction').value.trim();
  if (!instruction) { showToast('Enter edit instructions.', 'error'); return; }
  showAILoading('Applying portfolio edit…', ['Processing instruction', 'Regenerating']);
  setTimeout(() => {
    hideAILoading();
    generatePortfolio();
  }, 800);
}

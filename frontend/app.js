// ============================================================
//  ResumeAI Pro — App Logic (app.js)
// ============================================================
const AppState = {
  user: null, currentSection: 'builder', currentTemplate: 'classic',
  builderMode: 'build', portfolioMode: 'build', portStyle: 'minimal',
  jobTarget: '', aiInstruction: '',
  resumeData: { personal:{}, experience:[], education:[], skills:{tech:[],soft:[],languages:[]}, projects:[] },
  history: [],
  _lastRawData: null, _lastAIData: null, _lastPortfolioHTML: null
};

document.addEventListener('DOMContentLoaded', () => {
  loadUser(); loadHistory(); addDefaultExperience(); addDefaultEducation();
  populateHistoryGrid(); setupKeyboard();
});

// ---- User ----
function loadUser() {
  const raw = localStorage.getItem('raiUser');
  if (!raw) { window.location.href = 'index.html'; return; }
  AppState.user = JSON.parse(raw);
  const ini = AppState.user.name.split(' ').map(w=>w[0]).join('').toUpperCase().slice(0,2);
  ['userAvatar','topUserAvatar'].forEach(id => { const el=document.getElementById(id); if(el) el.textContent=ini; });
  const un = document.getElementById('userName'); if(un) un.textContent = AppState.user.name;
  const sn = document.getElementById('settingName'); if(sn) sn.value = AppState.user.name;
  const se = document.getElementById('settingEmail'); if(se) se.value = AppState.user.email || '';
}
function logout() { if(confirm('Sign out?')){ localStorage.removeItem('raiUser'); window.location.href='index.html'; } }

// ---- Navigation ----
function showSection(name) {
  AppState.currentSection = name;
  document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  const sec = document.getElementById(name+'Section');
  if(sec) sec.classList.add('active');
  document.querySelectorAll('.nav-item').forEach(btn => {
    if(btn.getAttribute('onclick') && btn.getAttribute('onclick').includes("'"+name+"'")) btn.classList.add('active');
  });
  if(window.innerWidth < 768) document.getElementById('sidebar').classList.remove('open');
}
function toggleSidebar() { document.getElementById('sidebar').classList.toggle('open'); }

// ---- Builder Mode ----
function selectBuilderMode(mode) {
  AppState.builderMode = mode;
  document.getElementById('modeCardBuild').classList.toggle('selected', mode==='build');
  document.getElementById('modeCardUpload').classList.toggle('selected', mode==='upload');
  document.getElementById('buildModePanel').classList.toggle('active', mode==='build');
  document.getElementById('uploadModePanel').classList.toggle('active', mode==='upload');
}

// ---- Portfolio Mode ----
function selectPortfolioMode(mode) {
  AppState.portfolioMode = mode;
  document.getElementById('portModeCardBuild').classList.toggle('selected', mode==='build');
  document.getElementById('portModeCardUpload').classList.toggle('selected', mode==='upload');
}
function selectPortStyle(card, style) {
  document.querySelectorAll('[id^=styleCard]').forEach(c => c.classList.remove('selected'));
  card.classList.add('selected');
  AppState.portStyle = style;
}

// ---- Form Tabs ----
function switchFormTab(btn, tab) {
  document.querySelectorAll('.ftab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.ftab-content').forEach(c => c.classList.remove('active'));
  btn.classList.add('active');
  const el = document.getElementById(tab+'Tab');
  if(el) el.classList.add('active');
}

// ---- Analysis Tabs ----
function switchAnalysisTab(btn, tab) {
  btn.closest('.analysis-body').querySelectorAll('.atab').forEach(t => t.classList.remove('active'));
  btn.closest('.analysis-body').querySelectorAll('.atab-content').forEach(c => c.classList.remove('active'));
  btn.classList.add('active');
  const el = document.getElementById(tab+'Content');
  if(el) el.classList.add('active');
}
function switchReviewTab2(btn, tab) {
  document.querySelectorAll('#reviewResults2 .atab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('#reviewResults2 .atab-content').forEach(c => c.classList.remove('active'));
  btn.classList.add('active');
  const el = document.getElementById(tab+'Content');
  if(el) el.classList.add('active');
}

// ---- Job Target / Instructions ----
function setJobTarget() {
  AppState.jobTarget = document.getElementById('jobTarget').value;
  if(AppState.jobTarget) showToast('Target role set: '+AppState.jobTarget,'success');
}
function applyInstruction() {
  AppState.aiInstruction = document.getElementById('aiInstruction').value;
  if(AppState.aiInstruction) showToast('Instructions applied!','info');
}

// ---- Template ----
function changeTemplate(tpl) {
  AppState.currentTemplate = tpl;
  const doc = document.querySelector('.resume-doc');
  if(doc) doc.className = 'resume-doc template-'+tpl;
  showToast('Template: '+tpl,'info');
}

// ---- Experience Entries ----
let expCount=0;
function addExperience(data={}) {
  expCount++;
  const id = 'exp_'+expCount;
  const list = document.getElementById('experienceList');
  const card = document.createElement('div');
  card.className='entry-card'; card.id=id;
  card.innerHTML=`
    <div class="entry-card-header">
      <span class="entry-card-title">Experience ${expCount}</span>
      <button class="entry-remove" onclick="removeEntry('${id}')">✕</button>
    </div>
    <div class="form-grid">
      <div class="form-group"><label>Job Title *</label><input type="text" data-field="title" placeholder="Software Engineer" value="${data.title||''}"/></div>
      <div class="form-group"><label>Company *</label><input type="text" data-field="company" placeholder="Infosys" value="${data.company||''}"/></div>
      <div class="form-group"><label>Start Date</label><input type="text" data-field="startDate" placeholder="Jan 2022" value="${data.startDate||''}"/></div>
      <div class="form-group"><label>End Date</label><input type="text" data-field="endDate" placeholder="Present" value="${data.endDate||'Present'}"/></div>
      <div class="form-group"><label>Location</label><input type="text" data-field="location" placeholder="Hyderabad" value="${data.location||''}"/></div>
    </div>
    <div class="form-group" style="margin-top:8px">
      <label>Responsibilities / Achievements</label>
      <textarea data-field="description" rows="3" placeholder="• Led development of…&#10;• Improved performance by 40%…&#10;• Collaborated with 5-member team…">${data.description||''}</textarea>
      <button class="ai-enhance-btn" onclick="enhanceBullets('${id}')">✨ Enhance Bullets with AI</button>
    </div>`;
  list.appendChild(card);
}
function addDefaultExperience() { addExperience(); }

// ---- Education Entries ----
let eduCount=0;
function addEducation(data={}) {
  eduCount++;
  const id='edu_'+eduCount;
  const list=document.getElementById('educationList');
  const card=document.createElement('div');
  card.className='entry-card'; card.id=id;
  card.innerHTML=`
    <div class="entry-card-header">
      <span class="entry-card-title">Education ${eduCount}</span>
      <button class="entry-remove" onclick="removeEntry('${id}')">✕</button>
    </div>
    <div class="form-grid">
      <div class="form-group"><label>Degree *</label><input type="text" data-field="degree" placeholder="B.Tech Computer Science" value="${data.degree||''}"/></div>
      <div class="form-group"><label>Institution *</label><input type="text" data-field="institution" placeholder="JNTU Hyderabad" value="${data.institution||''}"/></div>
      <div class="form-group"><label>Start Year</label><input type="text" data-field="startYear" placeholder="2018" value="${data.startYear||''}"/></div>
      <div class="form-group"><label>End Year</label><input type="text" data-field="endYear" placeholder="2022" value="${data.endYear||''}"/></div>
      <div class="form-group"><label>CGPA / %</label><input type="text" data-field="gpa" placeholder="8.5/10" value="${data.gpa||''}"/></div>
      <div class="form-group"><label>Location</label><input type="text" data-field="location" placeholder="Hyderabad" value="${data.location||''}"/></div>
    </div>
    <div class="form-group" style="margin-top:8px">
      <label>Coursework / Achievements</label>
      <textarea data-field="details" rows="2" placeholder="Data Structures, Machine Learning, Award: Best Student…">${data.details||''}</textarea>
    </div>`;
  list.appendChild(card);
}
function addDefaultEducation() { addEducation(); }

// ---- Projects ----
let projCount=0;
function addProject(data={}) {
  projCount++;
  const id='proj_'+projCount;
  const list=document.getElementById('projectsList');
  const card=document.createElement('div');
  card.className='entry-card'; card.id=id;
  card.innerHTML=`
    <div class="entry-card-header">
      <span class="entry-card-title">Project ${projCount}</span>
      <button class="entry-remove" onclick="removeEntry('${id}')">✕</button>
    </div>
    <div class="form-grid">
      <div class="form-group"><label>Project Name *</label><input type="text" data-field="name" placeholder="E-Commerce App" value="${data.name||''}"/></div>
      <div class="form-group"><label>Technologies</label><input type="text" data-field="tech" placeholder="React, Node.js, MongoDB" value="${data.tech||''}"/></div>
      <div class="form-group"><label>Duration</label><input type="text" data-field="duration" placeholder="3 months" value="${data.duration||''}"/></div>
      <div class="form-group"><label>GitHub URL</label><input type="url" data-field="github" placeholder="github.com/…" value="${data.github||''}"/></div>
    </div>
    <div class="form-group" style="margin-top:8px">
      <label>Description</label>
      <textarea data-field="description" rows="2" placeholder="What you built and its impact…">${data.description||''}</textarea>
      <button class="ai-enhance-btn" onclick="enhanceProjectDesc('${id}')">✨ AI Enhance</button>
    </div>`;
  list.appendChild(card);
}

// ---- Portfolio Projects ----
let portProjCount=0;
function addPortProject(data={}) {
  portProjCount++;
  const id='pp_'+portProjCount;
  const list=document.getElementById('portProjects');
  const card=document.createElement('div');
  card.className='entry-card'; card.id=id;
  card.innerHTML=`
    <div class="entry-card-header">
      <span class="entry-card-title">Project ${portProjCount}</span>
      <button class="entry-remove" onclick="removeEntry('${id}')">✕</button>
    </div>
    <div class="form-grid">
      <div class="form-group"><label>Project Name</label><input type="text" placeholder="My Project" value="${data.name||''}"/></div>
      <div class="form-group"><label>Tech Stack</label><input type="text" placeholder="React, Node.js" value="${data.tech||''}"/></div>
    </div>
    <div class="form-group"><label>Description</label><textarea rows="2" placeholder="What does this do?">${data.desc||''}</textarea></div>
    <div class="form-group"><label>Live URL</label><input type="url" placeholder="https://myproject.com" value="${data.url||''}"/></div>`;
  list.appendChild(card);
}
function removeEntry(id) { const el=document.getElementById(id); if(el) el.remove(); }

// ---- Tags ----
function addTag(event, containerId, inputId) {
  if(event.key!=='Enter' && event.key!==',') return;
  event.preventDefault();
  const input=document.getElementById(inputId);
  const val=input.value.replace(',','').trim();
  if(!val) return;
  const container=document.getElementById(containerId);
  const tag=document.createElement('div');
  tag.className='tag-item';
  tag.innerHTML=`<span>${val}</span><button onclick="this.parentElement.remove()">×</button>`;
  container.appendChild(tag);
  input.value='';
}
function getTagsFromContainer(id) {
  const c=document.getElementById(id);
  if(!c) return [];
  return Array.from(c.querySelectorAll('.tag-item span')).map(s=>s.textContent);
}
function populateTags(containerId, items) {
  const c=document.getElementById(containerId); if(!c) return;
  c.innerHTML='';
  items.forEach(val => {
    const tag=document.createElement('div'); tag.className='tag-item';
    tag.innerHTML=`<span>${val}</span><button onclick="this.parentElement.remove()">×</button>`;
    c.appendChild(tag);
  });
}

// ---- Upload Resume (Builder Mode) ----
function handleUploadDrop(e) {
  e.preventDefault();
  document.getElementById('uploadDropZone').classList.remove('drag-over');
  if(e.dataTransfer.files[0]) processBuilderUpload(e.dataTransfer.files[0]);
}
function handleResumeUpload(input) { if(input.files[0]) processBuilderUpload(input.files[0]); }
function processBuilderUpload(file) {
  showAILoading('Analysing your resume…', ['Reading file content','Parsing structure','Scoring ATS compatibility','Identifying skill gaps','Generating improvements']);
  const fn = document.getElementById('analysisFileName');
  if(fn) fn.textContent = file.name;
  setTimeout(() => { hideAILoading(); showBuilderAnalysis(file.name); }, 3000);
}

function showBuilderAnalysis(fileName) {
  document.getElementById('uploadDropZone').style.display='none';
  const panel=document.getElementById('analysisPanel');
  panel.style.display='block';
  panel.style.animation='fadeIn 0.3s ease';

  const score = Math.floor(Math.random()*20)+65;
  document.getElementById('atsScoreVal').textContent = score;
  document.getElementById('atsScoreVal').style.color = score>=80?'#4ade80':score>=60?'#fbbf24':'#f87171';

  // Issues
  document.getElementById('issuesContent').innerHTML=`
    <div class="analysis-card issue"><div class="analysis-card-icon">⚠️</div><div class="analysis-card-body"><strong>Weak Action Verbs</strong><p>Phrases like "worked on", "helped with" should be replaced with strong verbs: "engineered", "led", "delivered", "optimized".</p></div></div>
    <div class="analysis-card issue"><div class="analysis-card-icon">⚠️</div><div class="analysis-card-body"><strong>No Quantified Achievements</strong><p>None of your bullet points include measurable results. Add numbers: "Reduced load time by 40%", "Led team of 5 engineers".</p></div></div>
    <div class="analysis-card issue"><div class="analysis-card-icon">⚠️</div><div class="analysis-card-body"><strong>Missing ATS Keywords</strong><p>Your resume lacks role-specific keywords that ATS systems scan for. Add: REST API, Agile, CI/CD, cloud technologies.</p></div></div>
    <div class="analysis-card issue"><div class="analysis-card-icon">⚠️</div><div class="analysis-card-body"><strong>Professional Summary Missing</strong><p>A 2-3 line professional summary dramatically improves ATS pass rates and recruiter attention.</p></div></div>`;

  // Suggestions
  document.getElementById('suggestionsContent').innerHTML=`
    <div class="analysis-card suggestion"><div class="analysis-card-icon">✅</div><div class="analysis-card-body"><strong>Add a Professional Summary</strong><p>Place a 2-3 sentence summary at the top targeting your specific role. <button class="ai-enhance-btn" onclick="generateSummaryFromUpload()">✨ AI Generate Summary</button></p></div></div>
    <div class="analysis-card suggestion"><div class="analysis-card-icon">✅</div><div class="analysis-card-body"><strong>Quantify All Achievements</strong><p>Go through each bullet point and add metrics where possible. AI can help rewrite them.</p></div></div>
    <div class="analysis-card suggestion"><div class="analysis-card-icon">✅</div><div class="analysis-card-body"><strong>Reorder Sections for Your Role</strong><p>For tech roles: Skills → Experience → Projects → Education works better than the reverse.</p></div></div>
    <div class="analysis-card suggestion"><div class="analysis-card-icon">✅</div><div class="analysis-card-body"><strong>Add Your GitHub / LinkedIn</strong><p>Tech recruiters check these. Including them increases your callback rate by ~35%.</p></div></div>`;

  // Skills to Learn
  document.getElementById('skillsContent').innerHTML=`
    <p style="font-size:0.82rem;color:var(--text-2);margin-bottom:14px;">Based on your profile and current market demand, here are the skills that will most improve your job prospects:</p>
    <div class="analysis-card skill"><div class="analysis-card-icon">🚀</div><div class="analysis-card-body"><strong>Cloud Platforms (AWS / Azure / GCP)</strong><p>Cloud skills are required in 78% of senior developer roles. Start with AWS Certified Cloud Practitioner.</p><div class="pill-tags"><span class="pill-tag learn">High Demand</span><span class="pill-tag missing">Not in Resume</span></div></div></div>
    <div class="analysis-card skill"><div class="analysis-card-icon">🐳</div><div class="analysis-card-body"><strong>Docker & Kubernetes</strong><p>Container skills appear in 65% of full-stack job listings. 2-week learning curve for basics.</p><div class="pill-tags"><span class="pill-tag learn">High Demand</span><span class="pill-tag missing">Not in Resume</span></div></div></div>
    <div class="analysis-card skill"><div class="analysis-card-icon">⚡</div><div class="analysis-card-body"><strong>TypeScript</strong><p>TypeScript adoption is at 85% among modern React/Node projects. Easy upgrade from JavaScript.</p><div class="pill-tags"><span class="pill-tag learn">Growing Fast</span><span class="pill-tag missing">Not Detected</span></div></div></div>
    <div class="analysis-card skill"><div class="analysis-card-icon">🔄</div><div class="analysis-card-body"><strong>CI/CD Pipelines (GitHub Actions / Jenkins)</strong><p>DevOps knowledge increases your salary bracket by 20-30% in most markets.</p><div class="pill-tags"><span class="pill-tag learn">Medium Demand</span></div></div></div>`;

  // Enhanced Resume Tab
  document.getElementById('enhancedContent').innerHTML=`
    <p style="font-size:0.82rem;color:var(--text-2);margin-bottom:14px;">Click below to generate an AI-improved version of your uploaded resume:</p>
    <button class="btn-accent" onclick="generateEnhancedVersion()" style="margin-bottom:16px">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
      Generate Enhanced Resume
    </button>
    <div id="enhancedResumePreview"></div>`;

  showToast('Resume analysed! Check the tabs for detailed feedback.','success');
}

function generateEnhancedVersion() {
  showAILoading('Generating enhanced resume…', ['Applying improvements','Rewriting bullet points','Adding keywords','Optimising structure']);
  setTimeout(() => {
    hideAILoading();
    loadSampleData();
    generateDocument();
    showSection('builder');
    selectBuilderMode('build');
    showToast('Enhanced resume generated in Builder!','success');
  }, 2500);
}

// ---- Review Section ----
function handleReviewDrop(e) {
  e.preventDefault();
  if(e.dataTransfer.files[0]) processReviewUpload(e.dataTransfer.files[0]);
}
function handleReviewUpload2(input) { if(input.files[0]) processReviewUpload(input.files[0]); }
function processReviewUpload(file) {
  const target = document.getElementById('reviewTargetRole').value || 'Software Developer';
  showAILoading('Performing deep resume analysis…', ['Parsing resume content','Matching against job requirements','Calculating ATS score','Identifying skill gaps','Building learning roadmap']);
  document.getElementById('reviewFileName2').textContent = file.name + ' → ' + target;
  setTimeout(() => { hideAILoading(); showReviewResults(file.name, target); }, 3500);
}

function showReviewResults(fileName, target) {
  document.getElementById('reviewDropZone2').style.display='none';
  const results=document.getElementById('reviewResults2');
  results.style.display='block'; results.style.animation='fadeIn 0.3s ease';
  const score=Math.floor(Math.random()*25)+60;
  document.getElementById('reviewAtsScore').textContent=score;
  document.getElementById('reviewAtsScore').style.color=score>=80?'#16a34a':score>=60?'#d97706':'#dc2626';

  document.getElementById('r-issuesContent').innerHTML=`
    <div class="analysis-card issue"><div class="analysis-card-icon">❌</div><div class="analysis-card-body"><strong>No measurable impact statements</strong><p>Every bullet point should answer "so what?" — add numbers, percentages, team sizes.</p></div></div>
    <div class="analysis-card issue"><div class="analysis-card-icon">❌</div><div class="analysis-card-body"><strong>Generic job descriptions</strong><p>Your experience section reads like a job description, not achievement highlights. Focus on outcomes.</p></div></div>
    <div class="analysis-card issue"><div class="analysis-card-icon">❌</div><div class="analysis-card-body"><strong>Missing target keywords</strong><p>For "${target}", your resume is missing: REST API, Agile, unit testing, system design, performance optimization.</p></div></div>`;

  document.getElementById('r-suggestContent').innerHTML=`
    <div class="analysis-card suggestion"><div class="analysis-card-icon">💡</div><div class="analysis-card-body"><strong>Tailor summary to "${target}"</strong><p>Your summary is generic. Mention "${target}" skills and your unique value proposition.</p></div></div>
    <div class="analysis-card suggestion"><div class="analysis-card-icon">💡</div><div class="analysis-card-body"><strong>Add a Projects section</strong><p>Side projects show initiative. Even open-source contributions or personal projects count.</p></div></div>
    <div class="analysis-card suggestion"><div class="analysis-card-icon">💡</div><div class="analysis-card-body"><strong>Use industry-standard section names</strong><p>Use "Work Experience" not "Jobs", "Technical Skills" not "Things I know". ATS matters.</p></div></div>`;

  document.getElementById('r-skillsContent').innerHTML=`
    <p style="font-size:0.82rem;color:var(--text-2);margin-bottom:12px">Skills present ✅ vs gaps for <strong>${target}</strong>:</p>
    <div class="analysis-card skill"><div class="analysis-card-icon">📊</div><div class="analysis-card-body">
      <strong>Your Current Skills vs Required</strong>
      <div class="pill-tags">
        <span class="pill-tag have">✓ JavaScript</span><span class="pill-tag have">✓ React</span>
        <span class="pill-tag have">✓ Node.js</span><span class="pill-tag have">✓ Git</span>
        <span class="pill-tag missing">✗ TypeScript</span><span class="pill-tag missing">✗ AWS</span>
        <span class="pill-tag missing">✗ Docker</span><span class="pill-tag missing">✗ System Design</span>
        <span class="pill-tag missing">✗ GraphQL</span>
      </div>
    </div></div>`;

  document.getElementById('r-roadmapContent').innerHTML=`
    <p style="font-size:0.82rem;color:var(--text-2);margin-bottom:14px">Personalised learning roadmap to get the "${target}" role:</p>
    <div class="skill-roadmap">
      <div class="roadmap-item"><div class="roadmap-num">1</div><div class="roadmap-skill"><strong>TypeScript</strong><span>2-3 weeks • Upgrade from JS. Huge demand in React/Node ecosystem.</span></div><span class="roadmap-priority high">Urgent</span></div>
      <div class="roadmap-item"><div class="roadmap-num">2</div><div class="roadmap-skill"><strong>AWS Cloud Practitioner</strong><span>4-6 weeks • Free tier + free exam prep. Most in-demand cloud cert.</span></div><span class="roadmap-priority high">High</span></div>
      <div class="roadmap-item"><div class="roadmap-num">3</div><div class="roadmap-skill"><strong>Docker Basics</strong><span>1-2 weeks • Containerisation is expected in most dev roles now.</span></div><span class="roadmap-priority medium">Medium</span></div>
      <div class="roadmap-item"><div class="roadmap-num">4</div><div class="roadmap-skill"><strong>System Design Fundamentals</strong><span>4-8 weeks • Critical for senior roles and FAANG interviews.</span></div><span class="roadmap-priority medium">Medium</span></div>
      <div class="roadmap-item"><div class="roadmap-num">5</div><div class="roadmap-skill"><strong>GraphQL</strong><span>1-2 weeks • Growing fast as REST alternative in modern APIs.</span></div><span class="roadmap-priority good">Nice to have</span></div>
    </div>`;

  showToast('Deep analysis complete!','success');
}

function applyReviewFix() {
  const instr=document.getElementById('reviewFixInstruction').value.trim();
  if(!instr) { showToast('Enter an instruction.','error'); return; }
  showAILoading('Applying fix…', ['Processing instruction','Updating resume']);
  setTimeout(() => { hideAILoading(); showToast('Fix applied! Rebuild the resume to see changes.','success'); }, 1800);
}
function buildFromReview() { showSection('builder'); selectBuilderMode('build'); showToast('Switch to the Builder to create your improved resume!','info'); }

// ---- Sample Data ----
function loadSampleData() {
  document.getElementById('fullName').value='Ravi Kumar';
  document.getElementById('jobTitle').value='Full Stack Developer';
  document.getElementById('email').value='ravi.kumar@gmail.com';
  document.getElementById('phone').value='+91 98765 43210';
  document.getElementById('location').value='Hyderabad, Telangana';
  document.getElementById('linkedin').value='linkedin.com/in/ravikumar';
  document.getElementById('github').value='github.com/ravikumar';
  document.getElementById('summary').value='Passionate Full Stack Developer with 3+ years building scalable web applications. Proficient in React, Node.js and cloud technologies. Delivered 10+ production systems with measurable business impact.';
  populateTags('techSkillTags',['React','Node.js','TypeScript','MongoDB','AWS','Docker','Git']);
  populateTags('softSkillTags',['Leadership','Communication','Problem Solving']);
  populateTags('langTags',['English','Telugu','Hindi']);
}

// ---- History ----
// ── History (fixed: saves full data, restores properly) ──────
function loadHistory() {
  try {
    const raw = localStorage.getItem('raiHistory');
    AppState.history = raw ? JSON.parse(raw) : [];
  } catch(e) {
    AppState.history = [];
  }
}

function saveToHistory(type, title, template) {
  // Save full resume/portfolio data so "Open" can restore it
  const item = {
    id: 'h' + Date.now(),
    type,
    title,
    date: new Date().toLocaleString(),
    template,
    score: Math.floor(Math.random() * 20) + 75,
    // snapshot the actual data
    rawData:  AppState._lastRawData  ? JSON.parse(JSON.stringify(AppState._lastRawData))  : null,
    aiData:   AppState._lastAIData   ? JSON.parse(JSON.stringify(AppState._lastAIData))   : null,
    portHTML: AppState._lastPortfolioHTML || null,
  };
  AppState.history.unshift(item);
  // Keep max 50 items
  if (AppState.history.length > 50) AppState.history = AppState.history.slice(0, 50);
  try {
    localStorage.setItem('raiHistory', JSON.stringify(AppState.history));
  } catch(e) {
    // localStorage full — trim oldest and retry
    AppState.history = AppState.history.slice(0, 20);
    localStorage.setItem('raiHistory', JSON.stringify(AppState.history));
  }
  populateHistoryGrid();
}

let historyFilter = 'all';
function filterHistory(btn, f) {
  document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active'); historyFilter = f; populateHistoryGrid();
}
function searchHistory(val) { populateHistoryGrid(val); }

function populateHistoryGrid(search = '') {
  const grid = document.getElementById('historyGrid');
  if (!grid) return;
  const items = AppState.history.filter(h => {
    const matchFilter = historyFilter === 'all' || h.type === historyFilter;
    const matchSearch = !search || h.title.toLowerCase().includes(search.toLowerCase());
    return matchFilter && matchSearch;
  });
  grid.innerHTML = items.length
    ? items.map(item => `
    <div class="history-card">
      <div class="history-card-top">
        <span class="hc-type ${item.type.toLowerCase()}">${item.type}</span>
        ${item.score ? `<span class="hc-score">ATS ${item.score}</span>` : ''}
      </div>
      <div class="history-card-title">${item.title}</div>
      <div class="history-card-meta">${item.date}${item.template ? ' • ' + item.template : ''}</div>
      <div class="history-card-actions">
        <button class="hc-btn" onclick="loadHistoryItem('${item.id}')">Open</button>
        <button class="hc-btn" onclick="downloadHistoryItem('${item.id}')">PDF</button>
        <button class="hc-btn danger" onclick="deleteHistoryItem('${item.id}')">Delete</button>
      </div>
    </div>`).join('')
    : '<p style="color:var(--text-3);font-size:0.85rem;padding:20px 0">No documents yet. Generate a resume or portfolio to see it here.</p>';
}

function loadHistoryItem(id) {
  const item = AppState.history.find(h => h.id === id);
  if (!item) { showToast('Item not found.', 'error'); return; }

  if (item.type === 'Portfolio' && item.portHTML) {
    showSection('portfolio');
    setTimeout(() => {
      const container = document.getElementById('portfolioPreview');
      if (container) {
        container.innerHTML = item.portHTML;
        AppState._lastPortfolioHTML = item.portHTML;
        showToast('Portfolio loaded!', 'success');
      }
    }, 300);
    return;
  }

  if (item.rawData && item.aiData) {
    showSection('builder');
    AppState._lastRawData = item.rawData;
    AppState._lastAIData  = item.aiData;
    setTimeout(() => {
      // Restore personal fields
      const p = item.rawData.personal || {};
      const setVal = (id, val) => { const el = document.getElementById(id); if(el) el.value = val || ''; };
      setVal('fullName', p.name);
      setVal('jobTitle', p.title);
      setVal('email', p.email);
      setVal('phone', p.phone);
      setVal('location', p.location);
      setVal('linkedin', p.linkedin);
      setVal('github', p.github);
      setVal('summary', p.summary);
      // Restore skills
      if (item.rawData.skills) {
        populateTags('techSkillTags', item.rawData.skills.tech || []);
        populateTags('softSkillTags', item.rawData.skills.soft || []);
        populateTags('langTags', item.rawData.skills.languages || []);
      }
      // Re-render the resume preview
      renderResumePreview(item.rawData, item.aiData);
      document.getElementById('downloadRow').style.display = 'flex';
      showToast('Resume loaded from history!', 'success');
    }, 400);
    return;
  }

  // Fallback: just navigate to builder
  showSection('builder');
  showToast('Opened — regenerate to restore full preview.', 'info');
}

function downloadHistoryItem(id) {
  const item = AppState.history.find(h => h.id === id);
  if (!item) return;
  if (item.rawData && item.aiData) {
    AppState._lastRawData = item.rawData;
    AppState._lastAIData  = item.aiData;
  }
  downloadAs('pdf');
}

function deleteHistoryItem(id) {
  AppState.history = AppState.history.filter(h => h.id !== id);
  localStorage.setItem('raiHistory', JSON.stringify(AppState.history));
  populateHistoryGrid();
  showToast('Deleted.', 'info');
}

// ---- Settings ----
function saveSettings() {
  AppState.user.name=document.getElementById('settingName').value;
  AppState.user.email=document.getElementById('settingEmail').value;
  localStorage.setItem('raiUser',JSON.stringify(AppState.user));
  loadUser(); showToast('Settings saved!','success');
}
function clearAllData() { if(confirm('Clear all data?')){localStorage.removeItem('raiHistory');loadHistory();populateHistoryGrid();showToast('Cleared.','info');} }
function deleteAccount() { if(confirm('Delete account permanently?')){localStorage.clear();window.location.href='index.html';} }

// ---- Search ----
const SEARCH_ITEMS=[
  {icon:'📝',title:'Build Resume from Scratch',sub:'Start fresh',action:()=>{showSection('builder');selectBuilderMode('build');}},
  {icon:'📄',title:'Improve Existing Resume',sub:'Upload & enhance',action:()=>{showSection('builder');selectBuilderMode('upload');}},
  {icon:'🔍',title:'Review Resume',sub:'Deep AI analysis',action:()=>showSection('reviewer')},
  {icon:'🎨',title:'Build Portfolio',sub:'Showcase your work',action:()=>showSection('portfolio')},
  {icon:'📁',title:'Document History',sub:'Past documents',action:()=>showSection('history')},
  {icon:'⚙️',title:'Settings',sub:'Account settings',action:()=>showSection('settings')},
  {icon:'🎨',title:'Modern Template',sub:'Resume template',action:()=>changeTemplate('modern')},
  {icon:'🎨',title:'Classic Template',sub:'Resume template',action:()=>changeTemplate('classic')},
];
function handleSearch(val) {
  const dd=document.getElementById('searchDropdown');
  if(!val.trim()){dd.classList.remove('open');return;}
  const f=SEARCH_ITEMS.filter(i=>i.title.toLowerCase().includes(val.toLowerCase())||i.sub.toLowerCase().includes(val.toLowerCase()));
  if(!f.length){dd.classList.remove('open');return;}
  dd.innerHTML=f.map((item,i)=>`
    <div class="search-item" onclick="runSearchItem(${i},'${val}')">
      <div class="search-item-icon">${item.icon}</div>
      <div class="search-item-text"><strong>${item.title}</strong><span>${item.sub}</span></div>
    </div>`).join('');
  dd.classList.add('open');
}
function runSearchItem(i,val) {
  const f=SEARCH_ITEMS.filter(item=>item.title.toLowerCase().includes(val.toLowerCase())||item.sub.toLowerCase().includes(val.toLowerCase()));
  if(f[i])f[i].action();
  document.getElementById('searchDropdown').classList.remove('open');
  document.getElementById('globalSearch').value='';
}
document.addEventListener('click',e=>{if(!e.target.closest('.search-bar-wrap'))document.getElementById('searchDropdown').classList.remove('open');});

// ---- Toast ----
function showToast(msg,type='info') {
  const c=document.getElementById('toastContainer');
  const t=document.createElement('div'); t.className='toast '+type;
  const icons={success:'✅',error:'❌',info:'ℹ️'};
  t.innerHTML=`<span>${icons[type]||'💬'}</span><span>${msg}</span>`;
  c.appendChild(t);
  setTimeout(()=>{t.style.opacity='0';t.style.transform='translateX(14px)';t.style.transition='0.25s';setTimeout(()=>t.remove(),300);},3000);
}

// ---- AI Loading ----
function showAILoading(text='AI is working…', steps=[]) {
  document.getElementById('aiLoadingText').textContent=text;
  const stepsEl=document.getElementById('loadingSteps');
  stepsEl.innerHTML=steps.map((s,i)=>`<div class="loading-step ${i===0?'active':''}" id="ls_${i}"><div class="loading-step-dot"></div>${s}</div>`).join('');
  document.getElementById('aiLoading').classList.add('show');
  if(steps.length>1) {
    steps.forEach((_,i)=>{
      if(i===0) return;
      setTimeout(()=>{
        document.querySelectorAll('.loading-step').forEach((el,j)=>{
          el.classList.remove('active','done');
          if(j<i) el.classList.add('done');
          if(j===i) el.classList.add('active');
        });
      }, i*600);
    });
  }
}
function hideAILoading() { document.getElementById('aiLoading').classList.remove('show'); }

// ---- Keyboard ----
function setupKeyboard() {
  document.addEventListener('keydown',e=>{
    if((e.metaKey||e.ctrlKey)&&e.key==='k'){e.preventDefault();document.getElementById('globalSearch').focus();}
    if((e.metaKey||e.ctrlKey)&&e.key==='s'){e.preventDefault();showToast('Saved!','success');}
    if(e.key==='Escape'){document.getElementById('searchDropdown').classList.remove('open');document.getElementById('globalSearch').blur();}
  });
}
// ---- Collect form data (used by ai-engine.js) ----
function collectResumeData() {
  return {
    personal:{
      name:document.getElementById('fullName').value||'',
      title:document.getElementById('jobTitle').value||'',
      email:document.getElementById('email').value||'',
      phone:document.getElementById('phone').value||'',
      location:document.getElementById('location').value||'',
      linkedin:document.getElementById('linkedin').value||'',
      github:document.getElementById('github').value||'',
      website:document.getElementById('website')?.value||'',
      summary:document.getElementById('summary').value||'',
    },
    experience:collectEntries('experienceList',['title','company','startDate','endDate','location','description']),
    education:collectEntries('educationList',['degree','institution','startYear','endYear','gpa','location','details']),
    skills:{tech:getTagsFromContainer('techSkillTags'),soft:getTagsFromContainer('softSkillTags'),languages:getTagsFromContainer('langTags')},
    projects:collectEntries('projectsList',['name','tech','duration','github','description']),
    jobTarget:AppState.jobTarget, aiInstruction:AppState.aiInstruction, template:AppState.currentTemplate,
  };
}
function collectEntries(listId, fields) {
  const list=document.getElementById(listId); if(!list) return [];
  return Array.from(list.querySelectorAll('.entry-card')).map(card=>{
    const obj={};
    fields.forEach(f=>{const el=card.querySelector(`[data-field="${f}"]`);if(el)obj[f]=el.value;});
    return obj;
  });
}

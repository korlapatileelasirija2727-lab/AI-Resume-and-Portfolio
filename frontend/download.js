// ============================================================
//  ResumeAI Pro — Download Engine (download.js)
// ============================================================

function downloadAs(format) {
  const docEl = document.getElementById('resumeDocEl');
  if (!docEl && format !== 'txt') { showToast('Generate a resume first!', 'error'); return; }
  showToast(`Preparing ${format.toUpperCase()}…`, 'info');
  switch (format) {
    case 'pdf':  downloadPDF();  break;
    case 'docx': downloadDOCX(); break;
    case 'txt':  downloadTXT();  break;
  }
}

// ---- PDF via browser print ----
function downloadPDF() {
  const docEl = document.getElementById('resumeDocEl');
  if (!docEl) { showToast('Generate a resume first!', 'error'); return; }
  const name = AppState._lastRawData?.personal?.name || 'Resume';
  const win = window.open('', '_blank');
  win.document.write(`<!DOCTYPE html>
<html><head>
<meta charset="UTF-8">
<title>${name} — Resume</title>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=Playfair+Display:wght@700;800&display=swap" rel="stylesheet">
<style>
*{box-sizing:border-box;margin:0;padding:0}
html{font-size:15px;-webkit-font-smoothing:antialiased}
body{font-family:'Inter',sans-serif;background:white}
@page{margin:0;size:A4}
@media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact}}
${getResumeDocCSS()}
</style>
</head>
<body style="padding:0;margin:0">
${docEl.outerHTML}
</body></html>`);
  win.document.close();
  setTimeout(() => { win.focus(); win.print(); win.close(); showToast('PDF exported!', 'success'); }, 700);
}

// ---- DOCX as .doc ----
function downloadDOCX() {
  const ai  = AppState._lastAIData;
  const raw = AppState._lastRawData;
  if (!ai || !raw) { showToast('Generate a resume first!', 'error'); return; }
  const name = (raw.personal?.name || 'Resume').replace(/\s+/g, '_');
  const content = buildWordContent(raw, ai);
  const blob = new Blob([content], { type: 'application/msword' });
  triggerDownload(blob, `${name}_Resume.doc`);
  showToast('DOCX downloaded!', 'success');
}

function buildWordContent(raw, ai) {
  const p   = raw.personal;
  const contact = [p.email, p.phone, p.location, p.linkedin, p.github].filter(Boolean).join(' | ');
  const accent  = '#1a56db';

  return `<html xmlns:o='urn:schemas-microsoft-com:office:office'
xmlns:w='urn:schemas-microsoft-com:office:word'
xmlns='http://www.w3.org/TR/REC-html40'>
<head><meta charset="UTF-8"><title>${esc(p.name)} Resume</title>
<style>
body{font-family:Calibri,sans-serif;font-size:11pt;color:#111;margin:.8in 1in}
h1{font-size:22pt;font-weight:bold;margin-bottom:2pt;color:#0a0a0a}
.title{font-size:12pt;color:${accent};font-weight:600;margin-bottom:5pt}
.contact{font-size:9pt;color:#555;margin-bottom:12pt;border-bottom:1.5pt solid #111;padding-bottom:8pt}
h2{font-size:8pt;font-weight:bold;letter-spacing:1.5pt;text-transform:uppercase;color:${accent};border-bottom:1pt solid ${accent};padding-bottom:2pt;margin:14pt 0 6pt}
.eheader{display:flex;justify-content:space-between;margin-bottom:1pt}
.etitle{font-weight:bold;font-size:10.5pt}
.edate{font-size:9pt;color:#777}
.esub{font-size:9.5pt;color:#555;font-style:italic;margin-bottom:4pt}
ul{margin:4pt 0 8pt 16pt;padding:0}
li{font-size:9.5pt;margin-bottom:2pt;color:#374151}
.skill-line{font-size:10pt;margin-bottom:4pt}
table{width:100%;border-collapse:collapse}td{vertical-align:top}
</style></head><body>
<h1>${esc(p.name || '')}</h1>
<div class="title">${esc(p.title || '')}</div>
<div class="contact">${esc(contact)}</div>
${ai.summary ? `<h2>Professional Summary</h2><p style="font-size:10pt;line-height:1.6;color:#374151">${esc(ai.summary)}</p>` : ''}
${(ai.experience||[]).filter(e=>e.company||e.title).length ? `<h2>Work Experience</h2>
${(ai.experience||[]).filter(e=>e.company||e.title).map(e => `
<table><tr>
  <td><div class="etitle">${esc(e.title||'')}</div><div class="esub">${esc(e.company||'')}${e.location?' · '+esc(e.location):''}</div></td>
  <td align="right"><div class="edate">${esc(e.startDate||'')} – ${esc(e.endDate||'')}</div></td>
</tr></table>
<ul>${(e.bullets||[]).map(b=>`<li>${esc(b)}</li>`).join('')}</ul>`).join('')}` : ''}
${(ai.projects||[]).filter(p=>p.name).length ? `<h2>Projects</h2>
${(ai.projects||[]).filter(p=>p.name).map(proj=>`
<div><span class="etitle">${esc(proj.name)}</span>${proj.tech?` | <span style="color:${accent};font-size:9pt">${esc(proj.tech)}</span>`:''}</div>
<ul>${(proj.bullets||[]).filter(Boolean).map(b=>`<li>${esc(b)}</li>`).join('')}</ul>`).join('')}` : ''}
${(ai.education||[]).filter(e=>e.institution||e.degree).length ? `<h2>Education</h2>
${(ai.education||[]).filter(e=>e.institution||e.degree).map(e=>`
<table><tr>
  <td><div class="etitle">${esc(e.degree||'')}</div><div class="esub">${esc(e.institution||'')}${e.gpa?' · '+esc(e.gpa):''}</div></td>
  <td align="right"><div class="edate">${esc(e.year||'')}</div></td>
</tr></table>`).join('')}` : ''}
${(ai.skills?.tech?.length||ai.skills?.soft?.length) ? `<h2>Skills</h2>
${ai.skills.tech?.length?`<div class="skill-line"><b>Technical:</b> ${esc(ai.skills.tech.join(', '))}</div>`:''}
${ai.skills.soft?.length?`<div class="skill-line"><b>Soft Skills:</b> ${esc(ai.skills.soft.join(', '))}</div>`:''}
${ai.skills.languages?.length?`<div class="skill-line"><b>Languages:</b> ${esc(ai.skills.languages.join(', '))}</div>`:''}` : ''}
</body></html>`;
}

// ---- TXT ----
function downloadTXT() {
  const ai  = AppState._lastAIData;
  const raw = AppState._lastRawData;
  if (!ai || !raw) { showToast('Generate a resume first!', 'error'); return; }
  const p   = raw.personal;
  const line = (c=60) => '─'.repeat(c);
  let txt    = '';

  txt += `${p.name || ''}\n${p.title || ''}\n`;
  txt += [p.email, p.phone, p.location, p.linkedin, p.github].filter(Boolean).join('  |  ');
  txt += `\n${line()}\n\n`;

  if (ai.summary) txt += `PROFESSIONAL SUMMARY\n${line(22)}\n${ai.summary}\n\n`;

  if ((ai.experience||[]).some(e=>e.company)) {
    txt += `WORK EXPERIENCE\n${line(16)}\n`;
    ai.experience.filter(e=>e.company||e.title).forEach(e => {
      txt += `${e.title||''} · ${e.company||''} · ${e.startDate||''} – ${e.endDate||''}\n`;
      if (e.location) txt += `${e.location}\n`;
      (e.bullets||[]).forEach(b => txt += `  • ${b}\n`);
      txt += '\n';
    });
  }

  if ((ai.projects||[]).some(p=>p.name)) {
    txt += `PROJECTS\n${line(8)}\n`;
    ai.projects.filter(p=>p.name).forEach(proj => {
      txt += `${proj.name}${proj.tech?' ('+proj.tech+')':''}\n`;
      (proj.bullets||[]).filter(Boolean).forEach(b => txt += `  • ${b}\n`);
      txt += '\n';
    });
  }

  if ((ai.education||[]).some(e=>e.institution)) {
    txt += `EDUCATION\n${line(9)}\n`;
    ai.education.filter(e=>e.institution||e.degree).forEach(e => {
      txt += `${e.degree||''} · ${e.institution||''}${e.gpa?' · '+e.gpa:''} · ${e.year||''}\n\n`;
    });
  }

  if (ai.skills?.tech?.length) {
    txt += `SKILLS\n${line(6)}\n`;
    if (ai.skills.tech.length)      txt += `Technical : ${ai.skills.tech.join(', ')}\n`;
    if (ai.skills.soft?.length)     txt += `Soft Skills: ${ai.skills.soft.join(', ')}\n`;
    if (ai.skills.languages?.length) txt += `Languages  : ${ai.skills.languages.join(', ')}\n`;
  }

  const fname = (p.name || 'Resume').replace(/\s+/g,'_');
  triggerDownload(new Blob([txt], {type:'text/plain'}), `${fname}_Resume.txt`);
  showToast('TXT downloaded!', 'success');
}

// ---- Portfolio Download ----
function downloadPortfolio(format) {
  const container = document.getElementById('portfolioPreview');
  if (!container || container.querySelector('.preview-placeholder')) {
    showToast('Generate a portfolio first!', 'error'); return;
  }
  const title = (document.getElementById('portTitle').value || 'Portfolio').replace(/\s+/g,'_');

  if (format === 'html') {
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${title.replace(/_/g,' ')}</title>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
<style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:'Inter',sans-serif}a{cursor:pointer}</style>
</head>
<body>${container.innerHTML}</body>
</html>`;
    triggerDownload(new Blob([html],{type:'text/html'}), `${title}_Portfolio.html`);
    showToast('Portfolio HTML downloaded!', 'success');
  } else if (format === 'pdf') {
    const win = window.open('','_blank');
    win.document.write(`<!DOCTYPE html><html><head>
<meta charset="UTF-8">
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
<style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:'Inter',sans-serif}@media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact}}</style>
</head><body>${container.innerHTML}</body></html>`);
    win.document.close();
    setTimeout(() => { win.print(); win.close(); showToast('Portfolio PDF exported!', 'success'); }, 700);
  }
}

// ---- Share ----
function shareResume() {
  if (navigator.share) {
    navigator.share({ title: 'My Resume — ResumeAI Pro', text: 'Check out my AI-generated resume!', url: window.location.href })
      .catch(() => copyLink());
  } else {
    copyLink();
  }
}
function copyLink() {
  navigator.clipboard.writeText(window.location.href)
    .then(() => showToast('Link copied to clipboard!', 'success'))
    .catch(() => showToast('Could not copy link.', 'error'));
}

// ---- Helpers ----
function triggerDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a   = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function esc(str) {
  return (str||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

function getResumeDocCSS() {
  return `
.resume-doc{padding:44px 50px;max-width:210mm;margin:0 auto;color:#111;font-size:10pt;line-height:1.6;font-family:'Inter',sans-serif}
.resume-name{font-size:22pt;font-weight:800;color:#0a0a0a;letter-spacing:-0.5pt;margin-bottom:2pt}
.resume-title{font-size:11pt;color:#4b5563;margin-bottom:8pt;font-weight:500}
.resume-contact{display:flex;flex-wrap:wrap;gap:10pt;font-size:8pt;color:#6b7280;padding-bottom:12pt}
.resume-section{margin-bottom:16pt}
.resume-section-title{font-size:7pt;font-weight:800;letter-spacing:1.5pt;text-transform:uppercase;border-bottom:1.5pt solid #111;padding-bottom:3pt;margin-bottom:10pt;color:#111}
.resume-entry{margin-bottom:10pt}
.resume-entry-header{display:flex;justify-content:space-between;align-items:baseline}
.resume-entry-title{font-weight:700;font-size:10pt;color:#0a0a0a}
.resume-entry-date{font-size:8pt;color:#6b7280}
.resume-entry-sub{font-size:9pt;color:#4b5563;margin-bottom:4pt}
.resume-bullets{list-style:none;padding:0}
.resume-bullets li{padding-left:10pt;position:relative;margin-bottom:2pt;font-size:9pt;color:#374151}
.resume-bullets li::before{content:'▸';position:absolute;left:0;font-size:7pt;top:2pt;color:#111}
.resume-skills-grid{display:flex;flex-wrap:wrap;gap:4pt}
.resume-skill-tag{background:#f3f4f6;border:1pt solid #e5e7eb;padding:2pt 8pt;border-radius:3pt;font-size:7.5pt;color:#374151;font-weight:600}
.template-modern .resume-section-title{color:#1d4ed8;border-color:#1d4ed8}
.template-modern .resume-bullets li::before{color:#1d4ed8}
.template-modern .resume-skill-tag{background:#eff6ff;border-color:#bfdbfe;color:#1d4ed8}
.template-executive .resume-section-title{color:#7c3aed;border-color:#7c3aed}
.template-creative .resume-section-title{color:#0891b2;border-color:#0891b2}
  `;
}

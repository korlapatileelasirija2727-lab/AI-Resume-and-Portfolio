// ============================================================
//  ResumeAI Pro — Templates (templates.js)
// ============================================================
const TEMPLATES = {
  classic:   { name: 'Classic',   accent: '#111827', description: 'Traditional black-and-white, universally accepted' },
  modern:    { name: 'Modern',    accent: '#1d4ed8', description: 'Clean blue accents, great for tech roles' },
  executive: { name: 'Executive', accent: '#7c3aed', description: 'Distinguished purple, ideal for senior positions' },
  creative:  { name: 'Creative',  accent: '#0891b2', description: 'Teal accents for creative and design roles' },
};
// Re-render on template switch
function changeTemplate(tpl) {
  AppState.currentTemplate = tpl;
  if (AppState._lastAIData && AppState._lastRawData) {
    renderResumePreview(AppState._lastRawData, AppState._lastAIData);
  }
  showToast(`Template: ${TEMPLATES[tpl]?.name || tpl}`, 'info');
}

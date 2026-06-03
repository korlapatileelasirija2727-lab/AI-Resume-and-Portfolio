// ============================================================
//  ResumeAI Pro — Auth Logic (auth.js)
// ============================================================
let selectedRole = 'fresher';

function switchTab(tab) {
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.auth-form').forEach(f => f.classList.remove('active'));
  document.getElementById(tab + 'Tab').classList.add('active');
  document.getElementById(tab + 'Form').classList.add('active');
}

function togglePass(inputId, btn) {
  const inp = document.getElementById(inputId);
  inp.type = inp.type === 'password' ? 'text' : 'password';
  btn.style.color = inp.type === 'text' ? 'var(--primary)' : '';
}

function checkStrength(val) {
  const fill  = document.getElementById('strengthFill');
  const label = document.getElementById('strengthLabel');
  let score = 0;
  if (val.length >= 8)            score++;
  if (/[A-Z]/.test(val))          score++;
  if (/[0-9]/.test(val))          score++;
  if (/[^A-Za-z0-9]/.test(val))  score++;
  const levels = [
    { w: '0%',   color: '',        text: '' },
    { w: '25%',  color: '#dc2626', text: 'Weak' },
    { w: '50%',  color: '#d97706', text: 'Fair' },
    { w: '75%',  color: '#ca8a04', text: 'Good' },
    { w: '100%', color: '#16a34a', text: 'Strong ✓' },
  ];
  fill.style.width      = levels[score].w;
  fill.style.background = levels[score].color;
  label.textContent     = levels[score].text;
  label.style.color     = levels[score].color;
}

function selectRole(btn, role) {
  document.querySelectorAll('.role-pill').forEach(p => p.classList.remove('active'));
  btn.classList.add('active');
  selectedRole = role;
}

function handleLogin() {
  const email    = document.getElementById('loginEmail').value.trim();
  const password = document.getElementById('loginPassword').value;
  clearError();
  if (!email || !password) { showError('Please fill in all fields.'); return; }
  if (!isValidEmail(email))  { showError('Please enter a valid email address.'); return; }

  setLoading(true);
  setTimeout(() => {
    setLoading(false);
    localStorage.setItem('raiUser', JSON.stringify({ email, name: formatName(email), role: 'user' }));
    window.location.href = 'dashboard.html';
  }, 1100);
}

function handleSignup() {
  const first    = document.getElementById('firstName').value.trim();
  const last     = document.getElementById('lastName').value.trim();
  const email    = document.getElementById('signupEmail').value.trim();
  const password = document.getElementById('signupPassword').value;
  const terms    = document.getElementById('termsCheck').checked;
  clearError();

  if (!first || !last || !email || !password) { showError('Please fill in all fields.'); return; }
  if (!isValidEmail(email))                   { showError('Please enter a valid email.'); return; }
  if (password.length < 8)                    { showError('Password must be at least 8 characters.'); return; }
  if (!terms)                                 { showError('Please accept the Terms of Service.'); return; }

  setLoading(true);
  setTimeout(() => {
    setLoading(false);
    localStorage.setItem('raiUser', JSON.stringify({ email, name: `${first} ${last}`, role: selectedRole }));
    window.location.href = 'dashboard.html';
  }, 1200);
}

function handleSocialLogin(provider) {
  setLoading(true);
  setTimeout(() => {
    setLoading(false);
    localStorage.setItem('raiUser', JSON.stringify({ email: 'demo@resumeai.pro', name: 'Demo User', role: 'user' }));
    window.location.href = 'dashboard.html';
  }, 900);
}

// helpers
function isValidEmail(e) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e); }
function formatName(email) {
  const local = email.split('@')[0];
  return local.charAt(0).toUpperCase() + local.slice(1).replace(/[._]/g,' ').replace(/\b\w/g,c=>c.toUpperCase());
}
function showError(msg) {
  clearError();
  const div = document.createElement('div');
  div.id = 'authError';
  div.style.cssText = 'background:#fee2e2;border:1px solid #fca5a5;color:#dc2626;padding:10px 14px;border-radius:6px;font-size:0.82rem;margin-bottom:14px;display:flex;gap:8px;align-items:center';
  div.innerHTML = `<span>⚠</span><span>${msg}</span>`;
  const active = document.querySelector('.auth-form.active');
  const btn    = active.querySelector('.btn-primary');
  active.insertBefore(div, btn);
  setTimeout(clearError, 4000);
}
function clearError() { const e = document.getElementById('authError'); if(e) e.remove(); }
function setLoading(state) {
  document.querySelectorAll('.btn-primary, .btn-social').forEach(b => {
    b.disabled    = state;
    b.style.opacity = state ? '0.6' : '1';
  });
}

document.addEventListener('keydown', e => {
  if (e.key !== 'Enter') return;
  const active = document.querySelector('.auth-form.active');
  if (active?.id === 'loginForm')  handleLogin();
  if (active?.id === 'signupForm') handleSignup();
});

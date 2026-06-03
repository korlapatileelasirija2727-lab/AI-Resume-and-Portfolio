// ============================================================
//  ResumeAI Pro — Frontend Static Server (server.js)
//  Serves the HTML/CSS/JS frontend on port 3000
//  AI calls go directly to the Python backend on port 8000
//
//  Run:  node server.js
//  Then: open http://localhost:3000
// ============================================================

const express = require('express');
const path    = require('path');
const app     = express();
const PORT    = process.env.FRONTEND_PORT || 3000;

// Serve all frontend files from the frontend/ folder
app.use(express.static(path.join(__dirname, 'frontend')));

app.get('*', (req, res) => {
  const file = req.path.endsWith('.html') ? req.path.slice(1) : 'index.html';
  res.sendFile(path.join(__dirname, 'frontend', file), err => {
    if (err) res.sendFile(path.join(__dirname, 'frontend', 'index.html'));
  });
});

app.listen(PORT, () => {
  console.log(`\n✅  ResumeAI Pro frontend running`);
  console.log(`   → http://localhost:${PORT}`);
  console.log(`   → AI backend expected at http://localhost:8000\n`);
  console.log(`   Make sure Python backend is running:`);
  console.log(`   cd backend && uvicorn main:app --reload --port 8000\n`);
});

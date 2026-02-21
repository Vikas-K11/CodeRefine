/* =============================================
   CodeRefine - Frontend Application Logic
   ============================================= */

// ===== CONFIG =====
const API_BASE = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  ? 'http://localhost:8000'
  : '';

// ===== STATE =====
let sessionId = localStorage.getItem('coderefine_session') || generateUUID();
let currentAnalysis = null;
let editor = null;
let optimizedEditor = null;
let activeIssueTab = 'bugs';

localStorage.setItem('coderefine_session', sessionId);

// ===== INIT =====
document.addEventListener('DOMContentLoaded', () => {
  initEditor();
  initOptimizedEditor();
  bindEvents();
  loadHistory();
});

// ===== CODEMIRROR EDITOR =====
function initEditor() {
  editor = CodeMirror.fromTextArea(document.getElementById('code-editor'), {
    theme: 'dracula',
    lineNumbers: true,
    matchBrackets: true,
    autoCloseBrackets: true,
    indentUnit: 2,
    tabSize: 2,
    lineWrapping: false,
    mode: 'python',
    extraKeys: { "Ctrl-Enter": () => analyzeCode() }
  });

  editor.on('change', () => {
    const len = editor.getValue().length;
    document.getElementById('char-count').textContent = `${len.toLocaleString()} chars`;
  });

  // Load a sample by default
  loadSampleCode('python');
}

function initOptimizedEditor() {
  optimizedEditor = CodeMirror.fromTextArea(document.getElementById('optimized-editor'), {
    theme: 'dracula',
    lineNumbers: true,
    readOnly: false,
    indentUnit: 2,
    tabSize: 2,
    lineWrapping: false,
    mode: 'python'
  });
}

// ===== LANGUAGE → CODEMIRROR MODE MAPPING =====
const LANG_MODES = {
  python: 'python',
  javascript: 'javascript',
  typescript: { name: 'javascript', typescript: true },
  java: 'text/x-java',
  cpp: 'text/x-c++src',
  c: 'text/x-csrc',
  csharp: 'text/x-csharp',
  go: 'go',
  rust: 'rust',
  php: 'php',
  ruby: 'ruby',
  sql: 'sql',
  bash: 'shell',
  html: 'htmlmixed',
  css: 'css'
};

// ===== SAMPLE CODE PER LANGUAGE =====
const SAMPLES = {
  python: `# Sample: Buggy Python code for review
import sqlite3
import hashlib

def get_user(username, password):
    conn = sqlite3.connect("users.db")
    cursor = conn.cursor()
    
    # BUG: SQL Injection vulnerability
    query = f"SELECT * FROM users WHERE username='{username}' AND password='{password}'"
    cursor.execute(query)
    user = cursor.fetchone()
    
    # BUG: Connection never closed
    return user

def calculate_average(numbers):
    # BUG: Division by zero not handled
    total = 0
    for n in numbers:
        total = total + n  # PERF: Use sum() instead
    return total / len(numbers)

def process_data(data):
    result = []
    for i in range(len(data)):           # PERF: Use enumerate
        for j in range(len(data)):       # PERF: O(n^2) complexity
            if data[i] == data[j] and i != j:
                result.append(data[i])
    return result

password = "secret123"  # SEC: Hardcoded credential
API_KEY = "sk-abc123xyz"  # SEC: Hardcoded API key`,

  javascript: `// Sample: Buggy JavaScript code for review
const express = require('express');
const app = express();

// BUG: No input validation
app.get('/user', (req, res) => {
  const userId = req.query.id;
  
  // SEC: XSS vulnerability - rendering unescaped user input
  res.send('<h1>User: ' + userId + '</h1>');
});

// PERF: Blocking operation in event loop
app.post('/process', (req, res) => {
  let result = [];
  const data = req.body.items;
  
  // PERF: Inefficient nested loop O(n^2)
  for (var i = 0; i < data.length; i++) {
    for (var j = 0; j < data.length; j++) {
      if (data[i].id == data[j].id) {   // BUG: Use === not ==
        result.push(data[i]);
      }
    }
  }
  
  // BUG: No error handling
  res.json(result);
});

// BUG: Callback hell with no error handling
function fetchData(url, callback) {
  fetch(url).then(r => r.json()).then(data => {
    fetch('/process').then(r => r.json()).then(result => {
      callback(result);
    })
  })
}

var DB_PASSWORD = "admin123";  // SEC: Hardcoded credential
app.listen(3000);`,

  java: `// Sample: Buggy Java code for review
import java.sql.*;
import java.util.*;

public class UserService {
    private static final String DB_PASSWORD = "secret123"; // SEC: Hardcoded
    
    // BUG: Resource leak - connection not closed
    public User getUser(String username, String password) throws Exception {
        Connection conn = DriverManager.getConnection(
            "jdbc:mysql://localhost/db", "root", DB_PASSWORD
        );
        
        // SEC: SQL Injection
        String query = "SELECT * FROM users WHERE username='" 
                      + username + "' AND password='" + password + "'";
        Statement stmt = conn.createStatement();
        ResultSet rs = stmt.executeQuery(query);
        
        if (rs.next()) {
            return new User(rs.getString("name"), rs.getString("email"));
        }
        return null;
    }
    
    // PERF: Inefficient string concatenation in loop
    public String buildReport(List<String> items) {
        String result = "";  // BUG: Use StringBuilder
        for (String item : items) {
            result += item + ", ";
        }
        return result;
    }
    
    // BUG: Catching generic Exception
    public void saveUser(User user) {
        try {
            // save logic
        } catch (Exception e) {
            e.printStackTrace();  // BUG: Don't print stack trace in production
        }
    }
}`
};

function loadSampleCode(lang) {
  const code = SAMPLES[lang] || SAMPLES.python;
  editor.setValue(code);
  const mode = LANG_MODES[lang] || lang;
  editor.setOption('mode', mode);
}

// ===== BIND EVENTS =====
function bindEvents() {
  // Tab navigation
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const tab = btn.dataset.tab;
      switchTab(tab);
      document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    });
  });

  // Language change
  document.getElementById('language-select').addEventListener('change', (e) => {
    const lang = e.target.value;
    const mode = LANG_MODES[lang] || lang;
    editor.setOption('mode', mode);
    if (optimizedEditor) optimizedEditor.setOption('mode', mode);
  });

  // Load sample
  document.getElementById('btn-load-sample').addEventListener('click', () => {
    const lang = document.getElementById('language-select').value;
    loadSampleCode(lang);
    showToast('Sample code loaded', 'info');
  });

  // Clear
  document.getElementById('btn-clear').addEventListener('click', () => {
    editor.setValue('');
    resetResults();
  });

  // Copy code
  document.getElementById('btn-copy-code').addEventListener('click', () => {
    copyToClipboard(editor.getValue(), 'Code copied!');
  });

  // Analyze
  document.getElementById('btn-analyze').addEventListener('click', analyzeCode);

  // Issue tabs
  document.querySelectorAll('.issue-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      activeIssueTab = tab.dataset.issues;
      document.querySelectorAll('.issue-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      if (currentAnalysis) renderIssues(currentAnalysis, activeIssueTab);
    });
  });

  // Rewrite
  document.getElementById('btn-rewrite').addEventListener('click', rewriteCode);

  // Optimized panel buttons
  document.getElementById('btn-copy-optimized').addEventListener('click', () => {
    copyToClipboard(optimizedEditor.getValue(), 'Optimized code copied!');
  });

  document.getElementById('btn-use-optimized').addEventListener('click', () => {
    editor.setValue(optimizedEditor.getValue());
    document.getElementById('optimized-panel').classList.add('hidden');
    showToast('Optimized code moved to editor', 'success');
  });

  document.getElementById('btn-close-optimized').addEventListener('click', () => {
    document.getElementById('optimized-panel').classList.add('hidden');
  });

  // History clear
  document.getElementById('btn-clear-history').addEventListener('click', clearHistory);
}

// ===== TAB SWITCH =====
function switchTab(tab) {
  document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
  const panel = document.getElementById(`tab-${tab}`);
  if (panel) panel.classList.add('active');

  if (tab === 'history') loadHistory();
}

// ===== ANALYZE CODE =====
async function analyzeCode() {
  const code = editor.getValue().trim();
  const language = document.getElementById('language-select').value;
  const model = document.getElementById('model-select').value;

  if (!code) {
    showToast('Please enter some code to analyze', 'error');
    return;
  }

  // UI: show loading
  setLoading(true);
  document.getElementById('btn-analyze').disabled = true;

  const loadingMessages = [
    'Connecting to AI model...',
    'Parsing code structure...',
    'Detecting bugs and issues...',
    'Running security analysis...',
    'Evaluating performance...',
    'Generating recommendations...'
  ];

  let msgIndex = 0;
  const msgInterval = setInterval(() => {
    document.getElementById('loading-sub').textContent = loadingMessages[msgIndex % loadingMessages.length];
    msgIndex++;
  }, 1800);

  try {
    const response = await fetch(`${API_BASE}/api/analyze`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Session-Id': sessionId
      },
      body: JSON.stringify({ code, language, model })
    });

    clearInterval(msgInterval);

    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.detail || `HTTP ${response.status}`);
    }

    const data = await response.json();
    currentAnalysis = data.analysis;
    sessionId = data.sessionId || sessionId;

    renderResults(data.analysis);
    showToast('Analysis complete!', 'success');

  } catch (error) {
    clearInterval(msgInterval);
    console.error('Analysis error:', error);
    showToast(`Error: ${error.message}`, 'error');
    resetResults();
  } finally {
    document.getElementById('btn-analyze').disabled = false;
    setLoading(false);
  }
}

// ===== REWRITE CODE =====
async function rewriteCode() {
  if (!currentAnalysis) return;
  const code = editor.getValue().trim();
  const language = document.getElementById('language-select').value;
  const model = document.getElementById('model-select').value;

  const btn = document.getElementById('btn-rewrite');
  btn.disabled = true;
  btn.innerHTML = '<span>✨ Generating...</span>';

  // Compile issues for context
  const issues = [
    ...currentAnalysis.bugs.map(b => ({ title: b.title, description: b.description })),
    ...currentAnalysis.security.map(s => ({ title: s.title, description: s.description })),
    ...currentAnalysis.performance.map(p => ({ title: p.title, description: p.description }))
  ].slice(0, 10);

  try {
    const response = await fetch(`${API_BASE}/api/rewrite`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Session-Id': sessionId
      },
      body: JSON.stringify({ code, language, model, issues })
    });

    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.detail || `HTTP ${response.status}`);
    }

    const data = await response.json();
    renderOptimizedCode(data.rewrite, language);
    showToast('Optimized code ready!', 'success');

  } catch (error) {
    console.error('Rewrite error:', error);
    showToast(`Rewrite failed: ${error.message}`, 'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<span>✨ Generate Optimized Code</span>';
  }
}

// ===== RENDER RESULTS =====
function renderResults(analysis) {
  setLoading(false);

  document.getElementById('idle-state').classList.add('hidden');
  document.getElementById('loading-state').classList.add('hidden');
  document.getElementById('results-content').classList.remove('hidden');

  // Score ring
  const score = analysis.overallScore || 0;
  const scoreColor = score >= 80 ? '#00cc88' : score >= 60 ? '#ffcc00' : score >= 40 ? '#4d9fff' : '#ff4d6a';
  const circumference = 326;
  const offset = circumference - (score / 100) * circumference;

  const fill = document.getElementById('score-ring-fill');
  fill.style.strokeDashoffset = offset;
  fill.style.stroke = scoreColor;

  document.getElementById('score-number').textContent = score;
  document.getElementById('score-grade').textContent = analysis.grade || '—';
  document.getElementById('score-grade').style.color = scoreColor;
  document.getElementById('score-summary').textContent = analysis.summary || '';

  // Stats row
  const bugs = analysis.bugs?.length || 0;
  const sec = analysis.security?.length || 0;
  const perf = analysis.performance?.length || 0;
  document.getElementById('score-stats').innerHTML = `
    <div class="score-stat"><span class="score-stat-dot" style="background:#ff4d6a"></span>${bugs} Bugs</div>
    <div class="score-stat"><span class="score-stat-dot" style="background:#4d9fff"></span>${sec} Security</div>
    <div class="score-stat"><span class="score-stat-dot" style="background:#ffcc00"></span>${perf} Performance</div>
    <div class="score-stat"><span class="score-stat-dot" style="background:#888"></span>${analysis.metrics?.linesOfCode || '?'} Lines</div>
  `;

  // Metrics bar
  const metrics = analysis.metrics || {};
  document.getElementById('metrics-bar').innerHTML = `
    ${metricItem('Maintainability', metrics.maintainability || 0)}
    ${metricItem('Testability', metrics.testability || 0)}
    ${metricItem('Readability', metrics.readability || 0)}
  `;

  // Issue counts
  document.getElementById('count-bugs').textContent = bugs;
  document.getElementById('count-security').textContent = sec;
  document.getElementById('count-performance').textContent = perf;
  document.getElementById('count-best').textContent = analysis.bestPractices?.length || 0;
  document.getElementById('count-positives').textContent = analysis.positives?.length || 0;

  // Render first tab
  renderIssues(analysis, activeIssueTab);
}

function metricItem(label, value) {
  const color = value >= 70 ? '#00cc88' : value >= 40 ? '#ffcc00' : '#ff4d6a';
  return `
    <div class="metric-item">
      <div class="metric-label">${label}</div>
      <div class="metric-value" style="color:${color}">${value}</div>
      <div class="metric-bar-wrap">
        <div class="metric-bar-fill" style="width:${value}%;background:${color}"></div>
      </div>
    </div>
  `;
}

// ===== RENDER ISSUES =====
function renderIssues(analysis, type) {
  const list = document.getElementById('issues-list');

  if (type === 'positives') {
    const items = analysis.positives || [];
    if (!items.length) {
      list.innerHTML = emptyIssues('No specific positives listed');
      return;
    }
    list.innerHTML = items.map(p => `
      <div class="issue-card positive">
        <div class="issue-header">
          <span class="issue-badge badge-positive">✓ Good</span>
          <span class="issue-title">${escapeHtml(p)}</span>
        </div>
      </div>
    `).join('');
    return;
  }

  const items = analysis[type] || [];

  if (!items.length) {
    const labels = { bugs: 'No bugs detected', security: 'No security issues', performance: 'No performance issues', bestPractices: 'No best practice violations' };
    list.innerHTML = emptyIssues(labels[type] || 'Nothing to show');
    return;
  }

  list.innerHTML = items.map(item => issueCard(item, type)).join('');
}

function issueCard(item, type) {
  const severity = item.severity || item.impact || 'medium';
  const badgeClass = `badge-${severity.toLowerCase()}`;
  const cardClass = severity.toLowerCase();
  const fix = item.fix || item.suggestion || item.recommendation || '';
  const line = item.line ? `<span class="issue-line">Line ${item.line}</span>` : '';

  return `
    <div class="issue-card ${cardClass}">
      <div class="issue-header">
        <span class="issue-badge ${badgeClass}">${severity.toUpperCase()}</span>
        <span class="issue-id">${escapeHtml(item.id || '')}</span>
        <span class="issue-title">${escapeHtml(item.title || '')}</span>
        ${line}
      </div>
      <div class="issue-desc">${escapeHtml(item.description || '')}</div>
      ${fix ? `
        <div class="issue-fix">
          <span class="issue-fix-icon">→</span>
          <span>${escapeHtml(fix)}</span>
        </div>
      ` : ''}
      ${item.cwe ? `<div style="margin-top:6px;font-size:11px;color:var(--text-3);font-family:var(--font-mono)">${escapeHtml(item.cwe)}</div>` : ''}
    </div>
  `;
}

function emptyIssues(msg) {
  return `
    <div class="empty-issues">
      <div class="empty-issues-icon">✓</div>
      <div>${msg}</div>
    </div>
  `;
}

// ===== RENDER OPTIMIZED CODE =====
function renderOptimizedCode(rewrite, language) {
  const panel = document.getElementById('optimized-panel');
  panel.classList.remove('hidden');

  // Changes summary
  const changes = rewrite.changes || [];
  const summary = document.getElementById('changes-summary');
  summary.innerHTML = `
    <div style="font-size:13px;color:var(--text-2);margin-bottom:10px">${escapeHtml(rewrite.explanation || '')}</div>
    <div>
      ${changes.map(c => `
        <span class="change-item change-type-${c.type}">
          ${typeIcon(c.type)} ${escapeHtml(c.description)}
        </span>
      `).join('')}
    </div>
  `;

  // Set optimized editor content
  const mode = LANG_MODES[language] || language;
  optimizedEditor.setOption('mode', mode);
  optimizedEditor.setValue(rewrite.optimizedCode || '');

  panel.scrollIntoView({ behavior: 'smooth' });
}

function typeIcon(type) {
  const icons = { bug_fix: '🐛', performance: '⚡', security: '🔒', style: '🎨', refactor: '♻️' };
  return icons[type] || '•';
}

// ===== LOADING STATE =====
function setLoading(isLoading) {
  const idle = document.getElementById('idle-state');
  const loading = document.getElementById('loading-state');
  const results = document.getElementById('results-content');

  if (isLoading) {
    idle.classList.add('hidden');
    results.classList.add('hidden');
    loading.classList.remove('hidden');
  }
}

function resetResults() {
  currentAnalysis = null;
  document.getElementById('idle-state').classList.remove('hidden');
  document.getElementById('loading-state').classList.add('hidden');
  document.getElementById('results-content').classList.add('hidden');
  document.getElementById('optimized-panel').classList.add('hidden');
}

// ===== HISTORY =====
async function loadHistory() {
  try {
    const response = await fetch(`${API_BASE}/api/history`, {
      headers: { 'X-Session-Id': sessionId }
    });
    const data = await response.json();
    renderHistory(data.history || []);
  } catch (e) {
    console.error('History load error:', e);
  }
}

async function clearHistory() {
  try {
    await fetch(`${API_BASE}/api/history`, {
      method: 'DELETE',
      headers: { 'X-Session-Id': sessionId }
    });
    renderHistory([]);
    showToast('History cleared', 'info');
  } catch (e) {
    showToast('Failed to clear history', 'error');
  }
}

function renderHistory(history) {
  const list = document.getElementById('history-list');
  if (!history.length) {
    list.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">📋</div>
        <p>No analyses yet. Run your first code review!</p>
      </div>
    `;
    return;
  }

  list.innerHTML = history.map(item => {
    const score = item.score || 0;
    const color = score >= 80 ? '#00cc88' : score >= 60 ? '#ffcc00' : score >= 40 ? '#4d9fff' : '#ff4d6a';
    const time = item.timestamp ? new Date(item.timestamp).toLocaleString() : '';

    return `
      <div class="history-card">
        <div class="history-score" style="background:${color}22;color:${color};border:2px solid ${color}44">
          ${score}
        </div>
        <div class="history-info">
          <div class="history-lang">${escapeHtml(item.language || '')} — Grade ${escapeHtml(item.grade || '?')}</div>
          <div class="history-summary">${escapeHtml(item.summary || '')}</div>
        </div>
        <div class="history-meta">
          <div class="history-time">${escapeHtml(time)}</div>
          <div class="history-issues">${item.issueCount || 0} issues</div>
        </div>
      </div>
    `;
  }).join('');
}

// ===== UTILITIES =====
function copyToClipboard(text, message) {
  if (!text) { showToast('Nothing to copy', 'error'); return; }
  navigator.clipboard.writeText(text)
    .then(() => showToast(message || 'Copied!', 'success'))
    .catch(() => showToast('Copy failed', 'error'));
}

function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;

  const icon = type === 'success' ? '✓' : type === 'error' ? '✕' : 'ℹ';
  toast.innerHTML = `<span>${icon}</span><span>${escapeHtml(message)}</span>`;

  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(20px)';
    toast.style.transition = 'all 0.3s';
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

function escapeHtml(str) {
  if (typeof str !== 'string') return String(str || '');
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0;
    return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
  });
}

/**
 * R Exam Study Hub - Q49, Q47, Q50, Q51
 * Pure Vanilla JavaScript: Multi-question switcher, live simulators, charts & state handling
 */

document.addEventListener('DOMContentLoaded', () => {
  initServiceWorker();
  initTheme();
  initQuestionSwitcher();
  initScrollProgressAndSpy();
  initCopyButtons();
  initCopyAllButton();
  initExportScript();
  initSearch();
  initInteractiveCleaner();
  initInteractiveTokenizer();
  initSimulatedCharts();
  initWordCloud();
  initShinySimulators();
  initChecklists();
  initMobileMenu();
});

/* ==========================================================================
   0. Offline Chrome Support & Service Worker
   ========================================================================== */
function initServiceWorker() {
  if ('serviceWorker' in navigator && window.location.protocol.startsWith('http')) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./sw.js').catch(err => {
        console.warn('SW registration skipped or failed:', err);
      });
    });
  }
}

function safeGetStorage(key, defaultVal = null) {
  try {
    const val = localStorage.getItem(key);
    return val !== null ? val : defaultVal;
  } catch (e) {
    return defaultVal;
  }
}

function safeSetStorage(key, val) {
  try {
    localStorage.setItem(key, val);
  } catch (e) {
    // Fail silently in restricted sandbox contexts
  }
}

/* ==========================================================================
   1. Theme Management (JupyterLab Light & Dark)
   ========================================================================== */
function initTheme() {
  const themeToggleBtn = document.getElementById('themeToggleBtn');
  // Default to JupyterLab Light Theme (matching official JupyterLab screenshot)
  let savedTheme = safeGetStorage('r_hub_theme', 'theme-jupyter-light');
  if (savedTheme === 'theme-light') savedTheme = 'theme-jupyter-light';
  if (savedTheme === 'theme-dark') savedTheme = 'theme-jupyter-dark';
  document.body.className = savedTheme;

  if (themeToggleBtn) {
    themeToggleBtn.addEventListener('click', () => {
      if (document.body.classList.contains('theme-jupyter-dark') || document.body.classList.contains('theme-dark')) {
        document.body.className = 'theme-jupyter-light';
        safeSetStorage('r_hub_theme', 'theme-jupyter-light');
      } else {
        document.body.className = 'theme-jupyter-dark';
        safeSetStorage('r_hub_theme', 'theme-jupyter-dark');
      }
    });
  }
}

/* ==========================================================================
   2. Question Switcher (Q49, Q47, Q50, Q51 on the same page)
   ========================================================================== */
let activeQuestion = 'q49';

function initQuestionSwitcher() {
  const tabs = document.querySelectorAll('.q-tab');
  const questions = ['q49', 'q47', 'q50', 'q51'];
  const guideTitle = document.getElementById('globalGuideTitle');
  const sidebarTocTitle = document.getElementById('sidebarTocTitle');

  const titleMap = {
    q49: 'Q49: Twitter Sentiment',
    q47: 'Q47: CO₂ Time Series',
    q50: 'Q50: Student Shiny',
    q51: 'Q51: Car Shiny'
  };

  const tocMap = {
    q49: 'Q49 Parts',
    q47: 'Q47 Parts',
    q50: 'Q50 Parts',
    q51: 'Q51 Parts'
  };

  // Check URL hash or localStorage for initial active question
  const hash = window.location.hash.toLowerCase().replace('#', '');
  let initialQ = safeGetStorage('active_r_question', 'q49');
  if (questions.includes(hash)) {
    initialQ = hash;
  }

  function switchQuestion(targetId) {
    if (!questions.includes(targetId)) targetId = 'q49';
    activeQuestion = targetId;
    safeSetStorage('active_r_question', targetId);

    // Update tabs
    tabs.forEach(t => {
      if (t.getAttribute('data-target') === targetId) {
        t.classList.add('active');
      } else {
        t.classList.remove('active');
      }
    });

    // Update views and sidebar navigations
    questions.forEach(q => {
      const view = document.getElementById(`view-${q}`);
      const nav = document.getElementById(`sidebarNav-${q}`);
      if (q === targetId) {
        if (view) {
          view.style.display = 'flex';
          view.classList.add('active');
        }
        if (nav) nav.style.display = 'block';
      } else {
        if (view) {
          view.style.display = 'none';
          view.classList.remove('active');
        }
        if (nav) nav.style.display = 'none';
      }
    });

    if (guideTitle) guideTitle.textContent = titleMap[targetId];
    if (sidebarTocTitle) sidebarTocTitle.textContent = tocMap[targetId];

    // Update JupyterLab breadcrumb filename
    const fileNames = {
      q49: 'Untitled3.ipynb',
      q47: 'Time_Series.ipynb',
      q50: 'Student_Shiny.ipynb',
      q51: 'Car_Shiny.ipynb'
    };
    const activeFileNameElem = document.getElementById('jpActiveFileName');
    if (activeFileNameElem && fileNames[targetId]) {
      activeFileNameElem.textContent = fileNames[targetId];
    }

    // Refresh Copy All button text & tooltip to match newly active question
    if (typeof updateCopyAllButtonLabel === 'function') {
      updateCopyAllButtonLabel();
    }

    // Scroll to top of content
    window.scrollTo({ top: 0, behavior: 'smooth' });

    // Trigger scroll spy update
    window.dispatchEvent(new Event('scroll'));
  }

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const target = tab.getAttribute('data-target');
      switchQuestion(target);
    });
  });

  // Set initial state
  switchQuestion(initialQ);
}

/* ==========================================================================
   3. Scroll Progress Bar & ScrollSpy (Context-Aware for 4 Questions)
   ========================================================================== */
function initScrollProgressAndSpy() {
  const progressBar = document.getElementById('scrollProgressBar');
  const progressSummary = document.getElementById('progressSummary');

  const visitedMap = {
    q49: new Set(),
    q47: new Set(),
    q50: new Set(),
    q51: new Set()
  };

  const totalMap = {
    q49: 22,
    q47: 19,
    q50: 6,
    q51: 6
  };

  window.addEventListener('scroll', () => {
    const scrollTop = window.scrollY;
    const docHeight = document.documentElement.scrollHeight - window.innerHeight;
    const scrollPercent = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
    progressBar.style.width = `${scrollPercent}%`;

    const activeView = document.getElementById(`view-${activeQuestion}`);
    if (!activeView) return;

    const sections = activeView.querySelectorAll('.guide-card');
    const navLinks = document.querySelectorAll(`#sidebarNav-${activeQuestion} .nav-link`);

    let currentId = '';
    sections.forEach(section => {
      const sectionTop = section.offsetTop - 120;
      const sectionHeight = section.offsetHeight;
      if (scrollTop >= sectionTop && scrollTop < sectionTop + sectionHeight) {
        currentId = section.getAttribute('id');
        section.classList.add('active-cell');
        const partNum = section.getAttribute('data-part');
        if (partNum && visitedMap[activeQuestion]) {
          visitedMap[activeQuestion].add(partNum);
          const statusCell = document.getElementById('jpStatusBarCell');
          if (statusCell && totalMap[activeQuestion]) {
            statusCell.textContent = `Cell ${partNum}/${totalMap[activeQuestion]}`;
          }
        }
      } else {
        section.classList.remove('active-cell');
      }
    });

    if (currentId) {
      navLinks.forEach(link => {
        link.classList.remove('active');
        if (link.getAttribute('href') === `#${currentId}`) {
          link.classList.add('active');
        }
      });
    }

    // Update Progress Pill
    if (progressSummary && totalMap[activeQuestion]) {
      const currentVisited = visitedMap[activeQuestion].size;
      const total = totalMap[activeQuestion];
      progressSummary.textContent = `${currentVisited}/${total} Read`;
    }
  });
}

/* ==========================================================================
   4. Resilient Clipboard Helper (Works offline, on localhost, and file:///)
   ========================================================================== */
async function copyToClipboard(text) {
  if (navigator.clipboard && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (err) {
      // Fallback below
    }
  }

  // Reliable fallback for file:/// protocol, offline Chrome, or restricted contexts
  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.style.position = 'fixed';
  textarea.style.left = '-9999px';
  textarea.style.top = '0';
  textarea.setAttribute('readonly', '');
  document.body.appendChild(textarea);
  textarea.select();
  let success = false;
  try {
    success = document.execCommand('copy');
  } catch (err) {
    success = false;
  }
  document.body.removeChild(textarea);
  return success;
}

/* ==========================================================================
   5. Copy Individual Code Snippet
   ========================================================================== */
function initCopyButtons() {
  const copyButtons = document.querySelectorAll('.copy-btn');

  copyButtons.forEach(btn => {
    btn.addEventListener('click', async () => {
      const targetId = btn.getAttribute('data-clipboard');
      const codeElement = document.getElementById(targetId);
      if (!codeElement) return;

      const codeText = codeElement.innerText;
      const originalText = btn.innerHTML;
      const success = await copyToClipboard(codeText);
      if (success) {
        btn.classList.add('copied');
        btn.innerHTML = `<span>Copied! ✓</span>`;

        setTimeout(() => {
          btn.classList.remove('copied');
          btn.innerHTML = originalText;
        }, 2000);
      }
    });
  });
}

/* ==========================================================================
   6. Question Script Generator (Strictly scoped to that question only)
   ========================================================================== */
const QUESTION_SCRIPT_HEADERS = {
  q49: `# =====================================================================
# Q49: Simple Text Mining + Bing Sentiment Analysis in R
# Twitter US Airline Sentiment (Tweets.csv)
# Clean 22-part notebook code for JupyterLab & RStudio
# =====================================================================\n\n`,
  q47: `# =====================================================================
# Q47: Time Series Analysis and Forecasting in R
# Monthly Atmospheric CO2 Concentration (Built-in data(co2))
# Models: Seasonal Naive, Holt, ARIMA (19-Part Notebook)
# =====================================================================\n\n`,
  q50: `# =====================================================================
# Q50: Student Analytics Dashboard in R Shiny
# Reactive filtering: Department, Semester, Minimum Mark
# KPIs, DT table, marks histogram, department bar chart (6 Parts)
# =====================================================================\n\n`,
  q51: `# =====================================================================
# Q51: Car Analytics Dashboard in R Shiny (mtcars)
# Reactive filtering: Cylinders (4, 6, 8) and Minimum MPG slider
# KPIs, DT table, MPG histogram, cylinder-wise bar chart (6 Parts)
# =====================================================================\n\n`
};

function generateQuestionScript(questionId) {
  const container = document.getElementById(`view-${questionId}`);
  if (!container) return '';
  const codeBlocks = container.querySelectorAll('.guide-card.part-card');

  let fullScript = QUESTION_SCRIPT_HEADERS[questionId] || `# R Script - ${questionId.toUpperCase()}\n\n`;

  codeBlocks.forEach(card => {
    const partNumber = card.getAttribute('data-part');
    const heading = card.querySelector('.part-heading')?.innerText.trim() || `Part ${partNumber}`;
    const codeElem = card.querySelector('pre code');
    if (codeElem) {
      fullScript += `# ---------------------------------------------------------------------\n`;
      fullScript += `# Part ${partNumber}: ${heading}\n`;
      fullScript += `# ---------------------------------------------------------------------\n`;
      fullScript += codeElem.innerText.trim() + `\n\n`;
    }
  });

  return fullScript;
}

/* ==========================================================================
   7. Copy All Code of Active Question Only
   ========================================================================== */
function updateCopyAllButtonLabel() {
  const copyAllBtnText = document.getElementById('copyAllBtnText');
  const copyAllBtn = document.getElementById('copyAllScriptBtn');
  const questionNames = {
    q49: 'Q49',
    q47: 'Q47',
    q50: 'Q50',
    q51: 'Q51'
  };
  const partCounts = {
    q49: '22 Parts',
    q47: '19 Parts',
    q50: '6 Parts',
    q51: '6 Parts'
  };

  const name = questionNames[activeQuestion] || 'Question';
  const parts = partCounts[activeQuestion] || '';

  if (copyAllBtnText) {
    copyAllBtnText.textContent = `Copy All (${name})`;
  }
  if (copyAllBtn) {
    copyAllBtn.title = `Copy all R code for ${name} only (${parts}) to clipboard`;
  }
}

function initCopyAllButton() {
  const copyAllBtn = document.getElementById('copyAllScriptBtn');
  const copyAllBtnText = document.getElementById('copyAllBtnText');

  const questionNames = {
    q49: 'Q49',
    q47: 'Q47',
    q50: 'Q50',
    q51: 'Q51'
  };

  // Header Sticky Copy All Button
  if (copyAllBtn) {
    copyAllBtn.addEventListener('click', async () => {
      const codeText = generateQuestionScript(activeQuestion);
      if (!codeText) return;

      const success = await copyToClipboard(codeText);
      if (success) {
        copyAllBtn.classList.add('copied');
        if (copyAllBtnText) {
          copyAllBtnText.textContent = `Copied ${questionNames[activeQuestion]} Code! ✓`;
        }

        setTimeout(() => {
          copyAllBtn.classList.remove('copied');
          updateCopyAllButtonLabel();
        }, 2500);
      }
    });
  }

  // Overview Card Copy All Buttons
  document.querySelectorAll('.q-copy-all-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const qId = btn.getAttribute('data-question') || activeQuestion;
      const codeText = generateQuestionScript(qId);
      if (!codeText) return;

      const success = await copyToClipboard(codeText);
      if (success) {
        const span = btn.querySelector('span');
        const origText = span ? span.textContent : '';
        btn.classList.add('copied');
        if (span) span.textContent = `Copied All ${questionNames[qId]} Code! ✓`;

        setTimeout(() => {
          btn.classList.remove('copied');
          if (span) span.textContent = origText;
        }, 2500);
      }
    });
  });

  // Overview Card Download Buttons
  document.querySelectorAll('.q-download-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const qId = btn.getAttribute('data-question') || activeQuestion;
      downloadQuestionScript(qId);
    });
  });

  updateCopyAllButtonLabel();
}

/* ==========================================================================
   8. Export .R Script (Strictly for active question)
   ========================================================================== */
function downloadQuestionScript(questionId) {
  const fullScript = generateQuestionScript(questionId);
  if (!fullScript) return;

  const filenames = {
    q49: 'q49_airline_sentiment.R',
    q47: 'q47_co2_forecasting.R',
    q50: 'q50_student_analytics_shiny.R',
    q51: 'q51_car_analytics_shiny.R'
  };

  const blob = new Blob([fullScript], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filenames[questionId] || `${questionId}_script.R`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function initExportScript() {
  const exportBtn = document.getElementById('exportScriptBtn');
  if (!exportBtn) return;

  exportBtn.addEventListener('click', () => {
    downloadQuestionScript(activeQuestion);
  });
}

/* ==========================================================================
   6. Live Content Search (Filters active question view)
   ========================================================================== */
function initSearch() {
  const searchInput = document.getElementById('searchInput');
  if (!searchInput) return;

  window.addEventListener('keydown', (e) => {
    if (e.key === '/' && document.activeElement !== searchInput) {
      e.preventDefault();
      searchInput.focus();
    }
  });

  searchInput.addEventListener('input', (e) => {
    const query = e.target.value.toLowerCase().trim();
    const activeView = document.getElementById(`view-${activeQuestion}`);
    if (!activeView) return;

    const cards = activeView.querySelectorAll('.part-card');

    cards.forEach(card => {
      const text = card.innerText.toLowerCase();
      if (!query || text.includes(query)) {
        card.style.display = 'block';
      } else {
        card.style.display = 'none';
      }
    });
  });
}

/* ==========================================================================
   7. Interactive Live Regex Cleaner Demo (Q49 Part 6)
   ========================================================================== */
function initInteractiveCleaner() {
  const input = document.getElementById('cleanerInput');
  const output = document.getElementById('cleanerOutput');
  if (!input || !output) return;

  const cleanText = (raw) => {
    return raw
      .toLowerCase()
      .replace(/https?:\/\/\S+|www\.\S+/g, ' ')
      .replace(/@\w+/g, ' ')
      .replace(/[^\w\s]|_/g, ' ')
      .replace(/[0-9]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  };

  const update = () => {
    output.textContent = cleanText(input.value) || '(empty)';
  };

  input.addEventListener('input', update);
  update();
}

/* ==========================================================================
   8. Interactive Tokenizer Demo (Q49 Part 7)
   ========================================================================== */
function initInteractiveTokenizer() {
  const input = document.getElementById('tokenizerInput');
  const container = document.getElementById('tokenChips');
  if (!input || !container) return;

  const updateTokens = () => {
    const val = input.value.trim().toLowerCase();
    const words = val.split(/\s+/).filter(w => w.length > 0);
    container.innerHTML = '';
    words.forEach(word => {
      const chip = document.createElement('span');
      chip.className = 'token-chip';
      chip.textContent = word;
      container.appendChild(chip);
    });
  };

  input.addEventListener('input', updateTokens);
  updateTokens();
}

/* ==========================================================================
   9. Simulated SVG Visualizations (Q49 & Q47)
   ========================================================================== */
function initSimulatedCharts() {
  // --- Q49 Charts ---
  const chartWordFreq = document.getElementById('chartWordFreq');
  if (chartWordFreq) {
    const data = [
      { word: 'flight', n: 3820 },
      { word: 'united', n: 2940 },
      { word: 'usairways', n: 2800 },
      { word: 'americanair', n: 2600 },
      { word: 'southwestair', n: 2380 },
      { word: 'jetblue', n: 2150 },
      { word: 'cancelled', n: 1040 },
      { word: 'service', n: 980 },
      { word: 'delay', n: 890 },
      { word: 'time', n: 760 }
    ];

    let svg = `<svg class="chart-svg" viewBox="0 0 500 230" xmlns="http://www.w3.org/2000/svg">`;
    const barHeight = 15;
    const gap = 6;
    const maxVal = 4000;
    const chartLeft = 95;
    const chartWidth = 360;

    data.forEach((item, index) => {
      const y = index * (barHeight + gap) + 10;
      const width = (item.n / maxVal) * chartWidth;
      svg += `
        <text x="${chartLeft - 10}" y="${y + 11}" text-anchor="end" class="chart-axis-text">${item.word}</text>
        <rect x="${chartLeft}" y="${y}" width="${width}" height="${barHeight}" rx="3" fill="#3b82f6" class="chart-bar-rect" />
        <text x="${chartLeft + width + 8}" y="${y + 11}" class="chart-val-text">${item.n}</text>
      `;
    });
    svg += `</svg>`;
    chartWordFreq.innerHTML = svg;
  }

  const chartBigramFreq = document.getElementById('chartBigramFreq');
  if (chartBigramFreq) {
    const bigrams = [
      { phrase: 'customer service', n: 438 },
      { phrase: 'late flight', n: 215 },
      { phrase: 'cancelled flightled', n: 194 },
      { phrase: 'hours late', n: 142 },
      { phrase: 'flight delayed', n: 130 },
      { phrase: 'call back', n: 112 },
      { phrase: 'booking problems', n: 98 },
      { phrase: 'gate agent', n: 86 }
    ];

    let svg = `<svg class="chart-svg" viewBox="0 0 520 200" xmlns="http://www.w3.org/2000/svg">`;
    const barHeight = 15;
    const gap = 6;
    const maxVal = 480;
    const chartLeft = 135;
    const chartWidth = 330;

    bigrams.forEach((item, index) => {
      const y = index * (barHeight + gap) + 10;
      const width = (item.n / maxVal) * chartWidth;
      svg += `
        <text x="${chartLeft - 10}" y="${y + 11}" text-anchor="end" class="chart-axis-text">${item.phrase}</text>
        <rect x="${chartLeft}" y="${y}" width="${width}" height="${barHeight}" rx="3" fill="#8b5cf6" class="chart-bar-rect" />
        <text x="${chartLeft + width + 8}" y="${y + 11}" class="chart-val-text">${item.n}</text>
      `;
    });
    svg += `</svg>`;
    chartBigramFreq.innerHTML = svg;
  }

  const chartBingCount = document.getElementById('chartBingCount');
  if (chartBingCount) {
    const data = [
      { sentiment: 'negative', n: 9530, color: '#ef4444' },
      { sentiment: 'positive', n: 3845, color: '#10b981' }
    ];

    let svg = `<svg class="chart-svg" viewBox="0 0 450 130" xmlns="http://www.w3.org/2000/svg">`;
    const barHeight = 28;
    const gap = 16;
    const maxVal = 10500;
    const chartLeft = 85;
    const chartWidth = 310;

    data.forEach((item, index) => {
      const y = index * (barHeight + gap) + 20;
      const width = (item.n / maxVal) * chartWidth;
      svg += `
        <text x="${chartLeft - 10}" y="${y + 18}" text-anchor="end" class="chart-axis-text" style="font-weight: 700;">${item.sentiment}</text>
        <rect x="${chartLeft}" y="${y}" width="${width}" height="${barHeight}" rx="4" fill="${item.color}" class="chart-bar-rect" />
        <text x="${chartLeft + width + 8}" y="${y + 18}" class="chart-val-text" style="font-size: 11px;">${item.n}</text>
      `;
    });
    svg += `</svg>`;
    chartBingCount.innerHTML = svg;
  }

  const chartAirlines = document.getElementById('chartAirlineCompare');
  if (chartAirlines) {
    const airlines = [
      { name: 'United', neg: 2633, pos: 492 },
      { name: 'US Airways', neg: 2263, pos: 269 },
      { name: 'American', neg: 1960, pos: 336 },
      { name: 'Southwest', neg: 1186, pos: 570 },
      { name: 'Delta', neg: 955, pos: 544 },
      { name: 'Virgin', neg: 181, pos: 152 }
    ];

    let svg = `<svg class="chart-svg" viewBox="0 0 540 190" xmlns="http://www.w3.org/2000/svg">`;
    svg += `
      <g transform="translate(190, 8)">
        <rect x="0" y="0" width="10" height="10" fill="#ef4444" rx="2" />
        <text x="16" y="9" class="chart-axis-text">negative</text>
        <rect x="90" y="0" width="10" height="10" fill="#10b981" rx="2" />
        <text x="106" y="9" class="chart-axis-text">positive</text>
      </g>
    `;

    const maxVal = 2800;
    const groupWidth = 75;
    const barWidth = 18;
    const startX = 40;
    const chartHeight = 125;
    const chartBaseY = 160;

    airlines.forEach((al, i) => {
      const gx = startX + (i * groupWidth);
      const hNeg = (al.neg / maxVal) * chartHeight;
      const hPos = (al.pos / maxVal) * chartHeight;

      svg += `
        <rect x="${gx}" y="${chartBaseY - hNeg}" width="${barWidth}" height="${hNeg}" fill="#ef4444" rx="2" class="chart-bar-rect" />
        <rect x="${gx + barWidth + 3}" y="${chartBaseY - hPos}" width="${barWidth}" height="${hPos}" fill="#10b981" rx="2" class="chart-bar-rect" />
        <text x="${gx + 18}" y="${chartBaseY + 16}" text-anchor="middle" class="chart-axis-text">${al.name}</text>
      `;
    });

    svg += `<line x1="30" y1="${chartBaseY}" x2="510" y2="${chartBaseY}" stroke="rgba(255,255,255,0.12)" stroke-width="1" />`;
    svg += `</svg>`;
    chartAirlines.innerHTML = svg;
  }

  // --- Q47 Time Series Charts ---
  const chartCo2Series = document.getElementById('chartCo2Series');
  if (chartCo2Series) {
    let svg = `<svg class="chart-svg" viewBox="0 0 560 190" xmlns="http://www.w3.org/2000/svg">`;
    svg += `
      <line x1="45" y1="25" x2="540" y2="25" class="ts-grid" />
      <line x1="45" y1="65" x2="540" y2="65" class="ts-grid" />
      <line x1="45" y1="110" x2="540" y2="110" class="ts-grid" />
      <line x1="45" y1="155" x2="540" y2="155" class="ts-grid" />
      <text x="38" y="29" text-anchor="end" class="chart-axis-text">360</text>
      <text x="38" y="69" text-anchor="end" class="chart-axis-text">345</text>
      <text x="38" y="114" text-anchor="end" class="chart-axis-text">330</text>
      <text x="38" y="159" text-anchor="end" class="chart-axis-text">315</text>
    `;

    let dPath = `M 45 155`;
    const numPoints = 80;
    const startX = 45;
    const totalW = 495;
    for (let i = 0; i <= numPoints; i++) {
      const frac = i / numPoints;
      const x = startX + frac * totalW;
      const trendY = 155 - (frac * 130);
      const wave = Math.sin(frac * 38 * Math.PI * 2) * 5;
      const y = trendY + wave;
      dPath += ` L ${x.toFixed(1)} ${y.toFixed(1)}`;
    }

    svg += `<path d="${dPath}" class="ts-path" />`;
    svg += `<line x1="45" y1="155" x2="540" y2="25" class="ts-trend-path" />`;

    svg += `
      <text x="45" y="176" text-anchor="middle" class="chart-axis-text">1959</text>
      <text x="170" y="176" text-anchor="middle" class="chart-axis-text">1970</text>
      <text x="295" y="176" text-anchor="middle" class="chart-axis-text">1980</text>
      <text x="420" y="176" text-anchor="middle" class="chart-axis-text">1990</text>
      <text x="540" y="176" text-anchor="middle" class="chart-axis-text">1997</text>
    `;

    svg += `
      <g transform="translate(220, 8)">
        <line x1="0" y1="5" x2="16" y2="5" stroke="#38bdf8" stroke-width="2" />
        <text x="22" y="9" class="chart-axis-text">Observed Series</text>
        <line x1="120" y1="5" x2="136" y2="5" stroke="#f59e0b" stroke-width="1.5" stroke-dasharray="3 2" />
        <text x="142" y="9" class="chart-axis-text">Upward Trend</text>
      </g>
    `;

    svg += `</svg>`;
    chartCo2Series.innerHTML = svg;
  }

  const chartCo2Forecast = document.getElementById('chartCo2Forecast');
  if (chartCo2Forecast) {
    let svg = `<svg class="chart-svg" viewBox="0 0 560 200" xmlns="http://www.w3.org/2000/svg">`;
    svg += `
      <line x1="45" y1="25" x2="540" y2="25" class="ts-grid" />
      <line x1="45" y1="75" x2="540" y2="75" class="ts-grid" />
      <line x1="45" y1="125" x2="540" y2="125" class="ts-grid" />
      <line x1="45" y1="170" x2="540" y2="170" class="ts-grid" />
      <text x="38" y="29" text-anchor="end" class="chart-axis-text">370</text>
      <text x="38" y="79" text-anchor="end" class="chart-axis-text">365</text>
      <text x="38" y="129" text-anchor="end" class="chart-axis-text">360</text>
      <text x="38" y="174" text-anchor="end" class="chart-axis-text">355</text>
    `;

    let histPath = `M 45 150`;
    const histPoints = [
      [80, 138], [115, 125], [150, 142], [185, 155], [220, 134],
      [255, 114], [290, 102], [325, 120], [360, 140], [380, 108]
    ];
    histPoints.forEach(pt => histPath += ` L ${pt[0]} ${pt[1]}`);
    svg += `<path d="${histPath}" class="ts-path" />`;

    svg += `
      <polygon points="380,108 420,68 460,48 495,62 530,42 530,112 495,126 460,112 420,132 380,108" class="ts-ci-95" />
      <polygon points="380,108 420,78 460,62 495,74 530,56 530,96 495,112 460,98 420,115 380,108" class="ts-ci-80" />
    `;

    const forecastPath = `M 380 108 L 420 95 L 460 78 L 495 92 L 530 76`;
    svg += `<path d="${forecastPath}" class="ts-forecast-path" />`;

    svg += `<line x1="380" y1="18" x2="380" y2="175" stroke="rgba(255,255,255,0.2)" stroke-dasharray="3 3" />`;
    svg += `<text x="380" y="14" text-anchor="middle" class="chart-val-text" style="fill:#10b981;">1998 Forecast Period</text>`;

    svg += `
      <text x="45" y="186" text-anchor="middle" class="chart-axis-text">Jan 1996</text>
      <text x="220" y="186" text-anchor="middle" class="chart-axis-text">Jan 1997</text>
      <text x="380" y="186" text-anchor="middle" class="chart-axis-text">Dec 1997</text>
      <text x="530" y="186" text-anchor="middle" class="chart-axis-text">Dec 1998</text>
    `;

    svg += `
      <g transform="translate(60, 8)">
        <line x1="0" y1="5" x2="14" y2="5" stroke="#38bdf8" stroke-width="2" />
        <text x="18" y="9" class="chart-axis-text">Historical Data</text>
        <line x1="110" y1="5" x2="124" y2="5" stroke="#10b981" stroke-width="2" />
        <text x="128" y="9" class="chart-axis-text">ARIMA Forecast</text>
        <rect x="215" y="0" width="10" height="10" fill="rgba(16, 185, 129, 0.3)" rx="2" />
        <text x="230" y="9" class="chart-axis-text">80% / 95% Confidence Bounds</text>
      </g>
    `;

    svg += `</svg>`;
    chartCo2Forecast.innerHTML = svg;
  }
}

/* ==========================================================================
   10. Simulated Word Cloud (Q49 Part 11)
   ========================================================================== */
function initWordCloud() {
  const container = document.getElementById('simWordCloud');
  if (!container) return;

  const words = [
    { text: 'flight', size: 34, color: '#38bdf8' },
    { text: 'cancelled', size: 24, color: '#f43f5e' },
    { text: 'delayed', size: 22, color: '#fb923c' },
    { text: 'service', size: 20, color: '#a855f7' },
    { text: 'customer', size: 18, color: '#2dd4bf' },
    { text: 'hours', size: 17, color: '#facc15' },
    { text: 'united', size: 26, color: '#60a5fa' },
    { text: 'usairways', size: 24, color: '#c084fc' },
    { text: 'help', size: 19, color: '#4ade80' },
    { text: 'time', size: 17, color: '#94a3b8' },
    { text: 'thanks', size: 20, color: '#34d399' },
    { text: 'hold', size: 18, color: '#fb7185' },
    { text: 'plane', size: 16, color: '#38bdf8' },
    { text: 'baggage', size: 15, color: '#f59e0b' },
    { text: 'airline', size: 19, color: '#818cf8' },
    { text: 'great', size: 18, color: '#10b981' }
  ];

  container.innerHTML = '';
  words.forEach(w => {
    const span = document.createElement('span');
    span.className = 'cloud-item';
    span.textContent = w.text;
    span.style.fontSize = `${w.size}px`;
    span.style.color = w.color;
    container.appendChild(span);
  });
}

/* ==========================================================================
   11. Interactive Live Shiny Simulators (Q50 & Q51)
   ========================================================================== */
function initShinySimulators() {
  // --- Q50: Student Analytics Simulator ---
  const studentsData = [
    { id: 1, name: "Student 1", dept: "CSE", sem: 1, mark: 78, att: 85 },
    { id: 2, name: "Student 2", dept: "CSE", sem: 2, mark: 85, att: 90 },
    { id: 3, name: "Student 3", dept: "ECE", sem: 3, mark: 67, att: 75 },
    { id: 4, name: "Student 4", dept: "ECE", sem: 4, mark: 90, att: 95 },
    { id: 5, name: "Student 5", dept: "EEE", sem: 5, mark: 72, att: 80 },
    { id: 6, name: "Student 6", dept: "EEE", sem: 6, mark: 88, att: 92 },
    { id: 7, name: "Student 7", dept: "CSE", sem: 1, mark: 95, att: 98 },
    { id: 8, name: "Student 8", dept: "CSE", sem: 2, mark: 61, att: 70 },
    { id: 9, name: "Student 9", dept: "ECE", sem: 3, mark: 76, att: 82 },
    { id: 10, name: "Student 10", dept: "EEE", sem: 4, mark: 82, att: 88 },
    { id: 11, name: "Student 11", dept: "CSE", sem: 5, mark: 91, att: 94 },
    { id: 12, name: "Student 12", dept: "ECE", sem: 6, mark: 69, att: 78 },
    { id: 13, name: "Student 13", dept: "EEE", sem: 1, mark: 74, att: 81 },
    { id: 14, name: "Student 14", dept: "CSE", sem: 2, mark: 87, att: 91 },
    { id: 15, name: "Student 15", dept: "ECE", sem: 3, mark: 93, att: 96 },
    { id: 16, name: "Student 16", dept: "EEE", sem: 4, mark: 65, att: 72 },
    { id: 17, name: "Student 17", dept: "CSE", sem: 5, mark: 80, att: 86 },
    { id: 18, name: "Student 18", dept: "ECE", sem: 6, mark: 71, att: 79 },
    { id: 19, name: "Student 19", dept: "EEE", sem: 1, mark: 89, att: 93 },
    { id: 20, name: "Student 20", dept: "CSE", sem: 2, mark: 96, att: 97 }
  ];

  const selDept = document.getElementById('simQ50Dept');
  const selSem = document.getElementById('simQ50Sem');
  const sliderMark = document.getElementById('simQ50MinMark');
  const lblMark = document.getElementById('simQ50MinMarkVal');
  const kpiTotal = document.getElementById('simQ50TotalStudents');
  const kpiMark = document.getElementById('simQ50AvgMark');
  const kpiAtt = document.getElementById('simQ50AvgAtt');
  const tbodyQ50 = document.querySelector('#simQ50Table tbody');

  function updateQ50Sim() {
    if (!selDept || !selSem || !sliderMark) return;
    const dept = selDept.value;
    const sem = selSem.value;
    const minMark = Number(sliderMark.value);
    lblMark.textContent = minMark;

    // Reactive filter implementation
    const filtered = studentsData.filter(s => {
      const matchDept = (dept === 'All') || (s.dept === dept);
      const matchSem = (sem === 'All') || (s.sem === Number(sem));
      const matchMark = s.mark >= minMark;
      return matchDept && matchSem && matchMark;
    });

    // Update KPIs
    const count = filtered.length;
    kpiTotal.textContent = count;
    if (count > 0) {
      const avgM = (filtered.reduce((acc, cur) => acc + cur.mark, 0) / count).toFixed(2);
      const avgA = (filtered.reduce((acc, cur) => acc + cur.att, 0) / count).toFixed(2);
      kpiMark.textContent = avgM;
      kpiAtt.textContent = `${avgA}%`;
    } else {
      kpiMark.textContent = '0.00';
      kpiAtt.textContent = '0.00%';
    }

    // Render table
    tbodyQ50.innerHTML = '';
    filtered.slice(0, 8).forEach(s => {
      const tr = document.createElement('tr');
      tr.innerHTML = `<td>${s.id}</td><td>${s.name}</td><td><span class="tag tag-neutral">${s.dept}</span></td><td>${s.sem}</td><td><strong>${s.mark}</strong></td><td>${s.att}%</td>`;
      tbodyQ50.appendChild(tr);
    });
    if (count > 8) {
      const tr = document.createElement('tr');
      tr.innerHTML = `<td colspan="6" style="text-align:center; color:var(--text-faint); font-style:italic;">... and ${count - 8} more students</td>`;
      tbodyQ50.appendChild(tr);
    }
    if (count === 0) {
      const tr = document.createElement('tr');
      tr.innerHTML = `<td colspan="6" style="text-align:center; color:var(--accent-rose);">No students match current filters</td>`;
      tbodyQ50.appendChild(tr);
    }
  }

  if (selDept) selDept.addEventListener('change', updateQ50Sim);
  if (selSem) selSem.addEventListener('change', updateQ50Sim);
  if (sliderMark) sliderMark.addEventListener('input', updateQ50Sim);
  updateQ50Sim();

  // --- Q51: Car Analytics Simulator (mtcars) ---
  const mtcarsData = [
    { model: "Mazda RX4", mpg: 21.0, cyl: 6, hp: 110, wt: 2.62 },
    { model: "Mazda RX4 Wag", mpg: 21.0, cyl: 6, hp: 110, wt: 2.88 },
    { model: "Datsun 710", mpg: 22.8, cyl: 4, hp: 93, wt: 2.32 },
    { model: "Hornet 4 Drive", mpg: 21.4, cyl: 6, hp: 110, wt: 3.21 },
    { model: "Hornet Sportabout", mpg: 18.7, cyl: 8, hp: 175, wt: 3.44 },
    { model: "Valiant", mpg: 18.1, cyl: 6, hp: 105, wt: 3.46 },
    { model: "Duster 360", mpg: 14.3, cyl: 8, hp: 245, wt: 3.57 },
    { model: "Merc 240D", mpg: 24.4, cyl: 4, hp: 62, wt: 3.19 },
    { model: "Merc 230", mpg: 22.8, cyl: 4, hp: 95, wt: 3.15 },
    { model: "Merc 280", mpg: 19.2, cyl: 6, hp: 123, wt: 3.44 },
    { model: "Merc 450SE", mpg: 16.4, cyl: 8, hp: 180, wt: 4.07 },
    { model: "Cadillac Fleetwood", mpg: 10.4, cyl: 8, hp: 205, wt: 5.25 },
    { model: "Lincoln Continental", mpg: 10.4, cyl: 8, hp: 215, wt: 5.42 },
    { model: "Chrysler Imperial", mpg: 14.7, cyl: 8, hp: 230, wt: 5.34 },
    { model: "Fiat 128", mpg: 32.4, cyl: 4, hp: 66, wt: 2.20 },
    { model: "Honda Civic", mpg: 30.4, cyl: 4, hp: 52, wt: 1.61 },
    { model: "Toyota Corolla", mpg: 33.9, cyl: 4, hp: 65, wt: 1.83 },
    { model: "Toyota Corona", mpg: 21.5, cyl: 4, hp: 97, wt: 2.46 },
    { model: "Dodge Challenger", mpg: 15.5, cyl: 8, hp: 150, wt: 3.52 },
    { model: "AMC Javelin", mpg: 15.2, cyl: 8, hp: 150, wt: 3.43 },
    { model: "Camaro Z28", mpg: 13.3, cyl: 8, hp: 245, wt: 3.84 },
    { model: "Pontiac Firebird", mpg: 19.2, cyl: 8, hp: 175, wt: 3.84 },
    { model: "Fiat X1-9", mpg: 27.3, cyl: 4, hp: 66, wt: 1.93 },
    { model: "Porsche 914-2", mpg: 26.0, cyl: 4, hp: 91, wt: 2.14 },
    { model: "Lotus Europa", mpg: 30.4, cyl: 4, hp: 113, wt: 1.51 },
    { model: "Ford Pantera L", mpg: 15.8, cyl: 8, hp: 264, wt: 3.17 },
    { model: "Ferrari Dino", mpg: 19.7, cyl: 6, hp: 175, wt: 2.77 },
    { model: "Maserati Bora", mpg: 15.0, cyl: 8, hp: 335, wt: 3.57 },
    { model: "Volvo 142E", mpg: 21.4, cyl: 4, hp: 109, wt: 2.78 }
  ];

  const chk4 = document.getElementById('simQ51Cyl4');
  const chk6 = document.getElementById('simQ51Cyl6');
  const chk8 = document.getElementById('simQ51Cyl8');
  const sliderMpg = document.getElementById('simQ51MinMpg');
  const lblMpg = document.getElementById('simQ51MinMpgVal');
  const kpiCarCount = document.getElementById('simQ51CarCount');
  const kpiCarMpg = document.getElementById('simQ51AvgMpg');
  const kpiCarHp = document.getElementById('simQ51AvgHp');
  const tbodyQ51 = document.querySelector('#simQ51Table tbody');

  function updateQ51Sim() {
    if (!chk4 || !chk6 || !chk8 || !sliderMpg) return;
    const selectedCyls = [];
    if (chk4.checked) selectedCyls.push(4);
    if (chk6.checked) selectedCyls.push(6);
    if (chk8.checked) selectedCyls.push(8);

    const minMpg = Number(sliderMpg.value);
    lblMpg.textContent = minMpg.toFixed(1);

    const filtered = mtcarsData.filter(c => selectedCyls.includes(c.cyl) && c.mpg >= minMpg);

    const count = filtered.length;
    kpiCarCount.textContent = count;
    if (count > 0) {
      const avgM = (filtered.reduce((acc, cur) => acc + cur.mpg, 0) / count).toFixed(2);
      const avgH = (filtered.reduce((acc, cur) => acc + cur.hp, 0) / count).toFixed(2);
      kpiCarMpg.textContent = avgM;
      kpiCarHp.textContent = avgH;
    } else {
      kpiCarMpg.textContent = '0.00';
      kpiCarHp.textContent = '0.00';
    }

    tbodyQ51.innerHTML = '';
    filtered.slice(0, 8).forEach(c => {
      const tr = document.createElement('tr');
      tr.innerHTML = `<td><strong>${c.model}</strong></td><td>${c.mpg}</td><td><span class="tag tag-neutral">${c.cyl} Cyl</span></td><td>${c.hp}</td><td>${c.wt}</td>`;
      tbodyQ51.appendChild(tr);
    });
    if (count > 8) {
      const tr = document.createElement('tr');
      tr.innerHTML = `<td colspan="5" style="text-align:center; color:var(--text-faint); font-style:italic;">... and ${count - 8} more cars</td>`;
      tbodyQ51.appendChild(tr);
    }
    if (count === 0) {
      const tr = document.createElement('tr');
      tr.innerHTML = `<td colspan="5" style="text-align:center; color:var(--accent-rose);">No cars match current filters</td>`;
      tbodyQ51.appendChild(tr);
    }
  }

  [chk4, chk6, chk8].forEach(chk => {
    if (chk) chk.addEventListener('change', updateQ51Sim);
  });
  if (sliderMpg) sliderMpg.addEventListener('input', updateQ51Sim);
  updateQ51Sim();
}

/* ==========================================================================
   12. Interactive Checklists (Q49, Q47, Q50, Q51)
   ========================================================================== */
function initChecklists() {
  function setupChecklist(prefix, total, storageKey) {
    const boxes = document.querySelectorAll(`.${prefix}-chk`);
    const fill = document.getElementById(`${prefix}ProgressFill`);
    const text = document.getElementById(`${prefix}StatusText`);
    if (!boxes.length) return;

    let saved = {};
    try {
      saved = JSON.parse(safeGetStorage(storageKey, '{}') || '{}');
    } catch (e) {
      saved = {};
    }

    const update = () => {
      let count = 0;
      boxes.forEach((chk, idx) => {
        const row = chk.closest('tr');
        if (chk.checked) {
          count++;
          if (row) row.classList.add('completed-row');
          saved[idx] = true;
        } else {
          if (row) row.classList.remove('completed-row');
          saved[idx] = false;
        }
      });
      const pct = Math.round((count / total) * 100);
      if (fill) fill.style.width = `${pct}%`;
      if (text) text.textContent = `${count} of ${total} completed (${pct}%)`;
      safeSetStorage(storageKey, JSON.stringify(saved));
    };

    boxes.forEach((chk, idx) => {
      if (saved[idx] === true) chk.checked = true;
      chk.addEventListener('change', update);
    });
    update();
  }

  setupChecklist('q49', 22, 'q49_22part_state');
  setupChecklist('q47', 19, 'q47_19part_state');
  setupChecklist('q50', 6, 'q50_6part_state');
  setupChecklist('q51', 6, 'q51_6part_state');
}

/* ==========================================================================
   13. Mobile Navigation Drawer Toggle
   ========================================================================== */
function initMobileMenu() {
  const toggleBtn = document.getElementById('mobileNavToggle');
  const sidebar = document.getElementById('guideSidebar');

  if (!toggleBtn || !sidebar) return;

  toggleBtn.addEventListener('click', () => {
    sidebar.classList.toggle('mobile-open');
  });

  sidebar.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', () => {
      sidebar.classList.remove('mobile-open');
    });
  });
}

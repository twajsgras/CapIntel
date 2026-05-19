// ======================= Event setup =======================

function setView(view) {
  state.view = view;
  localStorage.setItem(VIEW_KEY, view);
  $$('.seg-btn').forEach((b) => b.classList.toggle('active', b.dataset.view === view));
  if (view === 'stocks' && !Object.keys(state.stocks).length) loadStocks();
  state.query = '';
  state.searchResults = [];
  const search = $('#search');
  if (search) { search.value = ''; search.parentElement.classList.remove('has-value'); }
  render();
}

function setTopic(topic) {
  state.topic = topic;
  localStorage.setItem(TOPIC_KEY, topic);
  $$('.chip').forEach((c) => c.classList.toggle('active', c.dataset.topic === topic));
  render();
}

function setTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem(THEME_KEY, theme);
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', theme === 'light' ? '#ffffff' : '#0b0d10');
}

function openSettings() {
  const list = $('#sourceList');
  const groups = { ai: [], fintech: [], energy: [] };
  FEEDS.forEach((f) => groups[f.topic].push(f));
  list.innerHTML = Object.keys(groups).map((topic) => `
    <div class="source-group">
      <h3>${TOPIC_LABEL[topic]}</h3>
      ${groups[topic].map((f) => `
        <div class="source-row">
          <label>
            <input type="checkbox" data-source="${f.id}" ${state.settings[f.id] ? 'checked' : ''}/>
            ${escapeHtml(f.name)}
          </label>
        </div>`).join('')}
    </div>
  `).join('');
  $$('#sourceList input[type="checkbox"]').forEach((cb) =>
    cb.addEventListener('change', () => {
      state.settings[cb.dataset.source] = cb.checked;
      saveSettings();
    })
  );
  $('#settingsDialog').showModal();
}

function setupPullToRefresh() {
  let startY = 0, pulling = false, triggered = false;
  const hint = $('#pullHint');
  const threshold = 70;
  document.addEventListener('touchstart', (e) => {
    if (window.scrollY > 0) return;
    startY = e.touches[0].clientY; pulling = true; triggered = false;
  }, { passive: true });
  document.addEventListener('touchmove', (e) => {
    if (!pulling) return;
    const dy = e.touches[0].clientY - startY;
    if (dy > 20 && window.scrollY <= 0) {
      hint.classList.add('show');
      if (dy > threshold) triggered = true;
    } else { hint.classList.remove('show'); triggered = false; }
  }, { passive: true });
  document.addEventListener('touchend', () => {
    if (pulling && triggered) refresh();
    pulling = false; triggered = false; hint.classList.remove('show');
  });
}

function setupKeyboard() {
  document.addEventListener('keydown', (e) => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    const key = e.key.toLowerCase();
    if (key === 'r') { e.preventDefault(); refresh(); }
    else if (key === '/') { e.preventDefault(); $('#search').focus(); }
    else if (key === 'j') { e.preventDefault(); moveCursor(1); }
    else if (key === 'k') { e.preventDefault(); moveCursor(-1); }
    else if (key === 'enter') openCursor();
    else if (key === '1') setView('news');
    else if (key === '2') setView('stocks');
  });
}

function moveCursor(delta) {
  const sel = state.view === 'stocks' ? '.stock-panel' : '.card-wrap';
  const els = $$(sel);
  if (!els.length) return;
  state.keyboardIdx = Math.max(0, Math.min(els.length - 1, state.keyboardIdx + delta));
  els.forEach((el, i) => el.classList.toggle('focused', i === state.keyboardIdx));
  els[state.keyboardIdx].scrollIntoView({ block: 'nearest', behavior: 'smooth' });
}

function openCursor() {
  if (state.view !== 'news') return;
  const els = $$('.card-wrap');
  const el = els[state.keyboardIdx];
  if (!el) return;
  const link = el.dataset.link;
  if (link) window.open(link, '_blank', 'noopener');
}

function refresh() {
  if (state.view === 'stocks') loadStocks({ force: true });
  else loadNews({ force: true });
}

const debouncedSearch = debounce(async (q) => {
  if (state.view !== 'stocks') return;
  if (!q || !q.trim()) {
    state.searchResults = [];
    state.searching = false;
    render();
    return;
  }
  state.searching = true;
  render();
  const results = await searchTickers(q);
  state.searching = false;
  state.searchResults = results;
  render();
}, 250);

function init() {
  const savedTheme = localStorage.getItem(THEME_KEY);
  if (savedTheme) setTheme(savedTheme);
  else setTheme(matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark');

  $$('.seg-btn').forEach((b) => b.classList.toggle('active', b.dataset.view === state.view));
  setTopic(state.topic);

  $('#seg').addEventListener('click', (e) => {
    const b = e.target.closest('.seg-btn');
    if (!b) return;
    setView(b.dataset.view);
  });

  $('#chips').addEventListener('click', (e) => {
    const chip = e.target.closest('.chip');
    if (!chip) return;
    setTopic(chip.dataset.topic);
  });

  $('#refreshBtn').addEventListener('click', refresh);
  $('#themeBtn').addEventListener('click', () => {
    const current = document.documentElement.getAttribute('data-theme') || 'dark';
    setTheme(current === 'dark' ? 'light' : 'dark');
  });
  $('#settingsBtn').addEventListener('click', openSettings);
  $('#starredBtn').addEventListener('click', () => setTopic('starred'));
  $('#resetSources').addEventListener('click', () => {
    FEEDS.forEach((f) => (state.settings[f.id] = true));
    saveSettings();
    openSettings();
  });
  $('#settingsDialog').addEventListener('close', () => loadNews({ force: false }));

  const search = $('#search');
  const wrap = search.parentElement;
  search.addEventListener('input', () => {
    state.query = search.value.trim();
    wrap.classList.toggle('has-value', !!state.query);
    if (state.view === 'stocks') {
      debouncedSearch(state.query);
    } else {
      render();
    }
  });
  $('#clearSearch').addEventListener('click', () => {
    search.value = ''; state.query = '';
    state.searchResults = [];
    wrap.classList.remove('has-value');
    render(); search.focus();
  });

  setupPullToRefresh();
  setupKeyboard();

  if (state.view === 'news') loadNews();
  else { render(); loadStocks(); loadNews(); }

  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
  }
}

document.addEventListener('DOMContentLoaded', init);

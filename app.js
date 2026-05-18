'use strict';

const FEEDS = [
  // AI
  { id: 'tc-ai',    topic: 'ai',      name: 'TechCrunch AI',      url: 'https://techcrunch.com/category/artificial-intelligence/feed/' },
  { id: 'verge-ai', topic: 'ai',      name: 'The Verge AI',       url: 'https://www.theverge.com/rss/ai-artificial-intelligence/index.xml' },
  { id: 'mit-ai',   topic: 'ai',      name: 'MIT Tech Review',    url: 'https://www.technologyreview.com/topic/artificial-intelligence/feed' },
  { id: 'ars-ai',   topic: 'ai',      name: 'Ars Technica AI',    url: 'https://arstechnica.com/ai/feed/' },
  { id: 'hn-ai',    topic: 'ai',      name: 'Hacker News',        url: 'https://hnrss.org/newest?q=AI+OR+LLM+OR+%22machine+learning%22&points=100' },

  // Fintech
  { id: 'tc-fin',   topic: 'fintech', name: 'TechCrunch Fintech', url: 'https://techcrunch.com/category/fintech/feed/' },
  { id: 'finextra', topic: 'fintech', name: 'Finextra',           url: 'https://www.finextra.com/rss/headlines.aspx' },
  { id: 'block',    topic: 'fintech', name: 'The Block',          url: 'https://www.theblock.co/rss.xml' },
  { id: 'bankdive', topic: 'fintech', name: 'Banking Dive',       url: 'https://www.bankingdive.com/feeds/news/' },
  { id: 'pymnts',   topic: 'fintech', name: 'PYMNTS',             url: 'https://www.pymnts.com/feed/' },

  // Energy
  { id: 'canary',   topic: 'energy',  name: 'Canary Media',       url: 'https://www.canarymedia.com/articles/rss.xml' },
  { id: 'utildive', topic: 'energy',  name: 'Utility Dive',       url: 'https://www.utilitydive.com/feeds/news/' },
  { id: 'oilprice', topic: 'energy',  name: 'OilPrice.com',       url: 'https://oilprice.com/rss/main' },
  { id: 'rtrs-en',  topic: 'energy',  name: 'Reuters Energy',     url: 'https://www.reutersagency.com/feed/?best-sectors=energy&post_type=best' },
  { id: 'bloom-gr', topic: 'energy',  name: 'Bloomberg Green',    url: 'https://news.google.com/rss/search?q=site%3Abloomberg.com%2Fgreen&hl=en-US&gl=US&ceid=US%3Aen' },
];

const TTL_MS = 15 * 60 * 1000;
const CACHE_KEY = 'newsdash:cache:v1';
const STARRED_KEY = 'newsdash:starred:v1';
const SETTINGS_KEY = 'newsdash:settings:v1';
const THEME_KEY = 'newsdash:theme';
const VIEW_KEY = 'newsdash:view';
const PROXIES = [
  // JSON proxy — fastest path, but rate-limited and sometimes flaky.
  {
    kind: 'json',
    build: (url) => `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(url)}&count=25`,
  },
  // Raw RSS via CORS proxy — parsed client-side.
  {
    kind: 'xml',
    build: (url) => `https://corsproxy.io/?${encodeURIComponent(url)}`,
  },
  {
    kind: 'xml',
    build: (url) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
  },
];

const TOPIC_LABEL = { ai: 'AI', fintech: 'Fintech', energy: 'Energy' };

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));

const state = {
  articles: [],
  fetchedAt: 0,
  topic: localStorage.getItem(VIEW_KEY) || 'all',
  query: '',
  starred: new Set(JSON.parse(localStorage.getItem(STARRED_KEY) || '[]')),
  settings: loadSettings(),
  loading: false,
};

function loadSettings() {
  try {
    const saved = JSON.parse(localStorage.getItem(SETTINGS_KEY) || 'null');
    if (saved && typeof saved === 'object') return saved;
  } catch {}
  const def = {};
  FEEDS.forEach((f) => (def[f.id] = true));
  return def;
}

function saveSettings() {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(state.settings));
}

function saveStarred() {
  localStorage.setItem(STARRED_KEY, JSON.stringify([...state.starred]));
}

function articleId(a) {
  return a.link || a.guid || `${a.source}:${a.title}`;
}

function relativeTime(iso) {
  if (!iso) return '';
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return '';
  const diff = Date.now() - t;
  const min = 60 * 1000, hr = 60 * min, day = 24 * hr;
  if (diff < min) return 'just now';
  if (diff < hr) return `${Math.floor(diff / min)}m ago`;
  if (diff < day) return `${Math.floor(diff / hr)}h ago`;
  if (diff < 7 * day) return `${Math.floor(diff / day)}d ago`;
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function originOf(link) {
  try { return new URL(link).origin; } catch { return ''; }
}

function faviconUrl(link) {
  const origin = originOf(link);
  if (!origin) return '';
  return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(origin)}&sz=64`;
}

function stripHtml(html) {
  if (!html) return '';
  const tmp = document.createElement('div');
  tmp.innerHTML = html;
  return (tmp.textContent || tmp.innerText || '').replace(/\s+/g, ' ').trim();
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function readCache() {
  try {
    const c = JSON.parse(localStorage.getItem(CACHE_KEY) || 'null');
    if (!c || !Array.isArray(c.articles) || !c.articles.length) return null;
    return c;
  } catch { return null; }
}

function writeCache(articles) {
  if (!articles || !articles.length) return;
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ articles, fetchedAt: Date.now() }));
  } catch {}
}

function parseRssXml(xmlText) {
  const doc = new DOMParser().parseFromString(xmlText, 'application/xml');
  if (doc.querySelector('parsererror')) throw new Error('xml parse error');
  const root = doc.documentElement;
  const isAtom = root.nodeName.toLowerCase() === 'feed';
  const nodes = isAtom ? doc.getElementsByTagName('entry') : doc.getElementsByTagName('item');
  const out = [];
  for (const n of nodes) {
    const text = (sel) => {
      const el = n.getElementsByTagName(sel)[0];
      return el ? (el.textContent || '').trim() : '';
    };
    let link = '';
    if (isAtom) {
      const links = n.getElementsByTagName('link');
      for (const l of links) {
        const rel = l.getAttribute('rel');
        if (!rel || rel === 'alternate') { link = l.getAttribute('href') || ''; break; }
      }
    } else {
      link = text('link');
    }
    out.push({
      title: text('title'),
      link,
      description: text(isAtom ? 'summary' : 'description') || text('content'),
      pubDate: text(isAtom ? 'updated' : 'pubDate') || text('published') || text('dc:date'),
      guid: text(isAtom ? 'id' : 'guid') || link,
    });
  }
  return out;
}

async function fetchViaProxy(feed, proxy) {
  const res = await fetch(proxy.build(feed.url), { cache: 'no-store' });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  if (proxy.kind === 'json') {
    const data = await res.json();
    if (data.status !== 'ok' || !Array.isArray(data.items)) throw new Error(data.message || 'bad response');
    return data.items;
  }
  const text = await res.text();
  return parseRssXml(text);
}

async function fetchFeed(feed) {
  let lastErr;
  for (const proxy of PROXIES) {
    try {
      const items = await fetchViaProxy(feed, proxy);
      return items.map((it) => ({
        title: stripHtml(it.title),
        link: it.link,
        description: stripHtml(it.description || it.content || '').slice(0, 300),
        publishedAt: it.pubDate || null,
        source: feed.name,
        sourceId: feed.id,
        topic: feed.topic,
        guid: it.guid || it.link,
      })).filter((a) => a.title && a.link);
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr || new Error('all proxies failed');
}

async function loadAll({ force = false } = {}) {
  if (state.loading) return;
  const cached = readCache();
  if (!force && cached && Date.now() - cached.fetchedAt < TTL_MS) {
    state.articles = cached.articles;
    state.fetchedAt = cached.fetchedAt;
    render();
    return;
  }

  state.loading = true;
  if (!state.articles.length) renderSkeletons();
  setSpinner(true);

  const enabled = FEEDS.filter((f) => state.settings[f.id]);
  const results = await Promise.allSettled(enabled.map(fetchFeed));
  const ok = [];
  let failures = 0;
  results.forEach((r) => {
    if (r.status === 'fulfilled') ok.push(...r.value);
    else failures++;
  });

  if (!ok.length && cached) {
    state.articles = cached.articles;
    state.fetchedAt = cached.fetchedAt;
    toast('Couldn’t refresh — showing cached');
  } else {
    const dedup = new Map();
    for (const a of ok) dedup.set(a.link || a.guid, a);
    const merged = [...dedup.values()].sort(
      (a, b) => new Date(b.publishedAt || 0) - new Date(a.publishedAt || 0)
    );
    state.articles = merged;
    state.fetchedAt = Date.now();
    writeCache(merged);
    if (failures && failures < enabled.length) toast(`${failures} source${failures > 1 ? 's' : ''} failed`);
    else if (failures) toast('All sources failed');
  }

  state.loading = false;
  setSpinner(false);
  render();
}

function setSpinner(on) {
  const btn = $('#refreshBtn');
  btn.classList.toggle('spinning', on);
  btn.disabled = on;
}

function renderSkeletons() {
  const feed = $('#feed');
  feed.innerHTML = '';
  for (let i = 0; i < 6; i++) {
    const sk = document.createElement('div');
    sk.className = 'skeleton';
    sk.innerHTML = `
      <div class="sk-line short"></div>
      <div class="sk-line title"></div>
      <div class="sk-line body"></div>
      <div class="sk-line body-2"></div>`;
    feed.appendChild(sk);
  }
}

function visibleArticles() {
  let list = state.articles;
  if (state.topic === 'starred') {
    list = list.filter((a) => state.starred.has(articleId(a)));
  } else if (state.topic !== 'all') {
    list = list.filter((a) => a.topic === state.topic);
  }
  if (state.query) {
    const q = state.query.toLowerCase();
    list = list.filter((a) =>
      a.title.toLowerCase().includes(q) ||
      (a.description && a.description.toLowerCase().includes(q)) ||
      a.source.toLowerCase().includes(q)
    );
  }
  return list;
}

function render() {
  const feed = $('#feed');
  const list = visibleArticles();

  if (!list.length) {
    feed.innerHTML = renderEmpty();
    const retry = $('#emptyRetry');
    if (retry) retry.addEventListener('click', () => loadAll({ force: true }));
    return;
  }

  const html = list.map((a) => {
    const id = articleId(a);
    const starred = state.starred.has(id);
    const fav = faviconUrl(a.link);
    return `
      <article class="card-wrap">
        <a class="card" href="${escapeHtml(a.link)}" target="_blank" rel="noopener noreferrer">
          <div class="card-meta">
            <img class="favicon" src="${escapeHtml(fav)}" alt="" loading="lazy" onerror="this.style.visibility='hidden'" />
            <span class="source">${escapeHtml(a.source)}</span>
            <span class="dot">·</span>
            <span class="time">${escapeHtml(relativeTime(a.publishedAt))}</span>
            <span class="topic-pill topic-${a.topic}">${TOPIC_LABEL[a.topic] || a.topic}</span>
          </div>
          <h2>${escapeHtml(a.title)}</h2>
          ${a.description ? `<p>${escapeHtml(a.description)}</p>` : ''}
        </a>
        <button class="star-btn ${starred ? 'starred' : ''}" data-id="${escapeHtml(id)}" aria-label="${starred ? 'Unstar' : 'Star'}" title="${starred ? 'Unstar' : 'Star'}">
          <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
            <path fill="currentColor" d="M12 17.27 18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/>
          </svg>
        </button>
      </article>`;
  }).join('');

  feed.innerHTML = html;

  $$('.star-btn', feed).forEach((btn) =>
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      toggleStar(btn.dataset.id);
    })
  );
}

function renderEmpty() {
  if (state.topic === 'starred') {
    return `<div class="empty">
      <span class="empty-emoji">☆</span>
      <h3>No starred articles</h3>
      <p>Tap the star on a card to save it for later.</p>
    </div>`;
  }
  if (state.articles.length && state.query) {
    return `<div class="empty">
      <span class="empty-emoji">🔍</span>
      <h3>No matches</h3>
      <p>Nothing matches “${escapeHtml(state.query)}”.</p>
    </div>`;
  }
  if (!state.articles.length && !state.loading) {
    return `<div class="empty">
      <span class="empty-emoji">📡</span>
      <h3>Couldn’t load articles</h3>
      <p>Check your connection or try again.</p>
      <button id="emptyRetry">Retry</button>
    </div>`;
  }
  return `<div class="empty">
    <span class="empty-emoji">📰</span>
    <h3>Nothing here yet</h3>
    <p>No articles in this topic.</p>
  </div>`;
}

function toggleStar(id) {
  if (state.starred.has(id)) state.starred.delete(id);
  else state.starred.add(id);
  saveStarred();
  render();
}

let toastTimer;
function toast(msg) {
  const t = $('#toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 2200);
}

function setTopic(topic) {
  state.topic = topic;
  localStorage.setItem(VIEW_KEY, topic);
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
    startY = e.touches[0].clientY;
    pulling = true;
    triggered = false;
  }, { passive: true });

  document.addEventListener('touchmove', (e) => {
    if (!pulling) return;
    const dy = e.touches[0].clientY - startY;
    if (dy > 20 && window.scrollY <= 0) {
      hint.classList.add('show');
      if (dy > threshold) triggered = true;
    } else {
      hint.classList.remove('show');
      triggered = false;
    }
  }, { passive: true });

  document.addEventListener('touchend', () => {
    if (pulling && triggered) loadAll({ force: true });
    pulling = false;
    triggered = false;
    hint.classList.remove('show');
  });
}

function setupKeyboard() {
  document.addEventListener('keydown', (e) => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    if (e.key === 'r' || e.key === 'R') {
      e.preventDefault();
      loadAll({ force: true });
    } else if (e.key === '/') {
      e.preventDefault();
      $('#search').focus();
    }
  });
}

function init() {
  const savedTheme = localStorage.getItem(THEME_KEY);
  if (savedTheme) setTheme(savedTheme);
  else setTheme(matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark');

  setTopic(state.topic);

  $('#chips').addEventListener('click', (e) => {
    const chip = e.target.closest('.chip');
    if (!chip) return;
    setTopic(chip.dataset.topic);
  });

  $('#refreshBtn').addEventListener('click', () => loadAll({ force: true }));
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

  $('#settingsDialog').addEventListener('close', () => loadAll({ force: false }));

  const search = $('#search');
  const wrap = search.parentElement;
  search.addEventListener('input', () => {
    state.query = search.value.trim();
    wrap.classList.toggle('has-value', !!state.query);
    render();
  });
  $('#clearSearch').addEventListener('click', () => {
    search.value = '';
    state.query = '';
    wrap.classList.remove('has-value');
    render();
    search.focus();
  });

  setupPullToRefresh();
  setupKeyboard();

  loadAll();

  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('sw.js').catch(() => {});
    });
  }
}

document.addEventListener('DOMContentLoaded', init);

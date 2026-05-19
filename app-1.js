'use strict';

// ======================= Config =======================

const FEEDS = [
  // AI
  { id: 'tc-ai',    topic: 'ai',      name: 'TechCrunch AI',      url: 'https://techcrunch.com/category/artificial-intelligence/feed/' },
  { id: 'verge-ai', topic: 'ai',      name: 'The Verge AI',       url: 'https://www.theverge.com/rss/ai-artificial-intelligence/index.xml' },
  { id: 'mit-ai',   topic: 'ai',      name: 'MIT Tech Review',    url: 'https://www.technologyreview.com/topic/artificial-intelligence/feed' },
  { id: 'ars-ai',   topic: 'ai',      name: 'Ars Technica AI',    url: 'https://arstechnica.com/ai/feed/' },
  { id: 'hn-ai',    topic: 'ai',      name: 'Hacker News',        url: 'https://hnrss.org/newest?q=AI+OR+LLM+OR+%22machine+learning%22&points=100' },
  { id: 'latent',   topic: 'ai',      name: 'Latent Space',       url: 'https://www.latent.space/feed' },
  { id: 'oneuse',   topic: 'ai',      name: 'One Useful Thing',   url: 'https://www.oneusefulthing.org/feed' },
  { id: 'importai', topic: 'ai',      name: 'Import AI',          url: 'https://importai.substack.com/feed' },
  { id: 'snakeoil', topic: 'ai',      name: 'AI Snake Oil',       url: 'https://www.aisnakeoil.com/feed' },

  // Fintech
  { id: 'tc-fin',   topic: 'fintech', name: 'TechCrunch Fintech', url: 'https://techcrunch.com/category/fintech/feed/' },
  { id: 'finextra', topic: 'fintech', name: 'Finextra',           url: 'https://www.finextra.com/rss/headlines.aspx' },
  { id: 'block',    topic: 'fintech', name: 'The Block',          url: 'https://www.theblock.co/rss.xml' },
  { id: 'bankdive', topic: 'fintech', name: 'Banking Dive',       url: 'https://www.bankingdive.com/feeds/news/' },
  { id: 'pymnts',   topic: 'fintech', name: 'PYMNTS',             url: 'https://www.pymnts.com/feed/' },
  { id: 'netint',   topic: 'fintech', name: 'Net Interest',       url: 'https://www.netinterest.co/feed' },
  { id: 'brain',    topic: 'fintech', name: 'Fintech Brainfood',  url: 'https://www.fintechbrainfood.com/feed' },
  { id: 'bitsmoney',topic: 'fintech', name: 'Bits about Money',   url: 'https://www.bitsaboutmoney.com/feed' },

  // Energy
  { id: 'canary',   topic: 'energy',  name: 'Canary Media',       url: 'https://www.canarymedia.com/articles/rss.xml' },
  { id: 'utildive', topic: 'energy',  name: 'Utility Dive',       url: 'https://www.utilitydive.com/feeds/news/' },
  { id: 'oilprice', topic: 'energy',  name: 'OilPrice.com',       url: 'https://oilprice.com/rss/main' },
  { id: 'heatmap',  topic: 'energy',  name: 'Heatmap News',       url: 'https://heatmap.news/feed' },
  { id: 'volts',    topic: 'energy',  name: 'Volts',              url: 'https://www.volts.wtf/feed' },
  { id: 'conphys',  topic: 'energy',  name: 'Construction Physics',url:'https://www.construction-physics.com/feed' },
];

const STOCKS_CATALOG = [
  { ticker: 'NVDA',  name: 'Nvidia',                 sector: 'ai' },
  { ticker: 'MSFT',  name: 'Microsoft',              sector: 'ai' },
  { ticker: 'GOOGL', name: 'Alphabet',               sector: 'ai' },
  { ticker: 'META',  name: 'Meta Platforms',         sector: 'ai' },
  { ticker: 'AMD',   name: 'AMD',                    sector: 'ai' },
  { ticker: 'AVGO',  name: 'Broadcom',               sector: 'ai' },
  { ticker: 'PLTR',  name: 'Palantir',               sector: 'ai' },
  { ticker: 'TSM',   name: 'TSMC',                   sector: 'ai' },
  { ticker: 'V',     name: 'Visa',                   sector: 'fintech' },
  { ticker: 'MA',    name: 'Mastercard',             sector: 'fintech' },
  { ticker: 'PYPL',  name: 'PayPal',                 sector: 'fintech' },
  { ticker: 'COIN',  name: 'Coinbase',               sector: 'fintech' },
  { ticker: 'HOOD',  name: 'Robinhood',              sector: 'fintech' },
  { ticker: 'SOFI',  name: 'SoFi',                   sector: 'fintech' },
  { ticker: 'AFRM',  name: 'Affirm',                 sector: 'fintech' },
  { ticker: 'NU',    name: 'Nu Holdings',            sector: 'fintech' },
  { ticker: 'NEE',   name: 'NextEra Energy',         sector: 'energy' },
  { ticker: 'CEG',   name: 'Constellation Energy',   sector: 'energy' },
  { ticker: 'VST',   name: 'Vistra',                 sector: 'energy' },
  { ticker: 'FSLR',  name: 'First Solar',            sector: 'energy' },
  { ticker: 'ENPH',  name: 'Enphase Energy',         sector: 'energy' },
  { ticker: 'XOM',   name: 'Exxon Mobil',            sector: 'energy' },
  { ticker: 'CVX',   name: 'Chevron',                sector: 'energy' },
  { ticker: 'TSLA',  name: 'Tesla',                  sector: 'energy' },
];

const DEFAULT_WATCHLIST = STOCKS_CATALOG.map((s) => s.ticker);

const VALUATION_DEFAULTS = {
  NVDA:  { marketCap: 3.10e12, trailingPE: 50,  forwardPE: 33,  priceToSales: 25,  priceToBook: 45, dividendYield: 0.0001, eps: 2.50, beta: 1.7 },
  MSFT:  { marketCap: 3.10e12, trailingPE: 36,  forwardPE: 31,  priceToSales: 13,  priceToBook: 11, dividendYield: 0.0072, eps: 11.8, beta: 0.9 },
  GOOGL: { marketCap: 2.10e12, trailingPE: 23,  forwardPE: 20,  priceToSales: 6.5, priceToBook: 7,  dividendYield: 0.0048, eps: 7.5,  beta: 1.0 },
  META:  { marketCap: 1.50e12, trailingPE: 27,  forwardPE: 24,  priceToSales: 9,   priceToBook: 9,  dividendYield: 0.0033, eps: 20.3, beta: 1.2 },
  AMD:   { marketCap: 2.50e11, trailingPE: 95,  forwardPE: 28,  priceToSales: 11,  priceToBook: 4,  dividendYield: 0,      eps: 1.5,  beta: 1.8 },
  AVGO:  { marketCap: 8.00e11, trailingPE: 75,  forwardPE: 32,  priceToSales: 22,  priceToBook: 17, dividendYield: 0.0120, eps: 2.2,  beta: 1.1 },
  PLTR:  { marketCap: 2.20e11, trailingPE: 240, forwardPE: 175, priceToSales: 65,  priceToBook: 50, dividendYield: 0,      eps: 0.13, beta: 2.4 },
  TSM:   { marketCap: 9.50e11, trailingPE: 28,  forwardPE: 23,  priceToSales: 11,  priceToBook: 7,  dividendYield: 0.0140, eps: 6.6,  beta: 1.1 },
  V:     { marketCap: 5.80e11, trailingPE: 32,  forwardPE: 28,  priceToSales: 17,  priceToBook: 15, dividendYield: 0.0078, eps: 9.5,  beta: 0.9 },
  MA:    { marketCap: 4.70e11, trailingPE: 38,  forwardPE: 33,  priceToSales: 17,  priceToBook: 60, dividendYield: 0.0061, eps: 13.0, beta: 1.0 },
  PYPL:  { marketCap: 7.50e10, trailingPE: 19,  forwardPE: 14,  priceToSales: 2.6, priceToBook: 4.5,dividendYield: 0,      eps: 4.0,  beta: 1.4 },
  COIN:  { marketCap: 7.50e10, trailingPE: 65,  forwardPE: 45,  priceToSales: 14,  priceToBook: 9,  dividendYield: 0,      eps: 4.7,  beta: 3.4 },
  HOOD:  { marketCap: 3.50e10, trailingPE: 65,  forwardPE: 45,  priceToSales: 15,  priceToBook: 6,  dividendYield: 0,      eps: 0.7,  beta: 2.1 },
  SOFI:  { marketCap: 1.60e10, trailingPE: 95,  forwardPE: 50,  priceToSales: 5.5, priceToBook: 2.2,dividendYield: 0,      eps: 0.16, beta: 1.9 },
  AFRM:  { marketCap: 1.80e10, trailingPE: null,forwardPE: 95,  priceToSales: 8,   priceToBook: 9,  dividendYield: 0,      eps: -0.3, beta: 3.5 },
  NU:    { marketCap: 6.50e10, trailingPE: 35,  forwardPE: 25,  priceToSales: 9,   priceToBook: 7,  dividendYield: 0,      eps: 0.4,  beta: 1.3 },
  NEE:   { marketCap: 1.65e11, trailingPE: 22,  forwardPE: 22,  priceToSales: 6.5, priceToBook: 3.3,dividendYield: 0.0270, eps: 3.6,  beta: 0.6 },
  CEG:   { marketCap: 9.00e10, trailingPE: 35,  forwardPE: 33,  priceToSales: 4,   priceToBook: 7,  dividendYield: 0.0045, eps: 8.5,  beta: 1.0 },
  VST:   { marketCap: 5.00e10, trailingPE: 28,  forwardPE: 28,  priceToSales: 3.2, priceToBook: 9,  dividendYield: 0.0050, eps: 5.4,  beta: 1.2 },
  FSLR:  { marketCap: 2.50e10, trailingPE: 17,  forwardPE: 13,  priceToSales: 4.8, priceToBook: 2.7,dividendYield: 0,      eps: 13.6, beta: 1.4 },
  ENPH:  { marketCap: 1.00e10, trailingPE: 90,  forwardPE: 32,  priceToSales: 4,   priceToBook: 7,  dividendYield: 0,      eps: 0.8,  beta: 1.9 },
  XOM:   { marketCap: 4.80e11, trailingPE: 14,  forwardPE: 13,  priceToSales: 1.4, priceToBook: 2,  dividendYield: 0.0335, eps: 7.8,  beta: 0.9 },
  CVX:   { marketCap: 2.80e11, trailingPE: 16,  forwardPE: 14,  priceToSales: 1.5, priceToBook: 1.9,dividendYield: 0.0430, eps: 9.5,  beta: 1.0 },
  TSLA:  { marketCap: 8.00e11, trailingPE: 70,  forwardPE: 90,  priceToSales: 11,  priceToBook: 14, dividendYield: 0,      eps: 3.6,  beta: 2.3 },
};

const RANGES = [
  { key: '1d',  label: '1D',  range: '1d',  interval: '5m',  long: 'Today' },
  { key: '5d',  label: '1W',  range: '5d',  interval: '30m', long: 'Past Week' },
  { key: '1mo', label: '1M',  range: '1mo', interval: '1d',  long: 'Past Month' },
  { key: '3mo', label: '3M',  range: '3mo', interval: '1d',  long: 'Past 3 Months' },
  { key: 'ytd', label: 'YTD', range: 'ytd', interval: '1d',  long: 'Year to Date' },
  { key: '1y',  label: '1Y',  range: '1y',  interval: '1d',  long: 'Past Year' },
  { key: '5y',  label: '5Y',  range: '5y',  interval: '1wk', long: 'Past 5 Years' },
];
const DEFAULT_RANGE = '5d';

const TTL_NEWS = 15 * 60 * 1000;
const TTL_STOCK = 5 * 60 * 1000;
const NEWS_CACHE_KEY = 'newsdash:cache:v2';
const STOCK_CACHE_KEY = 'newsdash:stocks:v3';
const STARRED_KEY = 'newsdash:starred:v1';
const READ_KEY = 'newsdash:read:v1';
const SETTINGS_KEY = 'newsdash:settings:v1';
const THEME_KEY = 'newsdash:theme';
const VIEW_KEY = 'newsdash:view';
const TOPIC_KEY = 'newsdash:topic';
const WATCHLIST_KEY = 'capintel:watchlist:v1';
const CUSTOM_STOCKS_KEY = 'capintel:customStocks:v1';
const PANEL_RANGE_KEY = 'capintel:panelRanges:v1';

const NEWS_PROXIES = [
  { kind: 'json', build: (url) => `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(url)}&count=30` },
  { kind: 'xml',  build: (url) => `https://corsproxy.io/?${encodeURIComponent(url)}` },
  { kind: 'xml',  build: (url) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}` },
];

const PROXY_JSON = [
  (url) => `https://corsproxy.io/?${encodeURIComponent(url)}`,
  (url) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
];

const TOPIC_LABEL = { ai: 'AI', fintech: 'Fintech', energy: 'Energy' };

// ======================= State =======================

const state = {
  view: localStorage.getItem(VIEW_KEY) || 'news',
  topic: localStorage.getItem(TOPIC_KEY) || 'all',
  query: '',
  articles: [],
  fetchedAt: 0,
  stocks: {},
  stocksFetchedAt: 0,
  starred: new Set(JSON.parse(localStorage.getItem(STARRED_KEY) || '[]')),
  read: new Map(Object.entries(JSON.parse(localStorage.getItem(READ_KEY) || '{}'))),
  settings: loadSettings(),
  loading: false,
  errors: [],
  keyboardIdx: -1,
  watchlist: loadWatchlist(),
  customStocks: JSON.parse(localStorage.getItem(CUSTOM_STOCKS_KEY) || '{}'),
  panelRange: JSON.parse(localStorage.getItem(PANEL_RANGE_KEY) || '{}'),
  searchResults: [],
  searching: false,
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
function loadWatchlist() {
  try {
    const saved = JSON.parse(localStorage.getItem(WATCHLIST_KEY) || 'null');
    if (Array.isArray(saved) && saved.length) return saved;
  } catch {}
  return [...DEFAULT_WATCHLIST];
}
function saveSettings()      { localStorage.setItem(SETTINGS_KEY, JSON.stringify(state.settings)); }
function saveStarred()       { localStorage.setItem(STARRED_KEY, JSON.stringify([...state.starred])); }
function saveWatchlist()     { localStorage.setItem(WATCHLIST_KEY, JSON.stringify(state.watchlist)); }
function saveCustomStocks()  { localStorage.setItem(CUSTOM_STOCKS_KEY, JSON.stringify(state.customStocks)); }
function savePanelRanges()   { localStorage.setItem(PANEL_RANGE_KEY, JSON.stringify(state.panelRange)); }
function saveRead() {
  const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
  for (const [k, v] of state.read) if (v < cutoff) state.read.delete(k);
  localStorage.setItem(READ_KEY, JSON.stringify(Object.fromEntries(state.read)));
}

function tickerMeta(ticker) {
  return STOCKS_CATALOG.find((s) => s.ticker === ticker)
      || state.customStocks[ticker]
      || { ticker, name: ticker, sector: null };
}

// ======================= Utilities =======================

const $  = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
function stripHtml(html) {
  if (!html) return '';
  const tmp = document.createElement('div');
  tmp.innerHTML = html;
  return (tmp.textContent || tmp.innerText || '').replace(/\s+/g, ' ').trim();
}
function articleId(a) { return a.link || a.guid || `${a.source}:${a.title}`; }
function originOf(link) { try { return new URL(link).origin; } catch { return ''; } }
function faviconUrl(link) {
  const origin = originOf(link);
  if (!origin) return '';
  return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(origin)}&sz=64`;
}
function relativeTime(iso) {
  if (!iso) return '';
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return '';
  const diff = Date.now() - t;
  const min = 60000, hr = 60 * min, day = 24 * hr;
  if (diff < min) return 'just now';
  if (diff < hr) return `${Math.floor(diff / min)}m ago`;
  if (diff < day) return `${Math.floor(diff / hr)}h ago`;
  if (diff < 7 * day) return `${Math.floor(diff / day)}d ago`;
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}
function dateBucket(iso) {
  if (!iso) return 'Earlier';
  const t = new Date(iso);
  if (Number.isNaN(t.getTime())) return 'Earlier';
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const y = new Date(today); y.setDate(y.getDate() - 1);
  const w = new Date(today); w.setDate(w.getDate() - 7);
  if (t >= today) return 'Today';
  if (t >= y) return 'Yesterday';
  if (t >= w) return 'This week';
  return 'Earlier';
}
function formatBig(n) {
  if (n == null || !Number.isFinite(n)) return '—';
  const abs = Math.abs(n);
  if (abs >= 1e12) return (n / 1e12).toFixed(2) + 'T';
  if (abs >= 1e9)  return (n / 1e9).toFixed(2) + 'B';
  if (abs >= 1e6)  return (n / 1e6).toFixed(2) + 'M';
  if (abs >= 1e3)  return (n / 1e3).toFixed(2) + 'K';
  return String(Math.round(n));
}
function formatPrice(n) {
  if (n == null || !Number.isFinite(n)) return '—';
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function fmtNum(n, digits = 1) {
  if (n == null || !Number.isFinite(n)) return '—';
  return n.toFixed(digits);
}

function debounce(fn, ms) {
  let t;
  return function (...args) {
    clearTimeout(t);
    t = setTimeout(() => fn.apply(this, args), ms);
  };
}

// ======================= Cache =======================

function readNewsCache() {
  try {
    const c = JSON.parse(localStorage.getItem(NEWS_CACHE_KEY) || 'null');
    if (!c || !Array.isArray(c.articles) || !c.articles.length) return null;
    return c;
  } catch { return null; }
}
function writeNewsCache(articles) {
  if (!articles || !articles.length) return;
  try { localStorage.setItem(NEWS_CACHE_KEY, JSON.stringify({ articles, fetchedAt: Date.now() })); } catch {}
}
function readStockCache() {
  try {
    const c = JSON.parse(localStorage.getItem(STOCK_CACHE_KEY) || 'null');
    if (!c || !c.stocks) return null;
    return c;
  } catch { return null; }
}
function writeStockCache(stocks) {
  if (!stocks || !Object.keys(stocks).length) return;
  try { localStorage.setItem(STOCK_CACHE_KEY, JSON.stringify({ stocks, fetchedAt: Date.now() })); } catch {}
}

// ======================= News fetching =======================

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
    let thumbnail = '';
    const mediaThumb = n.getElementsByTagName('media:thumbnail')[0] || n.getElementsByTagName('thumbnail')[0];
    if (mediaThumb) thumbnail = mediaThumb.getAttribute('url') || '';
    if (!thumbnail) {
      const mediaContent = n.getElementsByTagName('media:content')[0];
      if (mediaContent && (mediaContent.getAttribute('medium') || '').startsWith('image')) {
        thumbnail = mediaContent.getAttribute('url') || '';
      }
    }
    if (!thumbnail) {
      const enclosure = n.getElementsByTagName('enclosure')[0];
      if (enclosure && (enclosure.getAttribute('type') || '').startsWith('image')) {
        thumbnail = enclosure.getAttribute('url') || '';
      }
    }
    out.push({
      title: text('title'),
      link,
      description: text(isAtom ? 'summary' : 'description') || text('content'),
      pubDate: text(isAtom ? 'updated' : 'pubDate') || text('published') || text('dc:date'),
      guid: text(isAtom ? 'id' : 'guid') || link,
      thumbnail,
    });
  }
  return out;
}

function extractImageFromHtml(html) {
  if (!html) return '';
  const m = html.match(/<img[^>]+src=["']([^"']+)["']/i);
  return m ? m[1] : '';
}

async function fetchViaProxy(feed, proxy) {
  const res = await fetch(proxy.build(feed.url), { cache: 'no-store' });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  if (proxy.kind === 'json') {
    const data = await res.json();
    if (data.status !== 'ok' || !Array.isArray(data.items)) throw new Error(data.message || 'bad response');
    return data.items.map((it) => ({
      title: it.title,
      link: it.link,
      description: it.description || it.content || '',
      pubDate: it.pubDate || null,
      guid: it.guid || it.link,
      thumbnail: it.thumbnail || it.enclosure?.link || '',
    }));
  }
  const text = await res.text();
  return parseRssXml(text);
}

function extractHnPoints(description) {
  if (!description) return 0;
  const m = String(description).match(/Points:\s*(\d+)/i);
  return m ? parseInt(m[1], 10) : 0;
}

async function fetchFeed(feed) {
  let lastErr;
  for (const proxy of NEWS_PROXIES) {
    try {
      const items = await fetchViaProxy(feed, proxy);
      return items.map((it) => ({
        title: stripHtml(it.title),
        link: it.link,
        description: stripHtml(it.description || '').slice(0, 240),
        publishedAt: it.pubDate || null,
        source: feed.name,
        sourceId: feed.id,
        topic: feed.topic,
        guid: it.guid || it.link,
        thumbnail: it.thumbnail || extractImageFromHtml(it.description) || '',
        points: extractHnPoints(it.description),
      })).filter((a) => a.title && a.link);
    } catch (e) {
      lastErr = e;
      state.errors.push(`${feed.name} via ${proxy.kind}: ${e.message}`);
    }
  }
  throw lastErr || new Error('all proxies failed');
}

let renderScheduled = false;
function scheduleRender() {
  if (renderScheduled) return;
  renderScheduled = true;
  requestAnimationFrame(() => { renderScheduled = false; render(); });
}

async function loadNews({ force = false } = {}) {
  if (state.loading) return;
  const cached = readNewsCache();
  if (!force && cached && Date.now() - cached.fetchedAt < TTL_NEWS) {
    state.articles = cached.articles;
    state.fetchedAt = cached.fetchedAt;
    render();
    return;
  }

  state.loading = true;
  state.errors = [];
  if (!state.articles.length) {
    if (cached) {
      state.articles = cached.articles;
      state.fetchedAt = cached.fetchedAt;
      render();
    } else {
      renderSkeletons();
    }
  }
  setSpinner(true);

  const enabled = FEEDS.filter((f) => state.settings[f.id]);
  const buffer = new Map();
  for (const a of state.articles) buffer.set(a.link || a.guid, a);

  let failures = 0;

  await Promise.all(enabled.map(async (feed) => {
    try {
      const items = await fetchFeed(feed);
      for (const a of items) buffer.set(a.link || a.guid, a);
      const merged = [...buffer.values()].sort(
        (a, b) => new Date(b.publishedAt || 0) - new Date(a.publishedAt || 0)
      );
      state.articles = merged;
      scheduleRender();
    } catch {
      failures++;
    }
  }));

  if (state.articles.length) {
    state.fetchedAt = Date.now();
    writeNewsCache(state.articles);
    if (failures && failures < enabled.length) toast(`${failures} source${failures > 1 ? 's' : ''} failed`);
    else if (failures === enabled.length) toast('All sources failed');
  }

  state.loading = false;
  setSpinner(false);
  render();
}

// ======================= Clustering =======================

const STOP_WORDS = new Set([
  'the','a','an','and','or','but','to','of','in','on','for','with','at','by','from',
  'is','are','was','were','be','been','as','it','its','that','this','these','those',
  'has','have','had','will','would','could','should','can','may','about','after',
  'over','under','into','out','says','said','new','how','why','what','when','who',
]);

function titleTokens(t) {
  return new Set(
    String(t || '')
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter((w) => w.length > 2 && !STOP_WORDS.has(w))
  );
}

function jaccard(a, b) {
  if (!a.size || !b.size) return 0;
  let inter = 0;
  for (const x of a) if (b.has(x)) inter++;
  return inter / (a.size + b.size - inter);
}

function clusterArticles(articles) {
  const tokens = articles.map((a) => titleTokens(a.title));
  const used = new Set();
  const clusters = [];
  for (let i = 0; i < articles.length; i++) {
    if (used.has(i)) continue;
    used.add(i);
    const group = [articles[i]];
    for (let j = i + 1; j < articles.length; j++) {
      if (used.has(j)) continue;
      if (jaccard(tokens[i], tokens[j]) >= 0.55) {
        group.push(articles[j]);
        used.add(j);
      }
    }
    group.sort((a, b) => new Date(b.publishedAt || 0) - new Date(a.publishedAt || 0));
    clusters.push(group);
  }
  return clusters;
}

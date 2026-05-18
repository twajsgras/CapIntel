'use strict';

// ======================= Config =======================

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
  { id: 'heatmap',  topic: 'energy',  name: 'Heatmap News',       url: 'https://heatmap.news/feed' },
  { id: 'rtrs-en',  topic: 'energy',  name: 'Reuters Energy',     url: 'https://www.reutersagency.com/feed/?best-sectors=energy&post_type=best' },
];

const STOCKS = [
  // AI
  { ticker: 'NVDA',  name: 'Nvidia',                 sector: 'ai' },
  { ticker: 'MSFT',  name: 'Microsoft',              sector: 'ai' },
  { ticker: 'GOOGL', name: 'Alphabet',               sector: 'ai' },
  { ticker: 'META',  name: 'Meta Platforms',         sector: 'ai' },
  { ticker: 'AMD',   name: 'AMD',                    sector: 'ai' },
  { ticker: 'AVGO',  name: 'Broadcom',               sector: 'ai' },
  { ticker: 'PLTR',  name: 'Palantir',               sector: 'ai' },
  { ticker: 'TSM',   name: 'TSMC',                   sector: 'ai' },
  // Fintech
  { ticker: 'V',     name: 'Visa',                   sector: 'fintech' },
  { ticker: 'MA',    name: 'Mastercard',             sector: 'fintech' },
  { ticker: 'PYPL',  name: 'PayPal',                 sector: 'fintech' },
  { ticker: 'COIN',  name: 'Coinbase',               sector: 'fintech' },
  { ticker: 'HOOD',  name: 'Robinhood',              sector: 'fintech' },
  { ticker: 'SOFI',  name: 'SoFi',                   sector: 'fintech' },
  { ticker: 'AFRM',  name: 'Affirm',                 sector: 'fintech' },
  { ticker: 'NU',    name: 'Nu Holdings',            sector: 'fintech' },
  // Energy
  { ticker: 'NEE',   name: 'NextEra Energy',         sector: 'energy' },
  { ticker: 'CEG',   name: 'Constellation Energy',   sector: 'energy' },
  { ticker: 'VST',   name: 'Vistra',                 sector: 'energy' },
  { ticker: 'FSLR',  name: 'First Solar',            sector: 'energy' },
  { ticker: 'ENPH',  name: 'Enphase Energy',         sector: 'energy' },
  { ticker: 'XOM',   name: 'Exxon Mobil',            sector: 'energy' },
  { ticker: 'CVX',   name: 'Chevron',                sector: 'energy' },
  { ticker: 'TSLA',  name: 'Tesla',                  sector: 'energy' },
];

const RANGES = [
  { key: '1d', label: '1D', range: '1d',  interval: '5m'  },
  { key: '5d', label: '1W', range: '5d',  interval: '30m' },
  { key: '1mo', label: '1M', range: '1mo', interval: '1d'  },
  { key: '3mo', label: '3M', range: '3mo', interval: '1d'  },
  { key: '1y',  label: '1Y', range: '1y',  interval: '1wk' },
];

const TTL_NEWS = 15 * 60 * 1000;
const TTL_STOCK = 5 * 60 * 1000;
const NEWS_CACHE_KEY = 'newsdash:cache:v2';
const STOCK_CACHE_KEY = 'newsdash:stocks:v1';
const STARRED_KEY = 'newsdash:starred:v1';
const STARRED_STOCKS_KEY = 'newsdash:starredStocks:v1';
const READ_KEY = 'newsdash:read:v1';
const SETTINGS_KEY = 'newsdash:settings:v1';
const THEME_KEY = 'newsdash:theme';
const VIEW_KEY = 'newsdash:view';
const TOPIC_KEY = 'newsdash:topic';

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
  starredStocks: new Set(JSON.parse(localStorage.getItem(STARRED_STOCKS_KEY) || '[]')),
  read: new Map(Object.entries(JSON.parse(localStorage.getItem(READ_KEY) || '{}'))),
  settings: loadSettings(),
  loading: false,
  errors: [],
  expandedTicker: null,
  expandedRange: '1mo',
  keyboardIdx: -1,
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
function saveSettings()       { localStorage.setItem(SETTINGS_KEY, JSON.stringify(state.settings)); }
function saveStarred()        { localStorage.setItem(STARRED_KEY, JSON.stringify([...state.starred])); }
function saveStarredStocks()  { localStorage.setItem(STARRED_STOCKS_KEY, JSON.stringify([...state.starredStocks])); }
function saveRead() {
  const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
  for (const [k, v] of state.read) if (v < cutoff) state.read.delete(k);
  localStorage.setItem(READ_KEY, JSON.stringify(Object.fromEntries(state.read)));
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

  let completed = 0;
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
    } finally {
      completed++;
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

// ======================= Stock fetching =======================

async function fetchJsonViaProxies(url) {
  let lastErr;
  for (const proxy of PROXY_JSON) {
    try {
      const res = await fetch(proxy(url), { cache: 'no-store' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (e) { lastErr = e; }
  }
  throw lastErr || new Error('all proxies failed');
}

function summarizeChart(result) {
  const meta = result.meta || {};
  const ts = result.timestamp || [];
  const closes = result.indicators?.quote?.[0]?.close || [];
  const points = [];
  for (let i = 0; i < ts.length; i++) {
    if (closes[i] != null) points.push({ t: ts[i] * 1000, c: closes[i] });
  }
  return {
    price: meta.regularMarketPrice,
    prevClose: meta.chartPreviousClose ?? meta.previousClose,
    currency: meta.currency || 'USD',
    fiftyTwoWeekHigh: meta.fiftyTwoWeekHigh,
    fiftyTwoWeekLow: meta.fiftyTwoWeekLow,
    volume: meta.regularMarketVolume,
    exchange: meta.exchangeName,
    points,
    fetchedAt: Date.now(),
  };
}

async function fetchStockChart(ticker, range = '1mo', interval = '1d') {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?interval=${interval}&range=${range}&includePrePost=false`;
  const data = await fetchJsonViaProxies(url);
  const result = data?.chart?.result?.[0];
  if (!result) throw new Error('no chart data');
  return summarizeChart(result);
}

async function loadStocks({ force = false } = {}) {
  const cached = readStockCache();
  if (!force && cached && Date.now() - cached.fetchedAt < TTL_STOCK) {
    state.stocks = cached.stocks;
    state.stocksFetchedAt = cached.fetchedAt;
    if (state.view === 'stocks') render();
    return;
  }
  if (cached && !Object.keys(state.stocks).length) {
    state.stocks = cached.stocks;
    state.stocksFetchedAt = cached.fetchedAt;
    if (state.view === 'stocks') render();
  }
  setSpinner(true);
  let failures = 0;
  await Promise.all(STOCKS.map(async (s) => {
    try {
      const summary = await fetchStockChart(s.ticker, '1mo', '1d');
      state.stocks[s.ticker] = { ...s, ...summary };
      if (state.view === 'stocks') scheduleRender();
    } catch {
      failures++;
    }
  }));
  state.stocksFetchedAt = Date.now();
  writeStockCache(state.stocks);
  setSpinner(false);
  if (failures && failures < STOCKS.length) toast(`${failures} ticker${failures > 1 ? 's' : ''} failed`);
  else if (failures === STOCKS.length) toast('Stock data unavailable');
  if (state.view === 'stocks') render();
}

async function fetchStockRange(ticker, rangeKey) {
  const cfg = RANGES.find((r) => r.key === rangeKey) || RANGES[2];
  return fetchStockChart(ticker, cfg.range, cfg.interval);
}

// ======================= SVG charts =======================

function pathFromPoints(points, w, h, pad = 2) {
  if (!points.length) return { line: '', area: '' };
  const ys = points.map((p) => p.c);
  const min = Math.min(...ys);
  const max = Math.max(...ys);
  const range = max - min || 1;
  const stepX = (w - 2 * pad) / Math.max(points.length - 1, 1);
  const coords = points.map((p, i) => {
    const x = pad + i * stepX;
    const y = pad + (h - 2 * pad) * (1 - (p.c - min) / range);
    return [x, y];
  });
  const line = coords.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(2)} ${y.toFixed(2)}`).join(' ');
  const area = line + ` L${coords[coords.length - 1][0].toFixed(2)} ${(h - pad).toFixed(2)} L${pad} ${(h - pad).toFixed(2)} Z`;
  return { line, area, min, max };
}

function sparklineSvg(points, color) {
  const w = 120, h = 36;
  const { line } = pathFromPoints(points, w, h, 2);
  if (!line) return `<svg class="spark" viewBox="0 0 ${w} ${h}"></svg>`;
  return `<svg class="spark" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none">
    <path d="${line}" fill="none" stroke="${color}" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>`;
}

function fullChartSvg(points, color) {
  const w = 800, h = 280, pad = 8;
  const { line, area, min, max } = pathFromPoints(points, w, h, pad);
  if (!line) return '';
  const gradId = `g-${Math.random().toString(36).slice(2, 8)}`;
  return `<svg class="chart-svg" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none">
    <defs>
      <linearGradient id="${gradId}" x1="0" x2="0" y1="0" y2="1">
        <stop offset="0%" stop-color="${color}" stop-opacity="0.32"/>
        <stop offset="100%" stop-color="${color}" stop-opacity="0"/>
      </linearGradient>
    </defs>
    <path d="${area}" fill="url(#${gradId})"/>
    <path d="${line}" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>
  <div class="chart-axis"><span>${formatPrice(min)}</span><span>${formatPrice(max)}</span></div>`;
}

// ======================= Render =======================

function visibleArticles() {
  let list = state.articles;
  if (state.topic === 'starred') list = list.filter((a) => state.starred.has(articleId(a)));
  else if (state.topic !== 'all') list = list.filter((a) => a.topic === state.topic);
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

function visibleStocks() {
  let list = STOCKS.map((s) => state.stocks[s.ticker] || { ...s, points: [] });
  if (state.topic === 'starred') list = list.filter((s) => state.starredStocks.has(s.ticker));
  else if (state.topic !== 'all') list = list.filter((s) => s.sector === state.topic);
  if (state.query) {
    const q = state.query.toLowerCase();
    list = list.filter((s) =>
      s.ticker.toLowerCase().includes(q) ||
      s.name.toLowerCase().includes(q)
    );
  }
  return list;
}

function renderSkeletons() {
  const feed = $('#feed');
  feed.innerHTML = '';
  feed.className = 'feed feed-news';
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

function renderStockSkeletons() {
  const feed = $('#feed');
  feed.innerHTML = '';
  feed.className = 'feed feed-stocks';
  for (let i = 0; i < 8; i++) {
    const sk = document.createElement('div');
    sk.className = 'skeleton stock-skel';
    sk.innerHTML = `<div class="sk-line short"></div><div class="sk-line title"></div><div class="sk-spark"></div>`;
    feed.appendChild(sk);
  }
}

function renderEmpty(view) {
  if (view === 'stocks') {
    if (state.topic === 'starred') {
      return `<div class="empty"><span class="empty-emoji">☆</span><h3>No starred stocks</h3><p>Tap a stock’s star to add it here.</p></div>`;
    }
    if (state.query) {
      return `<div class="empty"><span class="empty-emoji">🔍</span><h3>No matches</h3><p>Nothing matches “${escapeHtml(state.query)}”.</p></div>`;
    }
    const sample = state.errors.slice(0, 3).map(escapeHtml).join('<br>');
    return `<div class="empty">
      <span class="empty-emoji">📊</span>
      <h3>Couldn’t load stocks</h3>
      <p>Yahoo Finance proxy fetch failed.</p>
      <button id="emptyRetry">Retry</button>
      ${sample ? `<details class="err-details"><summary>Show errors</summary><pre>${sample}</pre></details>` : ''}
    </div>`;
  }
  if (state.topic === 'starred') {
    return `<div class="empty"><span class="empty-emoji">☆</span><h3>No starred articles</h3><p>Tap the star on a card to save it for later.</p></div>`;
  }
  if (state.articles.length && state.query) {
    return `<div class="empty"><span class="empty-emoji">🔍</span><h3>No matches</h3><p>Nothing matches “${escapeHtml(state.query)}”.</p></div>`;
  }
  if (!state.articles.length && !state.loading) {
    const sample = state.errors.slice(0, 3).map(escapeHtml).join('<br>');
    return `<div class="empty">
      <span class="empty-emoji">📡</span>
      <h3>Couldn’t load articles</h3>
      <p>All proxies failed.</p>
      <button id="emptyRetry">Retry</button>
      ${sample ? `<details class="err-details"><summary>Show errors</summary><pre>${sample}</pre></details>` : ''}
    </div>`;
  }
  return `<div class="empty"><span class="empty-emoji">📰</span><h3>Nothing here yet</h3><p>No articles in this topic.</p></div>`;
}

function newsCardHtml(primary, others) {
  const id = articleId(primary);
  const starred = state.starred.has(id);
  const read = state.read.has(id);
  const fav = faviconUrl(primary.link);
  const moreCount = others.length;
  const moreLabel = moreCount ? `<span class="more-srcs">+ ${moreCount} more</span>` : '';
  const thumb = primary.thumbnail
    ? `<img class="thumb" src="${escapeHtml(primary.thumbnail)}" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.remove()"/>`
    : '';
  return `
    <article class="card-wrap ${read ? 'is-read' : ''}" data-id="${escapeHtml(id)}" data-link="${escapeHtml(primary.link)}">
      <a class="card ${thumb ? 'has-thumb' : ''}" href="${escapeHtml(primary.link)}" target="_blank" rel="noopener noreferrer">
        ${thumb}
        <div class="card-body">
          <div class="card-meta">
            <img class="favicon" src="${escapeHtml(fav)}" alt="" loading="lazy" onerror="this.style.visibility='hidden'"/>
            <span class="source">${escapeHtml(primary.source)}</span>
            <span class="dot">·</span>
            <span class="time">${escapeHtml(relativeTime(primary.publishedAt))}</span>
            <span class="topic-pill topic-${primary.topic}">${TOPIC_LABEL[primary.topic] || primary.topic}</span>
          </div>
          <h2>${escapeHtml(primary.title)}</h2>
          ${primary.description ? `<p>${escapeHtml(primary.description)}</p>` : ''}
          ${moreLabel}
        </div>
      </a>
      <div class="card-actions">
        <button class="icon-mini share-btn" data-link="${escapeHtml(primary.link)}" data-title="${escapeHtml(primary.title)}" aria-label="Share" title="Share">
          <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path fill="currentColor" d="M18 16.08a3 3 0 0 0-2.4 1.2l-7.6-4.42a3 3 0 0 0 0-1.72l7.6-4.42A3 3 0 1 0 14.92 4l-7.6 4.42a3 3 0 1 0 0 7.16l7.6 4.42A3 3 0 1 0 18 16.08z"/></svg>
        </button>
        <button class="icon-mini star-btn ${starred ? 'starred' : ''}" data-id="${escapeHtml(id)}" aria-label="${starred ? 'Unstar' : 'Star'}" title="${starred ? 'Unstar' : 'Star'}">
          <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path fill="currentColor" d="M12 17.27 18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/></svg>
        </button>
      </div>
    </article>`;
}

function renderNews() {
  const feed = $('#feed');
  feed.className = 'feed feed-news';
  const list = visibleArticles();
  if (!list.length) {
    feed.innerHTML = renderEmpty('news');
    const retry = $('#emptyRetry');
    if (retry) retry.addEventListener('click', () => loadNews({ force: true }));
    return;
  }

  const showGroups = !state.query && state.topic !== 'starred';
  let html = '';
  let lastBucket = '';
  const clusters = clusterArticles(list);
  for (const group of clusters) {
    const primary = group[0];
    const others = group.slice(1);
    if (showGroups) {
      const bucket = dateBucket(primary.publishedAt);
      if (bucket !== lastBucket) {
        html += `<h3 class="date-header">${bucket}</h3>`;
        lastBucket = bucket;
      }
    }
    html += newsCardHtml(primary, others);
  }
  feed.innerHTML = html;
  attachNewsHandlers(feed);
}

function attachNewsHandlers(feed) {
  $$('.star-btn', feed).forEach((btn) =>
    btn.addEventListener('click', (e) => {
      e.preventDefault(); e.stopPropagation();
      const id = btn.dataset.id;
      if (state.starred.has(id)) state.starred.delete(id);
      else state.starred.add(id);
      saveStarred();
      render();
    })
  );
  $$('.share-btn', feed).forEach((btn) =>
    btn.addEventListener('click', async (e) => {
      e.preventDefault(); e.stopPropagation();
      const url = btn.dataset.link;
      const title = btn.dataset.title;
      if (navigator.share) {
        try { await navigator.share({ title, url }); } catch {}
      } else if (navigator.clipboard) {
        try { await navigator.clipboard.writeText(url); toast('Link copied'); } catch {}
      }
    })
  );
  $$('.card', feed).forEach((a) =>
    a.addEventListener('click', () => {
      const wrap = a.closest('.card-wrap');
      if (!wrap) return;
      const id = wrap.dataset.id;
      state.read.set(id, Date.now());
      saveRead();
      wrap.classList.add('is-read');
    })
  );
}

function stockCardHtml(s) {
  const starred = state.starredStocks.has(s.ticker);
  const change = (s.price != null && s.prevClose != null) ? (s.price - s.prevClose) : null;
  const changePct = (change != null && s.prevClose) ? (change / s.prevClose) * 100 : null;
  const isUp = change != null ? change >= 0 : null;
  const color = isUp == null ? 'var(--muted)' : isUp ? 'var(--up)' : 'var(--down)';
  const changeStr = change != null
    ? `${isUp ? '+' : ''}${change.toFixed(2)} (${isUp ? '+' : ''}${changePct.toFixed(2)}%)`
    : '—';
  const points = (s.points || []).slice(-22);
  return `
    <div class="stock-card" data-ticker="${escapeHtml(s.ticker)}">
      <div class="stock-head">
        <div>
          <div class="stock-ticker">${escapeHtml(s.ticker)}</div>
          <div class="stock-name">${escapeHtml(s.name)}</div>
        </div>
        <button class="icon-mini star-btn ${starred ? 'starred' : ''}" data-ticker="${escapeHtml(s.ticker)}" aria-label="${starred ? 'Unstar' : 'Star'}">
          <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path fill="currentColor" d="M12 17.27 18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/></svg>
        </button>
      </div>
      <div class="stock-body">
        <div class="stock-price-wrap">
          <div class="stock-price">${formatPrice(s.price)}</div>
          <div class="stock-change" style="color:${color}">${changeStr}</div>
        </div>
        <div class="stock-spark" style="color:${color}">${sparklineSvg(points, 'currentColor')}</div>
      </div>
      <div class="stock-foot">
        <span class="topic-pill topic-${s.sector}">${TOPIC_LABEL[s.sector]}</span>
        <span class="stock-range">${formatPrice(s.fiftyTwoWeekLow)} – ${formatPrice(s.fiftyTwoWeekHigh)} <span class="muted">(52w)</span></span>
      </div>
    </div>`;
}

function renderStocks() {
  const feed = $('#feed');
  feed.className = 'feed feed-stocks';
  const list = visibleStocks();
  if (!list.length || list.every((s) => !s.points || !s.points.length)) {
    if (!Object.keys(state.stocks).length) {
      renderStockSkeletons();
      return;
    }
    feed.innerHTML = renderEmpty('stocks');
    const retry = $('#emptyRetry');
    if (retry) retry.addEventListener('click', () => loadStocks({ force: true }));
    return;
  }
  feed.innerHTML = list.map(stockCardHtml).join('');
  $$('.stock-card', feed).forEach((card) => {
    card.addEventListener('click', (e) => {
      if (e.target.closest('.star-btn')) return;
      openStock(card.dataset.ticker);
    });
  });
  $$('.star-btn', feed).forEach((btn) =>
    btn.addEventListener('click', (e) => {
      e.preventDefault(); e.stopPropagation();
      const t = btn.dataset.ticker;
      if (state.starredStocks.has(t)) state.starredStocks.delete(t);
      else state.starredStocks.add(t);
      saveStarredStocks();
      render();
    })
  );
}

async function openStock(ticker) {
  state.expandedTicker = ticker;
  state.expandedRange = '1mo';
  const dlg = $('#stockDialog');
  renderExpandedStock();
  dlg.showModal();
  await refreshExpandedRange();
}

async function refreshExpandedRange() {
  const ticker = state.expandedTicker;
  if (!ticker) return;
  const inner = $('#stockInner');
  inner.classList.add('loading-range');
  try {
    const data = await fetchStockRange(ticker, state.expandedRange);
    const existing = state.stocks[ticker] || {};
    state.stocks[ticker] = {
      ...existing,
      price: data.price,
      prevClose: data.prevClose,
      fiftyTwoWeekHigh: data.fiftyTwoWeekHigh,
      fiftyTwoWeekLow: data.fiftyTwoWeekLow,
      volume: data.volume,
      exchange: data.exchange,
      currency: data.currency,
      _rangePoints: { ...(existing._rangePoints || {}), [state.expandedRange]: data.points },
    };
    renderExpandedStock();
  } catch {
    toast('Couldn’t load chart');
  } finally {
    inner.classList.remove('loading-range');
  }
}

function renderExpandedStock() {
  const ticker = state.expandedTicker;
  if (!ticker) return;
  const s = state.stocks[ticker] || STOCKS.find((x) => x.ticker === ticker);
  if (!s) return;
  const points = (s._rangePoints && s._rangePoints[state.expandedRange]) || s.points || [];
  const change = (s.price != null && s.prevClose != null) ? (s.price - s.prevClose) : null;
  const changePct = (change != null && s.prevClose) ? (change / s.prevClose) * 100 : null;
  const isUp = change != null ? change >= 0 : null;
  const color = isUp == null ? 'var(--muted)' : isUp ? 'var(--up)' : 'var(--down)';
  const changeStr = change != null
    ? `${isUp ? '+' : ''}${change.toFixed(2)} (${isUp ? '+' : ''}${changePct.toFixed(2)}%) today`
    : '—';
  const starred = state.starredStocks.has(ticker);

  $('#stockInner').innerHTML = `
    <header class="stock-dialog-header">
      <div>
        <div class="stock-dialog-ticker">${escapeHtml(ticker)} <span class="topic-pill topic-${s.sector}">${TOPIC_LABEL[s.sector]}</span></div>
        <div class="stock-dialog-name">${escapeHtml(s.name)} <span class="muted">· ${escapeHtml(s.exchange || '')}</span></div>
      </div>
      <div class="stock-dialog-actions">
        <button class="icon-btn star-dialog-btn ${starred ? 'starred' : ''}" data-ticker="${escapeHtml(ticker)}" aria-label="${starred ? 'Unstar' : 'Star'}">
          <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path fill="currentColor" d="M12 17.27 18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/></svg>
        </button>
        <button class="icon-btn" id="closeStockBtn" aria-label="Close">×</button>
      </div>
    </header>
    <div class="stock-dialog-price">
      <div class="big-price">$${formatPrice(s.price)}</div>
      <div class="big-change" style="color:${color}">${changeStr}</div>
    </div>
    <div class="range-tabs">
      ${RANGES.map((r) => `<button class="range-tab ${r.key === state.expandedRange ? 'active' : ''}" data-range="${r.key}">${r.label}</button>`).join('')}
    </div>
    <div class="chart-box" style="color:${color}">
      ${points.length ? fullChartSvg(points, 'currentColor') : '<div class="chart-empty">No data</div>'}
    </div>
    <div class="stat-grid">
      <div class="stat"><div class="stat-label">52w Low</div><div class="stat-value">$${formatPrice(s.fiftyTwoWeekLow)}</div></div>
      <div class="stat"><div class="stat-label">52w High</div><div class="stat-value">$${formatPrice(s.fiftyTwoWeekHigh)}</div></div>
      <div class="stat"><div class="stat-label">Volume</div><div class="stat-value">${formatBig(s.volume)}</div></div>
      <div class="stat"><div class="stat-label">Prev close</div><div class="stat-value">$${formatPrice(s.prevClose)}</div></div>
    </div>
  `;

  $('#closeStockBtn').addEventListener('click', () => $('#stockDialog').close());
  $('.star-dialog-btn').addEventListener('click', () => {
    const t = state.expandedTicker;
    if (state.starredStocks.has(t)) state.starredStocks.delete(t);
    else state.starredStocks.add(t);
    saveStarredStocks();
    renderExpandedStock();
    if (state.view === 'stocks') render();
  });
  $$('.range-tab').forEach((btn) =>
    btn.addEventListener('click', () => {
      state.expandedRange = btn.dataset.range;
      renderExpandedStock();
      refreshExpandedRange();
    })
  );
}

function render() {
  $('#search').placeholder = state.view === 'stocks' ? 'Filter by ticker or name…' : 'Filter loaded articles…';
  const starredChip = $('.chip-starred');
  if (starredChip) starredChip.style.display = '';
  if (state.view === 'stocks') renderStocks();
  else renderNews();
}

function setSpinner(on) {
  const btn = $('#refreshBtn');
  btn.classList.toggle('spinning', on);
  btn.disabled = on;
}

let toastTimer;
function toast(msg) {
  const t = $('#toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 2200);
}

// ======================= Event setup =======================

function setView(view) {
  state.view = view;
  localStorage.setItem(VIEW_KEY, view);
  $$('.seg-btn').forEach((b) => b.classList.toggle('active', b.dataset.view === view));
  if (view === 'stocks' && !Object.keys(state.stocks).length) loadStocks();
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
  const sel = state.view === 'stocks' ? '.stock-card' : '.card-wrap';
  const els = $$(sel);
  if (!els.length) return;
  state.keyboardIdx = Math.max(0, Math.min(els.length - 1, state.keyboardIdx + delta));
  els.forEach((el, i) => el.classList.toggle('focused', i === state.keyboardIdx));
  els[state.keyboardIdx].scrollIntoView({ block: 'nearest', behavior: 'smooth' });
}

function openCursor() {
  const sel = state.view === 'stocks' ? '.stock-card' : '.card-wrap';
  const els = $$(sel);
  const el = els[state.keyboardIdx];
  if (!el) return;
  if (state.view === 'stocks') openStock(el.dataset.ticker);
  else {
    const link = el.dataset.link;
    if (link) window.open(link, '_blank', 'noopener');
  }
}

function refresh() {
  if (state.view === 'stocks') loadStocks({ force: true });
  else loadNews({ force: true });
}

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
    render();
  });
  $('#clearSearch').addEventListener('click', () => {
    search.value = ''; state.query = '';
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

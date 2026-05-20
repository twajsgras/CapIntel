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

async function fetchStockChart(ticker, rangeKey) {
  const cfg = RANGES.find((r) => r.key === rangeKey) || RANGES[1];
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?interval=${cfg.interval}&range=${cfg.range}&includePrePost=false`;
  const data = await fetchJsonViaProxies(url);
  const result = data?.chart?.result?.[0];
  if (!result) throw new Error('no chart data');
  return summarizeChart(result);
}

async function fetchQuoteBatch(tickers) {
  if (!tickers.length) return [];
  const symbols = tickers.join(',');
  const url = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(symbols)}`;
  try {
    const data = await fetchJsonViaProxies(url);
    return data?.quoteResponse?.result || [];
  } catch {
    return [];
  }
}

function applyQuoteToStock(sym, q) {
  if (!state.stocks[sym]) return;
  state.stocks[sym] = {
    ...state.stocks[sym],
    marketCap: q.marketCap,
    trailingPE: q.trailingPE,
    forwardPE: q.forwardPE,
    priceToSales: q.priceToSalesTrailing12Months,
    priceToBook: q.priceToBook,
    dividendYield: q.trailingAnnualDividendYield ?? q.dividendYield,
    avgVolume: q.averageDailyVolume3Month,
    eps: q.epsTrailingTwelveMonths,
    beta: q.beta,
    changePct: q.regularMarketChangePercent,
  };
}

async function searchTickers(query) {
  if (!query || !query.trim()) return [];
  const url = `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(query)}&quotesCount=10&newsCount=0`;
  try {
    const data = await fetchJsonViaProxies(url);
    return (data?.quotes || [])
      .filter((q) => q.symbol && (q.quoteType === 'EQUITY' || q.quoteType === 'ETF'))
      .map((q) => ({
        ticker: q.symbol,
        name: q.shortname || q.longname || q.symbol,
        type: q.quoteType,
        exchange: q.exchDisp || '',
      }));
  } catch {
    return [];
  }
}

async function fetchTickerRange(ticker, rangeKey) {
  try {
    const summary = await fetchStockChart(ticker, rangeKey);
    const existing = state.stocks[ticker] || {};
    state.stocks[ticker] = {
      ...existing,
      price: summary.price,
      prevClose: summary.prevClose,
      fiftyTwoWeekHigh: summary.fiftyTwoWeekHigh,
      fiftyTwoWeekLow: summary.fiftyTwoWeekLow,
      volume: summary.volume,
      exchange: summary.exchange,
      currency: summary.currency,
      _ranges: { ...(existing._ranges || {}), [rangeKey]: { points: summary.points, fetchedAt: Date.now() } },
    };
    writeStockCache(state.stocks);
    return summary.points;
  } catch {
    return null;
  }
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
  const tickers = state.watchlist;
  let failures = 0;
  await Promise.all(tickers.map(async (ticker) => {
    try {
      const summary = await fetchStockChart(ticker, DEFAULT_RANGE);
      const meta = tickerMeta(ticker);
      const existing = state.stocks[ticker] || {};
      state.stocks[ticker] = {
        ...existing,
        ticker, name: meta.name, sector: meta.sector,
        price: summary.price,
        prevClose: summary.prevClose,
        currency: summary.currency,
        fiftyTwoWeekHigh: summary.fiftyTwoWeekHigh,
        fiftyTwoWeekLow: summary.fiftyTwoWeekLow,
        volume: summary.volume,
        exchange: summary.exchange,
        _ranges: {
          ...(existing._ranges || {}),
          [DEFAULT_RANGE]: { points: summary.points, fetchedAt: Date.now() },
        },
      };
      if (state.view === 'stocks') scheduleRender();
    } catch {
      failures++;
    }
  }));

  const quotes = await fetchQuoteBatch(tickers);
  for (const q of quotes) {
    if (q.symbol) applyQuoteToStock(q.symbol, q);
  }

  for (const ticker of tickers) {
    const cur = state.stocks[ticker] || { ticker };
    const def = VALUATION_DEFAULTS[ticker] || {};
    for (const k of Object.keys(def)) {
      if (cur[k] == null) cur[k] = def[k];
    }
    state.stocks[ticker] = cur;
  }

  state.stocksFetchedAt = Date.now();
  writeStockCache(state.stocks);
  setSpinner(false);
  if (failures && failures < tickers.length) toast(`${failures} ticker${failures > 1 ? 's' : ''} failed`);
  else if (failures === tickers.length && tickers.length) toast('Stock data unavailable');
  if (state.view === 'stocks') render();
}

// ======================= Watchlist management =======================

async function addTicker(ticker, name, sector) {
  ticker = ticker.toUpperCase();
  if (state.watchlist.includes(ticker)) {
    toast(`${ticker} is already in your watchlist`);
    return;
  }
  state.watchlist.push(ticker);
  if (!STOCKS_CATALOG.find((s) => s.ticker === ticker)) {
    state.customStocks[ticker] = { ticker, name: name || ticker, sector: sector || null };
    saveCustomStocks();
  }
  saveWatchlist();
  toast(`Added ${ticker}`);
  try {
    const summary = await fetchStockChart(ticker, DEFAULT_RANGE);
    const meta = tickerMeta(ticker);
    state.stocks[ticker] = {
      ticker, name: meta.name, sector: meta.sector,
      price: summary.price,
      prevClose: summary.prevClose,
      currency: summary.currency,
      fiftyTwoWeekHigh: summary.fiftyTwoWeekHigh,
      fiftyTwoWeekLow: summary.fiftyTwoWeekLow,
      volume: summary.volume,
      exchange: summary.exchange,
      _ranges: { [DEFAULT_RANGE]: { points: summary.points, fetchedAt: Date.now() } },
      ...(VALUATION_DEFAULTS[ticker] || {}),
    };
    const quotes = await fetchQuoteBatch([ticker]);
    if (quotes[0] && quotes[0].symbol) applyQuoteToStock(quotes[0].symbol, quotes[0]);
    writeStockCache(state.stocks);
    render();
  } catch {
    toast(`Couldn’t fetch chart for ${ticker}`);
    render();
  }
}

function removeTicker(ticker) {
  state.watchlist = state.watchlist.filter((t) => t !== ticker);
  state.expanded.delete(ticker);
  saveWatchlist();
  saveExpanded();
  toast(`Removed ${ticker}`);
  render();
}

function toggleExpanded(ticker) {
  if (state.expanded.has(ticker)) state.expanded.delete(ticker);
  else state.expanded.add(ticker);
  saveExpanded();
  render();
}

// ======================= SVG charts =======================

function rhChartSvg(points, isUp, width, height) {
  const w = width || 800, h = height || 200, pad = 4;
  if (!points || points.length < 2) return '<div class="chart-empty">No data</div>';
  const ys = points.map((p) => p.c);
  const min = Math.min(...ys);
  const max = Math.max(...ys);
  const range = max - min || 1;
  const stepX = (w - 2 * pad) / Math.max(points.length - 1, 1);
  const coords = points.map((p, i) => [
    pad + i * stepX,
    pad + (h - 2 * pad) * (1 - (p.c - min) / range),
  ]);
  const line = coords.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)} ${y.toFixed(1)}`).join(' ');
  const area = line + ` L${(w - pad).toFixed(1)} ${(h - pad).toFixed(1)} L${pad.toFixed(1)} ${(h - pad).toFixed(1)} Z`;
  const color = isUp ? 'var(--up)' : 'var(--down)';
  const gradId = `g-${Math.random().toString(36).slice(2, 8)}`;
  return `<svg viewBox="0 0 ${w} ${h}" class="rh-chart" preserveAspectRatio="none">
    <defs>
      <linearGradient id="${gradId}" x1="0" x2="0" y1="0" y2="1">
        <stop offset="0%" stop-color="${color}" stop-opacity="0.32"/>
        <stop offset="100%" stop-color="${color}" stop-opacity="0"/>
      </linearGradient>
    </defs>
    <path d="${area}" fill="url(#${gradId})"/>
    <path d="${line}" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>`;
}

function miniSparkSvg(points, isUp) {
  const w = 120, h = 36, pad = 2;
  if (!points || points.length < 2) return '<svg viewBox="0 0 120 36" class="mini-spark"></svg>';
  const ys = points.map((p) => p.c);
  const min = Math.min(...ys);
  const max = Math.max(...ys);
  const range = max - min || 1;
  const stepX = (w - 2 * pad) / Math.max(points.length - 1, 1);
  const line = points.map((p, i) => {
    const x = pad + i * stepX;
    const y = pad + (h - 2 * pad) * (1 - (p.c - min) / range);
    return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)} ${y.toFixed(1)}`;
  }).join(' ');
  const color = isUp ? 'var(--up)' : 'var(--down)';
  return `<svg viewBox="0 0 ${w} ${h}" class="mini-spark" preserveAspectRatio="none">
    <path d="${line}" fill="none" stroke="${color}" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>`;
}

// ======================= Render =======================

function visibleArticles() {
  let list = state.articles;
  if (state.topic === 'starred') {
    list = list.filter((a) => state.starred.has(articleId(a)));
  } else if (state.topic === 'hot') {
    const sixHrAgo = Date.now() - 6 * 60 * 60 * 1000;
    list = list.filter((a) => {
      const t = a.publishedAt ? new Date(a.publishedAt).getTime() : 0;
      return (a.points && a.points >= 100) || t >= sixHrAgo;
    });
    list = [...list].sort((a, b) => {
      const sa = (a.points || 0) * 1e6 - (Date.now() - (a.publishedAt ? new Date(a.publishedAt).getTime() : 0)) / 1000;
      const sb = (b.points || 0) * 1e6 - (Date.now() - (b.publishedAt ? new Date(b.publishedAt).getTime() : 0)) / 1000;
      return sb - sa;
    });
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

function renderSkeletons() {
  const feed = $('#feed');
  feed.innerHTML = '';
  feed.className = 'feed feed-news';
  for (let i = 0; i < 6; i++) {
    const sk = document.createElement('div');
    sk.className = 'skeleton';
    sk.innerHTML = `<div class="sk-line short"></div><div class="sk-line title"></div><div class="sk-line body"></div><div class="sk-line body-2"></div>`;
    feed.appendChild(sk);
  }
}

function renderStockSkeletons() {
  const feed = $('#feed');
  feed.innerHTML = '';
  feed.className = 'feed feed-stocks-panels';
  for (let i = 0; i < 8; i++) {
    const sk = document.createElement('div');
    sk.className = 'skeleton stock-row-skel';
    sk.innerHTML = `<div class="sk-row"></div>`;
    feed.appendChild(sk);
  }
}

function renderEmpty(view) {
  if (view === 'stocks') {
    if (!state.watchlist.length) {
      return `<div class="empty"><span class="empty-emoji">📊</span><h3>Your watchlist is empty</h3><p>Search above to add tickers.</p></div>`;
    }
    const sample = state.errors.slice(0, 3).map(escapeHtml).join('<br>');
    return `<div class="empty"><span class="empty-emoji">📊</span><h3>Couldn’t load stocks</h3><p>Yahoo Finance proxy fetch failed.</p><button id="emptyRetry">Retry</button>${sample ? `<details class="err-details"><summary>Show errors</summary><pre>${sample}</pre></details>` : ''}</div>`;
  }
  if (state.topic === 'starred') {
    return `<div class="empty"><span class="empty-emoji">☆</span><h3>No starred articles</h3><p>Tap the star on a card to save it for later.</p></div>`;
  }
  if (state.topic === 'hot') {
    return `<div class="empty"><span class="empty-emoji">🔥</span><h3>Nothing hot right now</h3><p>No trending articles yet — pull to refresh.</p></div>`;
  }
  if (state.articles.length && state.query) {
    return `<div class="empty"><span class="empty-emoji">🔍</span><h3>No matches</h3><p>Nothing matches "${escapeHtml(state.query)}".</p></div>`;
  }
  if (!state.articles.length && !state.loading) {
    const sample = state.errors.slice(0, 3).map(escapeHtml).join('<br>');
    return `<div class="empty"><span class="empty-emoji">📡</span><h3>Couldn’t load articles</h3><p>All proxies failed.</p><button id="emptyRetry">Retry</button>${sample ? `<details class="err-details"><summary>Show errors</summary><pre>${sample}</pre></details>` : ''}</div>`;
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
  const pointsBadge = primary.points && primary.points > 0
    ? `<span class="hn-points" title="Hacker News points">▲ ${primary.points}</span>` : '';
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
            ${pointsBadge}
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
  const showGroups = !state.query && state.topic !== 'starred' && state.topic !== 'hot';
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

// ============== Compact stock rows + expanded detail ==============

function getRangePoints(s, rangeKey) {
  const rd = s && s._ranges && s._ranges[rangeKey];
  return rd ? rd.points : (rangeKey === DEFAULT_RANGE ? s?.points || [] : []);
}

function computeChange(points, fallbackPrice, fallbackPrev) {
  if (points && points.length >= 2) {
    const first = points[0].c, last = points[points.length - 1].c;
    return { change: last - first, changePct: ((last - first) / first) * 100, last };
  }
  if (fallbackPrice != null && fallbackPrev != null) {
    return { change: fallbackPrice - fallbackPrev, changePct: ((fallbackPrice - fallbackPrev) / fallbackPrev) * 100, last: fallbackPrice };
  }
  return { change: null, changePct: null, last: fallbackPrice };
}

function stockRowHtml(ticker) {
  const s = state.stocks[ticker] || { ticker, ...tickerMeta(ticker) };
  const meta = tickerMeta(ticker);
  const rangeKey = state.panelRange[ticker] || DEFAULT_RANGE;
  const points = getRangePoints(s, rangeKey);
  const { change, changePct } = computeChange(points, s.price, s.prevClose);
  const isUp = changePct == null ? true : changePct >= 0;
  const color = changePct == null ? 'var(--muted)' : isUp ? 'var(--up)' : 'var(--down)';
  const arrow = changePct == null ? '·' : isUp ? '▲' : '▼';
  const pctStr = changePct != null ? `${isUp ? '+' : ''}${changePct.toFixed(2)}%` : '—';
  const expanded = state.expanded.has(ticker);

  const sectorPill = meta.sector
    ? `<span class="topic-pill topic-${meta.sector}">${TOPIC_LABEL[meta.sector]}</span>`
    : '';

  const compact = `
    <button class="stock-row" data-ticker="${escapeHtml(ticker)}" aria-expanded="${expanded ? 'true' : 'false'}">
      <div class="row-id">
        <div class="row-ticker">${escapeHtml(ticker)} ${sectorPill}</div>
        <div class="row-name">${escapeHtml(s.name || meta.name)}</div>
      </div>
      <div class="row-spark" style="color:${color}">${miniSparkSvg(points, isUp)}</div>
      <div class="row-price-block">
        <div class="row-price">$${formatPrice(s.price)}</div>
        <div class="row-change" style="color:${color}">${arrow} ${pctStr}</div>
      </div>
    </button>`;

  if (!expanded) return `<div class="stock-card" data-ticker="${escapeHtml(ticker)}">${compact}</div>`;

  return `<div class="stock-card is-expanded" data-ticker="${escapeHtml(ticker)}">${compact}${stockExpandedHtml(ticker)}</div>`;
}

function stockExpandedHtml(ticker) {
  const s = state.stocks[ticker] || { ticker, ...tickerMeta(ticker) };
  const rangeKey = state.panelRange[ticker] || DEFAULT_RANGE;
  const cfg = RANGES.find((r) => r.key === rangeKey) || RANGES[1];
  const rangeData = s._ranges && s._ranges[rangeKey];
  const points = rangeData ? rangeData.points : (s.points || []);
  const { change, changePct } = computeChange(points, s.price, s.prevClose);
  const isUp = changePct == null ? true : changePct >= 0;
  const color = changePct == null ? 'var(--muted)' : isUp ? 'var(--up)' : 'var(--down)';
  const arrow = changePct == null ? '·' : isUp ? '▲' : '▼';
  const dollarStr = change != null ? `${isUp ? '+' : ''}$${Math.abs(change).toFixed(2)}` : '—';
  const pctStr = changePct != null ? `(${isUp ? '+' : ''}${changePct.toFixed(2)}%)` : '';

  const rangeTabs = RANGES.map((r) =>
    `<button class="range-tab ${r.key === rangeKey ? 'active' : ''}" data-ticker="${escapeHtml(ticker)}" data-range="${r.key}">${r.label}</button>`
  ).join('');

  const loading = !rangeData && !points.length;
  const chart = loading
    ? '<div class="chart-loading"></div>'
    : rhChartSvg(points, isUp);

  const metricsHtml = hasFundamentals(s)
    ? `<div class="panel-metrics">
        ${s.marketCap != null ? `<div class="m"><div class="m-label">Mkt Cap</div><div class="m-value">$${formatBig(s.marketCap)}</div></div>` : ''}
        ${s.trailingPE != null ? `<div class="m"><div class="m-label">P/E</div><div class="m-value">${fmtNum(s.trailingPE)}</div></div>` : ''}
        ${s.forwardPE != null ? `<div class="m"><div class="m-label">Fwd P/E</div><div class="m-value">${fmtNum(s.forwardPE)}</div></div>` : ''}
        ${s.priceToSales != null ? `<div class="m"><div class="m-label">P/S</div><div class="m-value">${fmtNum(s.priceToSales)}</div></div>` : ''}
        ${s.priceToBook != null ? `<div class="m"><div class="m-label">P/B</div><div class="m-value">${fmtNum(s.priceToBook)}</div></div>` : ''}
        ${s.dividendYield != null ? `<div class="m"><div class="m-label">Yield</div><div class="m-value">${(s.dividendYield * 100).toFixed(2)}%</div></div>` : ''}
        ${s.eps != null ? `<div class="m"><div class="m-label">EPS</div><div class="m-value">${fmtNum(s.eps, 2)}</div></div>` : ''}
        ${s.fiftyTwoWeekLow != null && s.fiftyTwoWeekHigh != null ? `<div class="m"><div class="m-label">52w Range</div><div class="m-value">$${formatPrice(s.fiftyTwoWeekLow)}–$${formatPrice(s.fiftyTwoWeekHigh)}</div></div>` : ''}
      </div>`
    : `<div class="metrics-unavailable">Fundamentals unavailable for this ticker</div>`;

  return `
    <div class="stock-expanded">
      <div class="stock-panel-price-row">
        <div class="big-price">$${formatPrice(s.price)}</div>
        <div class="big-change" style="color:${color}">${arrow} ${dollarStr} ${pctStr} <span class="period-label">${cfg.long}</span></div>
      </div>
      <div class="panel-chart ${loading ? 'is-loading' : ''}" style="color:${color}">${chart}</div>
      <div class="range-tabs-wrap">
        <div class="range-tabs">${rangeTabs}</div>
      </div>
      ${metricsHtml}
      <div class="expanded-actions">
        <button class="btn-secondary remove-btn-text" data-ticker="${escapeHtml(ticker)}">Remove from watchlist</button>
      </div>
    </div>
  `;
}

function searchDropdownHtml() {
  if (!state.searchResults.length && !state.searching && !state.query) return '';
  if (state.searching) {
    return `<div class="search-dropdown"><div class="search-empty">Searching…</div></div>`;
  }
  if (!state.searchResults.length) {
    return `<div class="search-dropdown"><div class="search-empty">No results</div></div>`;
  }
  return `<div class="search-dropdown">${state.searchResults.map((r) => {
    const inList = state.watchlist.includes(r.ticker);
    return `<button class="search-result" data-ticker="${escapeHtml(r.ticker)}" data-name="${escapeHtml(r.name)}" ${inList ? 'disabled' : ''}>
      <span class="sr-ticker">${escapeHtml(r.ticker)}</span>
      <span class="sr-name">${escapeHtml(r.name)}</span>
      <span class="sr-exch">${escapeHtml(r.exchange || '')}</span>
      <span class="sr-add">${inList ? '✓' : '+ Add'}</span>
    </button>`;
  }).join('')}</div>`;
}

function renderStocks() {
  const feed = $('#feed');
  feed.className = 'feed feed-stocks-panels';
  if (!state.watchlist.length) {
    feed.innerHTML = `<div class="watchlist-controls">${searchDropdownHtml()}</div>${renderEmpty('stocks')}`;
    attachSearchHandlers(feed);
    return;
  }
  if (!Object.keys(state.stocks).length) {
    feed.innerHTML = `<div class="watchlist-controls">${searchDropdownHtml()}</div>`;
    renderStockSkeletons();
    return;
  }

  let html = `<div class="watchlist-controls">${searchDropdownHtml()}</div>`;
  for (const ticker of state.watchlist) html += stockRowHtml(ticker);
  feed.innerHTML = html;

  attachSearchHandlers(feed);
  attachPanelHandlers(feed);
}

function attachSearchHandlers(feed) {
  $$('.search-result', feed).forEach((btn) =>
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const t = btn.dataset.ticker;
      const n = btn.dataset.name;
      addTicker(t, n);
      state.query = '';
      state.searchResults = [];
      const search = $('#search');
      if (search) { search.value = ''; search.parentElement.classList.remove('has-value'); }
    })
  );
}

function attachPanelHandlers(feed) {
  $$('.stock-row', feed).forEach((row) =>
    row.addEventListener('click', (e) => {
      const ticker = row.dataset.ticker;
      toggleExpanded(ticker);
    })
  );
  $$('.range-tab', feed).forEach((btn) =>
    btn.addEventListener('click', async (e) => {
      e.preventDefault(); e.stopPropagation();
      const ticker = btn.dataset.ticker;
      const range = btn.dataset.range;
      state.panelRange[ticker] = range;
      savePanelRanges();
      const cur = state.stocks[ticker];
      const have = cur && cur._ranges && cur._ranges[range];
      if (!have) {
        render();
        await fetchTickerRange(ticker, range);
        render();
      } else {
        render();
      }
    })
  );
  $$('.remove-btn-text', feed).forEach((btn) =>
    btn.addEventListener('click', (e) => {
      e.preventDefault(); e.stopPropagation();
      removeTicker(btn.dataset.ticker);
    })
  );
}

function render() {
  const search = $('#search');
  if (search) {
    search.placeholder = state.view === 'stocks' ? 'Search to add a ticker (e.g. AAPL, Apple)…' : 'Filter loaded articles…';
  }
  const hotChip = $('.chip-hot');
  if (hotChip) hotChip.style.display = state.view === 'stocks' ? 'none' : '';
  const chips = $('#chips');
  if (chips) chips.style.display = state.view === 'stocks' ? 'none' : '';
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

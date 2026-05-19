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
  };
}

async function fetchStockChart(ticker, range = '3mo', interval = '1d') {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?interval=${interval}&range=${range}&includePrePost=false`;
  const data = await fetchJsonViaProxies(url);
  const result = data?.chart?.result?.[0];
  if (!result) throw new Error('no chart data');
  return summarizeChart(result);
}

async function fetchQuoteBatch(tickers) {
  const symbols = tickers.join(',');
  const url = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(symbols)}`;
  try {
    const data = await fetchJsonViaProxies(url);
    return data?.quoteResponse?.result || [];
  } catch {
    return [];
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
  let failures = 0;
  await Promise.all(STOCKS.map(async (s) => {
    try {
      const summary = await fetchStockChart(s.ticker, '3mo', '1d');
      state.stocks[s.ticker] = { ...(state.stocks[s.ticker] || {}), ...s, ...summary };
      if (state.view === 'stocks') scheduleRender();
    } catch {
      failures++;
    }
  }));

  // Live fundamentals (often blocked by Yahoo auth).
  const quotes = await fetchQuoteBatch(STOCKS.map((s) => s.ticker));
  for (const q of quotes) {
    const sym = q.symbol;
    if (!sym || !state.stocks[sym]) continue;
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

  // Fill gaps with hardcoded snapshot.
  for (const s of STOCKS) {
    const cur = state.stocks[s.ticker] || { ...s };
    const def = VALUATION_DEFAULTS[s.ticker] || {};
    for (const k of Object.keys(def)) {
      if (cur[k] == null) cur[k] = def[k];
    }
    state.stocks[s.ticker] = cur;
  }

  state.stocksFetchedAt = Date.now();
  writeStockCache(state.stocks);
  setSpinner(false);
  if (failures && failures < STOCKS.length) toast(`${failures} ticker${failures > 1 ? 's' : ''} failed`);
  else if (failures === STOCKS.length) toast('Stock data unavailable');
  if (state.view === 'stocks') render();
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
  return { line, min, max };
}

// Build a normalized peer-overlay chart for a stock's sector.
function peerChartSvg(currentTicker, sector) {
  const w = 800, h = 200, pad = 10;
  const peers = STOCKS.filter((p) => p.sector === sector);
  const series = peers.map((p) => {
    const s = state.stocks[p.ticker];
    const pts = (s && s.points) || [];
    if (pts.length < 2) return null;
    const baseline = pts[0].c;
    if (!baseline) return null;
    return {
      ticker: p.ticker,
      isCurrent: p.ticker === currentTicker,
      values: pts.map((pt) => ((pt.c - baseline) / baseline) * 100),
    };
  }).filter(Boolean);

  if (!series.length) return '<div class="chart-empty">No data</div>';

  let min = Infinity, max = -Infinity;
  for (const s of series) for (const v of s.values) {
    if (v < min) min = v;
    if (v > max) max = v;
  }
  const pad_pct = (max - min) * 0.05 || 1;
  min -= pad_pct; max += pad_pct;
  const range = max - min || 1;

  const zeroY = pad + (h - 2 * pad) * (1 - (0 - min) / range);
  const zeroLine = (zeroY >= pad && zeroY <= h - pad)
    ? `<line x1="${pad}" y1="${zeroY.toFixed(1)}" x2="${w - pad}" y2="${zeroY.toFixed(1)}" stroke="var(--border)" stroke-width="1" stroke-dasharray="3 4"/>`
    : '';

  const peerPaths = series.filter((s) => !s.isCurrent).map((s) => {
    const stepX = (w - 2 * pad) / Math.max(s.values.length - 1, 1);
    const d = s.values.map((v, i) => {
      const x = pad + i * stepX;
      const y = pad + (h - 2 * pad) * (1 - (v - min) / range);
      return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)} ${y.toFixed(1)}`;
    }).join(' ');
    return `<path d="${d}" fill="none" stroke="var(--muted)" stroke-width="1" stroke-opacity="0.35" stroke-linecap="round" stroke-linejoin="round"/>`;
  }).join('');

  const current = series.find((s) => s.isCurrent);
  let currentPath = '';
  let endLabel = '';
  if (current) {
    const stepX = (w - 2 * pad) / Math.max(current.values.length - 1, 1);
    const coords = current.values.map((v, i) => [pad + i * stepX, pad + (h - 2 * pad) * (1 - (v - min) / range)]);
    const d = coords.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)} ${y.toFixed(1)}`).join(' ');
    const last = coords[coords.length - 1];
    const lastVal = current.values[current.values.length - 1];
    const color = lastVal >= 0 ? 'var(--up)' : 'var(--down)';
    currentPath = `<path d="${d}" fill="none" stroke="${color}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
      <circle cx="${last[0].toFixed(1)}" cy="${last[1].toFixed(1)}" r="3.5" fill="${color}"/>`;
    endLabel = `<text x="${(w - pad - 4).toFixed(1)}" y="${(last[1] - 8).toFixed(1)}" text-anchor="end" fill="${color}" font-size="11" font-weight="700">${lastVal >= 0 ? '+' : ''}${lastVal.toFixed(1)}%</text>`;
  }

  return `<svg class="peer-chart-svg" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none">
    ${zeroLine}
    ${peerPaths}
    ${currentPath}
    ${endLabel}
  </svg>
  <div class="chart-axis">
    <span>${min.toFixed(1)}%</span>
    <span class="muted">3 month · ${escapeHtml(currentTicker)} vs ${TOPIC_LABEL[sector]} peers</span>
    <span>${max.toFixed(1)}%</span>
  </div>`;
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

function visibleStocks() {
  let list = STOCKS.map((s) => state.stocks[s.ticker] || { ...s, points: [] });
  if (state.topic === 'starred') list = list.filter((s) => state.starredStocks.has(s.ticker));
  else if (state.topic !== 'all' && state.topic !== 'hot') list = list.filter((s) => s.sector === state.topic);
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
  feed.className = 'feed feed-stocks-panels';
  for (let i = 0; i < 4; i++) {
    const sk = document.createElement('div');
    sk.className = 'skeleton stock-panel-skel';
    sk.innerHTML = `
      <div class="sk-line short"></div>
      <div class="sk-line title"></div>
      <div class="sk-chart"></div>
      <div class="sk-line body"></div>`;
    feed.appendChild(sk);
  }
}

function renderEmpty(view) {
  if (view === 'stocks') {
    if (state.topic === 'starred') {
      return `<div class="empty"><span class="empty-emoji">☆</span><h3>No starred stocks</h3><p>Tap a stock's star to add it here.</p></div>`;
    }
    if (state.query) {
      return `<div class="empty"><span class="empty-emoji">🔍</span><h3>No matches</h3><p>Nothing matches "${escapeHtml(state.query)}".</p></div>`;
    }
    const sample = state.errors.slice(0, 3).map(escapeHtml).join('<br>');
    return `<div class="empty">
      <span class="empty-emoji">📊</span>
      <h3>Couldn't load stocks</h3>
      <p>Yahoo Finance proxy fetch failed.</p>
      <button id="emptyRetry">Retry</button>
      ${sample ? `<details class="err-details"><summary>Show errors</summary><pre>${sample}</pre></details>` : ''}
    </div>`;
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
    return `<div class="empty">
      <span class="empty-emoji">📡</span>
      <h3>Couldn't load articles</h3>
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

// ============== Stock panel (dashboard) ==============

function stockPanelHtml(s) {
  const change = (s.price != null && s.prevClose != null) ? (s.price - s.prevClose) : null;
  const changePct = (change != null && s.prevClose) ? (change / s.prevClose) * 100 : (s.changePct ?? null);
  const isUp = changePct != null ? changePct >= 0 : null;
  const color = isUp == null ? 'var(--muted)' : isUp ? 'var(--up)' : 'var(--down)';
  const arrow = isUp == null ? '·' : isUp ? '▲' : '▼';
  const dollarChange = change != null ? `${isUp ? '+' : ''}$${Math.abs(change).toFixed(2)}` : '';
  const pctStr = changePct != null ? `${isUp ? '+' : ''}${changePct.toFixed(2)}%` : '—';
  const starred = state.starredStocks.has(s.ticker);

  const peers = STOCKS.filter((p) => p.sector === s.sector);

  return `
    <div class="stock-panel" data-ticker="${escapeHtml(s.ticker)}">
      <div class="stock-panel-head">
        <div class="stock-panel-id">
          <div class="stock-panel-ticker">
            ${escapeHtml(s.ticker)}
            <span class="topic-pill topic-${s.sector}">${TOPIC_LABEL[s.sector]}</span>
          </div>
          <div class="stock-panel-name">${escapeHtml(s.name)}</div>
        </div>
        <div class="stock-panel-price">
          <div class="big-price-sm">$${formatPrice(s.price)}</div>
          <div class="big-change-sm" style="color:${color}">${arrow} ${dollarChange} (${pctStr})</div>
        </div>
        <button class="icon-mini star-btn ${starred ? 'starred' : ''}" data-ticker="${escapeHtml(s.ticker)}" aria-label="${starred ? 'Unstar' : 'Star'}">
          <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path fill="currentColor" d="M12 17.27 18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/></svg>
        </button>
      </div>

      <div class="panel-chart">${peerChartSvg(s.ticker, s.sector)}</div>

      <div class="panel-legend">
        ${peers.map((p) => `<span class="legend-item ${p.ticker === s.ticker ? 'is-current' : ''}"><i></i>${escapeHtml(p.ticker)}</span>`).join('')}
      </div>

      <div class="panel-metrics">
        <div class="m"><div class="m-label">Mkt Cap</div><div class="m-value">${s.marketCap != null ? '$' + formatBig(s.marketCap) : '—'}</div></div>
        <div class="m"><div class="m-label">P/E</div><div class="m-value">${fmtNum(s.trailingPE)}</div></div>
        <div class="m"><div class="m-label">Fwd P/E</div><div class="m-value">${fmtNum(s.forwardPE)}</div></div>
        <div class="m"><div class="m-label">P/S</div><div class="m-value">${fmtNum(s.priceToSales)}</div></div>
        <div class="m"><div class="m-label">P/B</div><div class="m-value">${fmtNum(s.priceToBook)}</div></div>
        <div class="m"><div class="m-label">Yield</div><div class="m-value">${s.dividendYield != null ? (s.dividendYield * 100).toFixed(2) + '%' : '—'}</div></div>
        <div class="m"><div class="m-label">EPS</div><div class="m-value">${fmtNum(s.eps, 2)}</div></div>
        <div class="m"><div class="m-label">52w Range</div><div class="m-value">$${formatPrice(s.fiftyTwoWeekLow)}–$${formatPrice(s.fiftyTwoWeekHigh)}</div></div>
      </div>
    </div>`;
}

function renderStocks() {
  const feed = $('#feed');
  feed.className = 'feed feed-stocks-panels';
  const list = visibleStocks();
  if (!list.length) {
    feed.innerHTML = renderEmpty('stocks');
    const retry = $('#emptyRetry');
    if (retry) retry.addEventListener('click', () => loadStocks({ force: true }));
    return;
  }
  if (list.every((s) => !s.points || !s.points.length)) {
    if (!Object.keys(state.stocks).length) { renderStockSkeletons(); return; }
  }

  const groupBySector = state.topic === 'all' && !state.query;
  let html = '';
  if (groupBySector) {
    for (const sector of ['ai', 'fintech', 'energy']) {
      const inSector = list.filter((s) => s.sector === sector);
      if (!inSector.length) continue;
      html += `<h3 class="sector-header sector-${sector}">${TOPIC_LABEL[sector]} <span class="sector-count">${inSector.length}</span></h3>`;
      for (const s of inSector) html += stockPanelHtml(s);
    }
  } else {
    for (const s of list) html += stockPanelHtml(s);
  }
  feed.innerHTML = html;

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

function render() {
  $('#search').placeholder = state.view === 'stocks' ? 'Filter by ticker or name…' : 'Filter loaded articles…';
  const hotChip = $('.chip-hot');
  if (hotChip) hotChip.style.display = state.view === 'stocks' ? 'none' : '';
  if (state.view === 'stocks' && state.topic === 'hot') setTopic('all');
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

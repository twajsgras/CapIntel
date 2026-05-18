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
  if (state.topic === 'hot') {
    return `<div class="empty"><span class="empty-emoji">🔥</span><h3>Nothing hot right now</h3><p>No trending articles yet — pull to refresh.</p></div>`;
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

function stockCardHtml(s) {
  const starred = state.starredStocks.has(s.ticker);
  const change = (s.price != null && s.prevClose != null) ? (s.price - s.prevClose) : null;
  const changePct = (change != null && s.prevClose) ? (change / s.prevClose) * 100 : (s.changePct ?? null);
  const isUp = change != null ? change >= 0 : (changePct != null ? changePct >= 0 : null);
  const color = isUp == null ? 'var(--muted)' : isUp ? 'var(--up)' : 'var(--down)';
  const arrow = isUp == null ? '·' : isUp ? '▲' : '▼';
  const pctStr = changePct != null ? `${isUp ? '+' : ''}${changePct.toFixed(2)}%` : '—';
  const points = (s.points || []).slice(-22);
  const pe = s.trailingPE != null ? s.trailingPE.toFixed(1) : '—';
  const cap = s.marketCap != null ? '$' + formatBig(s.marketCap) : '—';
  return `
    <div class="stock-card" data-ticker="${escapeHtml(s.ticker)}">
      <div class="stock-head">
        <div class="stock-id">
          <div class="stock-ticker">${escapeHtml(s.ticker)}</div>
          <div class="stock-name">${escapeHtml(s.name)}</div>
        </div>
        <button class="icon-mini star-btn ${starred ? 'starred' : ''}" data-ticker="${escapeHtml(s.ticker)}" aria-label="${starred ? 'Unstar' : 'Star'}">
          <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path fill="currentColor" d="M12 17.27 18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/></svg>
        </button>
      </div>

      <div class="stock-price-row">
        <div class="stock-price">$${formatPrice(s.price)}</div>
        <div class="stock-change" style="color:${color}">${arrow} ${pctStr}</div>
      </div>

      <div class="stock-spark" style="color:${color}">${sparklineSvg(points, 'currentColor')}</div>

      <div class="stock-metrics">
        <div class="metric"><span class="metric-label">P/E</span><span class="metric-value">${pe}</span></div>
        <div class="metric"><span class="metric-label">Mkt Cap</span><span class="metric-value">${cap}</span></div>
      </div>
    </div>`;
}

function renderStocks() {
  const feed = $('#feed');
  feed.className = 'feed feed-stocks-wrap';
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

  const groupBySector = state.topic === 'all' && !state.query;
  let html = '';
  if (groupBySector) {
    for (const sector of ['ai', 'fintech', 'energy']) {
      const inSector = list.filter((s) => s.sector === sector);
      if (!inSector.length) continue;
      html += `<h3 class="sector-header sector-${sector}">${TOPIC_LABEL[sector]} <span class="sector-count">${inSector.length}</span></h3>`;
      html += `<div class="stock-grid">${inSector.map(stockCardHtml).join('')}</div>`;
    }
  } else {
    html = `<div class="stock-grid">${list.map(stockCardHtml).join('')}</div>`;
  }
  feed.innerHTML = html;
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

function renderPeerTable(current) {
  const peers = STOCKS
    .filter((s) => s.sector === current.sector)
    .map((s) => state.stocks[s.ticker] || s);
  const metricKeys = ['trailingPE', 'forwardPE', 'priceToSales', 'priceToBook', 'marketCap', 'dividendYield'];
  const lowerBetter = new Set(['trailingPE', 'forwardPE', 'priceToSales', 'priceToBook']);
  const best = {};
  for (const k of metricKeys) {
    const vals = peers.map((p) => p[k]).filter((v) => v != null && Number.isFinite(v));
    if (!vals.length) continue;
    best[k] = lowerBetter.has(k) ? Math.min(...vals) : Math.max(...vals);
  }
  const cell = (p, k, formatter) => {
    const v = p[k];
    const cls = v != null && v === best[k] ? 'cell-best' : '';
    return `<td class="${cls}">${formatter(v)}</td>`;
  };
  const fmtPct = (v) => v == null ? '—' : (v * 100).toFixed(2) + '%';
  const fmtCap = (v) => v == null ? '—' : '$' + formatBig(v);
  const fmtPrice = (v) => v == null ? '—' : '$' + formatPrice(v);
  const fmtChg = (v) => v == null ? '—' : (v >= 0 ? '+' : '') + v.toFixed(2) + '%';
  const rows = peers.map((p) => {
    const isCurrent = p.ticker === current.ticker;
    const chg = p.changePct;
    const chgCls = chg == null ? '' : chg >= 0 ? 'up' : 'down';
    return `<tr class="${isCurrent ? 'is-current' : ''}">
      <td class="ticker-cell">${escapeHtml(p.ticker)}</td>
      <td>${fmtPrice(p.price)}</td>
      <td class="${chgCls}">${fmtChg(chg)}</td>
      ${cell(p, 'trailingPE', (v) => fmtNum(v))}
      ${cell(p, 'forwardPE', (v) => fmtNum(v))}
      ${cell(p, 'priceToSales', (v) => fmtNum(v))}
      ${cell(p, 'priceToBook', (v) => fmtNum(v))}
      ${cell(p, 'marketCap', fmtCap)}
      ${cell(p, 'dividendYield', fmtPct)}
    </tr>`;
  }).join('');
  return `<div class="peer-table-wrap">
    <table class="peer-table">
      <thead><tr>
        <th>Ticker</th><th>Price</th><th>Day</th>
        <th>P/E</th><th>Fwd P/E</th><th>P/S</th><th>P/B</th>
        <th>Mkt Cap</th><th>Yield</th>
      </tr></thead>
      <tbody>${rows}</tbody>
    </table>
    <p class="peer-note">Green dot = best value among ${TOPIC_LABEL[current.sector]} peers.</p>
  </div>`;
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

    <h4 class="section-title">Trading</h4>
    <div class="stat-grid">
      <div class="stat"><div class="stat-label">52w Low</div><div class="stat-value">$${formatPrice(s.fiftyTwoWeekLow)}</div></div>
      <div class="stat"><div class="stat-label">52w High</div><div class="stat-value">$${formatPrice(s.fiftyTwoWeekHigh)}</div></div>
      <div class="stat"><div class="stat-label">Volume</div><div class="stat-value">${formatBig(s.volume)}</div></div>
      <div class="stat"><div class="stat-label">Avg Vol</div><div class="stat-value">${formatBig(s.avgVolume)}</div></div>
    </div>

    <h4 class="section-title">Valuation</h4>
    <div class="stat-grid">
      <div class="stat"><div class="stat-label">Mkt Cap</div><div class="stat-value">${s.marketCap != null ? '$' + formatBig(s.marketCap) : '—'}</div></div>
      <div class="stat"><div class="stat-label">P/E (TTM)</div><div class="stat-value">${fmtNum(s.trailingPE)}</div></div>
      <div class="stat"><div class="stat-label">Fwd P/E</div><div class="stat-value">${fmtNum(s.forwardPE)}</div></div>
      <div class="stat"><div class="stat-label">P/S</div><div class="stat-value">${fmtNum(s.priceToSales)}</div></div>
      <div class="stat"><div class="stat-label">P/B</div><div class="stat-value">${fmtNum(s.priceToBook)}</div></div>
      <div class="stat"><div class="stat-label">Yield</div><div class="stat-value">${s.dividendYield != null ? (s.dividendYield * 100).toFixed(2) + '%' : '—'}</div></div>
      <div class="stat"><div class="stat-label">EPS (TTM)</div><div class="stat-value">${fmtNum(s.eps)}</div></div>
      <div class="stat"><div class="stat-label">Beta</div><div class="stat-value">${fmtNum(s.beta)}</div></div>
    </div>

    <h4 class="section-title">vs ${TOPIC_LABEL[s.sector]} peers</h4>
    ${renderPeerTable(s)}
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

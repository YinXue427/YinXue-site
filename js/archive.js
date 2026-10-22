(function () {
  'use strict';

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer  = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  const ARTICLES = Array.isArray(window.ARTICLES) ? window.ARTICLES : [];

  const nav            = document.getElementById('nav');
  const navProgSvg     = document.getElementById('navProgress');
  const navProgRect    = document.getElementById('navProgRect');
  const navProgressText= document.getElementById('navProgressText');
  const spotlight      = document.getElementById('spotlight');

  const tagNav         = document.getElementById('tagNav');
  const tocList        = document.getElementById('tocList');

  const articleListEl      = document.getElementById('articleListContainer');
  const archiveMeta        = document.getElementById('archiveMeta');
  const articleDetailView  = document.getElementById('articleDetailView');
  const artTag             = document.getElementById('artTag');
  const artTitle           = document.getElementById('artTitle');
  const artDate            = document.getElementById('artDate');
  const artContent         = document.getElementById('artContent');
  const navArticleName     = document.getElementById('navArticleName');
  const btnBack            = document.getElementById('btnBack');

  const btnSearch          = document.getElementById('btnSearch');
  const btnSearchClose     = document.getElementById('btnSearchClose');
  const searchInput        = document.getElementById('searchInput');
  
  const shareSection       = document.getElementById('shareSection');
  const btnShare           = document.getElementById('btnShare');
  const shareText          = document.getElementById('shareText');

  /* 动态创建搜索建议面板 */
  let suggestionPanel = document.querySelector('.search-suggestions');
  if (!suggestionPanel) {
    suggestionPanel = document.createElement('div');
    suggestionPanel.className = 'search-suggestions';
    nav.parentNode.insertBefore(suggestionPanel, nav.nextSibling);
  }

  /* Markdown 解析 */
  function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
  }
  function inline(text) {
    let s = escapeHtml(text);
    s = s.replace(/`([^`\n]+)`/g, (m, code) => `<code>${code}</code>`);
    s = s.replace(/!\[([^\]]*)\]\(([^)\s]+)(?:\s+"([^"]*)")?\)/g, (m, alt, src, title) => `<img src="${src}" alt="${alt}"${title ? ` title="${title}"` : ''} loading="lazy">`);
    s = s.replace(/\[([^\]]+)\]\(([^)\s]+)(?:\s+"([^"]*)")?\)/g, (m, txt, href, title) => `<a href="${href}"${title ? ` title="${title}"` : ''} target="_blank" rel="noopener">${txt}</a>`);
    s = s.replace(/\*\*([^*\n]+)\*\*/g, '<strong>$1</strong>');
    s = s.replace(/(^|[^*])\*([^*\n]+)\*(?!\*)/g, '$1<em>$2</em>');
    s = s.replace(/~~([^~\n]+)~~/g, '<del>$1</del>');
    return s;
  }
  function renderBlocks(src, codeBlocks) {
    const lines = src.split('\n');
    const out = [];
    let i = 0, para = [], listType = null, listItems = [], inQuote = false, quoteLines = [];
    const flushPara = () => { if (para.length) { out.push('<p>' + inline(para.join(' ')) + '</p>'); para = []; } };
    const flushList = () => { if (listType) { out.push(`<${listType}>` + listItems.map(t => '<li>' + inline(t) + '</li>').join('') + `</${listType}>`); listType = null; listItems = []; } };
    const flushQuote = () => { if (inQuote) { out.push('<blockquote>' + renderBlocks(quoteLines.join('\n'), codeBlocks) + '</blockquote>'); inQuote = false; quoteLines = []; } };
    const flushAll = () => { flushPara(); flushList(); flushQuote(); };

    while (i < lines.length) {
      const line = lines[i].trim();
      const cb = line.match(/^\u0000CB(\d+)\u0000$/);
      if (cb) {
        flushAll();
        const block = codeBlocks[+cb[1]];
        if (block) out.push(`<pre><code${block.lang ? ` class="language-${escapeHtml(block.lang)}"` : ''}>${escapeHtml(block.code)}</code></pre>`);
        i++; continue;
      }
      if (line === '') { flushAll(); i++; continue; }
      const h = line.match(/^(#{1,6})\s+(.*)$/);
      if (h) { flushAll(); out.push(`<h${h[1].length}>${inline(h[2])}</h${h[1].length}>`); i++; continue; }
      if (/^(-{3,}|\*{3,}|_{3,})$/.test(line)) { flushAll(); out.push('<hr>'); i++; continue; }
      if (/^>\s?/.test(line)) { flushPara(); flushList(); inQuote = true; quoteLines.push(line.replace(/^>\s?/, '')); i++; continue; }
      else if (inQuote) flushQuote();
      const ul = line.match(/^[-*+]\s+(.*)$/);
      const ol = line.match(/^\d+[.)]\s+(.*)$/);
      if (ul) { flushPara(); flushQuote(); if (listType !== 'ul') { flushList(); listType = 'ul'; } listItems.push(ul[1]); i++; continue; }
      if (ol) { flushPara(); flushQuote(); if (listType !== 'ol') { flushList(); listType = 'ol'; } listItems.push(ol[1]); i++; continue; }
      else if (listType) flushList();
      para.push(line); i++;
    }
    flushAll();
    return out.join('\n');
  }
  function renderMarkdown(source) {
    const src = String(source || '').replace(/\r\n?/g, '\n');
    const codeBlocks = [];
    const pre = src.replace(/```([^\n`]*)\n([\s\S]*?)```/g, (m, lang, code) => {
      const idx = codeBlocks.length;
      codeBlocks.push({ lang: lang.trim(), code });
      return `\n\u0000CB${idx}\u0000\n`;
    });
    return renderBlocks(pre, codeBlocks);
  }

  /* 状态 */
  let activeTag = 'ALL';
  let query = '';
  const TAGS = ['ALL', ...Array.from(new Set(ARTICLES.map(a => (a.tag || 'POST').toUpperCase())))];

  /* 侧边标签导航 */
  function renderTagNav() {
    tagNav.innerHTML = TAGS.map(t => {
      const label = t === 'ALL' ? '全部' : t;
      return `<div class="side-nav-item${t === activeTag ? ' active' : ''}" data-tag="${escapeHtml(t)}">
        <span class="nav-title">${escapeHtml(label)}</span><span class="dot"></span>
      </div>`;
    }).join('');
    tagNav.querySelectorAll('.side-nav-item').forEach(el => {
      el.addEventListener('click', () => {
        activeTag = el.dataset.tag;
        renderTagNav();
        renderList();
      });
    });
  }

  /* 列表渲染 */
  const arrowSvg = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>';

  function matches(a) {
    const tag = (a.tag || 'POST').toUpperCase();
    if (activeTag !== 'ALL' && tag !== activeTag) return false;
    if (!query) return true;
    const q = query.toLowerCase();
    return [a.title, a.summary, a.tag, a.date, a.content].some(v => String(v || '').toLowerCase().includes(q));
  }

  function renderList() {
    const items = ARTICLES.map((a, i) => ({ a, i })).filter(({ a }) => matches(a));

    archiveMeta.textContent = items.length === ARTICLES.length
      ? `共 ${ARTICLES.length} 篇文章`
      : `找到 ${items.length} 篇 / 共 ${ARTICLES.length} 篇`;

    articleListEl.querySelectorAll('.article-item, .article-empty').forEach(el => el.remove());

    if (!ARTICLES.length) {
      articleListEl.insertAdjacentHTML('beforeend', '<div class="article-empty">暂无文章。</div>');
      return;
    }
    if (!items.length) {
      articleListEl.insertAdjacentHTML('beforeend', '<div class="article-empty">没有匹配的文章，换个关键词或标签试试。</div>');
      return;
    }

    items.forEach(({ a, i }) => {
      const el = document.createElement('div');
      el.className = 'article-item';
      el.setAttribute('role', 'button'); el.setAttribute('tabindex', '0');
      el.dataset.index = String(i);
      el.innerHTML = `
        <div class="article-date">${escapeHtml(a.date || '—')}</div>
        <div class="article-content">
          <h3>${escapeHtml(a.title || '未命名')}<span class="article-tag">${escapeHtml((a.tag || 'POST').toUpperCase())}</span></h3>
          <p>${escapeHtml(a.summary || '')}</p>
        </div>
        <div class="article-icon">${arrowSvg}</div>
      `;
      
      const open = () => {
        const url = new URL(window.location);
        url.searchParams.set('num', a.num || String(i + 1));
        window.location.href = url.toString();
      };
      
      el.addEventListener('click', open);
      el.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); }
      });
      articleListEl.appendChild(el);
    });

    const els = Array.from(articleListEl.querySelectorAll('.article-item'));
    els.forEach((el, idx) => {
      el.style.animationDelay = Math.min(idx * 0.045, 0.5) + 's';
      el.classList.add('animate-in');
      el.addEventListener('animationend', () => {
        el.classList.remove('animate-in');
        el.style.animationDelay = '';
      }, { once: true });
    });

    bindCardTilt();
  }

  function bindCardTilt() {
    if (!finePointer || reduceMotion) return;
    articleListEl.querySelectorAll('.article-item').forEach(item => {
      let raf = 0, rx = 0, ry = 0;
      item.addEventListener('mouseenter', () => { item.classList.remove('animate-in'); item.style.transition = 'transform 0.12s ease, background 0.3s, border-color 0.3s, box-shadow 0.3s'; });
      item.addEventListener('mousemove', (e) => {
        const rect = item.getBoundingClientRect();
        rx = ((e.clientY - rect.top - rect.height / 2) / (rect.height / 2)) * -4;
        ry = ((e.clientX - rect.left - rect.width / 2) / (rect.width / 2)) * 4;
        if (!raf) raf = requestAnimationFrame(() => { item.style.transform = `perspective(1000px) rotateX(${rx}deg) rotateY(${ry}deg) scale(1.015)`; raf = 0; });
      }, { passive: true });
      item.addEventListener('mouseleave', () => {
        if (raf) { cancelAnimationFrame(raf); raf = 0; }
        item.style.transform = 'perspective(1000px) rotateX(0) rotateY(0) scale(1)';
        item.style.transition = 'transform .5s var(--ease), background .3s, border-color .3s, box-shadow .3s';
      });
    });
  }

  /* 阅读模式与路由 */
  let openToken = 0;

  function setReadingMode(on) {
    document.body.classList.toggle('reading-mode', on);
    document.documentElement.classList.toggle('reading-mode', on);
    if (on) document.body.classList.remove('search-mode');
  }

  function closeArticle(fromPopState) {
    if (!document.body.classList.contains('reading-mode')) return;
    setReadingMode(false);
    if (shareSection) shareSection.style.display = 'none';
    
    if (!fromPopState) {
      try {
        const url = new URL(window.location);
        url.searchParams.delete('num');
        history.replaceState(null, '', url.toString());
      } catch (e) {}
    }
    requestAnimationFrame(updateProgress);
  }

  async function openArticle(index, fromPopState) {
    const article = ARTICLES[index];
    if (!article) return;
    const token = ++openToken;

    artTag.textContent = (article.tag || 'POST').toUpperCase();
    artTitle.textContent = article.title || '未命名';
    artDate.textContent = article.date || '';
    navArticleName.textContent = article.title || '';
    artContent.innerHTML = '<p class="md-loading">加载中…</p>';
    tocList.innerHTML = '';

    setReadingMode(true);
    if (suggestionPanel) suggestionPanel.classList.remove('open'); // 隐藏下拉
    articleDetailView.scrollTop = 0;
    updateProgress();

    let md = article.content || '';
    if (article.path) {
      try {
        const res = await fetch(article.path, { cache: 'no-cache' });
        if (res.ok) {
          const text = await res.text();
          if (!/^\s*<(?:!doctype|html)/i.test(text) && text.trim()) md = text;
        }
      } catch (err) { console.warn('[archive] Markdown 加载失败：', err); }
    }
    if (token !== openToken) return;

    artContent.innerHTML = md.trim() ? renderMarkdown(md) : '<p class="md-error">暂无内容。</p>';
    buildToc();
    articleDetailView.scrollTop = 0;
    updateProgress();
    
    if (shareSection) shareSection.style.display = 'block';
  }

  function handleRoute() {
    const params = new URLSearchParams(location.search);
    const num = params.get('num');
    if (num !== null) {
      const index = ARTICLES.findIndex(a => String(a.num || '') === String(num));
      if (index !== -1) openArticle(index, true);
      else closeArticle(true);
    } else {
      closeArticle(true);
    }
  }

  function buildToc() {
    tocList.innerHTML = '';
    const h2s = artContent.querySelectorAll('h2');
    if (!h2s.length) {
      tocList.innerHTML = '<div class="side-nav-item active"><span class="nav-title">正文</span><span class="dot"></span></div>';
      return;
    }
    h2s.forEach((h2, idx) => {
      h2.id = 'sec-' + idx;
      const item = document.createElement('div');
      item.className = 'side-nav-item' + (idx === 0 ? ' active' : '');
      item.innerHTML = `<span class="nav-title">${escapeHtml(h2.textContent)}</span><span class="dot"></span>`;
      item.addEventListener('click', () => { h2.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' }); });
      tocList.appendChild(item);
    });
  }

  let tocRaf = 0;
  function updateToc() {
    const h2s = artContent.querySelectorAll('h2');
    if (!h2s.length) return;
    let current = 0;
    h2s.forEach((h2, idx) => { if (h2.getBoundingClientRect().top <= 150) current = idx; });
    tocList.querySelectorAll('.side-nav-item').forEach((item, idx) => { item.classList.toggle('active', idx === current); });
  }

  function layoutNavProgress() {
    const w = nav.clientWidth, h = nav.clientHeight;
    if (!w || !h) return;
    navProgSvg.setAttribute('viewBox', `0 0 ${w} ${h}`);
    const sw = 2;
    navProgRect.setAttribute('x', sw / 2); navProgRect.setAttribute('y', sw / 2);
    navProgRect.setAttribute('width', w - sw); navProgRect.setAttribute('height', h - sw);
    const r = (h - sw) / 2;
    navProgRect.setAttribute('rx', r); navProgRect.setAttribute('ry', r);
    updateProgress();
  }
  function updateProgress() {
    let p = 0;
    if (document.body.classList.contains('reading-mode')) {
      const el = articleDetailView;
      const max = el.scrollHeight - el.clientHeight;
      p = max > 0 ? Math.max(0, Math.min(1, el.scrollTop / max)) : 0;
    } else {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      p = max > 0 ? Math.max(0, Math.min(1, window.scrollY / max)) : 0;
    }
    navProgRect.style.strokeDashoffset = String(100 - p * 100);
    const pct = Math.round(p * 100);
    if (navProgressText.textContent !== pct + '%') navProgressText.textContent = pct + '%';
  }

  if ('ResizeObserver' in window) new ResizeObserver(layoutNavProgress).observe(nav);
  else window.addEventListener('resize', layoutNavProgress);

  btnBack.addEventListener('click', () => closeArticle(false));
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (document.body.classList.contains('search-mode')) exitSearch();
      else if (document.body.classList.contains('reading-mode')) closeArticle(false);
    }
  });
  articleDetailView.addEventListener('scroll', () => {
    if (!document.body.classList.contains('reading-mode')) return;
    if (tocRaf) return;
    tocRaf = requestAnimationFrame(() => { tocRaf = 0; updateToc(); updateProgress(); });
  }, { passive: true });

  /* ================= 搜索与聚焦建议 ================= */
  function enterSearch() { 
    document.body.classList.add('search-mode'); 
    searchInput.value = '';
    if (suggestionPanel) suggestionPanel.classList.remove('open');
    setTimeout(() => searchInput.focus(), 60); 
  }
  function exitSearch() { 
    document.body.classList.remove('search-mode'); 
    searchInput.value = ''; 
    query = ''; 
    if (suggestionPanel) suggestionPanel.classList.remove('open');
    renderList(); 
  }
  
  btnSearch.addEventListener('click', enterSearch);
  btnSearchClose.addEventListener('click', exitSearch);

  let searchTimer = null;
  searchInput.addEventListener('input', () => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => { 
      query = searchInput.value.trim(); 
      renderList(); 
      renderSuggestions(query); 
    }, 120);
  });
  
  // 回车直接跳转，上下键切换建议
  searchInput.addEventListener('keydown', (e) => { 
    if (e.key === 'Enter') { 
      e.preventDefault(); 
      const active = suggestionPanel.querySelector('.suggestion-item.active');
      if (active) {
        active.click();
      } else {
        const items = suggestionPanel.querySelectorAll('.suggestion-item');
        if (items.length > 0) items[0].click();
        else searchInput.blur();
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      moveActiveSuggestion(1);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      moveActiveSuggestion(-1);
    }
  });

  // 点击外部隐藏建议面板
  document.addEventListener('click', (e) => {
    if (document.body.classList.contains('search-mode')) {
      if (!e.target.closest('.nav') && !e.target.closest('.search-suggestions')) {
        exitSearch();
      }
    }
  });

  function highlightText(text, q) {
    if (!q) return escapeHtml(text);
    const escapedQ = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(${escapedQ})`, 'gi');
    return escapeHtml(text).replace(regex, '<mark>$1</mark>');
  }

  function renderSuggestions(q) {
    if (!q) {
      suggestionPanel.classList.remove('open');
      return;
    }
    
    const matchList = ARTICLES.filter(a => {
      const str = ((a.title || '') + ' ' + (a.summary || '') + ' ' + (a.tag || '')).toLowerCase();
      return str.includes(q.toLowerCase());
    }).slice(0, 5);

    if (matchList.length === 0) {
      suggestionPanel.innerHTML = '<div class="suggestion-empty">没有找到相关建议</div>';
      suggestionPanel.classList.add('open');
      return;
    }

    suggestionPanel.innerHTML = matchList.map((a) => {
      const num = a.num || String(ARTICLES.indexOf(a) + 1);
      const title = highlightText(a.title || '未命名', q);
      return `
        <a href="articles.html?num=${num}" class="suggestion-item" data-num="${num}">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><line x1="16.5" y1="16.5" x2="21" y2="21"/></svg>
          <div class="suggestion-content">
            <div class="suggestion-title">${title} <span class="suggestion-tag">${a.tag || 'POST'}</span></div>
          </div>
        </a>
      `;
    }).join('');
    
    suggestionPanel.classList.add('open');
  }

  function moveActiveSuggestion(dir) {
    const items = Array.from(suggestionPanel.querySelectorAll('.suggestion-item'));
    if (!items.length) return;
    let idx = items.findIndex(el => el.classList.contains('active'));
    if (idx >= 0) items[idx].classList.remove('active');
    
    idx += dir;
    if (idx < 0) idx = items.length - 1;
    if (idx >= items.length) idx = 0;
    
    items[idx].classList.add('active');
    items[idx].scrollIntoView({ block: 'nearest' });
  }

  /* 分享按钮事件 */
  if (btnShare) {
    btnShare.addEventListener('click', async () => {
      const url = window.location.href;
      try {
        if (navigator.clipboard && window.isSecureContext) {
          await navigator.clipboard.writeText(url);
        } else {
          const textArea = document.createElement('textarea');
          textArea.value = url;
          textArea.style.position = 'fixed';
          textArea.style.left = '-9999px';
          document.body.appendChild(textArea);
          textArea.focus();
          textArea.select();
          document.execCommand('copy');
          textArea.remove();
        }
        shareText.textContent = '✓ 链接已复制';
        setTimeout(() => { shareText.textContent = '分享文章'; }, 2000);
      } catch (err) {
        shareText.textContent = '复制失败';
        setTimeout(() => { shareText.textContent = '分享文章'; }, 2000);
      }
    });
  }

  /* 光标/磁吸/背景 */
  const cursorDot = document.getElementById('cursorDot'), cursorRing = document.getElementById('cursorRing');
  if (finePointer && !reduceMotion) {
    let mouseX = window.innerWidth / 2, mouseY = window.innerHeight / 2, ringX = mouseX, ringY = mouseY, rafId = 0;
    function renderCursor() {
      const dx = mouseX - ringX, dy = mouseY - ringY;
      ringX += dx * 0.2; ringY += dy * 0.2;
      cursorRing.style.transform = `translate(${ringX}px, ${ringY}px) translate(-50%, -50%)`;
      if (Math.abs(dx) < 0.1 && Math.abs(dy) < 0.1) { rafId = 0; return; }
      rafId = requestAnimationFrame(renderCursor);
    }
    window.addEventListener('mousemove', (e) => {
      mouseX = e.clientX; mouseY = e.clientY;
      cursorDot.style.transform = `translate(${mouseX}px, ${mouseY}px) translate(-50%, -50%)`;
      cursorDot.classList.add('visible'); cursorRing.classList.add('visible');
      if (!rafId) rafId = requestAnimationFrame(renderCursor);
    }, { passive: true });

    const hoverSelector = 'a, button, [role="button"], .side-nav-item, .icon-btn, .article-item, .suggestion-item';
    document.addEventListener('mouseover', (e) => { if (e.target.closest(hoverSelector)) { cursorRing.classList.add('hovering'); cursorDot.classList.add('hovering'); } });
    document.addEventListener('mouseout', (e) => { if (e.target.closest(hoverSelector) && !(e.relatedTarget && e.relatedTarget.closest(hoverSelector))) { cursorRing.classList.remove('hovering'); cursorDot.classList.remove('hovering'); } });

    document.querySelectorAll('.magnetic').forEach(btn => {
      btn.addEventListener('mousemove', (e) => {
        const rect = btn.getBoundingClientRect();
        btn.style.translate = `${(e.clientX - rect.left - rect.width / 2) * 0.3}px ${(e.clientY - rect.top - rect.height / 2) * 0.3}px`;
      });
      btn.addEventListener('mouseleave', () => btn.style.translate = '');
    });

    let spotRaf = 0, spotX = 0, spotY = 0;
    window.addEventListener('mousemove', (e) => {
      spotX = e.clientX; spotY = e.clientY;
      if (!spotRaf) {
        spotRaf = requestAnimationFrame(() => {
          spotlight.style.setProperty('--sx', spotX + 'px'); spotlight.style.setProperty('--sy', spotY + 'px');
          spotlight.classList.add('on'); spotRaf = 0;
        });
      }
    }, { passive: true });
  }

  if (!reduceMotion) {
    window.addEventListener('click', (e) => {
      if (e.clientX === 0 && e.clientY === 0) return;
      const ripple = document.createElement('div');
      ripple.className = 'click-ripple';
      ripple.style.left = e.clientX + 'px'; ripple.style.top = e.clientY + 'px';
      ripple.style.width = '20px'; ripple.style.height = '20px';
      document.body.appendChild(ripple); setTimeout(() => ripple.remove(), 600);
    });
  }

  const listSpot = articleListEl.querySelector('.hover-spotlight');
  if (listSpot) {
    articleListEl.addEventListener('mousemove', (e) => {
      const rect = articleListEl.getBoundingClientRect();
      listSpot.style.setProperty('--mouse-x', `${e.clientX - rect.left}px`);
      listSpot.style.setProperty('--mouse-y', `${e.clientY - rect.top}px`);
    }, { passive: true });
  }

  const API_URL_DESKTOP = 'https://api.yppp.net/pc.php';
  const API_URL_MOBILE = 'https://www.loliapi.com/acg/pe/';
  const blurLayers = [document.getElementById('blurA'), document.getElementById('blurB')];
  const btnRefresh = document.getElementById('btnRefresh');
  let blurIdx = 0, loading = false;

  function swapBlur(url) {
    const next = 1 - blurIdx;
    blurLayers[next].style.backgroundImage = 'url("' + url + '")';
    void blurLayers[next].offsetWidth;
    blurLayers[next].classList.add('show'); blurLayers[blurIdx].classList.remove('show');
    blurIdx = next;
    document.documentElement.style.setProperty('--article-bg', 'url("' + url + '")');
  }
  function tryImage(url) {
    return new Promise(resolve => {
      const img = new Image(); img.referrerPolicy = 'no-referrer';
      const timer = setTimeout(() => resolve(null), 10000);
      img.onload = () => { clearTimeout(timer); resolve(img.currentSrc || url); };
      img.onerror = () => { clearTimeout(timer); resolve(null); };
      img.src = url;
    });
  }
  async function loadBackground() {
    if (loading) return;
    loading = true; btnRefresh.classList.add('loading');
    const API_URL = window.innerWidth <= 768 ? API_URL_MOBILE : API_URL_DESKTOP;
    let src = await tryImage(API_URL + (API_URL.includes('?') ? '&' : '?') + '_t=' + Date.now());
    if (!src) src = await tryImage(API_URL);
    if (src) swapBlur(src);
    btnRefresh.classList.remove('loading'); loading = false;
  }
  btnRefresh.addEventListener('click', loadBackground);

  const btnFs = document.getElementById('btnFullscreen'), fsIcon = document.getElementById('fsIcon');
  btnFs.addEventListener('click', () => {
    if (!document.fullscreenElement) document.documentElement.requestFullscreen().catch(console.warn);
    else if (document.exitFullscreen) document.exitFullscreen();
  });
  document.addEventListener('fullscreenchange', () => {
    fsIcon.innerHTML = document.fullscreenElement ? `<path d="M4 14h6v6m10-6h-6v6M4 10h6V4m10 6h-6V4"></path>` : `<path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"></path>`;
  });

  let scrollRaf = 0;
  window.addEventListener('scroll', () => {
    if (document.body.classList.contains('reading-mode') || scrollRaf) return;
    scrollRaf = requestAnimationFrame(() => {
      scrollRaf = 0; nav.classList.toggle('scrolled', window.scrollY > 12); updateProgress();
    });
  }, { passive: true });

  window.addEventListener('popstate', handleRoute);

  /* 初始化 */
  renderTagNav();
  renderList();
  layoutNavProgress();
  updateProgress();
  loadBackground();
  handleRoute();

})();
(function () {
  'use strict';

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer  = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  const ARTICLES = Array.isArray(window.ARTICLES) ? window.ARTICLES : [];

  const nav          = document.getElementById('nav');
  const navProgSvg   = document.getElementById('navProgress');
  const navProgRect  = document.getElementById('navProgRect');
  const navProgressText = document.getElementById('navProgressText');
  const sections     = Array.from(document.querySelectorAll('.screen'));
  const sideNavItems = Array.from(document.querySelectorAll('.nav-group-main .side-nav-item'));
  const navLinks     = document.querySelectorAll('[data-target]');
  const spotlight    = document.getElementById('spotlight');

  const articleListEl = document.getElementById('articleListContainer');
  
  /* 文章列表渲染（只渲染最新 3 篇） */
  const arrowSvg = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>';

  function renderArticleList() {
    articleListEl.querySelectorAll('.article-item, .article-empty').forEach(el => el.remove());
    if (!ARTICLES.length) {
      articleListEl.innerHTML = '<div class="article-empty">暂无文章。</div>';
      return;
    }
    
    ARTICLES.slice(0, 3).forEach((a, index) => {
      const item = document.createElement('div');
      item.className = 'article-item stagger-item';
      item.setAttribute('role', 'button'); item.setAttribute('tabindex', '0');
      item.innerHTML = `
        <div class="article-date">${a.tag || 'POST'}</div>
        <div class="article-content"><h3>${a.title || '未命名'}</h3><p>${a.summary || ''}</p></div>
        <div class="article-icon">${arrowSvg}</div>
      `;
      
      const jump = () => {
        const num = a.num || String(index + 1);
        window.location.href = `articles.html?num=${num}`;
      };
      
      item.addEventListener('click', jump);
      item.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); jump(); }
      });
      articleListEl.appendChild(item);
    });
  }

  /* 进度环与数字 */
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
    const max = document.documentElement.scrollHeight - window.innerHeight;
    p = max > 0 ? Math.max(0, Math.min(1, window.scrollY / max)) : 0;
    navProgRect.style.strokeDashoffset = String(100 - p * 100);
    const pct = Math.round(p * 100);
    if (navProgressText && navProgressText.textContent !== pct + '%') navProgressText.textContent = pct + '%';
  }
  if ('ResizeObserver' in window) new ResizeObserver(layoutNavProgress).observe(nav);
  else window.addEventListener('resize', layoutNavProgress);

  /* 按钮高光 */
  document.querySelectorAll('.btn-liquid').forEach(btn => {
    btn.addEventListener('mousemove', (e) => {
      const rect = btn.getBoundingClientRect();
      btn.style.setProperty('--mx', `${e.clientX - rect.left}px`);
      btn.style.setProperty('--my', `${e.clientY - rect.top}px`);
    });
  });

  /* 打字机 */
  const EMAIL = 'yinxue427@foxmail.com';
  const PHRASES = ["Let's build something cool", "一起做点有意思的事", "何か面白いものを作ろう"];
  const typeEl = document.getElementById('typewriterText');
  const hugeTextEl = document.getElementById('hugeText');
  const btnMail = document.getElementById('btnMail');
  const mailBtnText = document.getElementById('mailBtnText');

  let phraseIndex = 0, target = PHRASES[0], charIndex = 0, deleting = false, emailMode = false, timer = null, started = false;
  let pendingEmail = false, pendingCopy = false, copyResetTimer = null;

  function syncEmailClass() { hugeTextEl.classList.toggle('email-mode', emailMode); }
  function schedule(ms) { clearTimeout(timer); timer = setTimeout(step, ms); }
  function step() {
    if (deleting) {
      charIndex = Math.max(0, charIndex - 1);
      typeEl.textContent = target.slice(0, charIndex);
      if (charIndex === 0) {
        deleting = false;
        if (pendingEmail) { pendingEmail = false; emailMode = true; syncEmailClass(); target = EMAIL; charIndex = 0; schedule(80); return; }
        if (emailMode) { emailMode = false; syncEmailClass(); phraseIndex = (phraseIndex + 1) % PHRASES.length; target = PHRASES[phraseIndex]; schedule(420); }
        else { phraseIndex = (phraseIndex + 1) % PHRASES.length; target = PHRASES[phraseIndex]; schedule(420); }
        return;
      }
      schedule(40); return;
    }
    if (charIndex < target.length) { charIndex += 1; typeEl.textContent = target.slice(0, charIndex); }
    if (charIndex >= target.length) {
      if (emailMode && target === EMAIL) {
        if (pendingCopy) { pendingCopy = false; performCopy(); }
        deleting = true; schedule(3400); return;
      }
      deleting = true; schedule(1600); return;
    }
    schedule(emailMode ? 65 : 85);
  }
  function startTypewriter() { if (!started) { started = true; schedule(400); } }
  if (document.getElementById('contact')) {
    new IntersectionObserver((e) => { if (e[0].isIntersecting) startTypewriter(); }, { threshold: 0.2 }).observe(document.getElementById('contact'));
  }

  async function copyEmail() {
    if (navigator.clipboard && window.isSecureContext) return navigator.clipboard.writeText(EMAIL);
    const textArea = document.createElement('textarea');
    textArea.value = EMAIL; textArea.style.position = 'fixed'; textArea.style.left = '-9999px';
    document.body.appendChild(textArea); textArea.focus(); textArea.select();
    document.execCommand('copy'); textArea.remove();
  }
  function showCopiedState() {
    btnMail.classList.add('copied'); mailBtnText.textContent = '✓ 已复制';
    clearTimeout(copyResetTimer);
    copyResetTimer = setTimeout(() => { btnMail.classList.remove('copied'); mailBtnText.textContent = '发个邮件'; }, 2200);
  }
  async function performCopy() {
    try { await copyEmail(); showCopiedState(); }
    catch (err) { mailBtnText.textContent = '复制失败'; clearTimeout(copyResetTimer); copyResetTimer = setTimeout(() => { mailBtnText.textContent = '发个邮件'; }, 2000); }
  }

  if (btnMail) {
    btnMail.addEventListener('click', () => {
      startTypewriter();
      if (emailMode && target === EMAIL) {
        if (charIndex >= EMAIL.length) { performCopy(); clearTimeout(timer); deleting = true; schedule(3400); return; }
        pendingCopy = true; if (deleting) deleting = false; clearTimeout(timer); schedule(60); return;
      }
      pendingEmail = true; pendingCopy = true; if (!deleting) deleting = true; clearTimeout(timer); schedule(60);
    });
  }

  /* 光标、涟漪、磁吸 */
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

    const hoverSelector = 'a, button, [role="button"], .side-nav-item, .icon-btn';
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

  /* 光斑、卡片 3D、TOC */
  const aboutSpot = document.querySelector('#aboutRight .hover-spotlight');
  if (aboutSpot) {
    document.getElementById('aboutRight').addEventListener('mousemove', (e) => {
      const rect = e.currentTarget.getBoundingClientRect();
      aboutSpot.style.setProperty('--mouse-x', `${e.clientX - rect.left}px`);
      aboutSpot.style.setProperty('--mouse-y', `${e.clientY - rect.top}px`);
    }, { passive: true });
  }
  const listSpot = articleListEl.querySelector('.hover-spotlight');
  if (listSpot) {
    articleListEl.addEventListener('mousemove', (e) => {
      const rect = articleListEl.getBoundingClientRect();
      listSpot.style.setProperty('--mouse-x', `${e.clientX - rect.left}px`);
      listSpot.style.setProperty('--mouse-y', `${e.clientY - rect.top}px`);
    }, { passive: true });
  }

  function bindCardTilt() {
    if (!finePointer || reduceMotion) return;
    articleListEl.querySelectorAll('.article-item').forEach(item => {
      let raf = 0, rx = 0, ry = 0;
      item.addEventListener('mouseenter', () => item.style.transition = 'transform 0.12s ease, background 0.3s, border-color 0.3s, box-shadow 0.3s');
      item.addEventListener('mousemove', (e) => {
        const rect = item.getBoundingClientRect();
        rx = ((e.clientY - rect.top - rect.height / 2) / (rect.height / 2)) * -5;
        ry = ((e.clientX - rect.left - rect.width / 2) / (rect.width / 2)) * 5;
        if (!raf) raf = requestAnimationFrame(() => { item.style.transform = `perspective(1000px) rotateX(${rx}deg) rotateY(${ry}deg) scale(1.02)`; raf = 0; });
      }, { passive: true });
      item.addEventListener('mouseleave', () => {
        if (raf) { cancelAnimationFrame(raf); raf = 0; }
        item.style.transform = 'perspective(1000px) rotateX(0) rotateY(0) scale(1)';
        item.style.transition = 'transform 0.5s var(--ease), background 0.3s, border-color 0.3s, box-shadow 0.3s';
      });
    });
  }

  /* 背景与全屏 */
  const API_URL_DESKTOP = 'https://api.yppp.net/pc.php';
  const API_URL_MOBILE = 'https://www.loliapi.com/acg/pe/';
  const heroLayers = [document.getElementById('heroA'), document.getElementById('heroB')];
  const blurLayers = [document.getElementById('blurA'), document.getElementById('blurB')];
  const btnRefresh = document.getElementById('btnRefresh');
  let heroIdx = 0, blurIdx = 0, loading = false;

  function swapLayer(layers, current, url) {
    const next = 1 - current;
    layers[next].style.backgroundImage = 'url("' + url + '")';
    void layers[next].offsetWidth;
    layers[next].classList.add('show'); layers[current].classList.remove('show');
    return next;
  }
  function applyBackground(url) {
    heroIdx = swapLayer(heroLayers, heroIdx, url); blurIdx = swapLayer(blurLayers, blurIdx, url);
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
    if (src) applyBackground(src);
    btnRefresh.classList.remove('loading'); loading = false;
  }
  if (btnRefresh) btnRefresh.addEventListener('click', loadBackground);

  const btnFs = document.getElementById('btnFullscreen'), fsIcon = document.getElementById('fsIcon');
  if (btnFs) {
    btnFs.addEventListener('click', () => {
      if (!document.fullscreenElement) document.documentElement.requestFullscreen().catch(console.warn);
      else if (document.exitFullscreen) document.exitFullscreen();
    });
    document.addEventListener('fullscreenchange', () => {
      fsIcon.innerHTML = document.fullscreenElement ? `<path d="M4 14h6v6m10-6h-6v6M4 10h6V4m10 6h-6V4"></path>` : `<path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"></path>`;
    });
  }

  /* 滚动导航 */
  let currentIndex = -1;
  function setActive(i) {
    if (i < 0 || i >= sections.length || i === currentIndex) return;
    currentIndex = i;
    sideNavItems.forEach((d, j) => d.classList.toggle('active', j === i));
    document.querySelectorAll('.nav-links a').forEach((d, j) => d.classList.toggle('active', j === i - 1));
  }
  function updateActiveOnScroll() {
    const mid = window.scrollY + window.innerHeight * 0.5;
    let idx = 0;
    for (let i = 0; i < sections.length; i++) {
      if (sections[i].getBoundingClientRect().top + window.scrollY <= mid) idx = i;
    }
    if (window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 4) idx = sections.length - 1;
    setActive(idx);
  }
  let snapTimer = null;
  function goTo(id) {
    const i = sections.findIndex(s => s.id === id);
    if (i < 0) return;
    setActive(i);
    document.documentElement.style.scrollSnapType = 'none';
    const scroll = () => {
      sections[i].scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
      if (snapTimer) clearTimeout(snapTimer);
      snapTimer = setTimeout(() => { document.documentElement.style.scrollSnapType = ''; updateActiveOnScroll(); updateProgress(); }, 800);
    };
    scroll();
  }
  navLinks.forEach(link => link.addEventListener('click', (e) => { e.preventDefault(); goTo(link.getAttribute('data-target')); }));

  let scrollRaf = 0;
  window.addEventListener('scroll', () => {
    if (scrollRaf) return;
    scrollRaf = requestAnimationFrame(() => {
      scrollRaf = 0; nav.classList.toggle('scrolled', window.scrollY > 12); updateActiveOnScroll(); updateProgress();
    });
  }, { passive: true });

  /* 初始化 */
  function observeSections() {
    const map = new Map();
    sections.forEach(screen => {
      const items = Array.from(screen.querySelectorAll('.stagger-item'));
      map.set(screen, items);
      items.forEach((item, index) => item.style.transitionDelay = (index * 0.1) + 's');
    });
    const io = new IntersectionObserver(entries => {
      entries.forEach(e => {
        const items = map.get(e.target);
        if (items) items.forEach(item => item.classList.toggle('in', e.isIntersecting));
      });
    }, { threshold: 0.3 });
    sections.forEach(s => io.observe(s));
  }

  renderArticleList();
  bindCardTilt();
  observeSections();

  layoutNavProgress();
  updateActiveOnScroll();
  updateProgress();
  loadBackground();

})();
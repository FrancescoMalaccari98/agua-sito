/* Aqua — interazioni */
(() => {
  window.aquaReady = true;
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const root = document.documentElement;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- Intro + ingresso hero ---------- */
  const hero = $('.hero');
  $$('[data-hero-step]', hero).forEach((el, i) => el.style.setProperty('--i', i));
  const startHero = () => setTimeout(() => hero.classList.add('is-loaded'), 30);

  const intro = $('.intro');
  if (root.classList.contains('has-intro') && !reduceMotion) {
    document.body.style.overflow = 'hidden';
    try { sessionStorage.setItem('aqua-intro', '1'); } catch (e) {}
    setTimeout(() => {
      intro.classList.add('is-leaving');
      setTimeout(startHero, 350);
      setTimeout(() => {
        root.classList.remove('has-intro');
        document.body.style.overflow = '';
      }, 1150);
    }, 1500);
  } else {
    root.classList.remove('has-intro');
    const heroImg = $('.hero__media img');
    if (heroImg.complete) startHero();
    else { heroImg.addEventListener('load', startHero, { once: true }); setTimeout(startHero, 1200); }
  }

  /* ---------- Header: sfondo e comparsa allo scroll ---------- */
  const header = $('.site-header');
  let lastY = window.scrollY;
  let ticking = false;
  const onScroll = () => {
    const y = window.scrollY;
    header.classList.toggle('is-scrolled', y > 40);
    const menuOpen = document.body.classList.contains('menu-open');
    if (!menuOpen && y > 600 && y > lastY + 4) header.classList.add('is-hidden');
    else if (y < lastY - 4 || y < 600) header.classList.remove('is-hidden');
    lastY = y;
    parallax();
    ticking = false;
  };
  window.addEventListener('scroll', () => {
    if (!ticking) { requestAnimationFrame(onScroll); ticking = true; }
  }, { passive: true });

  /* ---------- Parallasse della citazione ---------- */
  const para = $('[data-parallax]');
  function parallax() {
    if (!para || reduceMotion) return;
    const r = para.parentElement.getBoundingClientRect();
    if (r.bottom < 0 || r.top > innerHeight) return;
    const p = (r.top + r.height / 2 - innerHeight / 2) / innerHeight;
    para.style.transform = `translate3d(0, ${p * -60}px, 0)`;
  }
  onScroll();

  /* ---------- Menu mobile ---------- */
  const burger = $('.burger');
  const mobileMenu = $('#mobile-menu');
  const setMenu = (open) => {
    burger.setAttribute('aria-expanded', String(open));
    burger.setAttribute('aria-label', open ? 'Chiudi il menu' : 'Apri il menu');
    document.body.classList.toggle('menu-open', open);
    document.body.style.overflow = open ? 'hidden' : '';
    if (open) {
      mobileMenu.hidden = false;
      header.classList.remove('is-hidden');
      requestAnimationFrame(() => requestAnimationFrame(() => mobileMenu.classList.add('is-open')));
      setTimeout(() => $('a', mobileMenu).focus({ preventScroll: true }), 350);
    } else {
      mobileMenu.classList.remove('is-open');
      setTimeout(() => { if (!mobileMenu.classList.contains('is-open')) mobileMenu.hidden = true; }, 500);
    }
  };
  burger.addEventListener('click', () => setMenu(burger.getAttribute('aria-expanded') !== 'true'));
  $$('a', mobileMenu).forEach((a) => a.addEventListener('click', () => setMenu(false)));
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && document.body.classList.contains('menu-open')) { setMenu(false); burger.focus(); }
  });
  window.matchMedia('(min-width: 1025px)').addEventListener('change', (e) => { if (e.matches) setMenu(false); });

  /* ---------- Voce di navigazione attiva ---------- */
  const navLinks = $$('.nav__list a');
  const navObs = new IntersectionObserver((entries) => {
    entries.forEach((en) => {
      if (!en.isIntersecting) return;
      navLinks.forEach((a) => a.classList.toggle('is-active', a.getAttribute('href') === '#' + en.target.id));
    });
  }, { rootMargin: '-45% 0px -50% 0px' });
  $$('main > section[id]').forEach((s) => navObs.observe(s));

  /* ---------- Numeri che contano ---------- */
  const countUp = (el) => {
    const target = Number(el.dataset.count);
    if (reduceMotion || target === 0) { el.textContent = target; return; }
    const dur = 1600;
    const t0 = performance.now();
    const tick = (t) => {
      const k = Math.min(1, (t - t0) / dur);
      el.textContent = Math.round(target * (1 - Math.pow(1 - k, 4)));
      if (k < 1) requestAnimationFrame(tick);
    };
    el.textContent = '0';
    requestAnimationFrame(tick);
  };

  /* ---------- Rivelazione allo scroll ---------- */
  const revealObs = new IntersectionObserver((entries) => {
    entries.forEach((en) => {
      if (!en.isIntersecting) return;
      en.target.classList.add('is-visible');
      $$('[data-count]', en.target).forEach(countUp);
      revealObs.unobserve(en.target);
    });
  }, { rootMargin: '0px 0px -12% 0px', threshold: 0.08 });
  $$('.reveal').forEach((el) => {
    const siblings = $$(':scope > .reveal', el.parentElement);
    const idx = siblings.indexOf(el);
    if (idx > 0) el.style.transitionDelay = `${Math.min(idx, 4) * 90}ms`;
    revealObs.observe(el);
  });

  /* ---------- Carta: schede ---------- */
  const tabs = $$('.tabs [role="tab"]');
  const ink = $('.tabs__ink');
  const moveInk = (tab) => {
    ink.style.width = tab.offsetWidth + 'px';
    ink.style.transform = `translateX(${tab.offsetLeft}px)`;
  };
  const selectTab = (tab, focus = false) => {
    tabs.forEach((t) => {
      const on = t === tab;
      t.setAttribute('aria-selected', String(on));
      t.tabIndex = on ? 0 : -1;
      $('#' + t.getAttribute('aria-controls')).hidden = !on;
    });
    moveInk(tab);
    if (focus) tab.focus();
    const first = $(`#${tab.getAttribute('aria-controls')} .drink`);
    if (first) showPreview(first);
  };
  tabs.forEach((t, i) => {
    t.addEventListener('click', () => selectTab(t));
    t.addEventListener('keydown', (e) => {
      const dir = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
      if (dir) { e.preventDefault(); selectTab(tabs[(i + dir + tabs.length) % tabs.length], true); }
    });
  });
  const syncInk = () => moveInk($('.tabs [aria-selected="true"]'));
  window.addEventListener('resize', syncInk);
  if (document.fonts) document.fonts.ready.then(syncInk);
  syncInk();

  /* ---------- Carta: anteprima foto al passaggio ---------- */
  const preview = $('.menu__preview');
  const previewImg = $('img', preview);
  const previewName = $('[data-preview-name]', preview);
  let swapTimer;
  function showPreview(drink) {
    $$('.drink.is-active').forEach((d) => d.classList.remove('is-active'));
    drink.classList.add('is-active');
    const src = drink.dataset.img;
    const name = $('.drink__name', drink).textContent;
    if (previewName.textContent === name) return;
    clearTimeout(swapTimer);
    preview.classList.add('is-swapping');
    swapTimer = setTimeout(() => {
      const done = () => preview.classList.remove('is-swapping');
      previewName.textContent = name;
      if (previewImg.getAttribute('src') === src) { done(); return; }
      previewImg.onload = done;
      previewImg.src = src;
      if (previewImg.complete) done();
    }, 280);
  }
  $$('.drink').forEach((d) => d.addEventListener('mouseenter', () => showPreview(d)));
  [...new Set($$('.drink').map((d) => d.dataset.img))].forEach((src) => { const i = new Image(); i.src = src; });

  /* ---------- Orari: oggi e stato apertura ---------- */
  // giorno 0=dom..6=sab → [apertura, chiusura] in minuti; oltre 1440 = dopo mezzanotte
  const HOURS = { 0: [1080, 1440], 1: null, 2: [1110, 1500], 3: [1110, 1500], 4: [1110, 1500], 5: [1110, 1560], 6: [1110, 1560] };
  const DAYS = ['domenica', 'lunedì', 'martedì', 'mercoledì', 'giovedì', 'venerdì', 'sabato'];
  const now = new Date();
  const day = now.getDay();
  const mins = now.getHours() * 60 + now.getMinutes();
  const fmt = (m) => `${String(Math.floor((m % 1440) / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
  $$('.hours tr').forEach((tr) => {
    if (tr.dataset.days.split(',').map(Number).includes(day)) tr.classList.add('is-today');
  });

  const today = HOURS[day];
  const yesterday = HOURS[(day + 6) % 7];
  let text;
  let open = false;
  if (yesterday && yesterday[1] > 1440 && mins < yesterday[1] - 1440) {
    open = true; text = `Aperto ora · fino alle ${fmt(yesterday[1])}`;
  } else if (today && mins >= today[0] && mins < today[1]) {
    open = true; text = `Aperto ora · fino alle ${fmt(today[1])}`;
  } else if (today && mins < today[0]) {
    text = `Stasera dalle ${fmt(today[0])}`;
  } else {
    let d = 1;
    while (!HOURS[(day + d) % 7]) d++;
    const label = d === 1 ? 'Domani' : DAYS[(day + d) % 7].replace(/^./, (c) => c.toUpperCase());
    text = `${label} dalle ${fmt(HOURS[(day + d) % 7][0])}`;
  }
  /* ---------- Conto alla rovescia all'inaugurazione ---------- */
  const countdown = $('[data-countdown]');
  const opening = countdown ? new Date(countdown.dataset.countdown) : null;
  const beforeOpening = () => !!opening && Date.now() < opening.getTime();

  // prima dell'inaugurazione nessuno stato deve dire "aperto"
  if (beforeOpening()) {
    const openingDay = opening.toLocaleDateString('it-IT', { day: 'numeric', month: 'long', timeZone: 'Europe/Rome' });
    text = `Inaugurazione ${openingDay}`;
    open = false;
  }
  $$('[data-open-status]').forEach((el) => {
    el.textContent = text;
    const status = el.closest('.status');
    if (status) status.classList.toggle('is-closed', !open);
  });

  if (countdown) {
    const heroStatus = $('.hero__meta .status');
    const nums = Object.fromEntries($$('[data-unit]', countdown).map((el) => [el.dataset.unit, el]));
    const pad = (n) => String(n).padStart(2, '0');
    const set = (key, value) => {
      const el = nums[key];
      if (el.textContent === value) return;
      el.textContent = value;
      if (!reduceMotion) {
        el.classList.remove('is-tick');
        void el.offsetWidth; // riavvia l'animazione
        el.classList.add('is-tick');
      }
    };
    const finish = () => {
      countdown.hidden = true;
      heroStatus.hidden = false;
    };
    const render = () => {
      const diff = opening.getTime() - Date.now();
      if (diff <= 0) { finish(); return; }
      const sec = Math.floor(diff / 1000);
      set('d', pad(Math.floor(sec / 86400)));
      set('h', pad(Math.floor((sec % 86400) / 3600)));
      set('m', pad(Math.floor((sec % 3600) / 60)));
      set('s', pad(sec % 60));
      // riallinea al secondo esatto successivo
      setTimeout(render, 1000 - (Date.now() % 1000) + 5);
    };
    if (beforeOpening()) render(); else finish();
  }

  /* ---------- Anno nel footer ---------- */
  $('[data-year]').textContent = now.getFullYear();
})();

/* Agua — interazioni */
(() => {
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- Ingresso hero ---------- */
  const hero = $('.hero');
  $$('[data-hero-step]', hero).forEach((el, i) => el.style.setProperty('--i', i));
  const startHero = () => setTimeout(() => hero.classList.add('is-loaded'), 30);
  const heroImg = $('.hero__media img');
  if (heroImg.complete) startHero();
  else { heroImg.addEventListener('load', startHero, { once: true }); setTimeout(startHero, 1200); }

  /* ---------- Header: sfondo e comparsa allo scroll ---------- */
  const header = $('.site-header');
  let lastY = window.scrollY;
  let ticking = false;
  const onScroll = () => {
    const y = window.scrollY;
    header.classList.toggle('is-scrolled', y > 40);
    const menuOpen = document.body.classList.contains('menu-open');
    header.classList.toggle('is-hidden', !menuOpen && y > 600 && y > lastY + 4);
    if (y < lastY - 4 || y < 600) header.classList.remove('is-hidden');
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
    } else {
      mobileMenu.classList.remove('is-open');
      setTimeout(() => { if (!mobileMenu.classList.contains('is-open')) mobileMenu.hidden = true; }, 500);
    }
  };
  burger.addEventListener('click', () => setMenu(burger.getAttribute('aria-expanded') !== 'true'));
  $$('a', mobileMenu).forEach((a) => a.addEventListener('click', () => setMenu(false)));
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && document.body.classList.contains('menu-open')) { setMenu(false); burger.focus(); } });
  window.matchMedia('(min-width: 1025px)').addEventListener('change', (e) => { if (e.matches) setMenu(false); });

  /* ---------- Voce di navigazione attiva ---------- */
  const navLinks = $$('.nav__list a');
  const sections = navLinks.map((a) => $(a.getAttribute('href'))).filter(Boolean);
  const navObs = new IntersectionObserver((entries) => {
    entries.forEach((en) => {
      if (!en.isIntersecting) return;
      navLinks.forEach((a) => a.classList.toggle('is-active', a.getAttribute('href') === '#' + en.target.id));
    });
  }, { rootMargin: '-45% 0px -50% 0px' });
  sections.forEach((s) => navObs.observe(s));

  /* ---------- Rivelazione allo scroll ---------- */
  const revealObs = new IntersectionObserver((entries) => {
    entries.forEach((en) => {
      if (en.isIntersecting) { en.target.classList.add('is-visible'); revealObs.unobserve(en.target); }
    });
  }, { rootMargin: '0px 0px -12% 0px', threshold: 0.08 });
  $$('.reveal').forEach((el) => {
    // leggero sfalsamento tra fratelli
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
  window.addEventListener('resize', () => moveInk($('.tabs [aria-selected="true"]')));
  if (document.fonts) document.fonts.ready.then(() => moveInk($('.tabs [aria-selected="true"]')));
  moveInk(tabs[0]);

  /* ---------- Carta: anteprima foto al passaggio ---------- */
  const previewImg = $('.menu__preview img');
  let swapTimer;
  function showPreview(drink) {
    $$('.drink.is-active').forEach((d) => d.classList.remove('is-active'));
    drink.classList.add('is-active');
    const src = drink.dataset.img;
    if (!src || previewImg.getAttribute('src') === src) return;
    clearTimeout(swapTimer);
    previewImg.classList.add('is-swapping');
    swapTimer = setTimeout(() => {
      previewImg.onload = () => previewImg.classList.remove('is-swapping');
      previewImg.src = src;
      if (previewImg.complete) previewImg.classList.remove('is-swapping');
    }, 280);
  }
  $$('.drink').forEach((d) => d.addEventListener('mouseenter', () => showPreview(d)));
  // precarica le immagini della carta
  [...new Set($$('.drink').map((d) => d.dataset.img))].forEach((src) => { const i = new Image(); i.src = src; });

  /* ---------- Orari: oggi e stato apertura ---------- */
  // [giorno 0=dom..6=sab]: [apertura, chiusura] in minuti; chiusura oltre 24h = dopo mezzanotte
  const HOURS = { 0: [1080, 1440], 1: null, 2: [1110, 1500], 3: [1110, 1500], 4: [1110, 1500], 5: [1110, 1560], 6: [1110, 1560] };
  const now = new Date();
  const day = now.getDay();
  const mins = now.getHours() * 60 + now.getMinutes();
  const fmt = (m) => `${String(Math.floor((m % 1440) / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
  $$('.hours tr').forEach((tr) => { if (tr.dataset.days.split(',').map(Number).includes(day)) tr.classList.add('is-today'); });

  const statusEl = $('[data-open-status]');
  const today = HOURS[day];
  const yesterday = HOURS[(day + 6) % 7];
  let text, open = false;
  if (yesterday && yesterday[1] > 1440 && mins < yesterday[1] - 1440) {
    open = true; text = `Aperto ora · fino alle ${fmt(yesterday[1])}`;
  } else if (today && mins >= today[0] && mins < today[1]) {
    open = true; text = `Aperto ora · fino alle ${fmt(today[1])}`;
  } else if (today && mins < today[0]) {
    text = `Stasera dalle ${fmt(today[0])}`;
  } else {
    let d = 1; while (!HOURS[(day + d) % 7]) d++;
    const names = ['domenica', 'lunedì', 'martedì', 'mercoledì', 'giovedì', 'venerdì', 'sabato'];
    text = `${d === 1 ? 'Domani' : names[(day + d) % 7].replace(/^./, (c) => c.toUpperCase())} dalle ${fmt(HOURS[(day + d) % 7][0])}`;
  }
  statusEl.textContent = text;
  statusEl.parentElement.classList.toggle('is-closed', !open);

  /* ---------- Prenotazione ---------- */
  const form = $('#booking-form');
  const dateInput = $('#f-date');
  const iso = (d) => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
  dateInput.min = iso(now);

  const guests = $('#f-guests');
  $$('.stepper button').forEach((b) => b.addEventListener('click', () => {
    const v = Math.min(6, Math.max(1, Number(guests.value) + Number(b.dataset.step)));
    guests.value = v; guests.textContent = v;
  }));

  const rules = {
    nome: (v) => v.trim().length >= 2 || 'Inserite il vostro nome',
    data: (v) => {
      if (!v) return 'Scegliete una data';
      const d = new Date(v + 'T12:00');
      if (v < iso(now)) return 'La data è già passata';
      if (d.getDay() === 1) return 'Il lunedì siamo chiusi';
      return true;
    },
    ora: (v) => !!v || 'Scegliete un orario',
    telefono: (v) => /^[+\d][\d\s./-]{6,}$/.test(v.trim()) || 'Inserite un numero valido',
  };
  const check = (el) => {
    const rule = rules[el.name];
    if (!rule) return true;
    const res = rule(el.value);
    const field = el.closest('.field');
    field.classList.toggle('is-invalid', res !== true);
    $('.field__error', field).textContent = res === true ? '' : res;
    return res === true;
  };
  $$('input, select', form).forEach((el) => {
    el.addEventListener('input', () => { if (el.closest('.field').classList.contains('is-invalid')) check(el); });
    el.addEventListener('change', () => check(el));
  });

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const fields = $$('input[name], select[name]', form);
    const results = fields.map(check);
    const firstBad = fields[results.indexOf(false)];
    if (firstBad) { firstBad.focus(); return; }

    // TODO: collegare a un servizio reale (email, Formspree, gestionale prenotazioni)
    const data = new FormData(form);
    const when = new Date(data.get('data') + 'T12:00').toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' });
    const ok = $('.form__success', form);
    ok.textContent = `Grazie, ${data.get('nome').trim().split(' ')[0]}. Abbiamo ricevuto la richiesta per ${guests.value} ${guests.value === '1' ? 'persona' : 'persone'}, ${when} alle ${data.get('ora')}.`;
    ok.hidden = false;
    $('.form__submit', form).hidden = true;
  });

  /* ---------- Anno nel footer ---------- */
  $('[data-year]').textContent = now.getFullYear();
})();

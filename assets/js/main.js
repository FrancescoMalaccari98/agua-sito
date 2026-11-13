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
  const startHero = () => setTimeout(() => {
    hero.classList.add('is-loaded');
    if (heroVideo) setTimeout(heroVideo.start, 900);
  }, 30);

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
    }, 2700); // la Q, poi la parola che si apre, poi una breve pausa sul logo intero
  } else {
    root.classList.remove('has-intro');
    const heroImg = $('.hero__media img');
    if (heroImg.complete) startHero();
    else { heroImg.addEventListener('load', startHero, { once: true }); setTimeout(startHero, 1200); }
  }

  /* ---------- Video dell'hero ----------
     Parte dalla copertina (il drink finito), entra in dissolvenza, e a fine giro
     torna a sfumare sulla copertina: così il ritorno all'inizio non si vede. */
  const heroVideo = (() => {
    const video = $('.hero__video');
    if (!video) return null;
    const media = $('.hero__media');
    // senza video la copertina mostra il drink finito invece del bicchiere vuoto
    const stillFull = () => {
      $$('picture source, picture img', media).forEach((el) => {
        const attr = el.tagName === 'IMG' ? 'src' : 'srcset';
        el.setAttribute(attr, el.getAttribute(attr).replace(/\.jpg$/, '-fine.jpg'));
      });
    };
    const conn = navigator.connection;
    if (reduceMotion || (conn && conn.saveData) || !video.canPlayType('video/mp4')) {
      video.remove();
      stillFull();
      return null;
    }
    const small = window.matchMedia('(max-width: 640px)').matches;
    const FADE = 0.9;   // secondi di dissolvenza, come la transizione CSS
    const PAUSE = 1400; // ms sulla copertina tra un giro e l'altro
    let started = false, inView = true, restartTimer = 0;

    video.muted = true;
    video.defaultMuted = true;
    // HEVC: stessa qualità con circa il 30% di peso in meno (Safari, Chrome su Mac, iPhone);
    // altrimenti H.264, che va ovunque
    const hevc = video.canPlayType('video/mp4; codecs="hvc1.1.6.L123.B0"') !== '';
    video.src = `${video.dataset[small ? 'srcSmall' : 'src']}${hevc ? '.hevc' : ''}.mp4`;
    video.preload = 'auto';

    const play = () => {
      if (!started || !inView || document.hidden || restartTimer) return;
      const p = video.play();
      if (p) p.catch(() => {}); // autoplay bloccato (es. risparmio energetico su iPhone): resta la copertina
    };
    // su iPhone con risparmio energetico l'avvio automatico è bloccato: parte al primo tocco
    const onGesture = () => { if (video.paused && !video.ended) play(); };
    ['touchend', 'click'].forEach((ev) => document.addEventListener(ev, onGesture, { passive: true }));
    video.addEventListener('playing', () => {
      media.classList.add('is-playing');
      ['touchend', 'click'].forEach((ev) => document.removeEventListener(ev, onGesture));
    });
    video.addEventListener('timeupdate', () => {
      if (video.duration && video.currentTime > video.duration - FADE - 0.3) media.classList.remove('is-playing');
    });
    video.addEventListener('ended', () => {
      restartTimer = setTimeout(() => {
        restartTimer = 0;
        video.currentTime = 0;
        play();
      }, PAUSE);
    });
    video.addEventListener('error', () => {
      // se l'HEVC dichiarato non si decodifica, si riprova una volta con H.264
      if (video.src.includes('.hevc.mp4')) { video.src = video.src.replace('.hevc.mp4', '.mp4'); play(); }
      else { video.remove(); media.classList.remove('is-playing'); stillFull(); }
    });

    new IntersectionObserver(([en]) => {
      inView = en.isIntersecting;
      if (inView) play(); else video.pause();
    }).observe(hero);
    document.addEventListener('visibilitychange', () => (document.hidden ? video.pause() : play()));

    return { start() { started = true; play(); } };
  })();

  /* ---------- Link interni: scorrono alla sezione senza scrivere #… nell'indirizzo ----------
     Così ricaricando o riaprendo il sito si riparte sempre dall'inizio. */
  window.scrollTo({ top: 0, behavior: 'instant' });
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[href^="#"]');
    if (!a || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const id = a.getAttribute('href').slice(1);
    const target = id === 'top' || !id ? null : document.getElementById(id);
    if (id && id !== 'top' && !target) return;
    e.preventDefault();
    const behavior = reduceMotion ? 'auto' : 'smooth';
    if (!target) { window.scrollTo({ top: 0, behavior }); return; }
    target.scrollIntoView({ behavior, block: 'start' });
    // porta anche il focus (tastiera e lettori di schermo) senza un secondo salto
    if (!target.matches('a, button, input, select, textarea, [tabindex]')) target.setAttribute('tabindex', '-1');
    target.focus({ preventScroll: true });
  });

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

  /* ---------- Orari: oggi e stato apertura ---------- */
  // giorno 0=dom..6=sab → [apertura, chiusura] in minuti; oltre 1440 = dopo mezzanotte
  // martedì–venerdì 17:00–22:00 · sabato e domenica 22:00–02:00 · lunedì chiuso
  const HOURS = { 0: [1320, 1560], 1: null, 2: [1020, 1320], 3: [1020, 1320], 4: [1020, 1320], 5: [1020, 1320], 6: [1320, 1560] };
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

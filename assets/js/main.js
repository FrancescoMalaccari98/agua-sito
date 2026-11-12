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
    if (pour) pour.start(700);
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
    }, 1500);
  } else {
    root.classList.remove('has-intro');
    const heroImg = $('.hero__media img');
    if (heroImg.complete) startHero();
    else { heroImg.addEventListener('load', startHero, { once: true }); setTimeout(startHero, 1200); }
  }

  /* ---------- Versata animata sulla foto dell'hero ----------
     Coordinate in pixel della foto a 2200×1470: valgono SOLO per questa immagine.
     Se la foto cambia, l'animazione si spegne da sola invece di finire nel posto sbagliato. */
  const pour = (() => {
    const canvas = $('.hero__pour');
    if (!canvas) return null;
    const img = $('.hero__media img');
    if (reduceMotion || !canvas.getContext || !/1470337458703/.test(img.getAttribute('src'))) {
      canvas.remove();
      return null;
    }
    const ctx = canvas.getContext('2d');
    const IW = 2200, IH = 1470;
    const X0 = 1489;            // asse del filo
    const TOP = 350, HIT = 488; // dal beccuccio al cubo di ghiaccio
    const G = 2600;             // gravità (px foto / s²)
    const PROFILE = [[350, 34], [372, 25], [400, 21], [440, 22], [488, 24]]; // y, mezza larghezza
    const SURF = { x: 1490, y: 895, rx: 312, ry: 58 }; // pelo del drink nel bicchiere
    const RIVULETS = [
      [[1488, 494], [1484, 540], [1478, 620], [1483, 700], [1474, 790], [1470, 850]],
      [[1500, 495], [1512, 545], [1522, 630], [1516, 720], [1527, 815]],
      [[1477, 496], [1452, 532], [1444, 605], [1440, 700], [1446, 800]],
    ].map((pts) => {
      let len = 0;
      for (let i = 1; i < pts.length; i++) len += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
      return { pts, len };
    });

    let W = 0, H = 0, dpr = 1, map = null;
    let clock = 0, startAt = Infinity, last = 0, raf = 0;
    let inView = true, started = false;
    let drops = [], ripples = [], bubbles = [];
    let nextRipple = 0, nextBubble = 0, hitDone = false;
    const rand = (a, b) => a + Math.random() * (b - a);
    const clamp01 = (v) => Math.max(0, Math.min(1, v));

    const resize = () => {
      W = canvas.clientWidth; H = canvas.clientHeight;
      if (!W || !H) return;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);
      // stessa matematica di object-fit: cover + object-position della foto
      const pos = getComputedStyle(img).objectPosition.split(' ').map((v) => parseFloat(v) / 100);
      const rw = Math.max(W, H * IW / IH);
      const s = rw / IW;
      map = { s, ox: (W - rw) * (pos[0] || 0.5), oy: (H - IH * s) * (pos[1] || 0.5) };
    };

    const halfAt = (y) => {
      for (let i = 1; i < PROFILE.length; i++) {
        const [y1, w1] = PROFILE[i];
        if (y <= y1) {
          const [y0, w0] = PROFILE[i - 1];
          const k = Math.max(0, (y - y0) / (y1 - y0));
          return w0 + (w1 - w0) * (k * k * (3 - 2 * k));
        }
      }
      return PROFILE[PROFILE.length - 1][1];
    };

    const streamPath = (t, head) => {
      const left = [], right = [];
      for (let y = TOP; y <= head; y += 4) {
        const k = (y - TOP) / (HIT - TOP);
        const cx = X0 + Math.sin(y * 0.045 - t * 9) * 1.8 * k + Math.sin(y * 0.11 + t * 13) * 0.7;
        const w = halfAt(y) + Math.sin(y * 0.07 - t * 14) * 1.5 * k;
        left.push([cx - w, y]);
        right.push([cx + w, y]);
      }
      const p = new Path2D();
      left.forEach(([x, y], i) => (i ? p.lineTo(x, y) : p.moveTo(x, y)));
      for (let i = right.length - 1; i >= 0; i--) p.lineTo(right[i][0], right[i][1]);
      p.closePath();
      if (head < HIT) { // goccia di testa mentre il filo scende
        const w = halfAt(head);
        p.ellipse(X0, head, w * 1.05, w * 1.3, 0, 0, Math.PI * 2);
      }
      return p;
    };

    const drawStream = (t, head) => {
      const path = streamPath(t, head);
      const body = ctx.createLinearGradient(X0 - 34, 0, X0 + 34, 0);
      body.addColorStop(0, 'rgba(120,58,8,0)');
      body.addColorStop(0.16, 'rgba(150,78,14,.38)');
      body.addColorStop(0.34, 'rgba(226,150,58,.34)');
      body.addColorStop(0.44, 'rgba(255,222,150,.52)');
      body.addColorStop(0.58, 'rgba(214,134,44,.3)');
      body.addColorStop(0.86, 'rgba(140,66,10,.36)');
      body.addColorStop(1, 'rgba(120,58,8,0)');
      ctx.fillStyle = body;
      ctx.fill(path);

      ctx.save();
      ctx.clip(path);
      ctx.globalCompositeOperation = 'lighter';
      // anelli di torsione che scendono lungo il filo
      const span = HIT - TOP + 40;
      for (let i = 0; i < 11; i++) {
        const y = TOP - 20 + ((t * 560 + i * (span / 11)) % span);
        const a = 0.05 + 0.05 * Math.sin(i * 2.3 + t * 2.1);
        ctx.fillStyle = `rgba(255,222,160,${Math.max(0.015, a)})`;
        ctx.beginPath();
        ctx.ellipse(X0 + (i % 3) - 1, y, halfAt(y) * 0.9, 1.6 + (i % 3), i % 2 ? -0.22 : -0.08, 0, Math.PI * 2);
        ctx.fill();
      }
      // riflesso speculare che corre verso il basso
      ctx.lineCap = 'round';
      ctx.setLineDash([18, 24, 6, 38, 26, 16]);
      ctx.lineDashOffset = -t * 640;
      ctx.strokeStyle = 'rgba(255,244,212,.6)';
      ctx.lineWidth = 3.2;
      ctx.beginPath();
      ctx.moveTo(X0 - 7, TOP);
      ctx.bezierCurveTo(X0 - 9, TOP + 50, X0 - 5, HIT - 60, X0 - 8, head);
      ctx.stroke();
      ctx.setLineDash([5, 31, 11, 47]);
      ctx.lineDashOffset = -t * 760 + 11;
      ctx.strokeStyle = 'rgba(255,236,190,.28)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(X0 + 9, TOP + 10);
      ctx.lineTo(X0 + 11, head);
      ctx.stroke();
      ctx.restore();

      // attacco morbido sotto il beccuccio
      ctx.save();
      ctx.globalCompositeOperation = 'destination-out';
      const fade = ctx.createLinearGradient(0, TOP, 0, TOP + 22);
      fade.addColorStop(0, 'rgba(0,0,0,1)');
      fade.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = fade;
      ctx.fillRect(X0 - 60, TOP - 4, 120, 26);
      ctx.restore();
    };

    const drawRivulets = (t, sinceHit) => {
      const grow = clamp01(sinceHit / 1.6);
      if (grow <= 0) return;
      ctx.save();
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      RIVULETS.forEach((r, i) => {
        const g = clamp01(grow * 1.15 - i * 0.12);
        if (g <= 0) return;
        const line = new Path2D();
        r.pts.forEach(([x, y], j) => {
          if (!j) { line.moveTo(x, y); return; }
          const [px, py] = r.pts[j - 1];
          line.quadraticCurveTo(px, py, (px + x) / 2, (py + y) / 2);
        });
        line.lineTo(...r.pts[r.pts.length - 1]);
        ctx.globalCompositeOperation = 'source-over';
        ctx.setLineDash([r.len * g, r.len * 2]);
        ctx.lineDashOffset = 0;
        ctx.strokeStyle = 'rgba(196,118,38,.2)';
        ctx.lineWidth = [7, 5, 5.5][i];
        ctx.stroke(line);
        ctx.globalCompositeOperation = 'lighter';
        ctx.setLineDash([9, 38, 4, 55]);
        ctx.lineDashOffset = -t * (120 + i * 25) - i * 17;
        ctx.strokeStyle = `rgba(255,214,150,${0.42 * g})`;
        ctx.lineWidth = 1.6;
        ctx.save();
        ctx.beginPath();
        ctx.rect(1380, r.pts[0][1] - 4, 220, (r.pts[r.pts.length - 1][1] - r.pts[0][1]) * g + 8);
        ctx.clip();
        ctx.stroke(line);
        ctx.restore();
      });
      ctx.restore();
    };

    const drawSurface = (dt, sinceHit) => {
      if (sinceHit < 1.1) return;
      nextRipple -= dt;
      if (nextRipple <= 0) { ripples.push({ age: 0, x: rand(1462, 1500) }); nextRipple = rand(0.6, 0.95); }
      nextBubble -= dt;
      if (nextBubble <= 0) {
        bubbles.push({ x: rand(1260, 1700), y: rand(1060, 1110), r: rand(1.4, 3), v: rand(40, 80), ph: rand(0, 6) });
        nextBubble = rand(0.25, 0.6);
      }
      ctx.save();
      ctx.beginPath();
      ctx.ellipse(SURF.x, SURF.y, SURF.rx, SURF.ry + 4, 0, 0, Math.PI * 2);
      ctx.rect(SURF.x - SURF.rx, SURF.y, SURF.rx * 2, 260);
      ctx.clip('nonzero');
      ctx.globalCompositeOperation = 'lighter';
      ripples = ripples.filter((r) => (r.age += dt) < 2.2);
      ripples.forEach((r) => {
        const k = r.age / 2.2;
        const rx = 14 + k * 250;
        ctx.strokeStyle = `rgba(255,214,150,${0.26 * (1 - k) * (1 - k)})`;
        ctx.lineWidth = 2.2 - k;
        ctx.beginPath();
        ctx.ellipse(r.x, SURF.y + 20 + k * 30, rx, rx * 0.17, 0, 0.05, Math.PI - 0.05);
        ctx.stroke();
      });
      bubbles = bubbles.filter((b) => (b.y -= b.v * dt) > SURF.y + SURF.ry - 6);
      bubbles.forEach((b) => {
        ctx.fillStyle = 'rgba(255,232,190,.22)';
        ctx.beginPath();
        ctx.arc(b.x + Math.sin(b.y * 0.08 + b.ph) * 2, b.y, b.r, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.restore();
    };

    const splash = (n, power) => {
      for (let i = 0; i < n; i++) {
        const dir = Math.random() < 0.5 ? -1 : 1;
        drops.push({
          x: X0 + rand(-14, 14), y: HIT + rand(-4, 2),
          vx: dir * rand(40, 230) * power, vy: -rand(70, 300) * power,
          r: rand(1.1, 3.2), age: 0, life: rand(0.35, 0.75),
        });
      }
    };

    const drawImpact = (t, dt) => {
      drops = drops.filter((d) => (d.age += dt) < d.life);
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const pulse = 0.75 + 0.25 * Math.sin(t * 17) * Math.sin(t * 6.3);
      const glow = ctx.createRadialGradient(X0, HIT + 2, 0, X0, HIT + 2, 46);
      glow.addColorStop(0, `rgba(255,214,140,${0.34 * pulse})`);
      glow.addColorStop(1, 'rgba(255,214,140,0)');
      ctx.fillStyle = glow;
      ctx.fillRect(X0 - 50, HIT - 48, 100, 100);
      drops.forEach((d) => {
        d.vy += 1500 * dt;
        d.x += d.vx * dt;
        d.y += d.vy * dt;
        const a = 1 - d.age / d.life;
        ctx.fillStyle = `rgba(255,222,160,${0.75 * a})`;
        ctx.beginPath();
        ctx.ellipse(d.x, d.y, d.r, d.r * 1.25, 0, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.restore();
    };

    const frame = (now) => {
      raf = 0;
      const dt = Math.min(0.05, last ? (now - last) / 1000 : 0.016);
      last = now;
      clock += dt;
      if (!map) resize();
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);
      if (map) {
        ctx.setTransform(dpr * map.s, 0, 0, dpr * map.s, dpr * map.ox, dpr * map.oy);
        const flow = clock - startAt;
        if (flow > 0) {
          const head = Math.min(HIT, TOP + 0.5 * G * flow * flow);
          const tHit = Math.sqrt((2 * (HIT - TOP)) / G);
          const sinceHit = flow - tHit;
          if (sinceHit >= 0 && !hitDone) { hitDone = true; splash(26, 1.15); }
          if (sinceHit >= 0 && Math.random() < dt * 34) splash(1, 0.7);
          drawRivulets(clock, sinceHit);
          drawSurface(dt, sinceHit);
          drawStream(clock, head);
          drawImpact(clock, dt);
        }
      }
      loop();
    };
    const loop = () => {
      if (!raf && started && inView && !document.hidden) raf = requestAnimationFrame(frame);
    };

    new IntersectionObserver(([en]) => {
      inView = en.isIntersecting;
      if (!inView) last = 0;
      loop();
    }).observe(hero);
    document.addEventListener('visibilitychange', () => { last = 0; loop(); });
    window.addEventListener('resize', () => { map = null; });

    return {
      start(delay = 0) {
        if (started) return;
        started = true;
        startAt = clock + delay / 1000;
        loop();
      },
    };
  })();

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

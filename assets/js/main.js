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
    if (pour) pour.start();
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

  /* ---------- Versata viva sulla foto dell'hero (cinemagraph WebGL) ----------
     Non disegna liquido finto: fa scorrere i pixel veri della foto dentro zone
     calibrate su QUESTA immagine (coordinate in pixel della foto a 2200×1470).
     Se la foto cambia, se WebGL manca o con "riduci movimento" resta la foto ferma. */
  const pour = (() => {
    const canvas = $('.hero__pour');
    if (!canvas) return null;
    const img = $('.hero__media img');
    const off = () => { canvas.remove(); return null; };
    if (reduceMotion || !/1470337458703/.test(img.getAttribute('src'))) return off();
    const opts = { alpha: true, premultipliedAlpha: true, antialias: false, depth: false };
    const gl = canvas.getContext('webgl', opts) || canvas.getContext('experimental-webgl', opts);
    if (!gl) return off();

    const VERT = 'attribute vec2 a;void main(){gl_Position=vec4(a,0.,1.);}';
    const FRAG = `
      precision highp float;
      uniform sampler2D u_tex;
      uniform float u_h;   // altezza tela in px reali
      uniform vec3 u_map;  // px reali per px foto, scostamento x, y
      uniform float u_t;
      const vec2 IMG = vec2(2200., 1470.);

      float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float noise(vec2 p){
        vec2 i = floor(p), f = fract(p); f = f * f * (3. - 2. * f);
        return mix(mix(hash(i), hash(i + vec2(1., 0.)), f.x), mix(hash(i + vec2(0., 1.)), hash(i + vec2(1., 1.)), f.x), f.y);
      }
      vec4 photo(vec2 p){ return texture2D(u_tex, clamp(p / IMG, 0., 1.)); }

      // scorrimento verso il basso: due letture sfasate in dissolvenza incrociata
      vec4 flow(vec2 p, float dist, float speed, float seed){
        float ph = u_t * speed + noise(p * vec2(.09, .025) + seed) * .7;
        float f1 = fract(ph), f2 = fract(ph + .5);
        vec4 a = photo(p - vec2(0., f1 * dist));
        vec4 b = photo(p - vec2(0., f2 * dist));
        return mix(b, a, 1. - abs(2. * f1 - 1.));
      }

      void main(){
        vec2 p = (vec2(gl_FragCoord.x, u_h - gl_FragCoord.y) - u_map.yz) / u_map.x;
        if (p.x < 1160. || p.x > 1820. || p.y < 330. || p.y > 1160.) { gl_FragColor = vec4(0.); return; }
        vec4 col = photo(p);
        float m = 0.;

        // 1. il filo che scende dal mixing glass
        float k = clamp((p.y - 350.) / 138., 0., 1.);
        float sway = sin(p.y * .05 - u_t * 7.) * 1.1 * k;
        float halfW = mix(34., 21., smoothstep(350., 398., p.y)) + 3. * smoothstep(420., 488., p.y);
        float ms = (1. - smoothstep(halfW - 3., halfW + 5., abs(p.x - 1489. - sway)))
                 * smoothstep(338., 358., p.y) * (1. - smoothstep(484., 498., p.y));
        if (ms > 0.) {
          vec4 s = flow(vec2(p.x - sway, p.y), 20. + 30. * k, 2.4, 0.);
          col = mix(col, s, ms); m = max(m, ms);
        }

        // 2. dove colpisce il ghiaccio: il liquido si agita e luccica
        float mi = 1. - smoothstep(14., 50., length((p - vec2(1490., 493.)) * vec2(1., 1.5)));
        if (mi > 0.) {
          vec2 n = vec2(noise(p * .12 + vec2(0., u_t * 9.)), noise(p * .12 + vec2(7.3, u_t * 9.))) - .5;
          vec4 s = photo(p + n * 6.);
          s.rgb *= 1. + n.x * .18;
          col = mix(col, s, mi); m = max(m, mi);
        }

        // 3. il filo sottilissimo che cola lungo il vetro
        float md = (1. - smoothstep(3., 8., abs(p.x - 1393.))) * smoothstep(578., 600., p.y) * (1. - smoothstep(748., 774., p.y));
        if (md > 0.) { col = mix(col, flow(p, 34., 1.3, 3.), md); m = max(m, md); }

        // 4. il drink nel bicchiere: superficie che ondeggia e cerchi dal punto di caduta
        float ex = (p.x - 1490.) / 322.;
        float surf = 890. + 66. * sqrt(max(0., 1. - ex * ex));
        float ml = smoothstep(surf - 16., surf - 3., p.y) * (1. - smoothstep(1122., 1150., p.y))
                 * smoothstep(1172., 1198., p.x) * (1. - smoothstep(1782., 1806., p.x));
        if (ml > 0.) {
          float near = 1. - smoothstep(surf, surf + 130., p.y);
          vec2 r = vec2(p.x - 1478., (p.y - surf) * 5.);
          float rr = length(r);
          float wave = sin(p.x * .055 - u_t * 2.2) * .8
                     + sin(p.x * .13 + u_t * 1.7 + p.y * .03) * .4
                     + sin(rr * .1 - u_t * 5.5) * 1.2 * exp(-rr / 260.);
          vec2 d = vec2(sin(p.y * .07 + u_t * 1.3) * .35 * (1. - smoothstep(1630., 1700., p.x)),
                        wave * (.45 + 1.7 * near));
          col = mix(col, photo(p + d), ml); m = max(m, ml);
        }

        gl_FragColor = vec4(col.rgb * m, m);
      }`;

    const compile = (type, src) => {
      const sh = gl.createShader(type);
      gl.shaderSource(sh, src);
      gl.compileShader(sh);
      return gl.getShaderParameter(sh, gl.COMPILE_STATUS) ? sh : null;
    };
    const vs = compile(gl.VERTEX_SHADER, VERT);
    const fs = compile(gl.FRAGMENT_SHADER, FRAG);
    if (!vs || !fs) return off();
    const prog = gl.createProgram();
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return off();
    gl.useProgram(prog);

    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    const aLoc = gl.getAttribLocation(prog, 'a');
    gl.enableVertexAttribArray(aLoc);
    gl.vertexAttribPointer(aLoc, 2, gl.FLOAT, false, 0, 0);
    const U = Object.fromEntries(['u_tex', 'u_h', 'u_map', 'u_t'].map((n) => [n, gl.getUniformLocation(prog, n)]));

    const tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.uniform1i(U.u_tex, 0);

    const IW = 2200, IH = 1470;
    const scratch = document.createElement('canvas');
    let ready = false, sized = false, clock = 0, last = 0, raf = 0;
    let started = false, inView = true;

    // la foto viene ridimensionata dal browser alla misura esatta in cui appare,
    // così i pixel animati coincidono con quelli dell'immagine sotto
    const resize = () => {
      const W = canvas.clientWidth, H = canvas.clientHeight;
      if (!W || !H || !img.naturalWidth) return false;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);
      gl.viewport(0, 0, canvas.width, canvas.height);
      const pos = getComputedStyle(img).objectPosition.split(' ').map((v) => parseFloat(v) / 100);
      const rw = Math.max(W, H * IW / IH);
      const s = rw / IW;
      const ox = (W - rw) * (isNaN(pos[0]) ? 0.5 : pos[0]);
      const oy = (H - IH * s) * (isNaN(pos[1]) ? 0.5 : pos[1]);
      gl.uniform1f(U.u_h, canvas.height);
      gl.uniform3f(U.u_map, s * dpr, ox * dpr, oy * dpr);
      const tw = Math.min(img.naturalWidth, Math.round(rw * dpr));
      scratch.width = tw;
      scratch.height = Math.round(tw * img.naturalHeight / img.naturalWidth);
      const c2 = scratch.getContext('2d');
      c2.imageSmoothingQuality = 'high';
      c2.drawImage(img, 0, 0, scratch.width, scratch.height);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, scratch);
      return true;
    };

    const frame = (now) => {
      raf = 0;
      clock += Math.min(0.05, last ? (now - last) / 1000 : 0.016);
      last = now;
      if (!sized) {
        try { sized = resize(); } catch (e) { off(); return; } // es. foto senza permesso CORS
      }
      if (sized) {
        gl.uniform1f(U.u_t, clock);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
        if (!ready) { ready = true; canvas.classList.add('is-live'); }
      }
      loop();
    };
    const loop = () => {
      if (!raf && started && inView && !document.hidden && canvas.isConnected) raf = requestAnimationFrame(frame);
    };

    new IntersectionObserver(([en]) => { inView = en.isIntersecting; last = 0; loop(); }).observe(hero);
    document.addEventListener('visibilitychange', () => { last = 0; loop(); });
    let rt;
    window.addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(() => { sized = false; loop(); }, 150); });
    canvas.addEventListener('webglcontextlost', () => off());

    return {
      start() {
        if (started) return;
        const go = () => { started = true; loop(); };
        if (img.complete && img.naturalWidth) go();
        else img.addEventListener('load', go, { once: true });
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

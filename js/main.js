(function () {
  var prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var fxEnabled = !document.documentElement.classList.contains('fx-off');
  var matrixEnabled = !document.documentElement.classList.contains('matrix-off');
  var glitchEnabled = !document.documentElement.classList.contains('glitch-off');

  /* ANIM toggle — CRT transitions only */
  function crtOff() {
    return prefersReduced || !fxEnabled;
  }

  function screenGlitchOff() {
    return prefersReduced || !glitchEnabled;
  }

  /* legacy alias for non-CRT ambient motion (cursor, etc.) */
  var reduced = prefersReduced;

  /* ---- Cursor glow ---- */
  (function initCursorGlow() {
    var glow = document.getElementById('cursor-glow');
    if (!glow) return;

    var x = window.innerWidth / 2;
    var y = window.innerHeight / 2;
    var targetX = x;
    var targetY = y;

    function move(e) {
      targetX = e.clientX;
      targetY = e.clientY;
      if (reduced) {
        x = targetX;
        y = targetY;
        glow.style.transform = 'translate(' + x + 'px, ' + y + 'px) translate(-50%, -50%)';
      }
    }

    function tick() {
      if (!reduced) {
        x += (targetX - x) * 0.12;
        y += (targetY - y) * 0.12;
        glow.style.transform = 'translate(' + x + 'px, ' + y + 'px) translate(-50%, -50%)';
      }
      requestAnimationFrame(tick);
    }

    document.addEventListener('mousemove', move, { passive: true });
    document.addEventListener('touchmove', function (e) {
      if (e.touches[0]) move(e.touches[0]);
    }, { passive: true });

    glow.style.transform = 'translate(' + x + 'px, ' + y + 'px) translate(-50%, -50%)';
    requestAnimationFrame(tick);
  })();

  /* ---- Live clock ---- */
  function pad(n) {
    return n < 10 ? '0' + n : String(n);
  }

  function updateClock() {
    var el = document.getElementById('live-clock');
    if (!el) return;
    var d = new Date();
    el.textContent =
      pad(d.getHours()) + ':' + pad(d.getMinutes()) + ':' + pad(d.getSeconds());
  }

  updateClock();
  setInterval(updateClock, 1000);

  /* ---- Mobile nav ---- */
  var toggle = document.getElementById('nav-toggle');
  var links = document.getElementById('nav-links');

  if (toggle && links) {
    toggle.addEventListener('click', function () {
      var open = links.classList.toggle('is-open');
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    });

    links.querySelectorAll('a').forEach(function (a) {
      a.addEventListener('click', function () {
        links.classList.remove('is-open');
        toggle.setAttribute('aria-expanded', 'false');
      });
    });
  }

  /* ---- Category screens + CRT power cycle ---- */
  var sections = ['system', 'intelgen', 'nanolab', 'misc'];
  var navAnchors = {};
  var currentCat = null;
  var crtBusy = false;

  var CAT_META = {
    system: { title: 'System', path: 'C:\\HOME\\SYSTEM' },
    intelgen: { title: 'IntelGen', path: 'C:\\HOME\\INTELGEN' },
    nanolab: { title: 'NanoLab', path: 'C:\\HOME\\NANOLAB' },
    misc: { title: 'Misc', path: 'C:\\HOME\\MISC' }
  };

  sections.forEach(function (id) {
    var a = document.querySelector(
      '.nav-path-trigger[data-cat="' + id + '"], .nav-links a[data-cat="' + id + '"], .nav-links a[href="#' + id + '"]'
    );
    if (a) navAnchors[id] = a;
  });

  function updateActiveNav() {
    Object.keys(navAnchors).forEach(function (id) {
      navAnchors[id].classList.toggle('is-active', id === currentCat);
    });
    document.querySelectorAll('.cat-hub-btn[data-cat]').forEach(function (btn) {
      btn.classList.toggle('is-active', btn.getAttribute('data-cat') === currentCat);
    });
    var homeBtn = document.getElementById('nav-home');
    if (homeBtn) {
      var onHomeScreen = document.getElementById('home-screen');
      homeBtn.classList.toggle('is-active', !currentCat && !!onHomeScreen);
    }

    /* Highlight the current project link inside path dropdowns */
    var path = (location.pathname || '').replace(/\\/g, '/');
    var file = path.split('/').pop() || '';
    document.querySelectorAll('.nav-path-menu a').forEach(function (a) {
      var href = (a.getAttribute('href') || '').replace(/\\/g, '/');
      var hrefFile = href.split('/').pop() || '';
      a.classList.toggle('is-active', !!file && hrefFile === file);
    });
  }

  function detectPageCategory() {
    /* Project detail pages: infer category from filename */
    if (document.getElementById('home-screen')) return null;

    var PAGE_CAT = {
      'system-build.html': 'system',
      'system-revival.html': 'system',
      'intelgen-app.html': 'intelgen',
      'intelgen-game-launcher.html': 'intelgen',
      'nanolab.html': 'nanolab',
      'nanolab-2.html': 'nanolab',
      'nanolab-gui.html': 'nanolab',
      'retro-computers.html': 'misc',
      'qtos.html': 'misc',
      'gun-mayhem-3.html': 'misc'
    };

    var path = (location.pathname || '').replace(/\\/g, '/');
    var file = path.split('/').pop() || '';
    return PAGE_CAT[file] || null;
  }

  function normalizeCat(raw) {
    if (!raw) return null;
    var key = String(raw).replace(/^#/, '').replace(/^cat-/, '').toLowerCase();
    return CAT_META[key] ? key : null;
  }

  function wait(ms) {
    return new Promise(function (resolve) {
      setTimeout(resolve, ms);
    });
  }

  function closeMobileNav() {
    var links = document.getElementById('nav-links');
    var toggle = document.getElementById('nav-toggle');
    if (links) links.classList.remove('is-open');
    if (toggle) toggle.setAttribute('aria-expanded', 'false');
  }

  function setView(mode, cat) {
    var home = document.getElementById('home-screen');
    var category = document.getElementById('category-screen');
    if (!home || !category) return;

    if (mode === 'home') {
      currentCat = null;
      home.classList.add('is-active');
      home.removeAttribute('hidden');
      category.classList.remove('is-active');
      category.hidden = true;
      category.setAttribute('aria-hidden', 'true');
      document.querySelectorAll('.category-panel').forEach(function (panel) {
        panel.hidden = true;
      });
      try {
        history.replaceState(null, '', location.pathname + location.search);
      } catch (e) { /* ignore */ }
    } else {
      currentCat = cat;
      var meta = CAT_META[cat];
      home.classList.remove('is-active');
      home.setAttribute('hidden', '');
      category.classList.add('is-active');
      category.hidden = false;
      category.removeAttribute('hidden');
      category.setAttribute('aria-hidden', 'false');

      var title = document.getElementById('category-title');
      var path = document.getElementById('category-path');
      if (title) title.textContent = meta.title;
      if (path) path.textContent = meta.path;

      document.querySelectorAll('.category-panel').forEach(function (panel) {
        panel.hidden = panel.getAttribute('data-cat') !== cat;
      });

      try {
        history.replaceState(null, '', '#' + cat);
      } catch (e) { /* ignore */ }
    }

    updateActiveNav();
    window.scrollTo(0, 0);
    updateRainClip();
  }

  function syncMatrixRain() {
    if (!window.IntelGenRain || !window.IntelGenRain.setSpawning) return;
    var home = document.getElementById('home-screen');
    var onHome = !currentCat && home && home.classList.contains('is-active') && !home.hidden;
    var crtBlocking =
      document.body.classList.contains('crt-powering-off') ||
      document.body.classList.contains('crt-blackout') ||
      document.body.classList.contains('crt-powering-on') ||
      document.body.classList.contains('view-fading') ||
      document.body.classList.contains('view-fading-in') ||
      crtBusy;
    var shouldSpawn = matrixEnabled && onHome && !crtBlocking;
    window.IntelGenRain.setSpawning(shouldSpawn);
  }

  var pendingCrt = null;

  function navigateWithPageFade(url) {
    if (prefersReduced) {
      window.location.href = url;
      return;
    }
    try {
      sessionStorage.setItem('intelgen-enter-fade', '1');
    } catch (e) { /* ignore */ }
    document.body.classList.add('view-fading');
    window.setTimeout(function () {
      window.location.href = url;
    }, 220);
  }

  function playEnterPageFade() {
    var shouldFade = false;
    try {
      shouldFade = sessionStorage.getItem('intelgen-enter-fade') === '1';
      if (shouldFade) sessionStorage.removeItem('intelgen-enter-fade');
    } catch (e) { /* ignore */ }
    if (!shouldFade || prefersReduced) {
      document.documentElement.classList.remove('enter-fade');
      return;
    }
    document.body.classList.add('view-fading-in');
    document.documentElement.classList.remove('enter-fade');
    wait(280).then(function () {
      document.body.classList.remove('view-fading-in');
    });
  }

  function playCrtTransition(nextMode, cat) {
    if (crtBusy) {
      pendingCrt = { mode: nextMode, cat: cat };
      return Promise.resolve();
    }
    if (crtOff()) {
      /* Soft fade instead of CRT collapse */
      document.body.classList.remove('crt-powering-off', 'crt-powering-on', 'crt-blackout');
      var fxOff = document.getElementById('crt-fx');
      if (fxOff) fxOff.classList.remove('is-on');

      if (prefersReduced) {
        setView(nextMode, cat);
        return Promise.resolve();
      }

      crtBusy = true;
      pendingCrt = null;
      closeMobileNav();
      if (nextMode !== 'home' && window.IntelGenRain && window.IntelGenRain.setSpawning) {
        window.IntelGenRain.setSpawning(false);
      }

      document.body.classList.add('view-fading');
      return wait(220).then(function () {
        setView(nextMode, cat);
        void document.body.offsetWidth;
        document.body.classList.add('view-fading-in');
        document.body.classList.remove('view-fading');
        return wait(280);
      }).then(function () {
        document.body.classList.remove('view-fading-in');
        crtBusy = false;
        updateRainClip();
        if (pendingCrt) {
          var next = pendingCrt;
          pendingCrt = null;
          return playCrtTransition(next.mode, next.cat);
        }
      }).catch(function () {
        document.body.classList.remove('view-fading', 'view-fading-in');
        crtBusy = false;
        updateRainClip();
      });
    }

    crtBusy = true;
    pendingCrt = null;
    closeMobileNav();

    /* Start rain peter-out as soon as we leave home */
    if (nextMode !== 'home' && window.IntelGenRain && window.IntelGenRain.setSpawning) {
      window.IntelGenRain.setSpawning(false);
    }

    var fx = document.getElementById('crt-fx');
    if (fx) fx.classList.add('is-on');

    document.body.classList.remove('crt-powering-on');
    document.body.classList.add('crt-powering-off');

    return wait(700).then(function () {
      document.body.classList.add('crt-blackout');
      document.body.classList.remove('crt-powering-off');
      setView(nextMode, cat);
      void document.body.offsetWidth;
      document.body.classList.remove('crt-blackout');
      document.body.classList.add('crt-powering-on');
      return wait(620);
    }).then(function () {
      document.body.classList.remove('crt-powering-on');
      if (fx) fx.classList.remove('is-on');
      crtBusy = false;
      /* Recalc clip after CRT scale finishes — mid-transition rects are ~0 and hide rain */
      updateRainClip();
      if (pendingCrt) {
        var next = pendingCrt;
        pendingCrt = null;
        return playCrtTransition(next.mode, next.cat);
      }
    }).catch(function () {
      document.body.classList.remove('crt-powering-off');
      document.body.classList.remove('crt-powering-on');
      document.body.classList.remove('crt-blackout');
      if (fx) fx.classList.remove('is-on');
      crtBusy = false;
      updateRainClip();
    });
  }

  function openCategory(cat, withCrt) {
    var key = normalizeCat(cat);
    if (!key) return;
    var category = document.getElementById('category-screen');
    if (currentCat === key && category && category.classList.contains('is-active')) return;
    if (withCrt === false) setView('category', key);
    else playCrtTransition('category', key);
  }

  function goHome(withCrt) {
    var home = document.getElementById('home-screen');
    if (!currentCat && home && home.classList.contains('is-active')) return;
    if (withCrt === false) setView('home');
    else playCrtTransition('home');
  }

  function closePathMenus(except) {
    document.querySelectorAll('.nav-path-drop').forEach(function (drop) {
      if (except && drop === except) return;
      drop.classList.remove('is-open');
      var trigger = drop.querySelector('.nav-path-trigger');
      var menu = drop.querySelector('.nav-path-menu');
      if (trigger) trigger.setAttribute('aria-expanded', 'false');
      if (menu) menu.hidden = true;
    });
  }

  function initPathDropdowns() {
    var canHover = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    var isHome = !!document.getElementById('home-screen');

    function categoryHref(cat) {
      var brand = document.querySelector('.nav-brand');
      var base = brand ? brand.getAttribute('href') : 'index.html';
      base = (base || 'index.html').split('#')[0];
      if (!base || base === '#' || base === '#top') base = 'index.html';
      return base + '#' + cat;
    }

    function homeHref() {
      var brand = document.querySelector('.nav-brand');
      var base = brand ? brand.getAttribute('href') : 'index.html';
      base = (base || 'index.html').split('#')[0];
      if (!base || base === '#' || base === '#top') base = 'index.html';
      return base;
    }

    var homeBtn = document.getElementById('nav-home');
    if (homeBtn) {
      homeBtn.addEventListener('click', function (e) {
        e.preventDefault();
        closePathMenus();
        closeMobileNav();
        if (isHome) goHome(true);
        else navigateWithPageFade(homeHref());
      });
    }

    if (!isHome) {
      var brand = document.querySelector('.nav-brand');
      if (brand) {
        brand.addEventListener('click', function (e) {
          e.preventDefault();
          closePathMenus();
          closeMobileNav();
          navigateWithPageFade(homeHref());
        });
      }
    }

    document.querySelectorAll('.nav-path-drop').forEach(function (drop) {
      var trigger = drop.querySelector('.nav-path-trigger');
      var menu = drop.querySelector('.nav-path-menu');
      if (!trigger || !menu) return;

      function openMenu() {
        closePathMenus(drop);
        drop.classList.add('is-open');
        trigger.setAttribute('aria-expanded', 'true');
        menu.hidden = false;
      }

      function closeMenu() {
        drop.classList.remove('is-open');
        trigger.setAttribute('aria-expanded', 'false');
        menu.hidden = true;
      }

      if (canHover) {
        drop.addEventListener('mouseenter', openMenu);
        drop.addEventListener('mouseleave', closeMenu);
      }

      trigger.addEventListener('click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        var cat = trigger.getAttribute('data-cat');

        if (!isHome) {
          closePathMenus();
          navigateWithPageFade(categoryHref(cat));
          return;
        }

        if (canHover) {
          closePathMenus();
          openCategory(cat, true);
          return;
        }
        if (drop.classList.contains('is-open')) {
          closeMenu();
          openCategory(cat, true);
        } else {
          openMenu();
        }
      });

      menu.querySelectorAll('a').forEach(function (a) {
        a.addEventListener('click', function () {
          closePathMenus();
          closeMobileNav();
        });
      });
    });

    document.addEventListener('click', function (e) {
      if (!e.target.closest('.nav-path-drop')) closePathMenus();
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') closePathMenus();
    });
  }

  function initCategoryScreens() {
    var home = document.getElementById('home-screen');
    var category = document.getElementById('category-screen');
    if (!home || !category) return;

    document.querySelectorAll('.cat-hub-btn[data-cat]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        openCategory(btn.getAttribute('data-cat'), true);
      });
    });

    var back = document.getElementById('category-back');
    if (back) {
      back.addEventListener('click', function () {
        goHome(true);
      });
    }

    var brand = document.querySelector('.nav-brand');
    if (brand) {
      brand.addEventListener('click', function (e) {
        e.preventDefault();
        goHome(true);
      });
    }

    var hashCat = normalizeCat(location.hash);
    if (hashCat) setView('category', hashCat);
    else setView('home');
    try {
      document.documentElement.removeAttribute('data-open-cat');
    } catch (e) { /* ignore */ }
    playEnterPageFade();

    window.addEventListener('hashchange', function () {
      var next = normalizeCat(location.hash);
      if (next) openCategory(next, true);
      else if (!location.hash || location.hash === '#' || location.hash === '#top') goHome(true);
    });
  }

  /* ---- Hero typewriter ---- */
  function initHeroTypewriter() {
    var textEl = document.getElementById('hero-type-text');
    if (!textEl || textEl.getAttribute('data-typing') === '1') return;
    textEl.setAttribute('data-typing', '1');

    var lines = [
      '14 Computers and counting',
      'RIP Commodore C=',
      'Hello World',
      'All vibe coded, Sorry',
      'NanoLab: Because Arduinos didn\'t have an OS',
      'QTOS: what if bits had a third option',
      'This website boots harder than my laptop',
      'Did I make a dent in the universe?',
      'https://github.com/intelgenv2',
      'Did I put the wrong version of my code in the repo?'
    ];

    var lineIndex = 0;
    var charIndex = 0;
    var deleting = false;
    var holdUntil = 0;
    var typingMs = 38;
    var deletingMs = 22;
    var holdMs = 5000;

    function tick() {
      var now = Date.now();
      var line = lines[lineIndex];

      if (holdUntil && now < holdUntil) {
        setTimeout(tick, Math.min(120, holdUntil - now));
        return;
      }
      holdUntil = 0;

      if (!deleting) {
        charIndex = Math.min(charIndex + 1, line.length);
        textEl.textContent = line.slice(0, charIndex);
        if (charIndex === line.length) {
          if (reduced) {
            return;
          }
          deleting = true;
          holdUntil = now + holdMs;
          setTimeout(tick, holdMs);
          return;
        }
        setTimeout(tick, typingMs + Math.floor(Math.random() * 28));
        return;
      }

      charIndex = Math.max(charIndex - 1, 0);
      textEl.textContent = line.slice(0, charIndex);
      if (charIndex === 0) {
        deleting = false;
        lineIndex = (lineIndex + 1) % lines.length;
        setTimeout(tick, 280);
        return;
      }
      setTimeout(tick, deletingMs);
    }

    if (reduced) {
      textEl.textContent = lines[0];
      return;
    }

    textEl.textContent = '';
    setTimeout(tick, 420);
  }

  /* ---- Scroll reveals ---- */
  function initReveals() {
    var nodes = document.querySelectorAll('.reveal');
    if (!nodes.length) return;

    if (reduced || !('IntersectionObserver' in window)) {
      nodes.forEach(function (n) {
        n.classList.add('is-visible');
      });
      return;
    }

    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            io.unobserve(entry.target);
          }
        });
      },
      { rootMargin: '180px 0px 120px 0px', threshold: 0 }
    );

    nodes.forEach(function (n) {
      io.observe(n);
    });
  }

  /* ---- Soft parallax on backdrop via scroll ---- */
  var backdrop = document.getElementById('backdrop');
  if (backdrop && !prefersReduced) {
    window.addEventListener(
      'scroll',
      function () {
        if (reduced) return;
        var y = window.scrollY * 0.04;
        backdrop.style.transform = 'translateY(' + y + 'px)';
      },
      { passive: true }
    );
  }

  /* ---- Rain clipped to hero / title screen ---- */
  function updateRainClip() {
    var canvas = document.getElementById('rainCanvas');
    var hero = document.getElementById('home-screen') || document.querySelector('.hero');
    if (!canvas || !hero) return;

    if (document.body.classList.contains('boot-active') ||
        document.body.classList.contains('loading-ui-active')) {
      canvas.style.clipPath = '';
      canvas.classList.remove('rain-hero-only');
      return;
    }

    /* Don't sample layout while CRT is scaling — rects collapse to ~0 and hide rain */
    if (crtBusy ||
        document.body.classList.contains('crt-powering-off') ||
        document.body.classList.contains('crt-blackout') ||
        document.body.classList.contains('crt-powering-on')) {
      syncMatrixRain();
      return;
    }

    var homeActive = hero.classList.contains('is-active') && !hero.hidden;
    if (!homeActive) {
      canvas.style.clipPath = '';
      canvas.classList.remove('rain-hero-only');
      syncMatrixRain();
      return;
    }

    var rect = hero.getBoundingClientRect();
    if (rect.width < 8 || rect.height < 8) {
      canvas.style.clipPath = '';
      canvas.classList.remove('rain-hero-only');
      syncMatrixRain();
      return;
    }

    var top = Math.max(0, rect.top);
    var right = Math.max(0, window.innerWidth - rect.right);
    var bottom = Math.max(0, window.innerHeight - rect.bottom);
    var left = Math.max(0, rect.left);

    canvas.classList.add('rain-hero-only');
    canvas.style.clipPath =
      'inset(' + top + 'px ' + right + 'px ' + bottom + 'px ' + left + 'px)';

    syncMatrixRain();
  }

  window.addEventListener('scroll', updateRainClip, { passive: true });
  window.addEventListener('resize', updateRainClip);

  /* ---- Accent color themes ---- */
  var THEMES = {
    red: {
      label: 'Red',
      base: '#dc143c',
      bright: '#ff3355',
      deep: '#8b0000',
      bg: '#0a0002',
      rgb: [220, 20, 60]
    },
    orange: {
      label: 'Orange',
      base: '#ff6a00',
      bright: '#ffb020',
      deep: '#8b3a00',
      bg: '#0a0602',
      rgb: [255, 106, 0]
    },
    amber: {
      label: 'Amber',
      base: '#e8a000',
      bright: '#ffd060',
      deep: '#7a5200',
      bg: '#0a0802',
      rgb: [232, 160, 0]
    },
    green: {
      label: 'Green',
      base: '#22c55e',
      bright: '#6eff9a',
      deep: '#0d5c2e',
      bg: '#020a04',
      rgb: [34, 197, 94]
    },
    cyan: {
      label: 'Cyan',
      base: '#00c8e0',
      bright: '#5ef0ff',
      deep: '#006878',
      bg: '#02080a',
      rgb: [0, 200, 224]
    },
    blue: {
      label: 'Blue',
      base: '#3b82f6',
      bright: '#7eb0ff',
      deep: '#1e3a8a',
      bg: '#02050a',
      rgb: [59, 130, 246]
    },
    magenta: {
      label: 'Magenta',
      base: '#e040a0',
      bright: '#ff70c8',
      deep: '#7a2058',
      bg: '#0a0206',
      rgb: [224, 64, 160]
    }
  };

  var STORAGE_KEY = 'intelgen-accent';
  var root = document.documentElement;
  var themeToggle = document.getElementById('theme-toggle');
  var themeMenu = document.getElementById('theme-menu');
  var themePicker = document.getElementById('theme-picker');

  function rgba(rgb, a) {
    return 'rgba(' + rgb[0] + ', ' + rgb[1] + ', ' + rgb[2] + ', ' + a + ')';
  }

  function applyTheme(id) {
    var theme = THEMES[id] || THEMES.orange;
    id = THEMES[id] ? id : 'orange';

    root.style.setProperty('--red', theme.base);
    root.style.setProperty('--red-bright', theme.bright);
    root.style.setProperty('--red-dim', rgba(theme.rgb, 0.45));
    root.style.setProperty('--red-glow', rgba(theme.rgb, 0.55));
    root.style.setProperty('--border', rgba(theme.rgb, 0.35));
    root.style.setProperty('--accent-deep', theme.deep);
    root.style.setProperty('--bg-dark', theme.bg);
    root.style.setProperty('--bg-panel', 'rgba(10, 8, 6, 0.72)');
    root.style.setProperty('--ch-tasks', theme.base);
    root.style.setProperty('--ch-nanolab', theme.base);
    document.body.style.backgroundColor = theme.bg;

    if (window.IntelGenRain && window.IntelGenRain.setColor) {
      window.IntelGenRain.setColor(theme.rgb[0], theme.rgb[1], theme.rgb[2]);
    }

    var channelText = theme.label + ' channel armed';
    var channelArmed = document.getElementById('channel-armed');
    var footerChannel = document.getElementById('footer-channel');
    if (channelArmed) channelArmed.textContent = channelText;
    if (footerChannel) footerChannel.textContent = channelText;

    if (themeMenu) {
      themeMenu.querySelectorAll('.theme-swatch').forEach(function (btn) {
        var active = btn.getAttribute('data-theme') === id;
        btn.setAttribute('aria-checked', active ? 'true' : 'false');
      });
    }

    try {
      localStorage.setItem(STORAGE_KEY, id);
    } catch (e) { /* ignore */ }
  }

  function closeThemeMenu() {
    if (!themeMenu || !themeToggle) return;
    themeMenu.classList.add('hidden');
    themeToggle.setAttribute('aria-expanded', 'false');
  }

  function openThemeMenu() {
    if (!themeMenu || !themeToggle) return;
    themeMenu.classList.remove('hidden');
    themeToggle.setAttribute('aria-expanded', 'true');
  }

  if (themeToggle && themeMenu) {
    themeToggle.addEventListener('click', function (e) {
      e.stopPropagation();
      if (themeMenu.classList.contains('hidden')) openThemeMenu();
      else closeThemeMenu();
    });

    themeMenu.addEventListener('click', function (e) {
      e.stopPropagation();
      var btn = e.target.closest('.theme-swatch');
      if (!btn) return;
      applyTheme(btn.getAttribute('data-theme'));
      closeThemeMenu();
    });

    document.addEventListener('click', function (e) {
      if (themePicker && !themePicker.contains(e.target)) closeThemeMenu();
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') closeThemeMenu();
    });
  }

  var savedTheme = 'orange';
  try {
    savedTheme = localStorage.getItem(STORAGE_KEY) || 'orange';
  } catch (e) { /* ignore */ }
  applyTheme(savedTheme);

  function initScreenGlitch() {
    var overlay = document.getElementById('screen-glitch');
    var hero = document.querySelector('.hero');
    if (!overlay || !hero) return;

    var heroInView = true;
    var stopped = screenGlitchOff();
    var scheduled = false;

    function updateHeroVisibility() {
      var rect = hero.getBoundingClientRect();
      heroInView = rect.bottom > 80 && rect.top < window.innerHeight * 0.85;
      hero.classList.toggle('is-offscreen', !heroInView);
      if (!heroInView) {
        document.body.classList.remove('screen-glitching');
      }
    }

    window.addEventListener('scroll', updateHeroVisibility, { passive: true });
    window.addEventListener('resize', updateHeroVisibility);
    updateHeroVisibility();

    function burst() {
      if (stopped || screenGlitchOff() || !heroInView) return;
      document.body.classList.add('screen-glitching');
      var duration = 160 + Math.floor(Math.random() * 180);
      setTimeout(function () {
        document.body.classList.remove('screen-glitching');
      }, duration);
    }

    function schedule() {
      if (scheduled) return;
      scheduled = true;
      (function loop() {
        var wait = 2800 + Math.floor(Math.random() * 6500);
        setTimeout(function () {
          if (!stopped && heroInView && !screenGlitchOff()) {
            burst();
            if (Math.random() < 0.28) {
              setTimeout(burst, 220 + Math.floor(Math.random() * 260));
            }
          }
          loop();
        }, wait);
      })();
    }

    if (!stopped) schedule();

    window.IntelGenGlitch = {
      stop: function () {
        stopped = true;
        document.body.classList.remove('screen-glitching');
      },
      start: function () {
        stopped = false;
        schedule();
      }
    };
  }

  function applyFxPreference(on) {
    fxEnabled = !!on;
    document.documentElement.classList.toggle('fx-off', !fxEnabled);
    var btn = document.getElementById('fx-toggle');
    if (btn) btn.setAttribute('aria-pressed', fxEnabled ? 'true' : 'false');
    try {
      localStorage.setItem('intelgen-fx', fxEnabled ? '1' : '0');
    } catch (e) { /* ignore */ }
  }

  function applyGlitchPreference(on) {
    glitchEnabled = !!on;
    document.documentElement.classList.toggle('glitch-off', !glitchEnabled);
    var btn = document.getElementById('glitch-toggle');
    if (btn) btn.setAttribute('aria-pressed', glitchEnabled ? 'true' : 'false');
    try {
      localStorage.setItem('intelgen-glitch', glitchEnabled ? '1' : '0');
    } catch (e) { /* ignore */ }
    if (!glitchEnabled) {
      document.body.classList.remove('screen-glitching');
      if (window.IntelGenGlitch) window.IntelGenGlitch.stop();
    } else if (window.IntelGenGlitch) {
      window.IntelGenGlitch.start();
    }
  }

  function applyMatrixPreference(on) {
    matrixEnabled = !!on;
    document.documentElement.classList.toggle('matrix-off', !matrixEnabled);
    var btn = document.getElementById('matrix-toggle');
    if (btn) btn.setAttribute('aria-pressed', matrixEnabled ? 'true' : 'false');
    try {
      localStorage.setItem('intelgen-matrix', matrixEnabled ? '1' : '0');
    } catch (e) { /* ignore */ }
    syncMatrixRain();
  }

  function initEffectToggles() {
    var fxBtn = document.getElementById('fx-toggle');
    var glitchBtn = document.getElementById('glitch-toggle');
    var matrixBtn = document.getElementById('matrix-toggle');

    if (fxBtn) {
      fxBtn.setAttribute('aria-pressed', fxEnabled ? 'true' : 'false');
      fxBtn.addEventListener('click', function () {
        applyFxPreference(!fxEnabled);
      });
    }

    if (glitchBtn) {
      glitchBtn.setAttribute('aria-pressed', glitchEnabled ? 'true' : 'false');
      glitchBtn.addEventListener('click', function () {
        applyGlitchPreference(!glitchEnabled);
      });
    }

    if (matrixBtn) {
      matrixBtn.setAttribute('aria-pressed', matrixEnabled ? 'true' : 'false');
      matrixBtn.addEventListener('click', function () {
        applyMatrixPreference(!matrixEnabled);
      });
    }

    syncMatrixRain();
  }

  window.IntelGenSite = {
    onReady: function () {
      initEffectToggles();
      initPathDropdowns();
      initCategoryScreens();
      if (!document.getElementById('home-screen')) {
        currentCat = detectPageCategory();
        playEnterPageFade();
      }
      initReveals();
      updateActiveNav();
      updateRainClip();
      initScreenGlitch();
      initHeroTypewriter();
    },
    setTheme: applyTheme
  };
})();

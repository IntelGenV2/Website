(function () {
  var prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
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

  /* ---- Category navigation ---- */
  const currentCategory = document.body.dataset.category;
  function updateActiveNav() {
    document.querySelectorAll('.nav-path-trigger[data-cat]').forEach(function (trigger) {
      trigger.classList.toggle('is-active', trigger.dataset.cat === currentCategory);
    });
    document.querySelectorAll('.page-controls a, .nav-path-menu a').forEach(function (link) {
      if (link.pathname === location.pathname) link.setAttribute('aria-current', 'page');
    });
  }

  const wipe = document.getElementById('page-wipe');
  const resting = 'translateX(0)';
  let leavingPage = false;

  async function slidePanel(from, to) {
    if (!wipe || prefersReduced || !wipe.animate) return;
    try {
      await wipe.decode();
      wipe.style.transform = from;
      wipe.style.visibility = 'visible';
      const slide = wipe.animate([{transform: from}, {transform: to}], {
        duration: 230, easing: 'cubic-bezier(.45,0,.35,1)'
      });
      await slide.finished;
      wipe.style.transform = to;
    } catch {
      // Navigation also works when a local image cannot be decoded.
    }
  }

  function resetPanel() {
    if (wipe) {
      wipe.style.removeProperty('visibility');
      wipe.style.removeProperty('transform');
    }
    document.documentElement.classList.remove('wipe-arrival');
  }

  async function goToPage(url) {
    if (leavingPage) return;
    leavingPage = true;
    await slidePanel('translateX(-110%)', resting);
    const destination = new URL(url, location.href);
    try {
      sessionStorage.setItem('intelgen-wipe-to', destination.pathname + destination.search);
    } catch { /* The destination can still open with storage disabled. */ }
    location.assign(destination.href);
  }

  async function revealPage() {
    if (!document.documentElement.classList.contains('wipe-arrival')) return;
    try {
      await slidePanel(resting, 'translateX(110%)');
    } finally {
      resetPanel();
    }
  }

  document.addEventListener('click', function (event) {
    if (event.defaultPrevented || event.button !== 0 || event.ctrlKey || event.metaKey ||
        event.altKey || event.shiftKey) return;
    const link = event.target.closest('a[href]');
    if (!link || link.hasAttribute('download') || (link.target && link.target !== '_self')) return;
    const destination = new URL(link.href);
    if (destination.origin !== location.origin || !(destination.pathname.endsWith('/') || destination.pathname.endsWith('.html')) ||
        (destination.pathname === location.pathname && destination.search === location.search)) return;
    event.preventDefault();
    goToPage(destination.href);
  });

  window.addEventListener('pageshow', function (event) {
    if (event.persisted) {
      leavingPage = false;
      resetPanel();
    }
  });

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

      if (canHover) {
        drop.addEventListener('mouseenter', openMenu);
        drop.addEventListener('mouseleave', function () { closePathMenus(); });
      }

      trigger.addEventListener('click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        if (canHover || drop.classList.contains('is-open')) {
          goToPage('/projects/' + trigger.dataset.cat + '/');
        } else {
          openMenu();
        }
      });

      menu.querySelectorAll('a').forEach(function (a) {
        a.addEventListener('click', function () { closePathMenus(); });
      });
    });

    document.addEventListener('click', function (e) {
      if (!e.target.closest('.nav-path-drop')) closePathMenus();
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') closePathMenus();
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
          if (prefersReduced) {
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

    if (prefersReduced) {
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

    if (prefersReduced || !('IntersectionObserver' in window)) {
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
        if (prefersReduced) return;
        var y = window.scrollY * 0.04;
        backdrop.style.transform = 'translateY(' + y + 'px)';
      },
      { passive: true }
    );
  }

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
    root.style.setProperty('--border', rgba(theme.rgb, 0.35));
    root.style.setProperty('--accent-deep', theme.deep);
    root.style.setProperty('--bg-dark', theme.bg);
    root.style.setProperty('--bg-panel', 'rgba(10, 8, 6, 0.72)');
    root.style.setProperty('--ch-tasks', theme.base);
    root.style.setProperty('--ch-nanolab', theme.base);
    document.body.style.backgroundColor = theme.bg;

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

  window.IntelGenSite = {
    onReady: function () {
      initPathDropdowns();
      initReveals();
      updateActiveNav();
      initHeroTypewriter();
      revealPage();
    },
    setTheme: applyTheme
  };
})();

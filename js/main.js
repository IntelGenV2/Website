(function () {
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

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

  /* ---- Active nav on scroll ---- */
  var sections = ['about', 'projects'];
  var navAnchors = {};

  sections.forEach(function (id) {
    var a = document.querySelector('.nav-links a[href="#' + id + '"]');
    if (a) navAnchors[id] = a;
  });

  function updateActiveNav() {
    var scrollY = window.scrollY + 120;
    var current = null;

    sections.forEach(function (id) {
      var el = document.getElementById(id);
      if (el && el.offsetTop <= scrollY) current = id;
    });

    Object.keys(navAnchors).forEach(function (id) {
      navAnchors[id].classList.toggle('is-active', id === current);
    });
  }

  window.addEventListener('scroll', updateActiveNav, { passive: true });

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
      { rootMargin: '0px 0px -8% 0px', threshold: 0.12 }
    );

    nodes.forEach(function (n) {
      io.observe(n);
    });
  }

  /* ---- Soft parallax on backdrop via scroll ---- */
  var backdrop = document.getElementById('backdrop');
  if (backdrop && !reduced) {
    window.addEventListener(
      'scroll',
      function () {
        var y = window.scrollY * 0.04;
        backdrop.style.transform = 'translateY(' + y + 'px)';
      },
      { passive: true }
    );
  }

  /* ---- Rain only over the hero / title screen ---- */
  function updateRainClip() {
    var canvas = document.getElementById('rainCanvas');
    var hero = document.querySelector('.hero');
    if (!canvas || !hero) return;

    if (document.body.classList.contains('boot-active') ||
        document.body.classList.contains('loading-ui-active')) {
      canvas.style.clipPath = '';
      canvas.classList.remove('rain-hero-only');
      return;
    }

    var rect = hero.getBoundingClientRect();
    var top = Math.max(0, rect.top);
    var right = Math.max(0, window.innerWidth - rect.right);
    var bottom = Math.max(0, window.innerHeight - rect.bottom);
    var left = Math.max(0, rect.left);

    canvas.classList.add('rain-hero-only');
    canvas.style.clipPath =
      'inset(' + top + 'px ' + right + 'px ' + bottom + 'px ' + left + 'px)';

    if (window.IntelGenRain) {
      var visible = rect.bottom > 0 && rect.top < window.innerHeight;
      if (visible) window.IntelGenRain.resume();
      else window.IntelGenRain.pause();
    }
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
    if (reduced) return;
    var overlay = document.getElementById('screen-glitch');
    var hero = document.querySelector('.hero');
    if (!overlay || !hero) return;

    var heroInView = true;

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
      if (!heroInView) return;
      document.body.classList.add('screen-glitching');
      var duration = 160 + Math.floor(Math.random() * 180);
      setTimeout(function () {
        document.body.classList.remove('screen-glitching');
      }, duration);
    }

    function schedule() {
      var wait = 2800 + Math.floor(Math.random() * 6500);
      setTimeout(function () {
        if (heroInView) {
          burst();
          if (Math.random() < 0.28) {
            setTimeout(burst, 220 + Math.floor(Math.random() * 260));
          }
        }
        schedule();
      }, wait);
    }

    schedule();
  }

  window.IntelGenSite = {
    onReady: function () {
      initReveals();
      updateActiveNav();
      updateRainClip();
      initScreenGlitch();
    },
    setTheme: applyTheme
  };
})();

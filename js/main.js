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
      'Home to Studio 256',
      '14 Computers and counting',
      'RIP Commodore C=',
      'Hello World',
      'NanoLab: Because Arduinos didn\'t have an OS',
      'This website boots harder than my laptop',
      'Did I make a dent in the universe?',
      'LOAD"*",8,1'
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

  window.IntelGenSite = {
    onReady: function () {
      initPathDropdowns();
      initReveals();
      updateActiveNav();
      initHeroTypewriter();
      revealPage();
    }
  };
})();

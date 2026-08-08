(function () {
  var bootScreen = document.getElementById('boot-screen');
  var bootLog = document.getElementById('boot-log');
  var progressBar = document.getElementById('boot-progress-bar');
  var progressPct = document.getElementById('boot-progress-pct');
  var loadingUiScreen = document.getElementById('loading-ui-screen');
  var loadingUiPhase = loadingUiScreen
    ? loadingUiScreen.querySelector('.boot-ui-phase')
    : null;
  var site = document.getElementById('site');

  if (!bootScreen || !bootLog) return;

  var reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var skipped = false;
  var finished = false;

  var lines = [
    { text: 'INTELGENV2.COM STACK', type: 'head' },
    { text: 'BIOS CHECK ....................', status: 'OK' },
    { text: 'MEMORY TEST 16384K ............', status: 'OK' },
    { text: 'DHCP LEASE ACQUIRED ...........', status: 'OK' },
    { text: 'DNS RESOLVE: INTELGENV2.COM ...', status: 'OK' },
    { text: 'ROUTE: EDGE → CDN → ORIGIN', type: 'dim' },
    { text: 'TLS HANDSHAKE .................', status: 'OK' },
    { text: 'SOCKET POOL ONLINE ............', status: 'OK' },
    { text: 'UPLINK NOMINAL', type: 'head' }
  ];

  var BOOT_KEY = 'intelgen-session-booted';

  function markBooted() {
    try {
      sessionStorage.setItem(BOOT_KEY, '1');
    } catch (e) { /* ignore */ }
  }

  function shouldSkipBoot() {
    if (window.location.hash) return true;
    try {
      return sessionStorage.getItem(BOOT_KEY) === '1';
    } catch (e) {
      return false;
    }
  }

  function scrollToHash() {
    var hash = window.location.hash;
    if (!hash) return;
    /* Category hashes are view switches, not scroll targets */
    if (/^#?(?:cat-)?(system|intelgen|nanolab|misc)$/i.test(hash.replace(/^#/, ''))) return;
    var el = document.querySelector(hash);
    if (el) {
      requestAnimationFrame(function () {
        el.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth' });
      });
    }
  }

  var BAR_WIDTH = 24;

  function setProgress(pct) {
    var filled = Math.round((pct / 100) * BAR_WIDTH);
    var empty = Math.max(0, BAR_WIDTH - filled);
    var bar = '[' + '#'.repeat(filled) + '·'.repeat(empty) + ']';
    if (progressBar) progressBar.textContent = bar;
    if (progressPct) progressPct.textContent = Math.round(pct) + '%';
  }

  function wait(ms) {
    return new Promise(function (resolve) {
      setTimeout(resolve, skipped || reducedMotion ? 0 : ms);
    });
  }

  function typeLine(entry, speed) {
    return new Promise(function (resolve) {
      if (skipped) return resolve();

      var text = typeof entry === 'string' ? entry : entry.text;
      var type = entry.type || '';
      var status = entry.status || '';
      var delay = reducedMotion ? 0 : speed;

      var row = document.createElement('div');
      row.className = 'boot-line-row';
      var lineEl = document.createElement('span');
      lineEl.className = 'boot-line';
      if (type) lineEl.classList.add('boot-line-' + type);
      row.appendChild(lineEl);
      bootLog.appendChild(row);

      var i = 0;
      var prefix = '> ';

      function finishLine() {
        if (status) {
          var ok = document.createElement('span');
          ok.className = 'boot-ok';
          ok.textContent = ' ' + status;
          row.appendChild(ok);
        }
        bootLog.scrollTop = bootLog.scrollHeight;
        resolve();
      }

      function tick() {
        if (skipped) return finishLine();
        if (i < prefix.length + text.length) {
          if (i < prefix.length) {
            lineEl.textContent += prefix.charAt(i);
          } else {
            lineEl.textContent += text.charAt(i - prefix.length);
          }
          i++;
          bootLog.scrollTop = bootLog.scrollHeight;
          setTimeout(tick, delay);
        } else {
          finishLine();
        }
      }
      tick();
    });
  }

  function hideLoadingUi() {
    if (!loadingUiScreen) return;
    loadingUiScreen.classList.add('hidden');
    loadingUiScreen.setAttribute('aria-hidden', 'true');
    if (loadingUiPhase) loadingUiPhase.classList.remove('active');
    document.body.classList.remove('loading-ui-active');
  }

  function showLoadingUi() {
    if (!loadingUiScreen || !loadingUiPhase) {
      return Promise.resolve();
    }

    document.body.classList.add('loading-ui-active');
    loadingUiScreen.classList.remove('hidden');
    loadingUiScreen.setAttribute('aria-hidden', 'false');
    loadingUiPhase.classList.add('active');

    if (window.IntelGenRain) {
      window.IntelGenRain.setOpacity('0.35');
    }

    return wait(reducedMotion ? 400 : 2200).then(function () {
      loadingUiPhase.classList.remove('active');
      return wait(reducedMotion ? 120 : 350);
    }).then(function () {
      hideLoadingUi();
    });
  }

  function enterSite() {
    hideLoadingUi();

    if (site) {
      site.classList.remove('hidden');
      site.setAttribute('aria-hidden', 'false');
      site.classList.add('site-ready');
    }
    document.body.classList.remove('boot-active');
    markBooted();

    if (window.IntelGenRain) {
      window.IntelGenRain.setOpacity('0.55');
    }

    setTimeout(function () {
      if (window.IntelGenSite) window.IntelGenSite.onReady();
      scrollToHash();
    }, document.documentElement.hasAttribute('data-open-cat') || reducedMotion ? 0 : 200);
  }

  function finishBoot() {
    if (finished) return;
    finished = true;
    skipped = true;

    setProgress(100);
    bootScreen.style.display = 'none';
    bootScreen.classList.add('is-dismissed');
    document.body.classList.remove('boot-active');

    var showUi =
      window.IntelGenBoot && window.IntelGenBoot.showLoadingUi
        ? window.IntelGenBoot.showLoadingUi()
        : Promise.resolve();

    showUi.then(function () {
      if (window.IntelGenBoot && window.IntelGenBoot.enterSite) {
        window.IntelGenBoot.enterSite();
      }
    });
  }

  function bypassBoot() {
    finished = true;
    skipped = true;
    setProgress(100);
    bootScreen.style.display = 'none';
    bootScreen.classList.add('is-dismissed');
    document.body.classList.remove('boot-active');
    hideLoadingUi();
    enterSite();
  }

  function runBoot() {
    document.body.classList.add('boot-active');
    bootScreen.style.display = '';
    bootScreen.classList.remove('is-dismissed');
    setProgress(0);
    bootLog.innerHTML = '';

    var chain = Promise.resolve();
    var stepPct = 100 / lines.length;

    lines.forEach(function (line, index) {
      chain = chain
        .then(function () {
          return typeLine(line, line.type === 'head' ? 22 : 14);
        })
        .then(function () {
          setProgress((index + 1) * stepPct);
          return wait(reducedMotion ? 30 : line.type === 'head' ? 200 : 90);
        });
    });

    chain
      .then(function () {
        return wait(reducedMotion ? 80 : 350);
      })
      .then(finishBoot);
  }

  function skipBoot(e) {
    if (finished) return;
    if (document.body.classList.contains('loading-ui-active')) return;
    if (e && e.target && e.target.closest && e.target.closest('a')) return;
    skipped = true;
    finishBoot();
  }

  bootScreen.addEventListener('click', function (e) {
    if (document.body.classList.contains('loading-ui-active')) return;
    skipBoot(e);
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' || e.key === ' ') {
      if (document.body.classList.contains('loading-ui-active')) return;
      if (!finished && bootScreen.style.display !== 'none') {
        e.preventDefault();
        skipBoot();
      }
    }
  });

  if (window.IntelGenRain) {
    window.IntelGenRain.setOpacity('0.35');
  }

  window.IntelGenBoot = {
    skip: skipBoot,
    runBoot: runBoot,
    enterSite: enterSite,
    showLoadingUi: showLoadingUi
  };

  function start() {
    if (shouldSkipBoot()) {
      bypassBoot();
    } else {
      runBoot();
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
})();

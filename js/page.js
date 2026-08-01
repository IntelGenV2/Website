(function () {
  /* Mark session so returning to home never re-plays boot */
  try {
    sessionStorage.setItem('intelgen-session-booted', '1');
  } catch (e) { /* ignore */ }

  /* Inner pages: no boot — show site immediately */
  var site = document.getElementById('site');
  if (site) {
    site.classList.remove('hidden');
    site.setAttribute('aria-hidden', 'false');
    site.classList.add('site-ready');
  }
  document.body.classList.remove('boot-active');
  document.body.classList.add('page-mode');

  /* Reuse home behaviors when main.js already loaded; otherwise light init */
  if (window.IntelGenSite && typeof window.IntelGenSite.onReady === 'function') {
    window.IntelGenSite.onReady();
  }
})();

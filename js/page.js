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

  /* Wire download buttons to the newest GitHub release asset */
  (function bindLatestGithubDownloads() {
    var links = document.querySelectorAll('.js-gh-latest-download[data-repo]');
    if (!links.length) return;

    var byRepo = {};
    links.forEach(function (a) {
      var repo = a.getAttribute('data-repo');
      if (!repo) return;
      if (!byRepo[repo]) byRepo[repo] = [];
      byRepo[repo].push(a);
    });

    Object.keys(byRepo).forEach(function (repo) {
      fetch('https://api.github.com/repos/' + repo + '/releases/latest', {
        headers: { Accept: 'application/vnd.github+json' }
      })
        .then(function (res) {
          if (!res.ok) throw new Error('release fetch failed');
          return res.json();
        })
        .then(function (data) {
          var assets = data.assets || [];
          var rawTag = String(data.tag_name || data.name || '').trim();
          var tag = rawTag.replace(/^v/i, '').replace(/^IntelGen Game Launcher\s*v?/i, '');
          var label = tag ? ('v' + tag) : '';
          byRepo[repo].forEach(function (a) {
            var needle = (a.getAttribute('data-asset') || 'setup.exe').toLowerCase();
            var match = null;
            for (var i = 0; i < assets.length; i++) {
              var name = String(assets[i].name || '').toLowerCase();
              if (name.indexOf(needle) !== -1 && name.slice(-4) === '.exe' && name.indexOf('.sig') === -1) {
                match = assets[i];
                break;
              }
            }
            if (!match) {
              for (var j = 0; j < assets.length; j++) {
                var n = String(assets[j].name || '').toLowerCase();
                if (n.slice(-4) === '.exe' && n.indexOf('.sig') === -1) {
                  match = assets[j];
                  break;
                }
              }
            }
            if (match && match.browser_download_url) {
              a.href = match.browser_download_url;
              a.removeAttribute('target');
              a.setAttribute('download', match.name || '');
            }
          });
          if (label) {
            document.querySelectorAll('.js-gh-latest-meta').forEach(function (meta) {
              meta.textContent = label + ' · x64 setup';
            });
            document.querySelectorAll('script[type="application/ld+json"]').forEach(function (el) {
              try {
                var json = JSON.parse(el.textContent);
                if (json && json.name === 'IntelGen Game Launcher') {
                  json.softwareVersion = tag;
                  for (var k = 0; k < assets.length; k++) {
                    var an = String(assets[k].name || '').toLowerCase();
                    if (an.slice(-4) === '.exe' && an.indexOf('.sig') === -1) {
                      json.downloadUrl = assets[k].browser_download_url;
                      break;
                    }
                  }
                  el.textContent = JSON.stringify(json, null, 2);
                }
              } catch (err) { /* ignore */ }
            });
          }
        })
        .catch(function () {
          /* keep fallback href to /releases/latest */
        });
    });
  })();

  /* Reuse home behaviors when main.js already loaded; otherwise light init */
  if (window.IntelGenSite && typeof window.IntelGenSite.onReady === 'function') {
    window.IntelGenSite.onReady();
  }
})();

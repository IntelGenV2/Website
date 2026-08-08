(function () {
  var canvas = document.getElementById('rainCanvas');
  if (!canvas) return;

  var ctx = canvas.getContext('2d');
  var letters = '10'.split('');
  var cellWidth = 20;
  var overshootFactor = 2;
  var drops = [];
  var intervalId = null;
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var categoryDeepLink =
    document.documentElement.hasAttribute('data-open-cat') ||
    (function () {
      var hash = String(location.hash || '').replace(/^#/, '').replace(/^cat-/, '').toLowerCase();
      return hash === 'system' || hash === 'intelgen' || hash === 'nanolab' || hash === 'misc';
    })();
  /* Never seed a full rain field on category deep-links / refresh */
  var spawning =
    !document.documentElement.classList.contains('matrix-off') && !categoryDeepLink;
  var baseOpacity = reduced ? 0.15 : 0.45;
  var rainRgb = [255, 120, 20];

  function makeDrop(seedAlong) {
    return {
      y: seedAlong ? Math.floor(Math.random() * (canvas.height / 14 + 1)) : 0,
      size: Math.random() * (70 - 10) + 10,
      trail: [],
      finished: false,
      cooldown: seedAlong ? 0 : Math.floor(Math.random() * 70) + 4
    };
  }

  function initDrops(mode) {
    /* mode: 'seed' = spread across screen, 'idle' = waiting to stagger in, 'keep' = resize preserve feel */
    var columns = Math.max(1, Math.floor(canvas.width / cellWidth));
    var prev = drops;
    drops = [];
    for (var i = 0; i < columns; i++) {
      if (mode === 'seed' && spawning) {
        drops[i] = makeDrop(true);
      } else if (mode === 'keep' && prev[i]) {
        drops[i] = prev[i];
      } else {
        drops[i] = makeDrop(false);
        drops[i].finished = true;
        drops[i].cooldown = Math.floor(Math.random() * 90) + 8 + (i % 20);
      }
    }
  }

  function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    if (!drops.length) initDrops(spawning ? 'seed' : 'idle');
    else initDrops('keep');
    /* If column count changed, fill gaps */
    var columns = Math.max(1, Math.floor(canvas.width / cellWidth));
    while (drops.length < columns) {
      var d = makeDrop(false);
      d.finished = !spawning;
      d.cooldown = Math.floor(Math.random() * 90) + 8;
      drops.push(d);
    }
    if (drops.length > columns) drops.length = columns;
  }

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (var i = 0; i < drops.length; i++) {
      var drop = drops[i];
      var x = i * cellWidth + (cellWidth - drop.size) / 2;

      for (var j = 0; j < drop.trail.length; j++) {
        drop.trail[j].alpha -= 0.05;
      }
      drop.trail = drop.trail.filter(function (item) {
        return item.alpha > 0;
      });

      if (!drop.finished) {
        if (drop.y * drop.size < canvas.height + drop.size * overshootFactor) {
          drop.trail.push({
            digit: letters[Math.floor(Math.random() * letters.length)],
            y: drop.y,
            alpha: 1
          });
          drop.y++;
        } else {
          drop.finished = true;
          drop.cooldown = spawning ? Math.floor(Math.random() * 28) + 12 : 0;
        }
      } else if (drop.trail.length === 0 && spawning) {
        if (drop.cooldown > 0) {
          drop.cooldown--;
        } else {
          drop.y = 0;
          drop.size = Math.random() * (70 - 10) + 10;
          drop.finished = false;
          drop.trail = [];
        }
      }

      for (var k = 0; k < drop.trail.length; k++) {
        var item = drop.trail[k];
        var yPos = item.y * drop.size;
        if (k === drop.trail.length - 1) {
          ctx.fillStyle = 'rgba(255, 255, 255, ' + item.alpha + ')';
        } else {
          ctx.fillStyle =
            'rgba(' + rainRgb[0] + ', ' + rainRgb[1] + ', ' + rainRgb[2] + ', ' + item.alpha + ')';
        }
        ctx.font = drop.size + 'px monospace';
        ctx.fillText(item.digit, x, yPos);
      }
    }
  }

  function ensureLoop() {
    if (reduced || intervalId) return;
    intervalId = setInterval(draw, 66);
  }

  /* Soft restart: only schedule idle columns with staggered delays — never blast all at y=0 */
  function scheduleStaggeredStart() {
    for (var i = 0; i < drops.length; i++) {
      var drop = drops[i];
      if (!drop.finished) continue;
      if (drop.trail.length > 0) continue;
      /* Keep an existing countdown; only assign if fully idle */
      if (drop.cooldown <= 0) {
        drop.cooldown = Math.floor(Math.random() * 75) + 6 + (i % 18);
      }
    }
  }

  resize();
  window.addEventListener('resize', resize);

  if (!reduced) ensureLoop();
  canvas.style.opacity = String(baseOpacity);

  window.IntelGenRain = {
    setOpacity: function (value) {
      baseOpacity = Number(value) || baseOpacity;
      canvas.style.opacity = String(baseOpacity);
    },
    setColor: function (r, g, b) {
      rainRgb = [r, g, b];
    },
    pause: function () {
      spawning = false;
    },
    resume: function () {
      this.setSpawning(true);
    },
    setSpawning: function (on) {
      var next = !!on;
      if (next === spawning) return;
      spawning = next;
      if (spawning) {
        canvas.style.opacity = String(baseOpacity);
        scheduleStaggeredStart();
        ensureLoop();
      }
    },
    setEnabled: function (on) {
      this.setSpawning(!!on);
    },
    isSpawning: function () {
      return spawning;
    }
  };
})();

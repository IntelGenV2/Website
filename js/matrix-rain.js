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

  function initDrops() {
    var columns = Math.floor(canvas.width / cellWidth);
    drops = [];
    for (var i = 0; i < columns; i++) {
      drops[i] = {
        y: Math.floor(Math.random() * canvas.height / cellWidth),
        size: Math.random() * (70 - 10) + 10,
        trail: [],
        finished: false,
        cooldown: 0
      };
    }
  }

  function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    initDrops();
  }

  var rainRgb = [255, 120, 20];

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
          var newDigit = letters[Math.floor(Math.random() * letters.length)];
          drop.trail.push({ digit: newDigit, y: drop.y, alpha: 1 });
          drop.y++;
        } else {
          drop.finished = true;
          drop.cooldown = Math.floor(Math.random() * 20) + 10;
        }
      } else if (drop.trail.length === 0) {
        if (drop.cooldown > 0) {
          drop.cooldown--;
        } else {
          drop.y = 0;
          drop.size = Math.random() * (70 - 10) + 10;
          drop.finished = false;
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

  resize();
  window.addEventListener('resize', resize);

  if (!reduced) {
    intervalId = setInterval(draw, 66);
  } else {
    canvas.style.opacity = '0.15';
  }

  window.IntelGenRain = {
    setOpacity: function (value) {
      canvas.style.opacity = String(value);
    },
    setColor: function (r, g, b) {
      rainRgb = [r, g, b];
    },
    pause: function () {
      if (intervalId) clearInterval(intervalId);
      intervalId = null;
    },
    resume: function () {
      if (!reduced && !intervalId) intervalId = setInterval(draw, 66);
    }
  };

  canvas.style.opacity = reduced ? '0.15' : '0.45';
})();

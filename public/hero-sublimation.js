(() => {
  // Astro's client-side router may not re-execute this script tag when
  // navigating back to "/" (it dedupes identical `<script src>` tags across
  // navigations), which would otherwise leave a fresh canvas element with
  // no animation attached to it. `astro:page-load` fires on the first load
  // and every navigation after it, so the whole setup lives in there and
  // re-runs against whatever canvas element currently exists.
  document.addEventListener('astro:page-load', mount);

  function mount() {
  const canvas = document.getElementById('sublimation-canvas');
  if (!canvas || !canvas.getContext || canvas.dataset.spMounted) return;
  canvas.dataset.spMounted = '1';
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const root = getComputedStyle(document.documentElement);
  const colorFrost = root.getPropertyValue('--frost').trim() || '#2c5d7c';
  const colorFrostDeep = root.getPropertyValue('--frost-deep').trim() || '#1d3f56';
  const colorAmber = root.getPropertyValue('--amber').trim() || '#9a6115';

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // --- Geometry: six-armed crystal, three branch pairs per arm -------------
  const ARM_COUNT = 6;
  const ARM_LENGTH = 0.86; // fraction of canvas half-size
  const BRANCH_STEPS = [0.42, 0.62, 0.8];
  const BRANCH_LENGTH = 0.22;
  const BRANCH_ANGLE = Math.PI / 3.4;

  function buildCrystalPaths(size) {
    const cx = size / 2;
    const cy = size / 2;
    const r = size / 2;
    const paths = [];
    for (let i = 0; i < ARM_COUNT; i++) {
      const theta = (i / ARM_COUNT) * Math.PI * 2 - Math.PI / 2;
      const dx = Math.cos(theta);
      const dy = Math.sin(theta);
      const armEndX = cx + dx * r * ARM_LENGTH;
      const armEndY = cy + dy * r * ARM_LENGTH;
      paths.push([[cx, cy], [armEndX, armEndY]]);
      for (const t of BRANCH_STEPS) {
        const bx = cx + dx * r * ARM_LENGTH * t;
        const by = cy + dy * r * ARM_LENGTH * t;
        for (const sign of [-1, 1]) {
          const bTheta = theta + sign * BRANCH_ANGLE;
          const bdx = Math.cos(bTheta);
          const bdy = Math.sin(bTheta);
          const branchLen = r * BRANCH_LENGTH * (1.15 - t * 0.5);
          paths.push([
            [bx, by],
            [bx + bdx * branchLen, by + bdy * branchLen],
          ]);
        }
      }
    }
    // Emission points: tip of every arm + branch, used as vapor origins.
    const emitters = [];
    for (const seg of paths) {
      emitters.push(seg[1]);
    }
    return { paths, emitters, cx, cy, r };
  }

  let dpr = Math.min(window.devicePixelRatio || 1, 2);
  let size = canvas.clientWidth || 360;
  let geometry = buildCrystalPaths(size);

  function resize() {
    size = canvas.clientWidth || 360;
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    geometry = buildCrystalPaths(size);
  }

  function drawCrystal(pulse) {
    ctx.save();
    ctx.translate(geometry.cx, geometry.cy);
    ctx.scale(pulse, pulse);
    ctx.translate(-geometry.cx, -geometry.cy);
    ctx.lineCap = 'round';
    ctx.strokeStyle = colorFrostDeep;
    ctx.globalAlpha = 0.55;
    ctx.lineWidth = Math.max(1, size * 0.012);
    for (const seg of geometry.paths) {
      ctx.beginPath();
      ctx.moveTo(seg[0][0], seg[0][1]);
      ctx.lineTo(seg[1][0], seg[1][1]);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    ctx.fillStyle = colorAmber;
    ctx.beginPath();
    ctx.arc(geometry.cx, geometry.cy, Math.max(1.5, size * 0.014), 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // --- Vapor particles: spawn at an emitter, drift outward + up, fade ------
  const PARTICLE_COUNT = reduceMotion ? 0 : 46;
  const particles = [];

  function spawn(p, immediate) {
    const src = geometry.emitters[(Math.random() * geometry.emitters.length) | 0];
    const outward = Math.atan2(src[1] - geometry.cy, src[0] - geometry.cx);
    const jitter = (Math.random() - 0.5) * 0.7;
    const angle = outward + jitter;
    p.x = src[0] + (Math.random() - 0.5) * size * 0.02;
    p.y = src[1] + (Math.random() - 0.5) * size * 0.02;
    p.vx = Math.cos(angle) * (size * 0.012) - size * 0.0015;
    p.vy = Math.sin(angle) * (size * 0.012) - size * 0.02;
    p.life = 0;
    p.maxLife = 2.6 + Math.random() * 2.2;
    p.size = size * (0.01 + Math.random() * 0.014);
    p.wobble = Math.random() * Math.PI * 2;
    p.wobbleSpeed = 0.6 + Math.random() * 0.8;
    if (immediate) p.life = Math.random() * p.maxLife;
  }

  for (let i = 0; i < PARTICLE_COUNT; i++) {
    const p = {};
    spawn(p, true);
    particles.push(p);
  }

  function drawParticles(dt) {
    ctx.fillStyle = colorFrost;
    for (const p of particles) {
      p.life += dt;
      if (p.life >= p.maxLife) {
        spawn(p, false);
        continue;
      }
      const t = p.life / p.maxLife;
      p.wobble += p.wobbleSpeed * dt;
      const wobbleX = Math.sin(p.wobble) * size * 0.006 * t;
      const x = p.x + p.vx * p.life * 6 + wobbleX;
      const y = p.y + p.vy * p.life * 6 - t * t * size * 0.05;
      const growth = 0.6 + t * 1.6;
      const opacity = t < 0.12 ? t / 0.12 : Math.max(0, 1 - (t - 0.12) / 0.88);
      ctx.globalAlpha = opacity * 0.65;
      ctx.beginPath();
      ctx.arc(x, y, p.size * growth, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  // --- Animation loop --------------------------------------------------------
  let running = false;
  let lastTime = 0;
  const PULSE_PERIOD = 5200;

  function frame(now) {
    if (!running) return;
    const dt = lastTime ? Math.min((now - lastTime) / 1000, 0.05) : 0;
    lastTime = now;
    ctx.clearRect(0, 0, size, size);
    const pulse = 1 + Math.sin((now % PULSE_PERIOD) / PULSE_PERIOD * Math.PI * 2) * 0.012;
    drawCrystal(pulse);
    drawParticles(dt);
    requestAnimationFrame(frame);
  }

  function start() {
    if (running) return;
    running = true;
    lastTime = 0;
    requestAnimationFrame(frame);
  }

  function stop() {
    running = false;
  }

  resize();

  if (reduceMotion) {
    drawCrystal(1);
  } else {
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) start();
          else stop();
        }
      },
      { threshold: 0.05 }
    );
    io.observe(canvas);

    let resizeTimer;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(resize, 150);
    });
  }
  }
})();

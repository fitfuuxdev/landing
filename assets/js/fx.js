(() => {
  'use strict';

  const layer = document.getElementById('fx-layer');
  const canvas = document.getElementById('fx-canvas');
  if (!layer || !canvas) return;

  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isCoarse = window.matchMedia('(pointer: coarse)').matches;
  if (reduceMotion || isCoarse) {
    layer.remove();
    return;
  }

  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  let w = 0;
  let h = 0;

  const resize = () => {
    w = window.innerWidth;
    h = window.innerHeight;
    canvas.width = Math.floor(w * dpr);
    canvas.height = Math.floor(h * dpr);
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };
  resize();
  window.addEventListener('resize', resize, { passive: true });

  /* ---------- Falling/rising neon particles ---------- */
  const PARTICLE_COUNT = window.innerWidth < 720 ? 34 : 64;
  const particles = [];
  const spawnParticle = () => ({
    x: Math.random() * window.innerWidth,
    y: window.innerHeight + Math.random() * window.innerHeight * 0.5,
    r: 0.7 + Math.random() * 1.9,
    vy: 28 + Math.random() * 60,
    drift: (Math.random() - 0.5) * 14,
    alpha: 0.12 + Math.random() * 0.28,
    lime: Math.random() > 0.72
  });
  for (let i = 0; i < PARTICLE_COUNT; i++) {
    const p = spawnParticle();
    p.y = Math.random() * window.innerHeight;
    particles.push(p);
  }

  /* ---------- Cursor ring ---------- */
  const pointer = { x: w * 0.4, y: h * 0.4 };
  const ring = { x: pointer.x, y: pointer.y, r: 26 };
  let ringVisible = false;
  const targetRing = { x: 0, y: 0 };

  window.addEventListener('pointermove', (event) => {
    pointer.x = event.clientX;
    pointer.y = event.clientY;
    if (!ringVisible) {
      ring.x = pointer.x;
      ring.y = pointer.y;
      ringVisible = true;
    }
  }, { passive: true });

  let raf = 0;
  const now = performance.now();
  const state = { time: 0, last: now };

  const loop = (t) => {
    raf = requestAnimationFrame(loop);
    const delta = Math.min((t - state.last) / 1000, 0.05);
    state.last = t;
    state.time += delta;

    ctx.clearRect(0, 0, w, h);

    /* particles rising */
    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];
      p.y -= p.vy * delta;
      p.x += Math.sin(state.time * 0.5 + i) * p.drift * delta;
      if (p.y < -20) {
        particles[i] = spawnParticle();
        continue;
      }
      const tw = 0.6 + 0.4 * Math.sin(state.time * 2 + i);
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = p.lime
        ? `rgba(198,255,0,${(p.alpha * tw).toFixed(3)})`
        : `rgba(230,235,255,${(p.alpha * tw * 0.8).toFixed(3)})`;
      ctx.fill();
    }

    /* cursor ring — trailing light circle */
    if (ringVisible) {
      const k = 1 - Math.exp(-delta * 8);
      ring.x += (pointer.x - ring.x) * k;
      ring.y += (pointer.y - ring.y) * k;

      const pulse = 0.9 + Math.sin(state.time * 3.2) * 0.12;
      const r = ring.r * pulse;
      const grad = ctx.createRadialGradient(ring.x, ring.y, r * 0.15, ring.x, ring.y, r);
      grad.addColorStop(0, 'rgba(198,255,0,0.06)');
      grad.addColorStop(0.62, 'rgba(198,255,0,0.2)');
      grad.addColorStop(0.84, 'rgba(198,255,0,0.6)');
      grad.addColorStop(1, 'rgba(198,255,0,0)');
      ctx.beginPath();
      ctx.arc(ring.x, ring.y, r, 0, Math.PI * 2);
      ctx.fillStyle = grad;
      ctx.fill();

      ctx.beginPath();
      ctx.arc(ring.x, ring.y, r, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(198,255,0,0.75)';
      ctx.lineWidth = 1.6;
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(ring.x, ring.y, r * 0.6, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(198,255,0,0.16)';
      ctx.lineWidth = 1;
      ctx.stroke();

      const sp = ctx.createRadialGradient(pointer.x - 2, pointer.y - 2, 0, pointer.x, pointer.y, 3.5);
      sp.addColorStop(0, 'rgba(255,255,255,0.9)');
      sp.addColorStop(1, 'rgba(198,255,0,0)');
      ctx.beginPath();
      ctx.arc(pointer.x, pointer.y, 3.5, 0, Math.PI * 2);
      ctx.fillStyle = sp;
      ctx.fill();
    }

    if (!document.hidden) raf;
  };

  raf = requestAnimationFrame(loop);
})();
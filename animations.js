/**
 * P&N Electrical Services — Electric Animations
 * Canvas lightning + cursor sparks + ambient particles
 * All disabled when prefers-reduced-motion is set
 */

(function () {
  'use strict';

  const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (REDUCED) return;

  /* ─────────────────────────────────────────
     SHARED UTILITIES
  ───────────────────────────────────────── */
  const rand    = (min, max) => Math.random() * (max - min) + min;
  const randInt = (min, max) => Math.floor(rand(min, max + 1));
  const TAU     = Math.PI * 2;

  const ORANGE = 'rgba(249,115,22,';
  const AMBER  = 'rgba(251,191,36,';
  const WHITE  = 'rgba(255,255,255,';

  /* ─────────────────────────────────────────
     1. HERO LIGHTNING CANVAS
  ───────────────────────────────────────── */
  (function initHeroLightning() {
    const hero = document.querySelector('.hero');
    if (!hero) return;

    const canvas = document.createElement('canvas');
    canvas.setAttribute('aria-hidden', 'true');
    canvas.style.cssText = [
      'position:absolute', 'inset:0', 'width:100%', 'height:100%',
      'pointer-events:none', 'z-index:1', 'opacity:0.55'
    ].join(';');
    hero.appendChild(canvas);

    const ctx = canvas.getContext('2d');

    function resize() {
      canvas.width  = hero.offsetWidth;
      canvas.height = hero.offsetHeight;
    }
    resize();
    window.addEventListener('resize', resize, { passive: true });

    /* Recursive midpoint displacement lightning */
    function segment(x1, y1, x2, y2, rough, depth) {
      if (depth <= 0) {
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        return;
      }
      const mx = (x1 + x2) / 2 + rand(-rough, rough);
      const my = (y1 + y2) / 2 + rand(-rough, rough);
      segment(x1, y1, mx, my, rough * 0.55, depth - 1);
      segment(mx, my, x2, y2, rough * 0.55, depth - 1);
      if (depth > 2 && Math.random() < 0.35) {
        const bx = mx + rand(-rough * 1.5, rough * 1.5);
        const by = my + rough * rand(1, 3);
        segment(mx, my, bx, by, rough * 0.45, depth - 2);
      }
    }

    function flash() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const bolts = randInt(1, 3);
      for (let b = 0; b < bolts; b++) {
        const startX = rand(canvas.width * 0.1, canvas.width * 0.9);
        const endX   = startX + rand(-120, 120);
        const endY   = rand(canvas.height * 0.55, canvas.height * 0.95);
        const rough  = rand(60, 140);

        /* Glow pass */
        ctx.save();
        ctx.beginPath();
        ctx.strokeStyle = ORANGE + '0.25)';
        ctx.lineWidth   = rand(6, 12);
        ctx.shadowColor = ORANGE + '0.8)';
        ctx.shadowBlur  = 30;
        ctx.filter      = 'blur(4px)';
        segment(startX, 0, endX, endY, rough, 6);
        ctx.stroke();
        ctx.restore();

        /* Core pass */
        ctx.save();
        ctx.beginPath();
        ctx.strokeStyle = WHITE + '0.9)';
        ctx.lineWidth   = rand(0.8, 1.8);
        ctx.shadowColor = AMBER + '1)';
        ctx.shadowBlur  = 8;
        segment(startX, 0, endX, endY, rough, 6);
        ctx.stroke();
        ctx.restore();
      }

      /* Fade out */
      let alpha = 1;
      const fade = () => {
        alpha -= 0.06;
        if (alpha <= 0) { ctx.clearRect(0, 0, canvas.width, canvas.height); return; }
        ctx.globalAlpha = alpha;
        requestAnimationFrame(fade);
      };
      setTimeout(() => { requestAnimationFrame(fade); }, 80);
    }

    function schedule() {
      flash();
      setTimeout(schedule, rand(2800, 6500));
    }
    setTimeout(schedule, rand(800, 2000));
  })();

  /* ─────────────────────────────────────────
     2. AMBIENT SPARK PARTICLES (full page)
  ───────────────────────────────────────── */
  (function initAmbientSparks() {
    const canvas = document.createElement('canvas');
    canvas.setAttribute('aria-hidden', 'true');
    canvas.style.cssText = [
      'position:fixed', 'inset:0', 'width:100%', 'height:100%',
      'pointer-events:none', 'z-index:0'
    ].join(';');
    document.body.appendChild(canvas);

    const ctx = canvas.getContext('2d');

    function resize() {
      canvas.width  = window.innerWidth;
      canvas.height = window.innerHeight;
    }
    resize();
    window.addEventListener('resize', resize, { passive: true });

    class Spark {
      constructor() { this.reset(true); }

      reset(initial) {
        this.x    = rand(0, canvas.width);
        this.y    = initial ? rand(0, canvas.height) : canvas.height + 4;
        this.vx   = rand(-0.6, 0.6);
        this.vy   = rand(-1.2, -0.4);
        this.life = 0;
        this.maxLife = rand(80, 200);
        this.size = rand(1, 2.5);
        this.col  = Math.random() > 0.5 ? ORANGE : AMBER;
      }

      update() {
        this.x   += this.vx + Math.sin(this.life * 0.08) * 0.4;
        this.y   += this.vy;
        this.vx  *= 0.99;
        this.vy  *= 0.995;
        this.life++;
        if (this.life > this.maxLife || this.y < -10) this.reset(false);
      }

      draw() {
        const a = Math.sin((this.life / this.maxLife) * Math.PI) * 0.7;
        ctx.save();
        ctx.globalAlpha   = a;
        ctx.shadowColor   = this.col + '1)';
        ctx.shadowBlur    = 6;
        ctx.fillStyle     = this.col + a + ')';
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, TAU);
        ctx.fill();
        ctx.restore();
      }
    }

    const SPARK_COUNT = window.innerWidth < 768 ? 28 : 55;
    const sparks = Array.from({ length: SPARK_COUNT }, () => new Spark());

    let lastTime = 0;
    function loop(ts) {
      if (ts - lastTime < 30) { requestAnimationFrame(loop); return; } // ~33fps cap
      lastTime = ts;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      sparks.forEach(s => { s.update(); s.draw(); });
      requestAnimationFrame(loop);
    }
    requestAnimationFrame(loop);
  })();

  /* ─────────────────────────────────────────
     3. CURSOR SPARK TRAIL (desktop only)
  ───────────────────────────────────────── */
  (function initCursorSparks() {
    if (window.matchMedia('(hover: none)').matches) return; // touch devices skip

    const canvas = document.createElement('canvas');
    canvas.setAttribute('aria-hidden', 'true');
    canvas.style.cssText = [
      'position:fixed', 'inset:0', 'width:100%', 'height:100%',
      'pointer-events:none', 'z-index:9999'
    ].join(';');
    document.body.appendChild(canvas);

    const ctx = canvas.getContext('2d');

    function resize() {
      canvas.width  = window.innerWidth;
      canvas.height = window.innerHeight;
    }
    resize();
    window.addEventListener('resize', resize, { passive: true });

    let mx = -999, my = -999, lastMx = -999, lastMy = -999;

    window.addEventListener('mousemove', (e) => {
      lastMx = mx; lastMy = my;
      mx = e.clientX; my = e.clientY;
    }, { passive: true });

    class TrailSpark {
      constructor(x, y, vx, vy) {
        this.x    = x;
        this.y    = y;
        this.vx   = vx + rand(-2, 2);
        this.vy   = vy + rand(-2, 2);
        this.life = 0;
        this.maxLife = randInt(12, 30);
        this.size = rand(1, 2.8);
        this.col  = Math.random() > 0.4 ? ORANGE : AMBER;
      }

      update() {
        this.x   += this.vx;
        this.y   += this.vy;
        this.vx  *= 0.92;
        this.vy  *= 0.92;
        this.vy  += 0.08; // gravity
        this.life++;
        return this.life < this.maxLife;
      }

      draw() {
        const a = (1 - this.life / this.maxLife) * 0.85;
        ctx.save();
        ctx.globalAlpha = a;
        ctx.shadowColor = this.col + '1)';
        ctx.shadowBlur  = 8;
        ctx.fillStyle   = this.col + a + ')';
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, TAU);
        ctx.fill();
        ctx.restore();
      }
    }

    const trail = [];
    let lastEmit = 0;

    function loop(ts) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const dx = mx - lastMx, dy = my - lastMy;
      const speed = Math.sqrt(dx * dx + dy * dy);

      if (speed > 3 && ts - lastEmit > 16) {
        const count = Math.min(Math.floor(speed / 5), 6);
        for (let i = 0; i < count; i++) {
          trail.push(new TrailSpark(mx, my, -dx * 0.3, -dy * 0.3));
        }
        lastEmit = ts;
      }

      for (let i = trail.length - 1; i >= 0; i--) {
        if (!trail[i].update()) { trail.splice(i, 1); continue; }
        trail[i].draw();
      }

      requestAnimationFrame(loop);
    }
    requestAnimationFrame(loop);
  })();

  /* ─────────────────────────────────────────
     4. CLICK BURST
  ───────────────────────────────────────── */
  (function initClickBurst() {
    const canvas = document.createElement('canvas');
    canvas.setAttribute('aria-hidden', 'true');
    canvas.style.cssText = [
      'position:fixed', 'inset:0', 'width:100%', 'height:100%',
      'pointer-events:none', 'z-index:9998'
    ].join(';');
    document.body.appendChild(canvas);

    const ctx = canvas.getContext('2d');

    function resize() { canvas.width = window.innerWidth; canvas.height = window.innerHeight; }
    resize();
    window.addEventListener('resize', resize, { passive: true });

    class BurstParticle {
      constructor(x, y) {
        const angle = rand(0, TAU);
        const speed = rand(2, 9);
        this.x    = x; this.y = y;
        this.vx   = Math.cos(angle) * speed;
        this.vy   = Math.sin(angle) * speed;
        this.life = 0;
        this.maxLife = randInt(18, 40);
        this.size = rand(1.5, 4);
        this.col  = Math.random() > 0.4 ? ORANGE : (Math.random() > 0.5 ? AMBER : WHITE);
      }
      update() { this.x += this.vx; this.y += this.vy; this.vx *= 0.88; this.vy *= 0.88; this.vy += 0.15; this.life++; return this.life < this.maxLife; }
      draw() {
        const a = (1 - this.life / this.maxLife) * 0.9;
        ctx.save(); ctx.globalAlpha = a; ctx.shadowColor = this.col + '1)'; ctx.shadowBlur = 10;
        ctx.fillStyle = this.col + a + ')';
        ctx.beginPath(); ctx.arc(this.x, this.y, this.size, 0, TAU); ctx.fill(); ctx.restore();
      }
    }

    const particles = [];
    let running = false;

    function loop() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (let i = particles.length - 1; i >= 0; i--) {
        if (!particles[i].update()) { particles.splice(i, 1); continue; }
        particles[i].draw();
      }
      if (particles.length > 0) requestAnimationFrame(loop);
      else running = false;
    }

    document.addEventListener('click', (e) => {
      for (let i = 0; i < 22; i++) particles.push(new BurstParticle(e.clientX, e.clientY));
      if (!running) { running = true; requestAnimationFrame(loop); }
    });

    /* Mobile tap */
    document.addEventListener('touchstart', (e) => {
      const t = e.touches[0];
      for (let i = 0; i < 18; i++) particles.push(new BurstParticle(t.clientX, t.clientY));
      if (!running) { running = true; requestAnimationFrame(loop); }
    }, { passive: true });
  })();

  /* ─────────────────────────────────────────
     5. SECTION LIGHTNING FLASH on enter
  ───────────────────────────────────────── */
  (function initSectionFlash() {
    const sections = document.querySelectorAll('.section');
    if (!('IntersectionObserver' in window)) return;

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const el = entry.target;
          el.classList.add('section-zap');
          setTimeout(() => el.classList.remove('section-zap'), 600);
          observer.unobserve(el);
        }
      });
    }, { threshold: 0.15 });

    sections.forEach(s => observer.observe(s));
  })();

})();

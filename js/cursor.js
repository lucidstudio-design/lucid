/* Custom two-part cursor with magnetic, color-adapt, CTA states */
(function () {
  const ring = document.createElement('div');
  ring.className = 'cursor-ring';
  const dot = document.createElement('div');
  dot.className = 'cursor-dot';
  document.body.appendChild(ring);
  document.body.appendChild(dot);

  // Keep the cursor a constant on-screen size regardless of browser zoom:
  // counter-scale by BASE_DPR / liveDPR (devicePixelRatio tracks zoom level).
  const BASE_DPR = window.devicePixelRatio || 1;

  let mx = window.innerWidth / 2, my = window.innerHeight / 2;
  let dx = mx, dy = my;     // dot position (follows quickly)
  let rx = mx, ry = my;     // ring position (lags slightly)

  // magnetic offset for buttons
  let magX = 0, magY = 0;
  let activeMagnet = null;

  window.addEventListener('mousemove', (e) => {
    mx = e.clientX; my = e.clientY;
  });

  // detect color under cursor
  function classifyEl(el) {
    document.body.classList.remove('cursor-on-light', 'cursor-on-peri');
    if (!el) return;
    // Check element + ancestors for a non-transparent bg
    let node = el;
    while (node && node !== document.body) {
      const cs = getComputedStyle(node);
      const bg = cs.backgroundColor;
      if (bg && bg !== 'rgba(0, 0, 0, 0)' && bg !== 'transparent') {
        const m = bg.match(/rgba?\(([^)]+)\)/);
        if (m) {
          const parts = m[1].split(',').map(parseFloat);
          const a = parts[3] === undefined ? 1 : parts[3];
          if (a > 0.4) {
            const [r, g, b] = parts;
            // periwinkle ish
            const isPeri = r > 100 && r < 170 && g > 100 && g < 170 && b > 200;
            if (isPeri) { document.body.classList.add('cursor-on-peri'); return; }
            // luminance
            const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
            if (lum > 0.6) { document.body.classList.add('cursor-on-light'); return; }
            return;
          }
        }
      }
      node = node.parentElement;
    }
  }

  let lastEl = null;
  let lastClassifyT = 0;

  // CTA detection + magnetic
  function isCta(el) {
    return el && (el.closest('[data-cursor="cta"]') || el.closest('button.btn, .btn, .nav-cta, .arrow-btn'));
  }

  function tick(t) {
    // ring lag
    rx += (mx - rx) * 0.18;
    ry += (my - ry) * 0.18;
    dx += (mx - dx) * 0.5;
    dy += (my - dy) * 0.5;

    const comp = BASE_DPR / (window.devicePixelRatio || 1);

    ring.style.transform = `translate(${rx}px, ${ry}px) scale(${comp}) translate(-50%, -50%)`;
    dot.style.transform = `translate(${dx}px, ${dy}px) scale(${comp}) translate(-50%, -50%)`;

    // classify (throttled)
    if (t - lastClassifyT > 80) {
      lastClassifyT = t;
      const el = document.elementFromPoint(mx, my);
      if (el !== lastEl) {
        lastEl = el;
        const cta = isCta(el);
        document.body.classList.toggle('cursor-cta', !!cta);
        classifyEl(el);
      } else {
        // re-classify periodically anyway in case background changed
        classifyEl(el);
      }
    }

    // magnetic effect
    const ctaEl = lastEl ? (lastEl.closest('[data-cursor="cta"]') || lastEl.closest('.btn, .nav-cta, .arrow-btn')) : null;
    if (ctaEl) {
      activeMagnet = ctaEl;
      const r = ctaEl.getBoundingClientRect();
      const cx = r.left + r.width / 2;
      const cy = r.top + r.height / 2;
      const ox = (mx - cx) * 0.25;
      const oy = (my - cy) * 0.25;
      magX += (ox - magX) * 0.18;
      magY += (oy - magY) * 0.18;
      ctaEl.style.transform = `translate(${magX}px, ${magY}px)`;
    } else if (activeMagnet) {
      magX += (0 - magX) * 0.18;
      magY += (0 - magY) * 0.18;
      activeMagnet.style.transform = `translate(${magX}px, ${magY}px)`;
      if (Math.abs(magX) < 0.2 && Math.abs(magY) < 0.2) {
        activeMagnet.style.transform = '';
        activeMagnet = null;
      }
    }

    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);

  // hide on leave
  window.addEventListener('mouseleave', () => {
    ring.style.opacity = '0';
    dot.style.opacity = '0';
  });
  window.addEventListener('mouseenter', () => {
    ring.style.opacity = '';
    dot.style.opacity = '';
  });

  // expose cursor pos for star map gravity
  window.__cursor = { get x() { return mx; }, get y() { return my; } };
})();

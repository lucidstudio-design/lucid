/* Star field — full-screen rotating constellations with glowing nexus dots
   and large 4-point stars that glow & blink in/out. Keeps cursor gravity. */
(function () {
  const canvas = document.getElementById('hero-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  // Zoom compensation: the field is drawn in CSS-pixel space, so a 1px line or
  // an N-px star renders thinner on screen the more the browser is zoomed out
  // (devicePixelRatio shrinks with zoom-out). We capture the load-time ratio as
  // a baseline and scale every line width / star size by BASE_DPR / liveDPR so
  // lines and stars keep a constant on-screen weight at any zoom level.
  const BASE_DPR = window.devicePixelRatio || 1;
  function zoomComp() { return BASE_DPR / (window.devicePixelRatio || 1); }

  let dpr = Math.min(window.devicePixelRatio || 1, 2);
  let w, h;
  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    // Measure the HERO (canvas parent), not the canvas itself. The canvas keeps
    // its CSS width/height:100% + inset:0, so it always visually fills the hero;
    // we only resize the backing buffer. Pinning canvas.style.width used to
    // freeze it so zoom-out growth went undetected and the field stopped covering.
    const host = canvas.parentElement || canvas;
    let r = host.getBoundingClientRect();
    let bw = r.width, bh = r.height;
    if (bw < 2 || bh < 2) { bw = window.innerWidth; bh = window.innerHeight; }
    w = bw; h = bh;
    canvas.width = Math.max(1, Math.round(w * dpr));
    canvas.height = Math.max(1, Math.round(h * dpr));
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  resize();
  window.addEventListener('resize', resize);
  // Browser/pinch zoom changes devicePixelRatio without always firing a resize
  // on the canvas box — listen to the visual viewport too so the field stays
  // matched to its container instead of collapsing into a corner.
  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', resize);
  }
  // Keep the canvas buffer matched to the hero box across reflows (font load,
  // height changes) so the field always fills edge-to-edge — never cropped.
  if (window.ResizeObserver) {
    const ro = new ResizeObserver(() => resize());
    ro.observe(canvas.parentElement);
  }
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => resize());
  window.addEventListener('load', resize);

  // ---- base star field (dust) — dense, area-uniform, reaches corners ----
  const NUM = 900;
  const stars = [];
  for (let i = 0; i < NUM; i++) {
    const angle = Math.random() * Math.PI * 2;
    const radius = Math.sqrt(Math.random()) * 1.08;
    stars.push({
      angle, radius,
      size: Math.random() * 0.9 + 0.25,
      brightness: Math.random() * 0.6 + 0.3,
      twinkle: Math.random() * Math.PI * 2,
      twinkleSpeed: 0.0008 + Math.random() * 0.0018,
      node: false,
      dx: 0, dy: 0
    });
  }

  // ---- constellation lines: connect each star to nearest neighbors ----
  const lines = [];
  const seen = new Set();
  for (let i = 0; i < NUM; i++) {
    const ai = stars[i].angle, ri = stars[i].radius;
    const xi = Math.cos(ai) * ri, yi = Math.sin(ai) * ri;
    const ds = [];
    for (let j = 0; j < NUM; j++) {
      if (j === i) continue;
      const aj = stars[j].angle, rj = stars[j].radius;
      const xj = Math.cos(aj) * rj, yj = Math.sin(aj) * rj;
      ds.push({ j, d: Math.hypot(xi - xj, yi - yj) });
    }
    ds.sort((a, b) => a.d - b.d);
    for (let n = 0; n < 2 && n < ds.length; n++) {
      const j = ds[n].j;
      if (ds[n].d > 0.16) continue;
      const key = i < j ? i + '_' + j : j + '_' + i;
      if (seen.has(key)) continue;
      seen.add(key);
      lines.push({ a: i, b: j, formStart: 150 + Math.random() * 2150, formDur: 700 + Math.random() * 950 });
      // mark both endpoints as glowing nexus nodes
      stars[i].node = true;
      stars[j].node = true;
    }
  }

  // ---- large 4-point sparkle stars that glow & blink in/out ----
  const BIG = 24;
  const bigs = [];
  for (let i = 0; i < BIG; i++) {
    bigs.push({
      angle: Math.random() * Math.PI * 2,
      radius: Math.sqrt(Math.random()) * 1.02,
      size: Math.random() * 2.4 + 2.2,
      // blink: full fade in/out
      blink: Math.random() * Math.PI * 2,
      blinkSpeed: 0.0005 + Math.random() * 0.0009,
      hue: Math.random() < 0.5 ? 'white' : 'icy',
      dx: 0, dy: 0
    });
  }

  let rot = 0;
  let last = performance.now();
  let elapsed = 0;

  function applyGravity(px, py, store, curX, curY) {
    const dx0 = curX - px, dy0 = curY - py;
    const dist = Math.hypot(dx0, dy0);
    const R = 230;
    let tx = 0, ty = 0;
    if (dist < R && dist > 0.01) {
      const f = (1 - dist / R) * 24;
      tx = (dx0 / dist) * f;
      ty = (dy0 / dist) * f;
    }
    store.dx += (tx - store.dx) * 0.06;
    store.dy += (ty - store.dy) * 0.06;
    return { x: px + store.dx, y: py + store.dy };
  }

  function drawSparkle(x, y, size, op, tint) {
    // halo
    const haloR = size * 7;
    const grad = ctx.createRadialGradient(x, y, 0, x, y, haloR);
    const c = tint === 'icy' ? '183, 211, 242' : '245, 245, 245';
    grad.addColorStop(0, `rgba(255,255,255,${op * 0.85})`);
    grad.addColorStop(0.35, `rgba(${c}, ${op * 0.22})`);
    grad.addColorStop(1, `rgba(${c}, 0)`);
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(x, y, haloR, 0, Math.PI * 2);
    ctx.fill();

    // 4-point cross — slim diamond rays
    const L = size * 4.6, Wd = size * 0.5;
    ctx.fillStyle = `rgba(255,255,255,${op})`;
    ctx.beginPath();
    ctx.moveTo(x, y - L); ctx.lineTo(x + Wd, y); ctx.lineTo(x, y + L); ctx.lineTo(x - Wd, y); ctx.closePath();
    ctx.moveTo(x - L, y); ctx.lineTo(x, y - Wd); ctx.lineTo(x + L, y); ctx.lineTo(x, y + Wd); ctx.closePath();
    ctx.fill();

    // bright core
    ctx.beginPath();
    ctx.arc(x, y, size * 0.7, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255,255,255,${op})`;
    ctx.fill();
  }

  function frame(now) {
    const dt = Math.min(50, now - last); last = now;
    elapsed += dt;
    rot += dt * 0.000026;

    // Self-heal against zoom: if the device pixel ratio or the canvas box size
    // has drifted from the buffer we sized for, re-sync before drawing so the
    // field never compresses into the top-left corner.
    const liveDpr = Math.min(window.devicePixelRatio || 1, 2);
    const host = canvas.parentElement || canvas;
    const box = host.getBoundingClientRect();
    if (Math.abs(box.width - w) > 0.5 || Math.abs(box.height - h) > 0.5 || Math.abs(liveDpr - dpr) > 0.01) {
      resize();
    }

    ctx.clearRect(0, 0, w, h);

    const zc = zoomComp();
    const cx = w / 2, cy = h / 2;
    const scale = Math.hypot(w, h) * 0.7;

    const rect = canvas.getBoundingClientRect();
    const curX = (window.__cursor ? window.__cursor.x : -9999) - rect.left;
    const curY = (window.__cursor ? window.__cursor.y : -9999) - rect.top;

    // positions for dust/nodes
    const positions = new Array(stars.length);
    for (let i = 0; i < stars.length; i++) {
      const s = stars[i];
      const a = s.angle + rot;
      const px = cx + Math.cos(a) * s.radius * scale;
      const py = cy + Math.sin(a) * s.radius * scale;
      positions[i] = applyGravity(px, py, s, curX, curY);
    }

    // constellation lines
    ctx.lineWidth = zc;
    for (const ln of lines) {
      const t = elapsed - ln.formStart;
      if (t < 0) continue;
      const p = Math.min(1, t / ln.formDur);
      const a = positions[ln.a], b = positions[ln.b];
      const dx = b.x - a.x, dy = b.y - a.y;
      const d = Math.hypot(dx, dy);
      const op = Math.max(0, 1 - d / (260 * zc)) * 0.28 * Math.min(1, p * 1.4);
      ctx.strokeStyle = `rgba(200, 220, 245, ${op})`;
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(a.x + dx * p, a.y + dy * p);
      ctx.stroke();
    }

    // dust stars + glowing nexus dots
    for (let i = 0; i < stars.length; i++) {
      const s = stars[i];
      const p = positions[i];
      s.twinkle += dt * s.twinkleSpeed;
      const tw = 0.55 + 0.45 * Math.sin(s.twinkle);

      if (s.node) {
        // soft circular glow at constellation nexus
        const op = (0.55 + 0.45 * tw);
        const gr = (5.5 + s.size * 1.5) * zc;
        const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, gr);
        grad.addColorStop(0, `rgba(255,255,255,${op * 0.9})`);
        grad.addColorStop(0.5, `rgba(183, 211, 242, ${op * 0.35})`);
        grad.addColorStop(1, `rgba(138, 132, 226, 0)`);
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(p.x, p.y, gr, 0, Math.PI * 2);
        ctx.fill();
        // crisp core
        ctx.beginPath();
        ctx.arc(p.x, p.y, 1.5 * zc, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,255,255,${op})`;
        ctx.fill();
      } else {
        const op = s.brightness * tw;
        ctx.beginPath();
        ctx.arc(p.x, p.y, s.size * zc, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(245, 245, 245, ${op})`;
        ctx.fill();
      }
    }

    // big blinking 4-point stars
    for (let i = 0; i < bigs.length; i++) {
      const s = bigs[i];
      const a = s.angle + rot;
      const px = cx + Math.cos(a) * s.radius * scale;
      const py = cy + Math.sin(a) * s.radius * scale;
      const p = applyGravity(px, py, s, curX, curY);
      s.blink += dt * s.blinkSpeed;
      // blink: opacity fully fades in and out (raised sine, sharpened)
      let b = 0.5 + 0.5 * Math.sin(s.blink);
      b = Math.pow(b, 2.2); // sharpen so they pop in/out
      if (b < 0.02) continue;
      drawSparkle(p.x, p.y, s.size * zc, b, s.hue);
    }

    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
})();

/* Into Focus — film section.
   The film sits in normal flow as a full-width panel that keeps the clip's own
   16:9 proportions (the CSS aspect-ratio drives the height from the width).

   The clip is an animation Stage: a 1920×1080 canvas scaled to fit its
   viewport with s = min(vw/1920, (vh-44)/1080), centred, with a playback bar
   stacked below. Instead of measuring elements inside the clip (fragile —
   that's what used to leave dark margins around the video), we size the
   IFRAME itself so the math is deterministic:

     iframe width  = panelW · k        (k = tiny bleed so rounding can't seam)
     → the Stage is width-bound: canvas = iframe-width × 16:9 = panel × k
     iframe height = canvasH + 244     (so the height constraint never binds)
     playback bar hidden → canvas is centred in the iframe
     iframe centred on the panel → canvas covers the panel EDGE-TO-EDGE

   The panel's overflow:hidden rounds the corners — the only crop. Autoplays
   on approach, loops forever; pointer-events: none so it can't be scrubbed. */
(function () {
  const panel = document.querySelector('.into-focus');
  const frame = document.querySelector('.film-frame');
  if (!panel || !frame) return;

  const PAD = 244;      // extra iframe height: keeps the Stage width-bound and
                        // gives the (hidden) playback bar room below the canvas
  const BLEED = 1.004;  // hairline overscan so rounding can't leave a seam

  let loaded = false;
  function load() {
    if (loaded || !frame.dataset.src) return;
    // Reset the clip to its first frame so it plays its intro from the top
    // when it scrolls into view (the same-origin film iframe restores its
    // timeline from this localStorage key on mount).
    try { localStorage.setItem('lucid-anim-14:t', '0'); } catch (e) {}
    frame.addEventListener('load', startSettleLoop);
    frame.src = (window.__resources && window.__resources.intoFocus) || frame.dataset.src;
    loaded = true;
  }

  // Pause/resume the film's animation by patching the iframe window's GLOBAL
  // requestAnimationFrame (the engine re-requests it every frame). Lets us hold
  // the clip paused while it's out of view and resume once it's ≥50% visible —
  // without re-loading the heavy bundle.
  function patchRAF(win) {
    if (!win || win.__lucidRAFPatched) return !!(win && win.__lucidRAFPatched);
    let nativeRAF;
    try { nativeRAF = win.requestAnimationFrame; } catch (e) { return false; }
    if (typeof nativeRAF !== 'function') return false;
    nativeRAF = nativeRAF.bind(win);
    let paused = false, pending = null, lastTs = 0, skew = 0;
    // Feed the engine a gap-free timestamp: while paused no time passes, so on
    // resume the clip continues from where it left off instead of jumping forward.
    // (Only the rAF timestamp arg is rewritten — performance.now is left alone so
    // the bundle's own load/unpack timing is never disturbed.)
    win.requestAnimationFrame = function (cb) {
      if (paused) { pending = cb; return 0; }
      return nativeRAF(function (ts) { lastTs = ts; cb(ts - skew); });
    };
    win.__lucidPause = function () { if (paused) return; paused = true; };
    win.__lucidResume = function () {
      if (!paused) return;
      paused = false;
      if (pending) {
        const c = pending; pending = null;
        nativeRAF(function (ts) { skew += ts - lastTs; lastTs = ts; c(ts - skew); });
      }
    };
    win.__lucidRAFPatched = true;
    return true;
  }
  let _wantPlay = false;
  function applyPlayState() {
    let win; try { win = frame.contentWindow; } catch (e) { return; }
    if (!win) return;
    patchRAF(win);
    if (!win.__lucidRAFPatched) return;
    // Never pause before the clip has mounted — the engine schedules its first
    // render via rAF, and blocking that would leave the panel blank. Only enforce
    // pause once #root has children.
    let ready = false;
    try { const d = frame.contentDocument; const r = d && d.getElementById && d.getElementById('root'); ready = !!(r && r.children.length); } catch (e) {}
    if (!ready || _wantPlay) { if (win.__lucidResume) win.__lucidResume(); }
    else { if (win.__lucidPause) win.__lucidPause(); }
  }
  function setPlaying(on) { _wantPlay = on; applyPlayState(); }

  // Hide the playback bar baked into the clip (inline-styled; identified by its
  // border-top + max-width signature). With the bar gone the canvas centres in
  // the full iframe height, which is what place() assumes. Returns true once
  // the bar exists and is hidden (i.e. the bundle has unpacked).
  function hideBar() {
    let ok = false;
    try {
      const doc = frame.contentDocument;
      if (!doc || !doc.body) return false;
      doc.querySelectorAll('body div').forEach((el) => {
        const s = el.getAttribute('style') || '';
        if (s.indexOf('border-top') !== -1 && s.indexOf('max-width: 680px') !== -1) {
          if (el.style.display !== 'none') el.style.display = 'none';
          ok = true;
        }
      });
    } catch (e) {}
    return ok;
  }

  // Size + centre the iframe on the panel. Pure math — no inner measuring.
  function place() {
    const CW = panel.clientWidth, CH = panel.clientHeight;
    if (!CW || !CH) return;
    const iw = CW * BLEED;
    const canvasH = iw * 9 / 16;
    const ih = canvasH + PAD;
    frame.style.inset = 'auto';
    frame.style.left = ((CW - iw) / 2).toFixed(2) + 'px';
    frame.style.top = ((CH - ih) / 2).toFixed(2) + 'px';
    frame.style.width = iw.toFixed(2) + 'px';
    frame.style.height = ih.toFixed(2) + 'px';
    frame.style.transform = 'none';
  }

  // The clip is a bundled standalone that unpacks asynchronously AFTER the
  // iframe's load event. Keep re-running until the playback bar has been found
  // and hidden a few times in a row, so the centring assumption always holds.
  let settleTimer = null, stableTicks = 0;
  function startSettleLoop() {
    if (settleTimer) window.clearInterval(settleTimer);
    stableTicks = 0;
    settleTimer = window.setInterval(() => {
      place();
      applyPlayState();          // (re)install the rAF patch + enforce play/pause
      stableTicks = hideBar() ? stableTicks + 1 : 0;
      if (stableTicks >= 6) { window.clearInterval(settleTimer); settleTimer = null; }
    }, 450);
    place();
    hideBar();
    applyPlayState();
  }

  function maybeLoad() {
    const r = panel.getBoundingClientRect();
    const vh = window.innerHeight || document.documentElement.clientHeight;
    if (r.top < vh * 1.15 && r.bottom > -vh * 0.15) load();
  }

  // Load the clip eagerly — right after first paint, so it's downloading from the
  // start (ready before the user reaches it) without competing with the page's
  // initial render. A scroll fallback guarantees it loads even if idle never fires.
  if ('requestIdleCallback' in window) { requestIdleCallback(function () { load(); }, { timeout: 1500 }); }
  else { setTimeout(load, 300); }
  window.addEventListener('scroll', function () { if (!loaded) load(); }, { passive: true });
  place();
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) setPlaying(e.isIntersecting && e.intersectionRatio >= 0.5);
    }, { threshold: [0, 0.25, 0.5, 0.75, 1] });
    io.observe(panel);
  } else {
    setPlaying(true);
  }
  window.addEventListener('resize', () => {
    place();
    if (loaded && !settleTimer) startSettleLoop();
  });
  if (typeof ResizeObserver !== 'undefined') {
    new ResizeObserver(() => place()).observe(panel);
  }
})();

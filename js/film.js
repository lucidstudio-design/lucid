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
    frame.src = frame.dataset.src;
    loaded = true;
  }

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
      stableTicks = hideBar() ? stableTicks + 1 : 0;
      if (stableTicks >= 6) { window.clearInterval(settleTimer); settleTimer = null; }
    }, 450);
    place();
    hideBar();
  }

  function maybeLoad() {
    const r = panel.getBoundingClientRect();
    const vh = window.innerHeight || document.documentElement.clientHeight;
    if (r.top < vh * 1.15 && r.bottom > -vh * 0.15) load();
  }

  maybeLoad();
  place();
  window.addEventListener('scroll', maybeLoad, { passive: true });
  window.addEventListener('resize', () => {
    place();
    if (loaded && !settleTimer) startSettleLoop();
  });
  if (typeof ResizeObserver !== 'undefined') {
    new ResizeObserver(() => place()).observe(panel);
  }
})();

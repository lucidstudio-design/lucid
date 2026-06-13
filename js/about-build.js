/* About — wireframe build-in.
   The section starts black (palette inverted): a shimmering ice-blue wireframe
   mockup of every element. On scroll-in, the wireframe locks into place and
   unblurs into focus — each block resolving with a clean, geometric top-down
   reveal (no scatter) — while the background returns from black to icy and the
   skeleton crossfades into the real text, graphic and CTA.
   Fully skipped for prefers-reduced-motion / no Web Animations API. */
(function () {
  const about = document.querySelector('.about');
  if (!about) return;

  const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const canAnimate = typeof Element !== 'undefined' && typeof Element.prototype.animate === 'function';
  if (reduce || !canAnimate) return; // keep the static, fully-coloured layout

  const q  = (s) => about.querySelector(s);
  const qa = (s) => [...about.querySelectorAll(s)];

  const wire     = q('.about-wire');
  const skels    = qa('.skel');             // DOM order: eyebrow, quote, para1, para2, cta
  const illoWire = q('.illo-wire');
  const eyebrow  = q('.about-eyebrow');
  const qlines   = qa('.about-quote .aq-line');
  const paras    = qa('.about-body p');
  const cta      = q('.about-cta');
  const img      = q('.about-illo img');

  const ICY = '#B7D3F2';
  const BLACK = '#0F0F0F';
  const anims = [];
  const track = (a) => { if (a) anims.push(a); return a; };

  // arm: invert to black + hide the real content immediately (it's off-screen)
  about.classList.add('is-wiring');

  /* soft focus reveal: blur resolves + gentle rise — no clipping, so ascenders,
     descenders and the Ruigslay overhangs are never cut off mid-animation */
  function focusIn(el, delay, dur) {
    el.style.willChange = 'transform, filter, opacity';
    return track(el.animate([
      { opacity: 0, filter: 'blur(16px)', transform: 'translateY(18px)',
        easing: 'cubic-bezier(.16,.8,.3,1)' },
      { opacity: 1, filter: 'blur(5px)',
        offset: 0.5, easing: 'cubic-bezier(.2,.7,.2,1)' },
      { opacity: 1, filter: 'blur(0px)', transform: 'translateY(0)' }
    ], { duration: dur, delay: delay, fill: 'both' }));
  }
  function fade(el, from, to, delay, dur, ease) {
    return track(el.animate([{ opacity: from }, { opacity: to }],
      { duration: dur, delay: delay, fill: 'both', easing: ease || 'ease' }));
  }

  // Image focus-in: only the blur/opacity resolve — the illustration sits in
  // natural flow at its final size the whole time (no transform).
  const imgBase = 'none';
  function focusInImage(el, delay, dur) {
    el.style.willChange = 'filter, opacity';
    return track(el.animate([
      { opacity: 0, filter: 'blur(16px)', transform: imgBase,
        easing: 'cubic-bezier(.16,.8,.3,1)' },
      { opacity: 1, filter: 'blur(5px)', transform: imgBase,
        offset: 0.5, easing: 'cubic-bezier(.2,.7,.2,1)' },
      { opacity: 1, filter: 'blur(0px)', transform: imgBase }
    ], { duration: dur, delay: delay, fill: 'both' }));
  }

  function run() {
    /* 1 — wireframe wash + skeletons shimmer in (on black) */
    fade(wire, 0, 1, 0, 360, 'ease-out');
    skels.forEach((s, i) => fade(s, 0, 1, i * 55, 340, 'ease-out'));
    fade(illoWire, 0, 1, 90, 380, 'ease-out');

    /* hold the wireframe, then return the palette: black → icy */
    track(about.animate(
      [{ backgroundColor: BLACK }, { backgroundColor: ICY }],
      { duration: 880, delay: 900, fill: 'both', easing: 'cubic-bezier(.4,0,.3,1)' }
    ));

    /* 2 — lock into place + unblur into focus (geometric, staggered top→down) */
    focusIn(eyebrow, 980, 640);
    if (qlines[0]) focusIn(qlines[0], 1080, 720);
    if (qlines[1]) focusIn(qlines[1], 1200, 720);
    if (img) focusInImage(img, 1080, 980);
    if (paras[0]) focusIn(paras[0], 1380, 720);
    if (paras[1]) focusIn(paras[1], 1520, 720);
    if (cta) focusIn(cta, 1700, 700);

    /* 3 — skeletons crossfade out as each block locks in */
    const skelFade = [940, 1040, 1340, 1480, 1660];
    skels.forEach((s, i) => fade(s, 1, 0, skelFade[i] != null ? skelFade[i] : 1100, 440, 'ease-in'));
    fade(illoWire, 1, 0, 1180, 520, 'ease-in');

    /* 4 — grid + shimmer sweep dissolve, leaving the clean composition */
    fade(wire, 1, 0, 1500, 720, 'ease-in');

    /* cleanup: drop the wiring state + cancel held animations (base CSS = final) */
    window.setTimeout(() => {
      anims.forEach((a) => { try { a.cancel(); } catch (e) {} });
      about.classList.remove('is-wiring');
      [eyebrow, ...qlines, ...paras, cta, img].forEach((el) => { if (el) el.style.willChange = 'auto'; });
    }, 2380);
  }

  let started = false;
  function maybeStart() {
    if (started) return;
    const r = about.getBoundingClientRect();
    const vh = window.innerHeight || document.documentElement.clientHeight;
    if (r.top < vh * 0.82 && r.bottom > vh * 0.12) {
      started = true;
      window.removeEventListener('scroll', maybeStart);
      window.removeEventListener('resize', maybeStart);
      run();
    }
  }
  window.addEventListener('scroll', maybeStart, { passive: true });
  window.addEventListener('resize', maybeStart);
  maybeStart();
  window.setTimeout(maybeStart, 200);
})();

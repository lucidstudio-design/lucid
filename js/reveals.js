/* Reveals + carousels + scroll-driven cover-scroll + vision-box expansion */
(function () {

  /* ---- hero entrance: base state is visible; add class to trigger the blur-in ---- */
  const heroEl = document.querySelector('.hero');
  if (heroEl) requestAnimationFrame(() => heroEl.classList.add('is-loaded'));

  /* ---- hero fit: the hero is exactly one viewport tall — the hero/marquee
     border lies at the bottom edge of the screen with no scrolling. Top and
     bottom paddings are untouched; if the content is too tall for the space
     between them, the whole inner block is scaled down proportionally (shrink
     only — never enlarged) via zoom, so the type resizes in proportion. ---- */
  const heroInner = document.querySelector('.hero-inner');
  function fitHero() {
    if (!heroEl || !heroInner) return;
    if (window.innerWidth <= 900) { heroInner.style.zoom = ''; return; }
    heroInner.style.zoom = '';
    const cs = getComputedStyle(heroEl);
    const avail = window.innerHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
    const natural = heroInner.offsetHeight;
    if (avail > 0 && natural > avail) {
      heroInner.style.zoom = String(Math.max(0.45, avail / natural));
    }
  }
  fitHero();
  window.addEventListener('resize', fitHero);
  if (document.fonts && document.fonts.ready) { document.fonts.ready.then(fitHero); }

  /* ---- Nav: collapse links into a hamburger when they no longer fit ---- */
  const navBar = document.querySelector('.nav');
  const navToggle = document.getElementById('navToggle');
  if (navBar && navToggle) {
    navToggle.addEventListener('click', () => {
      const open = navBar.classList.toggle('open');
      navToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      navToggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    });
    navBar.querySelectorAll('.nav-links a').forEach((a) => {
      a.addEventListener('click', () => {
        navBar.classList.remove('open');
        navToggle.setAttribute('aria-expanded', 'false');
        navToggle.setAttribute('aria-label', 'Open menu');
      });
    });
    window.addEventListener('resize', () => {
      if (window.innerWidth > 900 && navBar.classList.contains('open')) {
        navBar.classList.remove('open');
        navToggle.setAttribute('aria-expanded', 'false');
        navToggle.setAttribute('aria-label', 'Open menu');
      }
    });
  }

  /* ---- intersection observer for rise animations ---- */
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
    }
  }, { threshold: 0.12 });
  document.querySelectorAll('.rise-line, .rise-block').forEach(el => io.observe(el));

  /* stagger rise-lines within about-quote */
  document.querySelectorAll('.about-quote').forEach(parent => {
    parent.querySelectorAll('.rise-line').forEach((l, i) => {
      l.style.transitionDelay = (i * 0.13) + 's';
    });
  });

  /* ---- Portfolio carousel ---- */
  const rail = document.getElementById('p-rail');
  if (rail) {
    const cases = rail.querySelectorAll('.case');
    let idx = 0;
    const counterNow = document.getElementById('p-now');
    const counterTotal = document.getElementById('p-total');
    if (counterTotal) counterTotal.textContent = String(cases.length).padStart(2, '0');
    function updateCarousel() {
      const gap = 28;
      const caseW = cases[0].offsetWidth;
      const maxShift = Math.max(0, rail.scrollWidth - rail.parentElement.clientWidth);
      let shift = (caseW + gap) * idx;
      shift = Math.min(shift, maxShift);
      rail.style.transform = `translateX(${-shift}px)`;
      if (counterNow) counterNow.textContent = String(idx + 1).padStart(2, '0');
    }
    window.__updateCarousel = updateCarousel;
    document.getElementById('p-prev').addEventListener('click', () => { idx = Math.max(0, idx - 1); updateCarousel(); });
    document.getElementById('p-next').addEventListener('click', () => { idx = Math.min(cases.length - 1, idx + 1); updateCarousel(); });
    window.addEventListener('resize', updateCarousel);
    updateCarousel();
  }

  /* ---- Testimonials auto-drift ---- */
  const tTrack = document.getElementById('t-track');
  if (tTrack) {
    const cards = tTrack.querySelectorAll('.t-card');
    let tIdx = 0;
    function stepT() {
      const gap = 24;
      const cardW = cards[0].offsetWidth;
      tTrack.style.transform = `translateX(${-(cardW + gap) * tIdx}px)`;
    }
    document.getElementById('t-prev').addEventListener('click', () => { tIdx = Math.max(0, tIdx - 1); stepT(); });
    document.getElementById('t-next').addEventListener('click', () => { tIdx = Math.min(cards.length - 3, tIdx + 1); stepT(); });
    window.addEventListener('resize', stepT);
  }

  /* ---- Cover-scroll: services is sticky; the portfolio (natural height, can
     exceed the viewport) scrolls over it in normal flow — pure CSS, no JS
     translate and no hold. These refs are kept for nav targeting below. ---- */
  const coverWrap = document.querySelector('.cover-scroll');
  const overlay   = document.querySelector('.portfolio-overlay');
  const navEl     = document.querySelector('.nav');
  const navH = () => (navEl ? navEl.offsetHeight : 100);

  /* ---- Nav: smooth-scroll each link to the exact point where its section begins
     (where the background colour changes), accounting for the fixed nav. ---- */
  const aboutSection = document.querySelector('.about-cover');
  const testimonialsSection = document.getElementById('testimonials');
  const contactNavSection = document.querySelector('.contact');

  function navTarget(hash) {
    switch (hash) {
      case '#about':
        return aboutSection ? aboutSection.offsetTop - navH() : null;
      case '#services-anchor':
        // services fills the viewport at the start of the cover track. Land so the
        // about→services colour change sits exactly at the nav's bottom edge.
        return coverWrap ? coverWrap.offsetTop - navH() : null;
      case '#work-anchor': {
        // the portfolio is in normal flow now — land its (blue) top edge at the
        // nav's bottom edge.
        if (!overlay) return null;
        return overlay.getBoundingClientRect().top + window.scrollY - navH();
      }
      case '#testimonials':
        return testimonialsSection ? testimonialsSection.offsetTop - navH() : null;
      case '#contact': {
        // land where the periwinkle vision-box (the contact section's colour change)
        // meets the nav's bottom edge.
        const vb = document.querySelector('.vision-box');
        if (vb) return vb.getBoundingClientRect().top + window.scrollY - navH();
        return contactNavSection ? contactNavSection.offsetTop - navH() : null;
      }
      default:
        return null;
    }
  }

  document.querySelectorAll('a[href^="#"]').forEach((a) => {
    a.addEventListener('click', (e) => {
      const y = navTarget(a.getAttribute('href'));
      if (y == null) return;            // leave other in-page links to default behaviour
      e.preventDefault();
      window.scrollTo({ top: Math.max(0, Math.round(y)), behavior: 'smooth' });
    });
  });

  /* ---- Vision-box: expands from ~1in inset to full screen width as contact enters view ---- */
  const visionBox      = document.querySelector('.vision-box');
  const contactSection = document.querySelector('.contact');

  if (visionBox && contactSection) {
    const INSET = 192; // ~1in each side (96px) at start
    function updateVision() {
      const r = contactSection.getBoundingClientRect();
      const vh = window.innerHeight;
      const vw = window.innerWidth;
      const raw = (vh - r.top) / (vh * 0.55);
      const p = Math.max(0, Math.min(1, raw));
      const ease = p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
      const w = (vw - INSET) + ease * INSET; // (vw - 192px) → vw
      const br = 28 * (1 - ease);
      visionBox.style.width = w + 'px';
      visionBox.style.borderRadius = br + 'px';
    }
    updateVision();
    window.addEventListener('scroll', updateVision, { passive: true });
    window.addEventListener('resize', updateVision);
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', updateVision);
      window.visualViewport.addEventListener('scroll', updateVision);
    }
  }

  /* ---- Fit-to-width headings: keep each .fit-line on a single line and scale the
     whole heading down only when a line would overflow. Words never reflow from
     line to line; the type size changes instead. ---- */
  function fitHeadings() {
    document.querySelectorAll('.fit-head').forEach((h) => {
      const avail = h.clientWidth;
      if (!avail) return;
      if (h._fitAvail === avail) return;      // width unchanged → nothing to do
      h.style.fontSize = '';                  // reset to the CSS (clamp) size
      let widest = 0;
      h.querySelectorAll('.fit-line').forEach((l) => { widest = Math.max(widest, l.scrollWidth); });
      if (widest > avail) {
        const base = parseFloat(getComputedStyle(h).fontSize);
        h.style.fontSize = (base * (avail - 2) / widest) + 'px';
      }
      h._fitAvail = avail;
    });
  }
  function refit() { document.querySelectorAll('.fit-head').forEach((h) => { h._fitAvail = -1; }); fitHeadings(); }
  fitHeadings();
  window.addEventListener('resize', refit);
  window.addEventListener('scroll', fitHeadings, { passive: true });
  if (document.fonts && document.fonts.ready) { document.fonts.ready.then(refit); }

  /* ---- Portfolio cases: cards are vertical (image on top, text below) and
     stretch to the track height via CSS. We only keep the carousel in sync
     once the layout / fonts / video metadata settle. ---- */
  const pTrack = document.querySelector('.portfolio-track');
  const pCases = pTrack ? [...pTrack.querySelectorAll('.case')] : [];
  function fitCases() {
    if (window.__updateCarousel) window.__updateCarousel();
  }
  window.__fitCases = fitCases;
  fitCases();
  pCases.forEach((c) => {
    const v = c.querySelector('.case-img');
    if (!v) return;
    if (v.readyState >= 1) fitCases();
    v.addEventListener('loadedmetadata', fitCases);
  });
  window.addEventListener('resize', fitCases);
  window.addEventListener('scroll', fitCases, { passive: true });
  if (document.fonts && document.fonts.ready) { document.fonts.ready.then(fitCases); }
  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', fitCases);
  }

  /* ---- Service cards: keep all three the SAME size and only ever SHRINK the
     shared font so the card block fits inside the pinned area on short / zoomed-in
     viewports. It never scales UP — so the card text always stays in proportion
     with the section header and with the rest of the page, which scale uniformly
     under browser zoom. Cards size to their content (equal height via grid
     stretch); the block is centred in the pinned area. ---- */
  let _svcKey = null;
  function fitServices() {
    const redux = document.querySelector('.services-pinned .services-redux');
    if (!redux) return;

    // Mobile / stacked: clear inline sizing and let the CSS govern.
    if (window.innerWidth <= 900) { redux.style.fontSize = ''; _svcKey = null; return; }

    const availH = redux.clientHeight;
    const key = Math.round(availH) + ':' + window.innerWidth;
    if (key === _svcKey) return;
    _svcKey = key;

    redux.style.fontSize = '';                          // reset to the CSS base unit
    const base = parseFloat(getComputedStyle(redux).fontSize);
    const left  = redux.querySelector('.services-left');
    const right = redux.querySelector('.services-right');
    // Measure the left column by its heading only — the compass is decorative and
    // bleeds off the edges, so it must not inflate the natural-height calculation.
    const head = left ? left.querySelector('h2') : null;
    const leftH = head ? (head.offsetTop + head.offsetHeight) : (left ? left.scrollHeight : 0);
    const natural = Math.max(leftH, right ? right.scrollHeight : 0);
    // shrink-only: scale the whole block down if either column would overflow
    if (natural > availH && availH > 0) {
      const factor = Math.max(0.4, availH / natural);
      redux.style.fontSize = (base * factor) + 'px';
    }
  }
  function refitServices() { _svcKey = null; fitServices(); }
  fitServices();
  window.addEventListener('resize', refitServices);
  window.addEventListener('scroll', fitServices, { passive: true });
  if (document.fonts && document.fonts.ready) { document.fonts.ready.then(refitServices); }
  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', refitServices);
  }

})();

/* Reveals + carousels + scroll-driven cover-scroll + vision-box expansion */
(function () {

  /* ---- hero entrance: base state is visible; add class to trigger the blur-in ---- */
  const heroEl = document.querySelector('.hero');
  if (heroEl) {
    requestAnimationFrame(() => heroEl.classList.add('is-loaded'));
    // Safety net: the word-by-word blur-in uses animation-fill-mode:both, so words
    // sit at opacity:0 until their animation ticks. If the animation timeline ever
    // stalls (e.g. a backgrounded/non-painting tab), this wall-clock fallback
    // forces the final, fully-visible state so the headline can never stay blank.
    setTimeout(() => heroEl.classList.add('hero-anim-settled'), 2600);
  }

  /* ---- hero fit: the hero is exactly one viewport tall — the hero/marquee
     border lies at the bottom edge of the screen with no scrolling. Top and
     bottom paddings are untouched; if the content is too tall for the space
     between them, the whole inner block is scaled down proportionally (shrink
     only — never enlarged) via zoom, so the type resizes in proportion. ---- */
  const heroInner = document.querySelector('.hero-inner');
  function fitHero() {
    if (!heroEl || !heroInner) return;
    heroInner.style.zoom = '';
    const cs = getComputedStyle(heroEl);
    // Use the hero's OWN box height (it's now capped at min(100vh,1100px)), not the
    // raw viewport, so the fit math is correct when the cap engages on zoom-out.
    const availH = heroEl.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
    const availW = heroInner.clientWidth;
    // widest headline line (lines are nowrap), so the composition never overflows
    let widest = 0;
    heroInner.querySelectorAll('.hero-headline .line').forEach((l) => { widest = Math.max(widest, l.scrollWidth); });
    const natural = heroInner.offsetHeight;
    // Scale the WHOLE hero composition (eyebrow + headline + sub + CTA) as one unit
    // so the type hierarchy and the animation framing stay proportional at any size
    // — including mobile. Shrink-only: never enlarged past the desktop design.
    let z = 1;
    if (availH > 0 && natural > availH) z = Math.min(z, availH / natural);
    if (availW > 0 && widest > availW) z = Math.min(z, availW / widest);
    // FLOOR: the hero headline must always stay noticeably larger than the section
    // headers (--h2 = clamp(48, 7vw, 88)). Replicate that clamp in JS, compare to
    // the headline's own base size, and never let the zoom shrink the headline
    // below ~1.18× the section-header size. (The hero is overflow:hidden, so on an
    // extreme short/zoomed viewport this prefers a big headline over a tiny one.)
    const vw = window.innerWidth;
    const h2px = Math.max(48, Math.min(0.07 * vw, 88));
    const headEl = heroInner.querySelector('.hero-headline');
    const headBase = headEl ? parseFloat(getComputedStyle(headEl).fontSize) : 88;
    if (headBase > 0) {
      const minZ = Math.min(1, (1.18 * h2px) / headBase);
      z = Math.max(z, minZ);
    }
    heroInner.style.zoom = z < 1 ? String(Math.max(0.45, z)) : '';
  }
  fitHero();
  window.addEventListener('resize', fitHero);
  if (document.fonts && document.fonts.ready) { document.fonts.ready.then(fitHero); }

  /* ---- About / film parallax guard ----
     The About pins (position: sticky) while the film rides up over it — lovely
     when the About fits in one viewport. But when the About is TALLER than the
     viewport (zoom-in, or a short window), sticky keeps showing the TOP while the
     film covers from the bottom up, hiding text the user never got to read. So:
     flatten the About to normal flow whenever it can't fit, exactly like the
     Portfolio's pinned section only parallaxes within its own 100vh. ---- */
  const aboutEl = document.querySelector('.about');
  function guardAboutSticky() {
    if (!aboutEl) return;
    // Measure the About's full height (content + padding; scrollHeight survives
    // overflow:hidden and is unaffected by sticky/static). If it doesn't fit the
    // viewport with a little headroom, flatten it so the film can't ride over
    // unread text — this catches the 125–150% zoom range the old +48 guard missed.
    const tooTall = aboutEl.scrollHeight > window.innerHeight - 8;
    aboutEl.classList.toggle('about--flat', tooTall);
  }
  guardAboutSticky();
  window.addEventListener('resize', guardAboutSticky);
  if (document.fonts && document.fonts.ready) { document.fonts.ready.then(guardAboutSticky); }

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
    const PGAP = 28;
    // How many whole cards are visible at the current width — the carousel pages
    // by exactly this many, so a 3-up desktop steps 3 and a 1-up phone steps 1.
    function pVisible() {
      const caseW = cases[0].offsetWidth;
      const cont = rail.parentElement.clientWidth;
      return Math.max(1, Math.floor((cont + PGAP) / (caseW + PGAP)));
    }
    function updateCarousel() {
      const caseW = cases[0].offsetWidth;
      const maxIdx = Math.max(0, cases.length - pVisible());
      if (idx > maxIdx) idx = maxIdx;
      const maxShift = Math.max(0, rail.scrollWidth - rail.parentElement.clientWidth);
      let shift = (caseW + PGAP) * idx;
      shift = Math.min(shift, maxShift);
      rail.style.transform = `translateX(${-shift}px)`;
      if (counterNow) counterNow.textContent = String(idx + 1).padStart(2, '0');
    }
    window.__updateCarousel = updateCarousel;
    document.getElementById('p-prev').addEventListener('click', () => { idx = Math.max(0, idx - pVisible()); updateCarousel(); });
    document.getElementById('p-next').addEventListener('click', () => { idx = Math.min(Math.max(0, cases.length - pVisible()), idx + pVisible()); updateCarousel(); });
    window.addEventListener('resize', updateCarousel);
    updateCarousel();
  }

  /* ---- Testimonials auto-drift ---- */
  const tTrack = document.getElementById('t-track');
  if (tTrack) {
    const cards = tTrack.querySelectorAll('.t-card');
    let tIdx = 0;
    const TGAP = 24;
    // Page by the number of cards actually visible (≈3 on desktop, 2 or 1 as the
    // viewport compresses) so the arrows always advance one full screen of cards.
    function tVisible() {
      const cardW = cards[0].offsetWidth;
      const cont = tTrack.parentElement.clientWidth;
      return Math.max(1, Math.floor((cont + TGAP) / (cardW + TGAP)));
    }
    function stepT() {
      const cardW = cards[0].offsetWidth;
      const maxIdx = Math.max(0, cards.length - tVisible());
      if (tIdx > maxIdx) tIdx = maxIdx;
      // Clamp the shift to the real overscroll so EVERY card is reachable no matter
      // how many are visible (was hardcoded to a 3-up layout, hiding the last cards).
      const maxShift = Math.max(0, tTrack.scrollWidth - tTrack.parentElement.clientWidth);
      let shift = (cardW + TGAP) * tIdx;
      shift = Math.min(shift, maxShift);
      tTrack.style.transform = `translateX(${-shift}px)`;
    }
    document.getElementById('t-prev').addEventListener('click', () => { tIdx = Math.max(0, tIdx - tVisible()); stepT(); });
    document.getElementById('t-next').addEventListener('click', () => { tIdx = Math.min(Math.max(0, cards.length - tVisible()), tIdx + tVisible()); stepT(); });
    window.addEventListener('resize', stepT);
    stepT();
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
      // Logo / "#" → smooth scroll to the very top (hero).
      if (a.getAttribute('href') === '#') {
        e.preventDefault();
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }
      const y = navTarget(a.getAttribute('href'));
      if (y == null) return;            // leave other in-page links to default behaviour
      e.preventDefault();
      window.scrollTo({ top: Math.max(0, Math.round(y)), behavior: 'smooth' });
    });
  });

  /* ---- Nav scroll-spy: the link for the section currently in view goes bold,
     #79BEEE, and underlined (the underline wipes in/out left→right via CSS).
     Boundaries mirror navTarget so the highlight flips exactly where a nav
     click would land. ---- */
  const spyLinks = [...document.querySelectorAll('.nav-links a')];
  const navLinksEl = document.getElementById('navLinks');
  function currentSectionHash() {
    const y = window.scrollY + navH() + 2;
    const vb = document.querySelector('.vision-box');
    const contactTop = vb ? vb.getBoundingClientRect().top + window.scrollY : Infinity;
    const testiTop = testimonialsSection ? testimonialsSection.offsetTop : Infinity;
    const workTop = overlay ? overlay.getBoundingClientRect().top + window.scrollY : Infinity;
    const svcTop = coverWrap ? coverWrap.offsetTop : Infinity;
    const aboutTop = aboutSection ? aboutSection.offsetTop : Infinity;
    if (y >= contactTop) return null;            // contact is the nav CTA, not a link
    if (y >= testiTop) return '#testimonials';
    if (y >= workTop) return '#work-anchor';
    if (y >= svcTop) return '#services-anchor';
    if (y >= aboutTop) return '#about';
    return null;                                 // hero — nothing active
  }
  let _lastSpyY = window.scrollY;
  function updateSpy() {
    const y = window.scrollY;
    // Direction governs the wipe: scrolling DOWN draws/erases left→right;
    // scrolling UP reverses it to right→left (a class flips the CSS origins).
    if (Math.abs(y - _lastSpyY) > 1 && navLinksEl) {
      navLinksEl.classList.toggle('nav-up', y < _lastSpyY);
      _lastSpyY = y;
    }
    const cur = currentSectionHash();
    // A page can force a nav link permanently active (e.g. the standalone Works
    // page sets <body data-nav-active="portfolio">). Otherwise highlight the link
    // whose data-spy matches the section currently under the nav.
    const forcedNav = document.body.dataset.navActive || null;
    spyLinks.forEach((a) => {
      const forced = forcedNav && a.dataset.nav === forcedNav;
      const spyMatch = !!a.dataset.spy && a.dataset.spy === cur;
      a.classList.toggle('nav-active', forced || spyMatch);
    });
  }
  window.addEventListener('scroll', updateSpy, { passive: true });
  window.addEventListener('resize', updateSpy);
  updateSpy();

  /* ---- Cards that play an mp4 on hover (UNbound, CarWash MX, Flor Tierra, Abimerhi).
     Desktop: play on hover, pause on leave. Touch / no-hover: autoplay while the
     card is ≥50% in view. The poster (still image) shows until the .mp4 exists. */
  document.querySelectorAll('.case--hovervid').forEach((card) => {
    const vid = card.querySelector('video.case-vid');
    if (!vid) return;
    const play = () => { card.classList.add('is-playing'); const p = vid.play(); if (p && p.catch) p.catch(() => {}); };
    const stop = () => { card.classList.remove('is-playing'); try { vid.pause(); } catch (e) {} };
    card.addEventListener('mouseenter', play);
    card.addEventListener('mouseleave', stop);
    const coarse = window.matchMedia && window.matchMedia('(hover: none), (pointer: coarse)').matches;
    if (coarse && 'IntersectionObserver' in window) {
      new IntersectionObserver((ents) => {
        ents.forEach((en) => { (en.isIntersecting && en.intersectionRatio >= 0.5) ? play() : stop(); });
      }, { threshold: [0, 0.5, 1] }).observe(card);
    }
  });

  /* ---- Hero/Into-Focus clip (homepage + Portfolio tab header): plays whenever
     ≥25% in view, pauses when scrolled away. Also acts as an autoplay fallback —
     some browsers ignore the autoplay attribute until play() is called directly. */
  document.querySelectorAll('.film-frame').forEach((vid) => {
    const play = () => { const p = vid.play(); if (p && p.catch) p.catch(() => {}); };
    const stop = () => { try { vid.pause(); } catch (e) {} };
    if ('IntersectionObserver' in window) {
      new IntersectionObserver((ents) => {
        ents.forEach((en) => { en.isIntersecting ? play() : stop(); });
      }, { threshold: [0, 0.25] }).observe(vid);
    } else {
      play();
    }
  });

  /* ---- Carousel arrows: relocate at ≤1100 so the heading gets the full width.
     Portfolio arrows drop into the foot (bottom-left, level with 'See all work');
     Testimonials arrows drop below the cards. A single element is MOVED in the
     DOM (no duplicate IDs), so the click handlers above keep working. ---- */
  (function relocateArrows() {
    const pPrev = document.getElementById('p-prev');
    const tPrev = document.getElementById('t-prev');
    const pCtrls = pPrev ? pPrev.closest('.portfolio-controls') : null;
    const tCtrls = tPrev ? tPrev.closest('.portfolio-controls') : null;
    const pHead  = document.querySelector('.portfolio-head');
    const pFoot  = document.querySelector('.portfolio-foot');
    const tHead  = document.querySelector('.t-head');
    const tInner = document.querySelector('.testimonials-inner');
    let tBelow = null;
    if (tInner) { tBelow = document.createElement('div'); tBelow.className = 't-controls-below'; tInner.appendChild(tBelow); }
    function relocate() {
      const narrow = window.innerWidth <= 1100;
      if (pCtrls && pHead && pFoot) {
        if (narrow) { if (pCtrls.parentElement !== pFoot) pFoot.insertBefore(pCtrls, pFoot.firstChild); }
        else { if (pCtrls.parentElement !== pHead) pHead.appendChild(pCtrls); }
      }
      if (tCtrls && tHead && tBelow) {
        if (narrow) { if (tCtrls.parentElement !== tBelow) tBelow.appendChild(tCtrls); }
        else { if (tCtrls.parentElement !== tHead) tHead.appendChild(tCtrls); }
      }
    }
    relocate();
    window.addEventListener('resize', relocate);
  })();

  /* ---- Vision-box: expands from ~1in inset to full screen width as contact enters view ---- */
  const visionBox      = document.querySelector('.vision-box');
  const contactSection = document.querySelector('.contact');

  if (visionBox && contactSection) {
    const INSET = 96; // px each side at the start of the expand (desktop only)
    function updateVision() {
      // Mobile (≤900, where the nav collapses): no expand animation — the box is
      // full-bleed at all times. Clear the vars so the CSS defaults (inset:0) win.
      if (window.innerWidth <= 900) {
        visionBox.style.removeProperty('--inset');
        visionBox.style.removeProperty('--vision-radius');
        return;
      }
      // Desktop: expand from a rounded 96px inset to square full-bleed as the
      // contact section scrolls into view.
      const r = contactSection.getBoundingClientRect();
      const vh = window.innerHeight;
      const raw = (vh - r.top) / (vh * 0.55);
      const p = Math.max(0, Math.min(1, raw));
      const ease = p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
      visionBox.style.setProperty('--inset', (INSET * (1 - ease)) + 'px');
      visionBox.style.setProperty('--vision-radius', (28 * (1 - ease)) + 'px');
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

  /* ---- About headline: keep the "…can change" / "everything…" break, but drop it
     (flow the words) the moment the first line would wrap and orphan "change". We
     measure in the block state each time, then toggle the .flow class. ---- */
  function fitAboutQuote() {
    document.querySelectorAll('.about-quote').forEach((q) => {
      const lines = q.querySelectorAll('.aq-line');
      if (!lines.length) return;
      q.classList.remove('flow');           // measure the two-line (block) state
      let wrapped = false;
      lines.forEach((l) => {
        const cs = getComputedStyle(l);
        let lh = parseFloat(cs.lineHeight);
        if (!lh || isNaN(lh)) lh = parseFloat(cs.fontSize) * 1.12;
        if (l.offsetHeight > lh * 1.6) wrapped = true;   // this line broke to 2+ rows
      });
      if (wrapped) q.classList.add('flow');
    });
  }
  function refitAll() { refit(); fitAboutQuote(); }
  fitHeadings();
  fitAboutQuote();
  window.addEventListener('resize', refitAll);
  window.addEventListener('scroll', fitHeadings, { passive: true });
  if (document.fonts && document.fonts.ready) { document.fonts.ready.then(refitAll); }

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

    // Cache key off the viewport height + width so we only recompute when the
    // available space actually changes.
    const section = redux.closest('.services-section');
    const scs = section ? getComputedStyle(section) : null;
    const padV = scs ? (parseFloat(scs.paddingTop) + parseFloat(scs.paddingBottom)) : 0;
    // Keep the WHOLE section within one viewport so it pins + is covered cleanly
    // (the About→film model). On zoom-out the content is smaller than this, so it
    // stays its natural size; only short / zoomed-in viewports trigger a shrink.
    const availH = window.innerHeight - padV - 14;
    const key = Math.round(availH) + ':' + window.innerWidth;
    if (key === _svcKey) return;
    _svcKey = key;

    redux.style.fontSize = '';                          // reset to the CSS base unit
    const base = parseFloat(getComputedStyle(redux).fontSize);
    const left  = redux.querySelector('.services-left');
    const right = redux.querySelector('.services-right');
    // Layout height of each column. offsetHeight excludes the absolutely-positioned
    // compass (which bleeds off the edges by design) but DOES include the small
    // compass-wrap footprint — so the shrink keeps the real content in one viewport
    // without the decorative compass blowing up the measurement.
    const natural = Math.max(left ? left.offsetHeight : 0, right ? right.offsetHeight : 0);
    // shrink-only: scale the whole block down if it would overflow the viewport
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

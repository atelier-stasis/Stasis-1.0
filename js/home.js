/* ============================================================
   Home page — the project browser.

   Left panel: vertical list of project names, the centred one
   active and dark, neighbours dimmed, hairline dividers between.
   Right panel: vertical thumbnail carousel moving the opposite
   direction, locked to the same position.
   ============================================================ */

(function () {
  'use strict';

  /* ---------- Gallatin Grange: its own visuals and page sequence ----------
     Page types (each defines the left-half and right-half of a spread):
       hero        — copy block (left) + docked hero photograph (right)
       full        — one image full-bleed across both halves
       bleed-inset — full-bleed image (left) + centred inset on white (right)
       bleed-quote — full-bleed image (left) + centred quote on white (right)
       inset-bleed — centred inset on white (left) + full-bleed image (right) */
  const GG = '00 Visuals/02 Visuals_Projects/01 Gallatin Grange/';
  const GG_IMG = {
    hero:    GG + 'Woman_looking_into_sunset_2K_202607121645.jpeg',
    woods:   GG + 'Photo_from_woods_seeing_building_202607121644.jpeg',
    facade:  GG + 'Building_through_tree_leaves_2K_202607121646.jpeg',
    man:     GG + 'Man_in_minimal_clothing_architec…_202607121646.jpeg',
    porsche: GG + 'Porsche_and_building_in_frame_202607121646.jpeg',
    sunset:  GG + 'Woman_on_balcony_sunset_2K_202607121656.jpeg',
    leaves:  GG + 'Leaves_moving_handheld_camera_202607121707.mp4',
  };
  const GALLATIN_PAGES = [
    { type: 'hero' },
    { type: 'full',        image: GG_IMG.woods },
    { type: 'bleed-inset', left: GG_IMG.facade,  inset: GG_IMG.man },
    { type: 'bleed-quote', left: GG_IMG.porsche },
    { type: 'full',        image: GG_IMG.sunset },
    { type: 'inset-bleed', inset: GG_IMG.man,    right: GG_IMG.facade },
    { type: 'video-full',  video: GG_IMG.leaves },
  ];

  const PM = '00 Visuals/02 Visuals_Projects/04 Pearl Museum/';
  const PM_IMG = {
    family: PM + 'Emirati_kid_dropping_pearls_water_202607191139.jpeg',
    ballet: PM + 'Human_figure_ballet_pose_yellow_202607191210.jpeg',
    couple: PM + 'Arab_couple_enjoying_architecture_4K_202607191157.jpeg',
    aqua:   PM + 'Aqua_water_with_pearls_4K_202607191146.jpeg',
  };
  const PEARL_PAGES = [
    { type: 'hero' },
    { type: 'full',        image: PM_IMG.ballet },
    { type: 'bleed-inset', left: PM_IMG.couple, inset: PM_IMG.aqua },
  ];

  // Title = project name, sub-heading = location. Visuals are reused
  // from the five placeholder sets until each project gets its own;
  // projects with an explicit `pages` array drive a bespoke sequence.
  const PROJECTS = [
    { name: 'Catskills Retreat',     location: 'Catskills Range, New York',       image: '00 Visuals/project-01/01.jpg' },
    { name: 'Heard Falkenstern',     location: 'Portland, Oregon',                image: '00 Visuals/project-02/01.jpg' },
    { name: 'Fort Greene Townhouse', location: 'Brooklyn, New York',              image: '00 Visuals/project-03/01.jpg' },
    { name: 'Pearl Museum',          location: 'Abu Dhabi, United Arab Emirates', image: PM_IMG.family, pages: PEARL_PAGES },
    { name: 'Findlay',               location: 'Cincinnati, Ohio',                image: '00 Visuals/project-05/01.jpg' },
    { name: 'Batavia Farm',          location: 'Cincinnati, Ohio',                image: '00 Visuals/project-01/01.jpg' },
    { name: 'Gallatin Grange',       location: 'Columbia County, New York',       image: GG_IMG.hero, pages: GALLATIN_PAGES },
    { name: 'Frame House',           location: 'East Hampton, New York',          image: '00 Visuals/project-03/01.jpg' },
    { name: 'House on the Bluff',    location: 'Monsaraz, Portugal',              image: '00 Visuals/project-04/01.jpg' },
    { name: 'Snowmass',              location: 'Aspen, Colorado',                 image: '00 Visuals/project-05/01.jpg' },
  ];

  const N = PROJECTS.length;
  const SLOTS = 7;                  // rendered rows: enough to cover the viewport
  const HALF = Math.floor(SLOTS / 2);

  const INACTIVE_SCALE = 0.46;      // inactive names relative to the active one
  const THUMB_SCALE = 0.74;         // neighbour thumbnails relative to the main one
  const THUMB_OPACITY = 0.5;        // neighbour thumbnail opacity

  const namesEl = document.getElementById('names');
  const carouselEl = document.getElementById('carousel');
  const tagEl = document.getElementById('category-tag');
  const revealEl = document.getElementById('project-reveal');
  const sections = Array.prototype.slice.call(
    document.querySelectorAll('#project-copy section'));
  const brandEl = document.getElementById('brand');
  const splitEl = document.getElementById('split');
  const stripLeft = document.getElementById('ppages-left');
  const stripRight = document.getElementById('ppages-right');
  const heroDock = document.getElementById('hero-dock');
  const mediaOverlay = document.getElementById('project-media');

  const logoEl = document.querySelector('.site-header__logo');
  const backEl = document.getElementById('project-back');
  const menuBtn = document.querySelector('.site-header__menu');
  const menuPanel = document.getElementById('menu-panel');
  const menuBackdrop = document.getElementById('menu-backdrop');
  const menuItems = Array.prototype.slice.call(
    menuPanel.querySelectorAll('.menu-nav__item'))
    .concat([menuPanel.querySelector('.menu-studio')]);

  let projectOpen = false;
  let heroDocked = false;     // hero image lives inside the right strip
  let page = 0;               // current project page (0..PAGE_COUNT-1)
  let menuOpen = false;

  /* ---------- build slots ---------- */

  const nameSlots = [];
  const thumbSlots = [];

  for (let i = 0; i < SLOTS; i++) {
    const slot = document.createElement('div');
    slot.className = 'names__slot';
    const title = document.createElement('h2');
    title.className = 'names__title';
    slot.appendChild(title);
    namesEl.appendChild(slot);
    nameSlots.push({ el: slot, title, project: -1 });

    const thumb = document.createElement('div');
    thumb.className = 'carousel__slot';
    const img = document.createElement('img');
    img.alt = '';
    img.decoding = 'async';
    thumb.appendChild(img);
    const overlay = document.createElement('div');
    overlay.className = 'carousel__overlay';
    const plus = document.createElement('span');
    plus.className = 'carousel__plus';
    overlay.appendChild(plus);
    thumb.appendChild(overlay);
    carouselEl.appendChild(thumb);
    thumbSlots.push({ el: thumb, img, project: -1 });
  }

  /* ---------- metrics ---------- */

  const M = {};
  function measure() {
    M.panelH = window.innerHeight;
    M.panelW = window.innerWidth / 2;
    // Row height scales with the display size so the list breathes.
    const fontPx = parseFloat(getComputedStyle(nameSlots[0].title).fontSize);
    M.rowH = Math.max(128, fontPx * 2.15);
    M.tagOffset = fontPx * 0.66;
    // Main thumbnail: portrait 3:4, capped by both panel height and width.
    M.thumbW = Math.round(Math.min(M.panelH * 0.62 * 0.75, M.panelW * 0.58));
    M.thumbH = Math.round(M.thumbW / 0.75);
    // Spacing leaves a calm gap after the main image while keeping the
    // neighbours cropped by the panel edges.
    M.thumbSpacing = M.thumbH * (0.5 + THUMB_SCALE / 2) +
      Math.max(28, M.panelH * 0.05);

    for (let i = 0; i < thumbSlots.length; i++) {
      const t = thumbSlots[i];
      if (projectOpen && i === HALF) {
        // The hero is expanded (or docked in the right strip, sized in %):
        // leave its geometry alone.
        continue;
      }
      t.el.style.width = M.thumbW + 'px';
      t.el.style.height = M.thumbH + 'px';
      t.el.style.marginLeft = (-M.thumbW / 2) + 'px';
      t.el.style.marginTop = (-M.thumbH / 2) + 'px';
    }
  }

  /* ---------- helpers ---------- */

  const mod = (i, n) => ((i % n) + n) % n;

  // #555555 → #A2A2A2 as a name moves away from the centre.
  function nameColor(t) {
    const c = Math.round(0x55 + (0xA2 - 0x55) * t);
    const h = c.toString(16).padStart(2, '0');
    return '#' + h + h + h;
  }

  const clamp01 = (v) => Math.max(0, Math.min(1, v));

  /* ---------- render ---------- */

  function render(pos) {
    const center = Math.round(pos);

    for (let i = 0; i < SLOTS; i++) {
      const k = center - HALF + i;          // unwrapped item index for this slot
      const project = PROJECTS[mod(k, N)];
      const dist = Math.abs(k - pos);       // 0 = centred/active
      const t = clamp01(dist);              // 0..1 activation blend

      // Left: names travel downward as pos decreases, upward as it grows.
      const nameSlot = nameSlots[i];
      if (nameSlot.project !== mod(k, N)) {
        nameSlot.project = mod(k, N);
        nameSlot.title.textContent = project.name;
      }
      const y = (k - pos) * M.rowH;
      const scale = 1 - (1 - INACTIVE_SCALE) * t;
      nameSlot.el.style.transform =
        'translateY(' + y.toFixed(2) + 'px) scale(' + scale.toFixed(4) + ')';
      nameSlot.title.style.color = nameColor(t);

      // Right: thumbnails travel the opposite direction, in lockstep.
      if (projectOpen && i === HALF) continue;   // hero is out of the carousel
      const thumb = thumbSlots[i];
      if (thumb.project !== mod(k, N)) {
        thumb.project = mod(k, N);
        thumb.img.src = project.image;
      }
      const ty = -(k - pos) * M.thumbSpacing;
      const ts = 1 - (1 - THUMB_SCALE) * t;
      thumb.el.style.transform =
        'translateY(' + ty.toFixed(2) + 'px) scale(' + ts.toFixed(4) + ')';
      thumb.el.style.opacity = (1 - (1 - THUMB_OPACITY) * t).toFixed(3);
      thumb.el.style.zIndex = dist < 0.5 ? 2 : 1;
    }

    // The category tag sits just beneath the active title.
    tagEl.style.transform =
      'translateY(' + M.tagOffset.toFixed(1) + 'px)';
  }

  /* ---------- project page open / close ---------- */

  const EXPAND_MS = 850;      // shared-element expand + white reveal duration

  function setExpandedGeometry(el) {
    el.style.left = '0px';
    el.style.top = '0px';
    el.style.marginLeft = '0px';
    el.style.marginTop = '0px';
    el.style.width = M.panelW + 'px';
    el.style.height = M.panelH + 'px';
    el.style.transform = 'none';
    el.style.opacity = '1';
  }

  function setActiveCues() {
    nameSlots[HALF].el.classList.add('is-active');
    thumbSlots[HALF].el.classList.add('is-active');
  }

  function clearActiveCues() {
    for (let i = 0; i < SLOTS; i++) {
      nameSlots[i].el.classList.remove('is-active');
      thumbSlots[i].el.classList.remove('is-active');
    }
  }

  function showSections() {
    sections.forEach(function (s, i) {
      s.style.transitionDelay = (i * 240) + 'ms';
      s.classList.add('is-in');
    });
  }

  function hideSections() {
    sections.forEach(function (s) {
      s.style.transitionDelay = '0ms';
      s.classList.remove('is-in');
    });
  }

  const PUSH_MS = 1150;       // slower, more drawn-out than the home carousel

  let currentPages = [];      // the open project's page sequence
  let pageSlot = [];          // page index -> strip slot (-1 for overlay pages)
  let overlayMedia = {};      // page index -> media element in the overlay

  /* The default sequence when a project has no bespoke `pages`: hero,
     then a bleed+inset spread, then a bleed+quote spread. */
  function defaultPages(project) {
    const folder = project.image.replace(/\/[^/]+$/, '');
    return [
      { type: 'hero' },
      { type: 'bleed-inset', left: folder + '/02.jpg', inset: folder + '/03.jpg' },
      { type: 'bleed-quote', left: folder + '/04.jpg' },
    ];
  }

  /* Whether a page's LEFT half is a photograph (needs the white logo and
     the light back arrow) rather than white ground. */
  function leftDark(pg) {
    return !!pg && (pg.type === 'full' || pg.type === 'video-full' ||
      pg.type === 'bleed-inset' || pg.type === 'bleed-quote');
  }

  /* ---------- page DOM builders ---------- */

  function makeImg(cls, src) {
    const img = document.createElement('img');
    img.className = cls;
    img.alt = '';
    img.decoding = 'async';    // decode off the main thread — no push jank
    img.src = encodeURI(src);
    return img;
  }

  /* Full-bleed pages (a still image or a video) don't split across the
     two counter-moving strips — they ride a single full-screen overlay
     that slides as one whole plane. */
  function isOverlayType(pg) {
    return !!pg && (pg.type === 'full' || pg.type === 'video-full');
  }

  function makeVideoEl(src) {
    const v = document.createElement('video');
    v.className = 'project-media__el is-hidden';
    v.src = encodeURI(src);
    v.muted = true;            // required for autoplay
    v.loop = true;
    v.playsInline = true;
    v.setAttribute('playsinline', '');
    v.preload = 'auto';        // buffer ahead; playback starts on its page
    return v;
  }

  function makeQuote() {
    const q = document.createElement('div');
    q.className = 'quote';
    q.innerHTML = '<div class="quote__name">Jane Doe</div>' +
      '<blockquote class="quote__text">“Some people think design ' +
      'means how it looks. But if you dig deeper, it’s really how it ' +
      'works.”</blockquote>';
    return q;
  }

  /* Build the strip children for split pages and the overlay media for
     full-bleed pages. Index 0 (copy block on the left, hero dock on the
     right) is the static markup and is left in place.

     Split pages take sequential strip slots; overlay pages take none, so
     `pageSlot` maps every page to the strip position that should show
     behind it. */
  function buildProjectPages(pages) {
    currentPages = pages;
    pageSlot = [];
    overlayMedia = {};
    while (stripLeft.children.length > 1) stripLeft.lastChild.remove();
    while (stripRight.children.length > 1) stripRight.lastChild.remove();
    mediaOverlay.innerHTML = '';

    let slot = 0;
    for (let k = 0; k < pages.length; k++) {
      const pg = pages[k];

      // Full-bleed page: build its overlay media, and hold the strips on
      // the last split page seen so something coherent sits behind it.
      if (isOverlayType(pg)) {
        pageSlot[k] = Math.max(0, slot - 1);
        const el = pg.type === 'video-full'
          ? makeVideoEl(pg.video)
          : makeImg('project-media__el is-hidden', pg.image);
        mediaOverlay.appendChild(el);
        overlayMedia[k] = el;
        continue;
      }

      pageSlot[k] = slot;
      const s = slot;
      slot++;
      if (k === 0) continue;    // page 0 is the static hero/copy markup

      const l = document.createElement('div');
      l.className = 'ppage';
      l.style.top = (s * 100) + '%';
      const r = document.createElement('div');
      r.className = 'ppage';
      r.style.top = (-s * 100) + '%';

      if (pg.type === 'bleed-inset') {
        l.appendChild(makeImg('ppage__bleed', pg.left));
        r.classList.add('ppage--white');
        r.appendChild(makeImg('ppage__inset', pg.inset));
      } else if (pg.type === 'bleed-quote') {
        l.appendChild(makeImg('ppage__bleed', pg.left));
        r.classList.add('ppage--white');
        r.appendChild(makeQuote());
      } else if (pg.type === 'inset-bleed') {
        l.classList.add('ppage--white');
        l.appendChild(makeImg('ppage__inset', pg.inset));
        r.appendChild(makeImg('ppage__bleed', pg.right));
      }
      stripLeft.appendChild(l);
      stripRight.appendChild(r);
    }
  }

  /* The logo sits over the left half: dark on light ground, white over a
     full-bleed photograph. */
  function updateLogoTheme() {
    const overImage = subpageOpen() ||
      (projectOpen && leftDark(currentPages[page]));
    logoEl.classList.toggle('is-light', overImage);
  }

  /* The back arrow shows on every page past the hero; it turns dark when
     the left half beneath it is white rather than a photograph. */
  function updateBackArrow() {
    const show = projectOpen && page > 0;
    backEl.classList.toggle('is-visible', show);
    backEl.classList.toggle('is-dark', show && !leftDark(currentPages[page]));
  }

  function setStripSlot(s) {
    stripLeft.style.transform = 'translateY(' + (-s * 100) + '%)';
    stripRight.style.transform = 'translateY(' + (s * 100) + '%)';
  }

  /* Show one overlay page's media, hide the rest; play/pause videos. */
  function showOverlayMedia(activeIdx) {
    Object.keys(overlayMedia).forEach(function (key) {
      const el = overlayMedia[key];
      const on = (+key === activeIdx);
      el.classList.toggle('is-hidden', !on);
      if (el.tagName === 'VIDEO') {
        if (on) el.play().catch(function () {}); else el.pause();
      }
    });
  }

  /* Move to a page. Split pages push the two strips in opposite vertical
     directions as before. Full-bleed pages (image or video) instead ride
     the overlay, which slides as one whole plane — up to advance, down to
     go back — while the strips hold a coherent spread behind it. */
  function goToPage(p) {
    const prev = page;
    page = Math.max(0, Math.min(currentPages.length - 1, p));
    const dir = page < prev ? -1 : 1;         // -1 reverse, +1 advance
    const pg = currentPages[page];
    const wasOverlay = isOverlayType(currentPages[prev]);

    if (isOverlayType(pg)) {
      // Enter the whole-plane overlay from the travelling side.
      showOverlayMedia(page);
      mediaOverlay.style.transition = 'none';
      mediaOverlay.style.transform =
        'translateY(' + (dir > 0 ? 100 : -100) + '%)';
      void mediaOverlay.offsetHeight;
      mediaOverlay.style.transition = '';
      mediaOverlay.style.transform = 'translateY(0)';
    } else {
      if (wasOverlay) {
        // Reposition the strips instantly behind the covering overlay,
        // then slide the overlay off in the travel direction to reveal.
        stripLeft.style.transition = 'none';
        stripRight.style.transition = 'none';
        setStripSlot(pageSlot[page]);
        void stripLeft.offsetHeight;
        stripLeft.style.transition = '';
        stripRight.style.transition = '';
        mediaOverlay.style.transform =
          'translateY(' + (dir > 0 ? -100 : 100) + '%)';
      } else {
        setStripSlot(pageSlot[page]);
      }
    }

    // Flip the logo (and reveal the back arrow) as the page slides in.
    setTimeout(updateLogoTheme, PUSH_MS * 0.45);
    updateBackArrow();
  }

  /* Reset the strips (and the media overlay) to page 0 without animating. */
  function resetStrips() {
    stripLeft.style.transition = 'none';
    stripRight.style.transition = 'none';
    mediaOverlay.style.transition = 'none';
    page = 0;
    setStripSlot(0);
    mediaOverlay.style.transform = 'translateY(100%)';
    Object.keys(overlayMedia).forEach(function (key) {
      overlayMedia[key].classList.add('is-hidden');
    });
    void stripLeft.offsetHeight;
    stripLeft.style.transition = '';
    stripRight.style.transition = '';
    mediaOverlay.style.transition = '';
    updateLogoTheme();
    updateBackArrow();
  }

  function openProject() {
    if (projectOpen || scroller.moving) return;
    projectOpen = true;
    scroller.setEnabled(false);
    hideTag();
    clearActiveCues();

    // Build this project's page sequence (bespoke, or the default three).
    const project = PROJECTS[scroller.wrap(scroller.pos)];
    buildProjectPages(project.pages || defaultPages(project));

    resetStrips();
    splitEl.classList.add('is-project-open');

    // The centred slot itself becomes the full-height photograph —
    // one continuous shared-element motion, no duplicate image.
    const slot = thumbSlots[HALF].el;
    slot.style.zIndex = 4;
    slot.style.transition = 'all ' + EXPAND_MS + 'ms cubic-bezier(0.22, 1, 0.36, 1)';
    for (let i = 0; i < SLOTS; i++) {
      if (i === HALF) continue;
      const el = thumbSlots[i].el;
      el.style.transition = 'opacity 450ms ease';
      el.style.opacity = '0';
    }

    requestAnimationFrame(function () {
      setExpandedGeometry(slot);         // image expands to the right half
      revealEl.classList.add('is-open'); // white block slides down the left
    });

    setTimeout(function () {
      // Dock the hero inside the right strip so it rides the page pushes.
      slot.style.transition = 'none';
      slot.style.width = '100%';
      slot.style.height = '100%';
      slot.style.transform = 'none';
      slot.style.zIndex = '';
      heroDock.appendChild(slot);
      heroDocked = true;
      showSections();
    }, EXPAND_MS + 60);
  }

  function closeProject() {
    if (!projectOpen || !heroDocked) return;

    // From a later page, glide back to page 0 first, then unwind.
    const delay = page > 0 ? PUSH_MS + 100 : 0;
    if (page > 0) goToPage(0);
    heroDocked = false;
    setTimeout(unwindProject, delay);
  }

  function unwindProject() {
    hideSections();
    revealEl.classList.remove('is-open');

    // Hand the hero back to the carousel at its expanded geometry,
    // then shrink it into its slot.
    const slot = thumbSlots[HALF].el;
    slot.style.transition = 'none';
    carouselEl.appendChild(slot);
    setExpandedGeometry(slot);
    slot.style.zIndex = 4;
    void slot.offsetHeight;
    slot.style.transition = 'all ' + EXPAND_MS + 'ms cubic-bezier(0.22, 1, 0.36, 1)';

    slot.style.left = '50%';
    slot.style.top = '50%';
    slot.style.marginLeft = (-M.thumbW / 2) + 'px';
    slot.style.marginTop = (-M.thumbH / 2) + 'px';
    slot.style.width = M.thumbW + 'px';
    slot.style.height = M.thumbH + 'px';
    slot.style.transform = 'translateY(0px) scale(1)';

    for (let i = 0; i < SLOTS; i++) {
      if (i === HALF) continue;
      const el = thumbSlots[i].el;
      el.style.transition = 'opacity 700ms ease 250ms';
      el.style.opacity = String(THUMB_OPACITY);
    }

    setTimeout(function () {
      projectOpen = false;
      splitEl.classList.remove('is-project-open');
      for (let i = 0; i < SLOTS; i++) {
        thumbSlots[i].el.style.transition = '';
      }
      thumbSlots[HALF].el.style.zIndex = '';
      measure();
      render(scroller.pos);
      showTag(scroller.wrap(scroller.pos));
      setActiveCues();
      scroller.setEnabled(true);
    }, EXPAND_MS + 80);
  }

  /* ---------- project page pager ----------
     Deliberately less sensitive than the home carousel: one distinct
     gesture advances exactly one page, and a new push cannot begin
     until the current one has fully settled. */

  let pagerLastFire = -1e9;
  let pagerLastEvent = -1e9;
  let touchStartY = null;
  let touchFired = false;

  function tryPage(dir, now) {
    if (!projectOpen || !heroDocked || menuOpen) return;
    if (now - pagerLastFire < PUSH_MS + 200) return;   // still settling
    const next = page + dir;
    if (next < 0 || next >= currentPages.length) return;
    pagerLastFire = now;
    goToPage(next);
  }

  window.addEventListener('wheel', function (e) {
    if (!projectOpen) return;
    const now = performance.now();
    const gap = now - pagerLastEvent;
    pagerLastEvent = now;
    // Events arriving in a continuous stream (trackpad inertia) belong
    // to the gesture that already fired — require a genuine pause.
    if (gap < 240 && now - pagerLastFire < 2500) return;
    if (Math.abs(e.deltaY) < 8) return;
    tryPage(Math.sign(e.deltaY), now);
  }, { passive: true });

  window.addEventListener('touchstart', function (e) {
    if (!projectOpen) return;
    touchStartY = e.touches[0].clientY;
    touchFired = false;
  }, { passive: true });

  window.addEventListener('touchmove', function (e) {
    if (!projectOpen || touchStartY === null || touchFired) return;
    const dy = touchStartY - e.touches[0].clientY;
    if (Math.abs(dy) > 50) {
      touchFired = true;
      tryPage(dy > 0 ? 1 : -1, performance.now());
    }
  }, { passive: true });

  window.addEventListener('keydown', function (e) {
    if (!projectOpen) return;
    if (e.key === 'ArrowDown' || e.key === 'PageDown') tryPage(1, performance.now());
    if (e.key === 'ArrowUp' || e.key === 'PageUp') tryPage(-1, performance.now());
  });

  /* Snap the project view shut with no animation (used when another
     page is about to cover or replace it). */
  function resetProjectInstant() {
    if (!projectOpen) return;
    hideSections();
    const slot = thumbSlots[HALF].el;
    revealEl.style.transition = 'none';
    revealEl.classList.remove('is-open');
    slot.style.transition = 'none';
    carouselEl.appendChild(slot);
    slot.style.zIndex = '';
    slot.style.left = '50%';               // undo the expanded geometry
    slot.style.top = '50%';
    slot.style.transform = 'translateY(0px) scale(1)';
    for (let i = 0; i < SLOTS; i++) {
      thumbSlots[i].el.style.transition = 'none';
    }
    resetStrips();
    projectOpen = false;
    heroDocked = false;
    splitEl.classList.remove('is-project-open');
    measure();
    render(scroller.pos);
    void splitEl.offsetHeight;
    revealEl.style.transition = '';
    for (let i = 0; i < SLOTS; i++) {
      thumbSlots[i].el.style.transition = '';
    }
    showTag(scroller.wrap(scroller.pos));
    setActiveCues();
  }

  /* Block the context menu over any image-bearing region so photos
     can't be saved or opened in a new tab. */
  document.addEventListener('contextmenu', function (e) {
    if (e.target.closest(
      '.carousel, .loader, .ppages, .subpage__half--left, .site-header__brand')) {
      e.preventDefault();
    }
  });

  document.addEventListener('dragstart', function (e) {
    if (e.target.closest('img, canvas')) e.preventDefault();
  });

  /* ---------- subpages (About / Contact) ---------- */

  const aboutEl = document.getElementById('page-about');
  const contactEl = document.getElementById('page-contact');

  function subpageOpen() {
    return aboutEl.classList.contains('is-open') ||
      contactEl.classList.contains('is-open');
  }

  function openSubpage(el) {
    aboutEl.classList.toggle('is-open', el === aboutEl);
    contactEl.classList.toggle('is-open', el === contactEl);
    scroller.setEnabled(false);       // nothing behind a subpage moves
    setTimeout(updateLogoTheme, 400); // flip as the image slides under
  }

  function closeSubpages() {
    const wasOpen = subpageOpen();
    aboutEl.classList.remove('is-open');
    contactEl.classList.remove('is-open');
    if (wasOpen) setTimeout(updateLogoTheme, 400);
  }

  /* ---------- dropdown menu ----------
     Covers only the right half; everything behind it stays put. */

  const MENU_MS = 850;

  function openMenu() {
    if (menuOpen) return;
    menuOpen = true;
    scroller.setEnabled(false);           // nothing behind the menu moves
    menuBtn.classList.add('is-open');
    menuBtn.setAttribute('aria-label', 'Close');
    menuPanel.classList.add('is-open');
    menuBackdrop.classList.add('is-on');
    // Items fade in one at a time, promptly, while the panel comes down.
    menuItems.forEach(function (el, i) {
      el.style.transitionDelay = (120 + i * 70) + 'ms';
      el.classList.add('is-in');
    });
  }

  function closeMenu() {
    if (!menuOpen) return;
    menuOpen = false;
    menuBtn.classList.remove('is-open');
    menuBtn.setAttribute('aria-label', 'Menu');
    menuPanel.classList.remove('is-open');
    menuBackdrop.classList.remove('is-on');
    menuItems.forEach(function (el) {
      el.style.transitionDelay = '0ms';
      el.classList.remove('is-in');
    });
    if (!projectOpen && !subpageOpen() && !landingActive) {
      scroller.setEnabled(true);
    }
  }

  /* ---------- category tag ---------- */

  function hideTag() {
    tagEl.classList.remove('is-visible');
    tagEl.classList.add('is-hidden-fast');
  }

  function showTag(index) {
    tagEl.textContent = PROJECTS[index].location;
    tagEl.classList.remove('is-hidden-fast');
    tagEl.classList.add('is-visible');
  }

  /* ---------- boot ---------- */

  measure();
  window.addEventListener('resize', () => {
    measure();
    render(scroller.pos);
  });

  // Preload every thumbnail so wrapped slots never flash empty.
  for (const p of PROJECTS) { new Image().src = p.image; }

  // The carousel opens on this project (found by name so it survives
  // any reordering of PROJECTS).
  const START_INDEX = Math.max(0,
    PROJECTS.findIndex(function (p) { return p.name === 'Gallatin Grange'; }));

  const scroller = new SplitScroll({
    length: N,
    onRender: render,
    onMoveStart: function () { hideTag(); clearActiveCues(); },
    onSettle: function (index) { showTag(index); setActiveCues(); },
  });

  // Seat the carousel on the starting project before the first paint.
  scroller.pos = START_INDEX;
  scroller.target = START_INDEX;

  // Clicking the centred thumbnail or the active title opens the project.
  for (let i = 0; i < SLOTS; i++) {
    thumbSlots[i].el.addEventListener('click', function (e) {
      if (e.currentTarget.classList.contains('is-active')) openProject();
    });
    nameSlots[i].el.addEventListener('click', function (e) {
      if (e.currentTarget.classList.contains('is-active')) openProject();
    });
  }

  // STASIS returns to the carousel: reverse transitions, no reload.
  brandEl.addEventListener('click', function (e) {
    e.preventDefault();
    closeMenu();
    closeSubpages();
    closeProject();
    if (!projectOpen && !landingActive) scroller.setEnabled(true);
  });

  // Back arrow over the project images: return to the carousel.
  backEl.addEventListener('click', closeProject);

  // MENU / CLOSE toggle.
  menuBtn.addEventListener('click', function () {
    if (menuOpen) closeMenu(); else openMenu();
  });

  // Menu navigation.
  menuPanel.addEventListener('click', function (e) {
    const item = e.target.closest('.menu-nav__item');
    if (!item) return;
    e.preventDefault();
    const nav = item.dataset.nav;
    if (nav === 'home') {
      // Back to the split landing page.
      closeMenu();
      closeSubpages();
      resetProjectInstant();
      startLanding();
    } else if (nav === 'projects') {
      // Back to the scrolling project browser.
      closeMenu();
      closeSubpages();
      resetProjectInstant();
      scroller.setEnabled(true);
    } else if (nav === 'about') {
      closeMenu();
      resetProjectInstant();
      openSubpage(aboutEl);
    } else if (nav === 'contact') {
      closeMenu();
      resetProjectInstant();
      openSubpage(contactEl);
    }
  });

  render(START_INDEX);
  showTag(scroller.wrap(START_INDEX));
  setActiveCues();

  /* ---------- landing page (initial load, and menu Home) ---------- */

  const loaderEl = document.getElementById('loader');
  const wordEl = document.getElementById('loader-word');
  const imgL = document.getElementById('loader-img-left');
  const imgR = document.getElementById('loader-img-right');
  const cueEl = document.getElementById('loader-cue');

  // Landing visuals: one project folder at random, then two different
  // images from that same project — never a cross-project pairing.
  // Re-randomised every time the landing shows.
  const LANDING_ROOT =
    '00 Visuals/01 Visuals_Stasis/Landing Page Visuals/';
  const LANDING_SETS = [
    [
      '00 FBO/Architecture_peeking_through_asp…_2K_202607101747.jpeg',
      '00 FBO/Landscape_in_focus_woodlands_blu…_202607101747.jpeg',
    ],
    [
      '01 Gallatin Grange/Porsche_and_building_in_frame_202607101748.jpeg',
      '01 Gallatin Grange/Porsche_car_with_badge_water_202607101749.jpeg',
      '01 Gallatin Grange/Woman_looking_into_sunset_2K_202607101748.jpeg',
      '01 Gallatin Grange/Woods_view_through_tree_trunks_202607101748.jpeg',
    ],
    [
      '02 Iceland Sauna Competition/Arctic_fox_in_winter_sunlight_202607101750 (1).jpeg',
      '02 Iceland Sauna Competition/Arctic_fox_in_winter_sunlight_202607101750.jpeg',
      '02 Iceland Sauna Competition/Terrain_and_gabion_sauna_2K_202607101750.jpeg',
    ],
  ];

  let landingActive = false;   // landing is covering the site
  let landingReady = false;    // entrance finished, waiting for a scroll
  let dismissed = false;
  let trackGap = null;         // { from, to } gap in px, set once sliced
  let landingSession = 0;      // invalidates stale timeouts on re-show

    // Slice the white logo PNG into its individual letters (by scanning
    // for fully transparent columns) so the gaps between the real
    // letterforms can be animated — true tracking on the actual logo.
    const logoReady = new Promise(function (resolve) {
      const im = new Image();
      im.onload = function () {
        try {
          const cv = document.createElement('canvas');
          cv.width = im.width;
          cv.height = im.height;
          const cx2d = cv.getContext('2d');
          cx2d.drawImage(im, 0, 0);
          const px = cx2d.getImageData(0, 0, im.width, im.height).data;
          const solidCol = function (x) {
            for (let y = 0; y < im.height; y++) {
              if (px[(y * im.width + x) * 4 + 3] > 10) return true;
            }
            return false;
          };
          // Horizontal letter segments.
          const segs = [];
          let s = -1;
          for (let x = 0; x < im.width; x++) {
            const has = solidCol(x);
            if (has && s < 0) s = x;
            if (!has && s >= 0) { segs.push([s, x]); s = -1; }
          }
          if (s >= 0) segs.push([s, im.width]);
          // Vertical crop of the glyph band.
          const solidRow = function (y) {
            for (let x = 0; x < im.width; x++) {
              if (px[(y * im.width + x) * 4 + 3] > 10) return true;
            }
            return false;
          };
          let top = 0;
          let bot = im.height;
          while (top < bot && !solidRow(top)) top++;
          while (bot > top && !solidRow(bot - 1)) bot--;
          const glyphH = bot - top;

          if (segs.length < 2) throw new Error('no letter gaps found');

          // The logo's own average letter gap, in source pixels.
          let natural = 0;
          for (let i = 1; i < segs.length; i++) {
            natural += segs[i][0] - segs[i - 1][1];
          }
          natural /= (segs.length - 1);

          // Resample each slice down to its display size (in device
          // pixels) with stepped high-quality smoothing: the source PNG
          // has hard 1-bit transparency, and this rebuilds soft,
          // anti-aliased edges at the size actually shown.
          const displayH = wordEl.getBoundingClientRect().height;
          const targetH = Math.max(1,
            Math.round(displayH * (window.devicePixelRatio || 1)));

          segs.forEach(function (seg) {
            const w = seg[1] - seg[0];
            let src = document.createElement('canvas');
            src.width = w;
            src.height = glyphH;
            src.getContext('2d')
              .drawImage(im, seg[0], top, w, glyphH, 0, 0, w, glyphH);
            // Halve repeatedly until within 2x of the target height.
            while (src.height > targetH * 2) {
              const half = document.createElement('canvas');
              half.width = Math.max(1, Math.round(src.width / 2));
              half.height = Math.max(1, Math.round(src.height / 2));
              const hg = half.getContext('2d');
              hg.imageSmoothingEnabled = true;
              hg.imageSmoothingQuality = 'high';
              hg.drawImage(src, 0, 0, half.width, half.height);
              src = half;
            }
            const lc = document.createElement('canvas');
            lc.width = Math.max(1, Math.round(w * targetH / glyphH));
            lc.height = targetH;
            lc.className = 'loader__letter';
            const lg = lc.getContext('2d');
            lg.imageSmoothingEnabled = true;
            lg.imageSmoothingQuality = 'high';
            lg.drawImage(src, 0, 0, lc.width, lc.height);
            wordEl.appendChild(lc);
          });

          // Display scale: rendered height / source glyph height.
          const scale = displayH / glyphH;
          const from = natural * scale;         // as designed
          trackGap = { from: from, to: from * 3 };  // breathes to ~3x
          wordEl.style.gap = from.toFixed(2) + 'px';
        } catch (err) {
          wordEl.textContent = 'Stasis';        // graceful fallback
        }
        resolve();
      };
      im.onerror = function () {
        wordEl.textContent = 'Stasis';
        resolve();
      };
      im.src = '00 Visuals/01 Visuals_Stasis/Logo/Wide-Logo_White.png';
    });

  /* Widen the tracking by sliding each letter outward from the centre
     with transforms — smooth on the compositor, unlike animating the
     layout gap. `extra` is the additional spacing per letter gap. */
  function spreadLetters(extra) {
    const letters = wordEl.querySelectorAll('.loader__letter');
    const n = letters.length;
    for (let i = 0; i < n; i++) {
      const x = (i - (n - 1) / 2) * extra;
      letters[i].style.transform = 'translateX(' + x.toFixed(2) + 'px)';
    }
  }

  /* Show (or re-show) the landing page: fresh image pair, halves push
     in from opposite directions, wordmark breathes, chevron invites
     the dismissing scroll. */
  function startLanding() {
    const sid = ++landingSession;
    landingActive = true;
    landingReady = false;
    dismissed = false;
    scroller.setEnabled(false);   // the site stays still behind the landing
    cueEl.classList.remove('is-in');
    wordEl.classList.remove('is-gone');
    loaderEl.classList.remove('is-done');
    loaderEl.classList.remove('is-in');            // halves offscreen
    loaderEl.classList.remove('is-exiting');       // white backdrop restored
    loaderEl.style.pointerEvents = '';
    spreadLetters(0);                              // back to natural tracking

    const set =
      LANDING_SETS[Math.floor(Math.random() * LANDING_SETS.length)];
    const a = Math.floor(Math.random() * set.length);
    let b = Math.floor(Math.random() * (set.length - 1));
    if (b >= a) b++;
    imgL.src = encodeURI(LANDING_ROOT + set[a]);
    imgR.src = encodeURI(LANDING_ROOT + set[b]);

    const ready = Promise.all([imgL, imgR].map(function (im) {
      return im.complete ? true : new Promise(function (r) {
        im.onload = r;
        im.onerror = r;
      });
    }));

    // Begin once the images and wordmark are in (or after a grace period).
    Promise.race([
      Promise.all([ready, logoReady]),
      new Promise(function (r) { setTimeout(r, 2200); }),
    ])
      .then(function () {
        if (dismissed || sid !== landingSession) return;
        requestAnimationFrame(function () {
          if (sid !== landingSession) return;
          loaderEl.classList.add('is-in');   // halves push in, word breathes
          if (trackGap) spreadLetters(trackGap.to - trackGap.from);
        });
        // The landing then holds; the chevron invites the first scroll.
        setTimeout(function () {
          if (dismissed || sid !== landingSession) return;
          landingReady = true;
          cueEl.classList.add('is-in');
        }, 1600);
      });
  }

  // The first scroll gesture dismisses the landing into the site.
  function dismissLanding() {
    if (!landingReady || dismissed) return;
    const sid = landingSession;
    dismissed = true;
    landingReady = false;
    loaderEl.style.pointerEvents = 'none';       // header usable right away
    loaderEl.classList.add('is-exiting');        // drop the white backdrop
    cueEl.classList.remove('is-in');
    wordEl.classList.add('is-gone');             // STASIS fades away first
    setTimeout(function () {
      if (sid !== landingSession) return;
      loaderEl.classList.remove('is-in');        // halves slide back out
    }, 500);
    setTimeout(function () {
      if (sid !== landingSession) return;
      loaderEl.classList.add('is-done');         // the site is live
      landingActive = false;
      scroller.setEnabled(true);
    }, 1700);
  }

  window.addEventListener('wheel', dismissLanding, { passive: true });
  window.addEventListener('touchmove', dismissLanding, { passive: true });
  window.addEventListener('keydown', function (e) {
    if (e.key === 'ArrowDown' || e.key === 'PageDown' || e.key === ' ') {
      dismissLanding();
    }
  });
  // A click anywhere on the landing also transitions into the site.
  loaderEl.addEventListener('click', dismissLanding);

  startLanding();

  window.__debug = {
    scroller: scroller,
    M: M,
    getPage: function () { return page; },
    state: function () { return { projectOpen: projectOpen, heroDocked: heroDocked, menuOpen: menuOpen }; },
    hero: function () { return thumbSlots[HALF].el; },
    open: openProject,
  };
})();

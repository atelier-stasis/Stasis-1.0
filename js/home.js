/* ============================================================
   Home page — the project browser.

   Left panel: vertical list of project names, the centred one
   active and dark, neighbours dimmed, hairline dividers between.
   Right panel: vertical thumbnail carousel moving the opposite
   direction, locked to the same position.
   ============================================================ */

(function () {
  'use strict';

  // Title = project name, sub-heading = location. Visuals are reused
  // from the five placeholder sets until each project gets its own.
  const PROJECTS = [
    { name: 'Catskills Retreat',     location: 'Catskills Range, New York',       image: '00 Visuals/project-01/01.jpg' },
    { name: 'Heard Falkenstern',     location: 'Portland, Oregon',                image: '00 Visuals/project-02/01.jpg' },
    { name: 'Fort Greene Townhouse', location: 'Brooklyn, New York',              image: '00 Visuals/project-03/01.jpg' },
    { name: 'Pearl Museum',          location: 'Abu Dhabi, United Arab Emirates', image: '00 Visuals/project-04/01.jpg' },
    { name: 'Findlay',               location: 'Cincinnati, Ohio',                image: '00 Visuals/project-05/01.jpg' },
    { name: 'Batavia Farm',          location: 'Cincinnati, Ohio',                image: '00 Visuals/project-01/01.jpg' },
    { name: 'Gallatin Grange',       location: 'Columbia County, New York',       image: '00 Visuals/project-02/01.jpg' },
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
  const pageImgs = {
    p1Left: document.getElementById('page1-left'),
    p1Right: document.getElementById('page1-right'),
    p2Left: document.getElementById('page2-left'),
  };

  const menuBtn = document.querySelector('.site-header__menu');
  const menuPanel = document.getElementById('menu-panel');
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

  const PAGE_COUNT = 3;
  const PUSH_MS = 1150;       // slower, more drawn-out than the home carousel

  /* Move both strips to a page: halves push in opposite directions
     (page layout inverts the right strip's stacking order). */
  function goToPage(p) {
    page = Math.max(0, Math.min(PAGE_COUNT - 1, p));
    stripLeft.style.transform = 'translateY(' + (-page * 100) + '%)';
    stripRight.style.transform = 'translateY(' + (page * 100) + '%)';
  }

  /* Reset the strips to page 0 without animating. */
  function resetStrips() {
    stripLeft.style.transition = 'none';
    stripRight.style.transition = 'none';
    goToPage(0);
    void stripLeft.offsetHeight;
    stripLeft.style.transition = '';
    stripRight.style.transition = '';
  }

  function openProject() {
    if (projectOpen || scroller.moving) return;
    projectOpen = true;
    scroller.setEnabled(false);
    hideTag();
    clearActiveCues();

    // Load the rest of the active project's set for the further pages.
    const folder = PROJECTS[scroller.wrap(scroller.pos)].image
      .replace(/\/[^/]+$/, '');
    pageImgs.p1Left.src = folder + '/02.jpg';
    pageImgs.p1Right.src = folder + '/03.jpg';
    pageImgs.p2Left.src = folder + '/04.jpg';

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
    if (next < 0 || next >= PAGE_COUNT) return;
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

  /* ---------- dropdown menu ----------
     Covers only the right half; everything behind it stays put. */

  const MENU_MS = 850;

  function openMenu() {
    if (menuOpen) return;
    menuOpen = true;
    scroller.setEnabled(false);           // nothing behind the menu moves
    menuBtn.textContent = 'Close';
    menuPanel.classList.add('is-open');
    // Items fade in one at a time once the panel has come down.
    menuItems.forEach(function (el, i) {
      el.style.transitionDelay = (MENU_MS - 300 + i * 130) + 'ms';
      el.classList.add('is-in');
    });
  }

  function closeMenu() {
    if (!menuOpen) return;
    menuOpen = false;
    menuBtn.textContent = 'Menu';
    menuPanel.classList.remove('is-open');
    menuItems.forEach(function (el) {
      el.style.transitionDelay = '0ms';
      el.classList.remove('is-in');
    });
    if (!projectOpen) scroller.setEnabled(true);
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

  const scroller = new SplitScroll({
    length: N,
    onRender: render,
    onMoveStart: function () { hideTag(); clearActiveCues(); },
    onSettle: function (index) { showTag(index); setActiveCues(); },
  });

  // Clicking the centred thumbnail or the active title opens the project.
  for (let i = 0; i < SLOTS; i++) {
    thumbSlots[i].el.addEventListener('click', function (e) {
      if (e.currentTarget.classList.contains('is-active')) openProject();
    });
    nameSlots[i].el.addEventListener('click', function (e) {
      if (e.currentTarget.classList.contains('is-active')) openProject();
    });
  }

  // STASIS returns home: reverse the transition instead of reloading.
  brandEl.addEventListener('click', function (e) {
    e.preventDefault();
    closeMenu();
    closeProject();
  });

  // MENU / CLOSE toggle.
  menuBtn.addEventListener('click', function () {
    if (menuOpen) closeMenu(); else openMenu();
  });

  // Menu navigation. Home returns to the carousel; the other
  // destinations are placeholders for future pages.
  menuPanel.addEventListener('click', function (e) {
    const item = e.target.closest('.menu-nav__item');
    if (!item) return;
    e.preventDefault();
    if (item.dataset.nav === 'home') {
      closeMenu();
      closeProject();
    }
  });

  render(0);
  showTag(0);
  setActiveCues();

  /* ---------- loading animation (initial load only) ---------- */

  (function runLoader() {
    const loaderEl = document.getElementById('loader');
    const wordEl = document.getElementById('loader-word');
    const imgL = document.getElementById('loader-img-left');
    const imgR = document.getElementById('loader-img-right');

    scroller.setEnabled(false);   // the site stays still behind the loader

    // Landing visuals: one project folder at random, then two different
    // images from that same project — never a cross-project pairing.
    // Re-randomised on every load.
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
    const set = LANDING_SETS[Math.floor(Math.random() * LANDING_SETS.length)];
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

    const cueEl = document.getElementById('loader-cue');
    let landingReady = false;    // entrance finished, waiting for a scroll
    let dismissed = false;
    let trackGap = null;         // { from, to } gap in px, set once sliced

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

    // Begin once the images and wordmark are in (or after a grace period).
    Promise.race([
      Promise.all([ready, logoReady]),
      new Promise(function (r) { setTimeout(r, 2200); }),
    ])
      .then(function () {
        requestAnimationFrame(function () {
          loaderEl.classList.add('is-in');       // halves push in, word breathes
          if (trackGap) {
            wordEl.style.gap = trackGap.to.toFixed(2) + 'px';
          }
        });
        // The landing then holds; the chevron invites the first scroll.
        setTimeout(function () {
          landingReady = true;
          cueEl.classList.add('is-in');
        }, 1600);
      });

    // The first scroll gesture dismisses the landing into the home page.
    function dismiss() {
      if (!landingReady || dismissed) return;
      dismissed = true;
      cueEl.classList.remove('is-in');
      wordEl.classList.add('is-gone');           // STASIS fades away first
      setTimeout(function () {
        loaderEl.classList.remove('is-in');      // halves slide back out
      }, 500);
      setTimeout(function () {
        loaderEl.classList.add('is-done');       // home page is live
        scroller.setEnabled(true);
      }, 1700);
    }

    window.addEventListener('wheel', dismiss, { passive: true });
    window.addEventListener('touchmove', dismiss, { passive: true });
    window.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowDown' || e.key === 'PageDown' || e.key === ' ') {
        dismiss();
      }
    });
    cueEl.addEventListener('click', dismiss);
  })();

  window.__debug = {
    scroller: scroller,
    M: M,
    getPage: function () { return page; },
    state: function () { return { projectOpen: projectOpen, heroDocked: heroDocked, menuOpen: menuOpen }; },
    hero: function () { return thumbSlots[HALF].el; },
    open: openProject,
  };
})();

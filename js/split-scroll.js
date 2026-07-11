/* ============================================================
   SplitScroll — reusable scroll engine for the split-screen shell.

   Converts wheel / trackpad / touch / keyboard input into one
   continuous position value (in item units) that:
     - glides with a gentle ease-out toward its target,
     - always settles on a whole item (never between two),
     - wraps endlessly in both directions,
     - lets a fast gesture flow through several items.

   Usage:
     const scroller = new SplitScroll({
       length: 5,                       // number of items in the loop
       onRender(pos, settledIndex) {},  // called every animated frame
       onSettle(index) {},              // called when motion comes to rest
       onMoveStart() {},                // called when motion begins
     });
   ============================================================ */

(function () {
  'use strict';

  const EASE = 5.2;             // ease-out strength (higher = quicker settle)
  const WHEEL_NOTCH = 60;       // deltas >= this are treated as discrete notches
  const TRACKPAD_FACTOR = 1 / 320;  // px of trackpad scroll per item
  const IDLE_MS = 130;          // gesture considered finished after this quiet time
  const SETTLE_EPS = 0.001;     // how close to target counts as "at rest"
  const INTENT_MIN = 0.12;      // smallest gesture that still advances one item

  class SplitScroll {
    constructor(opts) {
      this.length = opts.length;
      this.onRender = opts.onRender || function () {};
      this.onSettle = opts.onSettle || function () {};
      this.onMoveStart = opts.onMoveStart || function () {};

      this.pos = 0;             // rendered position (item units, unwrapped)
      this.target = 0;          // where the position is gliding to
      this.enabled = true;      // when false, all input is ignored
      this.moving = false;
      this.lastInputTime = 0;
      this.gestureStart = 0;    // target value when the current gesture began
      this.inGesture = false;
      this.touchY = null;
      this.touchVel = 0;
      this.lastFrame = performance.now();

      this._bindInput();
      this._frame = this._frame.bind(this);
      requestAnimationFrame(this._frame);
    }

    /* Wrap any unwrapped position into [0, length) for content lookup. */
    wrap(i) {
      const n = this.length;
      return ((Math.round(i) % n) + n) % n;
    }

    /* Jump target by a number of items (used by keyboard / API). */
    advance(items) {
      if (!this.enabled) return;
      this._beginGesture();
      this.target = Math.round(this.target) + items;
      this._endGesture();
    }

    /* Lock / unlock all scroll input (e.g. while a project page is open). */
    setEnabled(v) {
      this.enabled = v;
      if (!v) this.touchY = null;
    }

    /* ---------- input ---------- */

    _bindInput() {
      window.addEventListener('wheel', (e) => {
        e.preventDefault();
        if (!this.enabled) return;
        const raw = e.deltaMode === 1 ? e.deltaY * 24 : e.deltaY;
        this._beginGesture();

        if (Math.abs(raw) >= WHEEL_NOTCH) {
          // Discrete mouse-wheel notch: one whole item per notch,
          // stacking naturally when the wheel is spun quickly.
          this.target = Math.round(this.target) + Math.sign(raw) *
            Math.max(1, Math.round(Math.abs(raw) / 110));
        } else {
          // Fine-grained trackpad deltas accumulate continuously.
          this.target += raw * TRACKPAD_FACTOR;
        }
        this.lastInputTime = performance.now();
      }, { passive: false });

      window.addEventListener('touchstart', (e) => {
        if (!this.enabled) return;
        this.touchY = e.touches[0].clientY;
        this.touchVel = 0;
        this._beginGesture();
      }, { passive: true });

      window.addEventListener('touchmove', (e) => {
        if (this.touchY === null) return;
        const y = e.touches[0].clientY;
        const d = this.touchY - y;
        this.touchY = y;
        const delta = d / (window.innerHeight * 0.42); // one screen-swipe ≈ 2 items
        this.touchVel = delta;
        this.target += delta;
        this.lastInputTime = performance.now();
      }, { passive: true });

      window.addEventListener('touchend', () => {
        if (this.touchY === null) return;
        this.touchY = null;
        this.target += this.touchVel * 10;  // gentle momentum carry
        this._endGesture();
      });

      window.addEventListener('keydown', (e) => {
        if (!this.enabled) return;
        if (e.key === 'ArrowDown' || e.key === 'PageDown') this.advance(1);
        if (e.key === 'ArrowUp' || e.key === 'PageUp') this.advance(-1);
      });
    }

    _beginGesture() {
      if (!this.inGesture) {
        this.inGesture = true;
        this.gestureStart = Math.round(this.target);
      }
      if (!this.moving) {
        this.moving = true;
        this.onMoveStart();
      }
    }

    _endGesture() {
      this.inGesture = false;
      this._snap();
    }

    /* Settle the target on a whole item, honouring small deliberate nudges. */
    _snap() {
      let snapped = Math.round(this.target);
      const travelled = this.target - this.gestureStart;
      if (snapped === this.gestureStart && Math.abs(travelled) >= INTENT_MIN) {
        snapped = this.gestureStart + Math.sign(travelled);
      }
      this.target = snapped;
    }

    /* ---------- animation ---------- */

    _frame(now) {
      const dt = Math.min((now - this.lastFrame) / 1000, 0.05);
      this.lastFrame = now;

      // A quiet wheel/trackpad ends the gesture and snaps to a whole item.
      if (this.inGesture && this.touchY === null &&
          now - this.lastInputTime > IDLE_MS) {
        this._endGesture();
      }

      // Exponential ease-out toward the target: fast when far, gliding
      // to a calm stop as it approaches.
      const k = 1 - Math.exp(-EASE * dt);
      this.pos += (this.target - this.pos) * k;

      const atRest = !this.inGesture &&
        Math.abs(this.target - this.pos) < SETTLE_EPS &&
        Number.isInteger(this.target);

      if (this.moving) {
        if (atRest) {
          this.pos = this.target;
          this.moving = false;
        }
        this.onRender(this.pos, this.wrap(this.pos));
        if (!this.moving) this.onSettle(this.wrap(this.pos));
      }

      requestAnimationFrame(this._frame);
    }
  }

  window.SplitScroll = SplitScroll;
})();

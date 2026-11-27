/* 過江龍的士搭電 — scrub hero + whole-site motion */
(function () {
  'use strict';

  var VIDEO_URL = 'assets/hero-scrub.mp4';
  var POSTER_URL = 'assets/hero-poster.jpg';
  var VIDEO_BYTES = 7290906; // hero-scrub.mp4 real byte size (fallback when Content-Length missing)

  var GATES = [
    '(orientation: landscape) and (pointer: coarse) and (max-height: 560px)',
    '(prefers-reduced-motion: reduce)'
  ];

  var stage = document.getElementById('stage');
  var video = document.getElementById('hero');
  var posterLayer = document.querySelector('.poster');
  var ring = document.querySelector('.ring');
  var hero = document.querySelector('.hero');
  var bands = Array.prototype.slice.call(document.querySelectorAll('.band'));

  function clamp(v, lo, hi) { return Math.min(hi, Math.max(lo, v)); }

  /* ---------- hero progress ---------- */
  function heroProgress() {
    var r = hero.getBoundingClientRect();
    var total = r.height - window.innerHeight;
    if (total <= 0) return 0;
    return clamp(-r.top / total, 0, 1);
  }

  /* ---------- text splitting (visual only; captions layer is aria-hidden) ---------- */
  function rng(seed) {
    var s = seed >>> 0;
    return function () { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
  }
  /* Per-char entrance: split each .bhead into char spans, each armed by JS via
     inline styles (max browser compatibility). The earlier "invisible on mobile"
     bug was a leftover .band{display:none} rule, NOT the char split — this is
     safe to re-enable now. */
  function splitBands() {
    bands.forEach(function (b, bi) {
      var head = b.querySelector('.bhead');
      if (!head) return;
      var text = head.textContent;
      head.textContent = '';
      head.setAttribute('aria-hidden', 'true');
      var ent = b.dataset.entrance || 'rise';
      var r = rng(1000 + bi * 137);
      /* "|" in the source text is a manual line-break marker: the title is split
         into lines at the marker so wrapped text lands where the design wants
         (e.g. settle "24小時。|全港各區。" renders as two clean lines). */
      var segments = text.split('|');
      var arr = [];
      segments.forEach(function (segText, si) {
        if (si > 0) { var br = document.createElement('br'); head.appendChild(br); }
        var chars = Array.prototype.slice.call(segText);
        /* group consecutive ASCII runs (digits like "15", latin) into one token so
           they never split across wrapped lines ("15" stays together) */
        var tokens = [];
        for (var i = 0; i < chars.length; i++) {
          if (/[A-Za-z0-9]/.test(chars[i])) {
            var j = i + 1;
            while (j < chars.length && /[A-Za-z0-9]/.test(chars[j])) j++;
            tokens.push(chars.slice(i, j).join(''));
            i = j - 1;
          } else {
            tokens.push(chars[i]);
          }
        }
        tokens.forEach(function (ch, i) {
          var c = document.createElement('span');
          c.className = 'c';
          c.textContent = ch;
          var th;
          if (ent === 'grid') { th = i / chars.length * 0.6 + r() * 0.05; c._jx = (r() * 34 - 17); }
          else if (ent === 'weave') { th = i / chars.length * 0.55 + r() * 0.05; c._jy = (i % 2 === 0 ? -20 : 20); }
          else if (ent === 'punch') { th = 0.04 + i * 0.05 + r() * 0.04; }
          else if (ent === 'rise') { th = 0.04 + i * 0.045 + r() * 0.03; }
          else if (ent === 'settle') { th = 0.02 + i * 0.03 + r() * 0.02; }
          else { th = i / chars.length * 0.5; }
          c._th = th;
          c._ent = ent;
          c.style.opacity = '0';   // JS drives char visibility directly
          head.appendChild(c);
          arr.push(c);
        });
      });
      head._chars = arr;
    });
  }

  /* char states driven in JS (inline styles) so no CSS custom-property math can
     fail on any browser; reduced-motion CSS forces opacity 1 !important instead */
  function applyChars(b, k) {
    var head = b.querySelector('.bhead');
    if (!head || !head._chars) return;
    var ent = b.dataset.entrance || 'rise';
    for (var i = 0; i < head._chars.length; i++) {
      var c = head._chars[i];
      var kc = clamp((k - c._th) * 2.8, 0, 1);
      var op = kc;
      var tf = '';
      if (ent === 'rise') tf = 'translateY(' + ((1 - kc) * -26).toFixed(1) + 'px)';
      else if (ent === 'weave') tf = 'translateY(' + ((1 - kc) * c._jy).toFixed(1) + 'px)';
      else if (ent === 'punch') {
        var ks = clamp((k - c._th - 0.14) * 2.8, 0, 1);
        tf = 'scale(' + (0.6 + 0.56 * kc - 0.16 * ks).toFixed(3) + ')';
      }
      else if (ent === 'grid') tf = 'translateX(' + ((1 - kc) * c._jx).toFixed(1) + 'px)';
      else if (ent === 'settle') tf = 'translateY(' + ((1 - kc) * -22).toFixed(1) + 'px)';
      if (c._op === undefined || Math.abs(op - c._op) > 0.01) { c.style.opacity = String(op); c._op = op; }
      if (kc >= 0.999) tf = 'none';   // fully shown chars get no transform (no GPU layer)
      if (c._tf !== tf) { c.style.transform = tf; c._tf = tf; }
    }
    /* settle band: subline then CTA, sequenced after the headline */
    if (ent === 'settle') {
      var sub = b.querySelector('.bsub');
      if (sub) {
        var sop = clamp((k - 0.6) * 4, 0, 1);
        if (sub._op === undefined || Math.abs(sop - sub._op) > 0.01) { sub.style.opacity = String(sop); sub._op = sop; }
        var stf = 'translateY(' + ((1 - sop) * -12).toFixed(1) + 'px)';
        if (sub._tf !== stf) { sub.style.transform = stf; sub._tf = stf; }
      }
      var btn = b.querySelector('.btn');
      if (btn) {
        var bop = clamp((k - 0.78) * 5, 0, 1);
        if (btn._op === undefined || Math.abs(bop - btn._op) > 0.01) { btn.style.opacity = String(bop); btn._op = bop; }
        var btf = 'translateY(' + ((1 - bop) * 14).toFixed(1) + 'px)';
        if (btn._tf !== btf) { btn.style.transform = btf; btn._tf = btf; }
      }
    }
  }

  /* ---------- caption bands ---------- */
  function smooth(p, e0, e1) {
    var t = clamp((p - e0) / (e1 - e0), 0, 1);
    return t * t * (3 - 2 * t);
  }
  function updateCaptions(p) {
    var isFirst = true;
    bands.forEach(function (b) {
      var a = parseFloat(b.dataset.a), bb = parseFloat(b.dataset.b);
      var len = bb - a;
      var f = Math.min(0.02, len / 3);
      var op;
      if (isFirst) op = 1 - smooth(p, bb - f, bb);
      else if (b === bands[bands.length - 1]) op = smooth(p, a, a + f);
      else op = smooth(p, a, a + f) * (1 - smooth(p, bb - f, bb));
      var ramp = Math.min(0.025, len * 0.35);
      /* band one is a title card: fully shown the moment the page renders (no
         timer-dependent load ramp — timers get throttled in background tabs and
         left the title invisible on some Android Chrome layouts). */
      var k = isFirst ? 1 : clamp((p - a) / ramp, 0, 1);
      if (Math.abs(op - (b.op === undefined ? -1 : b.op)) > 0.004) {
        b.style.opacity = String(op); b.op = op;
      }
      applyChars(b, k);
      isFirst = false;
    });
  }

  /* ---------- video scrub (lerp + gated seeks) ---------- */
  var target = 0, shown = 0, rafId = null, lastTick = 0, heroOnScreen = true;
  var seekBusy = false, pendingTime = null;

  function requestSeek(t) {
    if (!video.duration) return;
    if (seekBusy) { pendingTime = t; return; }
    seekBusy = true;
    try { video.currentTime = t; } catch (e) { seekBusy = false; }
  }
  video.addEventListener('seeked', function () {
    seekBusy = false;
    if (pendingTime !== null) { var t = pendingTime; pendingTime = null; requestSeek(t); }
  });
  video.addEventListener('error', function () { seekBusy = false; pendingTime = null; });

  function tick(now) {
    var dt = Math.min(100, now - (lastTick || now));
    lastTick = now;
    var k = 0.16;
    shown += (target - shown) * (1 - Math.pow(1 - k, dt / 16.667));
    if (Math.abs(target - shown) < 0.0005) { shown = target; }
    requestSeek(shown * video.duration);
    updateCaptions(shown);
    if (Math.abs(target - shown) > 0.0005) {
      rafId = requestAnimationFrame(tick);
      if (!tick._bk) tick._bk = setTimeout(function () { tick._bk = null; tick(performance.now()); }, 60);
    } else {
      rafId = null; lastTick = 0;
      if (tick._bk) { clearTimeout(tick._bk); tick._bk = null; }
    }
  }
  function onScroll() {
    target = heroProgress();
    updateCaptions(target);   // captions follow scroll directly, no rAF dependency
    if (rafId === null && heroOnScreen) rafId = requestAnimationFrame(tick);
  }
  new IntersectionObserver(function (en) {
    heroOnScreen = en[0].isIntersecting;
    if (!heroOnScreen && rafId !== null) { cancelAnimationFrame(rafId); rafId = null; }
    else if (heroOnScreen && Math.abs(target - shown) > 0.0005 && rafId === null) { rafId = requestAnimationFrame(tick); }
  }, { threshold: 0 }).observe(hero);

  /* band one is a title card shown synchronously on render; no timer load ramp. */

  /* ---------- blob fetch with loading ring (streamed) ---------- */
  var initDone = false;
  function initHeroOnce() {
    if (initDone) return;
    initDone = true;
    posterLayer.style.backgroundImage = "url('" + POSTER_URL + "')";
    var started = false;
    function startBlobFetch() { if (started) return; started = true; loadHeroBlob().catch(failVideo); }
    var posterImg = new Image();
    posterImg.onload = startBlobFetch;
    posterImg.onerror = startBlobFetch;
    posterImg.src = POSTER_URL;
    setTimeout(startBlobFetch, 4000);
  }
  function setRing(frac) { ring.style.setProperty('--ld', String(Math.round(126 * (1 - frac)))); }
  async function loadHeroBlob() {
    var ctrl = new AbortController();
    var watchdog = setTimeout(function () { ctrl.abort(); }, 20000);
    var res = await fetch(VIDEO_URL, { priority: 'low', signal: ctrl.signal });
    if (!res.ok) throw new Error('video HTTP ' + res.status);
    var total = Number(res.headers.get('Content-Length')) || VIDEO_BYTES;
    var reader = res.body.getReader();
    var chunks = [], got = 0, lastRing = 0;
    stage.classList.add('loading');
    for (;;) {
      var r = await reader.read();
      if (r.done) break;
      clearTimeout(watchdog);
      watchdog = setTimeout(function () { ctrl.abort(); }, 20000);
      chunks.push(r.value);
      got += r.value.length;
      var frac = Math.min(1, got / total);
      var now = performance.now();
      if (now - lastRing > 100 || frac === 1) { lastRing = now; setRing(frac); }
    }
    clearTimeout(watchdog);
    setRing(1);
    video.src = URL.createObjectURL(new Blob(chunks));
    video.load();
    var onLoadErr = function () { failVideo(); };
    video.addEventListener('error', onLoadErr, { once: true });
    video.addEventListener('canplay', function () {
      video.removeEventListener('error', onLoadErr);
      stage.classList.remove('loading');
      stage.classList.add('video-ready');
      requestSeek(heroProgress() * video.duration);
    }, { once: true });
  }
  function failVideo() {
    stage.classList.remove('loading');
    stage.classList.add('video-failed');
    setRing(1);
  }

  /* ---------- the five static-hero gates, decided live ---------- */
  var scrubOn = false;
  function enableScrub() {
    if (scrubOn) return;
    scrubOn = true;
    initHeroOnce();
    window.addEventListener('scroll', onScroll, { passive: true });
    bands.forEach(function (b) { b.op = -1; b.k = -1; });
    updateCaptions(heroProgress());
    onScroll();
  }
  function disableScrub() {
    if (!scrubOn) return;
    scrubOn = false;
    window.removeEventListener('scroll', onScroll);
    if (rafId !== null) { cancelAnimationFrame(rafId); rafId = null; }
  }
  function applyHeroMode() {
    if (GATES.some(function (q) { return matchMedia(q).matches; })) disableScrub();
    else enableScrub();
  }
  var MQLS = GATES.map(function (q) { return matchMedia(q); });
  MQLS.forEach(function (m) {
    if (m.addEventListener) m.addEventListener('change', applyHeroMode);
    else if (m.addListener) m.addListener(applyHeroMode);
  });
  applyHeroMode();

  /* ---------- reduced motion, live in both directions ---------- */
  function pinToFinalStates() {
    bands.forEach(function (b) {
      b.style.opacity = '1';
      b.op = 1; b.k = 1;
      applyChars(b, 1);
    });
    finishHold();
  }
  var rmMQL = matchMedia('(prefers-reduced-motion: reduce)');
  var onRMChange = function (e) {
    if (e.matches) pinToFinalStates();
    else applyHeroMode();
  };
  if (rmMQL.addEventListener) rmMQL.addEventListener('change', onRMChange);
  else if (rmMQL.addListener) rmMQL.addListener(onRMChange);

  /* ---------- the hold interaction: 幫佢撻著 ---------- */
  var hold = document.getElementById('holdZone');
  var holdRing = hold ? hold.querySelector('.hold-ring circle') : null;
  var holdProg = 0, holdActive = false, holdRaf = null, holdDone = false;
  function holdTick(now) {
    var dt = Math.min(100, now - (holdTick.last || now));
    holdTick.last = now;
    if (holdActive) holdProg += dt / 2300;
    else holdProg -= dt / 900;
    holdProg = clamp(holdProg, 0, 1);
    /* set strokeDashoffset directly (not via a CSS custom property) — some
       Android WebViews don't re-resolve custom properties on SVG elements,
       which left the progress ring invisible while the rest of the hold worked */
    if (holdRing) holdRing.style.strokeDashoffset = String(Math.round(126 * (1 - holdProg)));
    if (holdProg >= 1) { finishHold(); return; }
    if (holdProg > 0 || holdActive) holdRaf = requestAnimationFrame(holdTick);
  }
  function finishHold() {
    if (!hold || holdDone) return;
    holdProg = 1; holdActive = false;
    if (holdRing) holdRing.style.strokeDashoffset = '0';
    hold.classList.add('firing');
    holdDone = true;
  }
  if (hold) {
    var startHold = function (e) {
      if (holdDone) return;
      if (e && e.cancelable && e.type !== 'touchstart') e.preventDefault();
      hold.classList.add('active');
      holdActive = true;
      if (holdRaf === null) holdRaf = requestAnimationFrame(holdTick);
    };
    var stopHold = function () {
      if (holdDone) return;
      hold.classList.remove('active');
      holdActive = false;
    };
    /* pointer events first, with touch + mouse fallbacks for WebViews that do
       not fire Pointer Events (e.g. Discord's in-app browser on Android) */
    hold.addEventListener('pointerdown', startHold);
    hold.addEventListener('touchstart', startHold, { passive: true });
    hold.addEventListener('mousedown', startHold);
    ['pointerup', 'pointerleave', 'pointercancel', 'touchend', 'touchcancel', 'mouseup', 'mouseleave'].forEach(function (ev) {
      hold.addEventListener(ev, stopHold);
    });
    hold.addEventListener('keydown', function (e) {
      if (holdDone) return;
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        hold.classList.add('active');
        holdActive = true;
        if (holdRaf === null) holdRaf = requestAnimationFrame(holdTick);
      }
    });
    hold.addEventListener('keyup', function (e) {
      if (holdDone) return;
      if (e.key === 'Enter' || e.key === ' ') { hold.classList.remove('active'); holdActive = false; }
    });
  }
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) finishHold();

  /* safety net: if this script ever fails before arming, show the static hero
     so the page never ships with a wordless hero */
  window.addEventListener('error', function () {
    var st = document.getElementById('stage');
    if (st) st.classList.add('js-failed');
  });
  setTimeout(function () {
    var st = document.getElementById('stage');
    var cp = document.querySelector('.captions');
    if (st && cp && !cp.classList.contains('anim')) st.classList.add('js-failed');
  }, 3500);

  /* ---------- section entrances + living elements ---------- */
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (en) {
      if (en.isIntersecting) {
        en.target.classList.add('in');
        if (en.target.classList.contains('stagger')) {
          setTimeout(function () { en.target.classList.add('done'); }, 1500);
        }
        io.unobserve(en.target);
      }
    });
  }, { threshold: 0.15 });
  Array.prototype.forEach.call(document.querySelectorAll('.sec-enter, .stagger'), function (el) { io.observe(el); });

  var secIO = new IntersectionObserver(function (entries) {
    entries.forEach(function (en) { en.target.classList.toggle('on', en.isIntersecting); });
  }, { threshold: 0.06 });
  Array.prototype.forEach.call(document.querySelectorAll('.section'), function (s) { secIO.observe(s); });

  /* pause everything on hidden tab */
  document.addEventListener('visibilitychange', function () {
    document.body.classList.toggle('paused', document.hidden);
  });

  splitBands();
  updateCaptions(heroProgress());
  /* Progressive enhancement: only now (script fully ran) do we arm the char
     entrance animations. If anything above failed, .anim is never added and the
     split spans render as plain visible text. */
  var captionsEl = document.querySelector('.captions');
  if (captionsEl) captionsEl.classList.add('anim');
})();

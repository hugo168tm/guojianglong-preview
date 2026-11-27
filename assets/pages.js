/* 過江龍 — 內頁 motion（唔依賴 app.js：內頁冇 .hero／#stage／#hero 影片）
   只做兩件事：section 進場揭幕 + 「活著嘅一點」脈衝。app.js 唔可以喺內頁載入，
   因為 heroProgress() 會對 null 嘅 .hero 呼叫 getBoundingClientRect() 而拋錯。 */
(function () {
  'use strict';

  /* 入場 */
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (en) {
      if (!en.isIntersecting) return;
      en.target.classList.add('in');
      if (en.target.classList.contains('stagger')) {
        setTimeout(function () { en.target.classList.add('done'); }, 1500);
      }
      io.unobserve(en.target);
    });
  }, { threshold: 0.15 });
  Array.prototype.forEach.call(document.querySelectorAll('.sec-enter, .stagger'), function (el) { io.observe(el); });

  /* .section.on 開脈衝點 */
  var secIO = new IntersectionObserver(function (entries) {
    entries.forEach(function (en) { en.target.classList.toggle('on', en.isIntersecting); });
  }, { threshold: 0.06 });
  Array.prototype.forEach.call(document.querySelectorAll('.section'), function (s) { secIO.observe(s); });

  /* 分頁隱藏時停動畫 */
  document.addEventListener('visibilitychange', function () {
    document.body.classList.toggle('paused', document.hidden);
  });

  /* FAQ 手風琴：只開一個（鍵盤／滑鼠都合用） */
  var faq = document.getElementById('faq');
  if (faq) {
    var items = faq.querySelectorAll('details');
    Array.prototype.forEach.call(items, function (d) {
      d.addEventListener('toggle', function () {
        if (!d.open) return;
        Array.prototype.forEach.call(items, function (o) { if (o !== d) o.open = false; });
      });
    });
  }
})();

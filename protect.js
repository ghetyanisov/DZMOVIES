(function () {
  var block = function (e) { e.preventDefault(); e.stopPropagation(); return false; };

  // منع القائمة اليمنى واختصارات الفحص (آمن، لا يعطي إنذارات كاذبة)
  document.addEventListener('contextmenu', block);
  document.addEventListener('keydown', function (e) {
    var k = (e.key || '').toLowerCase();
    if (e.key === 'F12' ||
        (e.ctrlKey && e.shiftKey && ['i', 'j', 'c', 'k'].indexOf(k) > -1) ||
        (e.metaKey && e.altKey && ['i', 'j', 'c', 'u'].indexOf(k) > -1) ||
        (e.ctrlKey && ['u', 's'].indexOf(k) > -1)) return block(e);
  });

  // أي جهاز لمس (هاتف/لوحي/وضع "موقع سطح المكتب") لا نشغّل عليه الكشف التلقائي
  var isTouch = /Android|iPhone|iPad|iPod|Mobi|Tablet/i.test(navigator.userAgent) ||
                navigator.maxTouchPoints > 0 ||
                'ontouchstart' in window;
  if (isTouch) return;

  // كشف أدوات المطور بتوقف debugger فقط (تمت إزالة فحص حجم النافذة لأنه يعطي إنذارات كاذبة
  // مع الأشرطة الجانبية والزوم وتكبير الويندوز). لا يُفعَّل الإجراء إلا بعد 3 قياسات متتالية.
  var hits = 0;
  setInterval(function () {
    if (document.visibilityState !== 'visible' || !document.hasFocus()) { hits = 0; return; }
    var t = performance.now();
    (function () {}).constructor('debugger')();
    if (performance.now() - t > 200) hits++; else hits = 0;
    if (hits >= 3) {
      document.documentElement.innerHTML = '<body style="background:#0d0f14;color:#fff;font:18px Tahoma;display:flex;align-items:center;justify-content:center;height:100vh;direction:rtl">أدوات المطور غير مسموحة. أغلقها ثم أعد تحميل الصفحة.</body>';
    }
  }, 2000);
})();

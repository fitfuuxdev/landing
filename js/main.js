(function () {
  'use strict';

  // Mobile nav
  var toggles = document.querySelectorAll('[data-nav-toggle]');
  var nav = document.querySelector('[id="m-nav"]');
  toggles.forEach(function (btn) {
    btn.addEventListener('click', function () {
      if (!nav) return;
      var open = nav.classList.toggle('open');
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');
      btn.setAttribute('aria-label', open ? 'Закрыть меню' : 'Открыть меню');
    });
  });

  // FAQ accordion
  document.querySelectorAll('.faq-item').forEach(function (item) {
    var q = item.querySelector('.faq-q');
    var a = item.querySelector('.faq-a');
    if (!q || !a) return;
    q.addEventListener('click', function () {
      var open = item.classList.toggle('open');
      q.setAttribute('aria-expanded', open ? 'true' : 'false');
      a.style.maxHeight = open ? a.scrollHeight + 'px' : '0px';
    });
  });

  // Registration form
  var form = document.getElementById('registration-form');
  if (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var valid = form.checkValidity();
      if (!valid) { form.reportValidity(); return; }
      var success = form.querySelector('[data-success]');
      if (success) success.style.display = 'block';
      form.reset();
    });
  }

  // Scroll reveal
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!reduce && 'IntersectionObserver' in window) {
    var revealEls = document.querySelectorAll('[data-reveal]');
    var ro = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) {
          en.target.classList.add('revealed');
          ro.unobserve(en.target);
        }
      });
    }, { threshold: 0.15 });
    revealEls.forEach(function (el) { ro.observe(el); });
  } else {
    document.querySelectorAll('[data-reveal]').forEach(function (el) { el.classList.add('revealed'); });
  }

  // 3D price cube — drag to rotate
  var cube = document.getElementById('price-cube');
  if (cube) {
    var rotX = -16, rotY = 38;
    var drag = false, startX = 0, startY = 0, curX = rotX, curY = rotY;
    var autoTimer = null;

    function apply() {
      cube.style.transform = 'rotateX(' + curX + 'deg) rotateY(' + curY + 'deg)';
    }
    function startAuto() {
      if (autoTimer) clearInterval(autoTimer);
      autoTimer = setInterval(function () {
        if (!drag) { curY += 0.4; apply(); }
      }, 30);
    }
    function stopAuto() { if (autoTimer) { clearInterval(autoTimer); autoTimer = null; } }

    function onDown(x, y) {
      drag = true; stopAuto(); startX = x; startY = y; curX = rotX; curY = rotY;
    }
    function onMove(x, y) {
      if (!drag) return;
      curX = rotX - (y - startY) * 0.5;
      curY = rotY + (x - startX) * 0.5;
      apply();
    }
    function onUp() {
      if (!drag) return; drag = false;
      rotX = curX; rotY = curY;
      startAuto();
    }

    cube.addEventListener('pointerdown', function (e) {
      onDown(e.clientX, e.clientY);
      if (cube.setPointerCapture) { try { cube.setPointerCapture(e.pointerId); } catch (err) {} }
    });
    cube.addEventListener('pointermove', function (e) { onMove(e.clientX, e.clientY); });
    cube.addEventListener('pointerup', onUp);
    cube.addEventListener('pointercancel', onUp);

    // Touch fallback (older mobile browsers / partial PointerEvent support)
    cube.addEventListener('touchstart', function (e) {
      if (e.touches && e.touches[0]) onDown(e.touches[0].clientX, e.touches[0].clientY);
    }, { passive: true });
    cube.addEventListener('touchmove', function (e) {
      if (e.touches && e.touches[0]) { e.preventDefault(); onMove(e.touches[0].clientX, e.touches[0].clientY); }
    }, { passive: false });
    cube.addEventListener('touchend', onUp);

    startAuto();
  }
})();
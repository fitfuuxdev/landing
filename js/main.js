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
  if (cube && window.matchMedia && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    var rotX = -16, rotY = 38;
    var drag = false, startX = 0, startY = 0, curX = rotX, curY = rotY;
    var auto = true, autoTimer = null;

    function apply() {
      cube.style.transform = 'rotateX(' + curX + 'deg) rotateY(' + curY + 'deg)';
    }
    function startAuto() {
      auto = true;
      autoTimer = setInterval(function () {
        if (!drag) { curY += 0.4; apply(); }
      }, 30);
    }
    function stopAuto() { auto = false; if (autoTimer) { clearInterval(autoTimer); autoTimer = null; } }

    cube.addEventListener('pointerdown', function (e) {
      drag = true; stopAuto(); cube.setPointerCapture(e.pointerId);
      startX = e.clientX; startY = e.clientY; curX = rotX; curY = rotY;
    });
    cube.addEventListener('pointermove', function (e) {
      if (!drag) return;
      var dx = e.clientX - startX, dy = e.clientY - startY;
      curX = rotX - dy * 0.5;
      curY = rotY + dx * 0.5;
      apply();
    });
    function end(e) {
      if (!drag) return; drag = false;
      rotX = curX; rotY = curY;
      startAuto();
    }
    cube.addEventListener('pointerup', end);
    cube.addEventListener('pointercancel', end);
    cube.addEventListener('pointerleave', end);

    startAuto();
  }
})();
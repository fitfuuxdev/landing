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
})();
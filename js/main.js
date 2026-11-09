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

  // Hero parallax drift on mouse move
  var heroLogo = document.querySelector('.hero__logotype');
  var heroAtom = document.querySelector('.hero .atom');
  if ((heroLogo || heroAtom) && window.matchMedia('(pointer:fine)').matches && !reduce) {
    var drift = function (e) {
      var cx = (e.clientX / window.innerWidth) - 0.5;
      var cy = (e.clientY / window.innerHeight) - 0.5;
      if (heroLogo) heroLogo.style.transform = 'translate(' + (cx * 18) + 'px,' + (cy * 14) + 'px)';
      if (heroAtom) heroAtom.style.transform = 'translate(' + (cx * 30) + 'px,' + (cy * 22) + 'px)';
    };
    var heroEl = document.querySelector('.hero');
    if (heroEl) heroEl.addEventListener('pointermove', drift);
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

  // Spotlight hover on cards
  var cards = document.querySelectorAll('.price-card, .perk, .review');
  cards.forEach(function (c) {
    c.addEventListener('pointermove', function (e) {
      var r = c.getBoundingClientRect();
      c.style.setProperty('--mx', (e.clientX - r.left) + 'px');
      c.style.setProperty('--my', (e.clientY - r.top) + 'px');
    });
  });

  // Animated counters
  var reduce2 = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var counters = document.querySelectorAll('[data-count]');
  if (counters.length && !reduce2 && 'IntersectionObserver' in window) {
    var co = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        var el = en.target, target = parseInt(el.getAttribute('data-count'), 10), dur = 1000, t0 = null;
        function tick(ts) {
          if (!t0) t0 = ts;
          var p = Math.min((ts - t0) / dur, 1);
          el.textContent = Math.round(target * (1 - Math.pow(1 - p, 3))).toLocaleString('ru-RU');
          if (p < 1) requestAnimationFrame(tick);
        }
        requestAnimationFrame(tick);
        co.unobserve(el);
      });
    }, { threshold: 0.6 });
    counters.forEach(function (el) { co.observe(el); });
  }

  // Menu active-link highlight on scroll
  var navLinks = document.querySelectorAll('.main-nav a[href^="#"]');
  if (navLinks.length && 'IntersectionObserver' in window) {
    var sections = [];
    navLinks.forEach(function (l) { var el = document.querySelector(l.getAttribute('href')); if (el) sections.push(el); });
    var sno = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        navLinks.forEach(function (l) { l.classList.remove('active'); });
        var id = en.target.getAttribute('id');
        var link = document.querySelector('.main-nav a[href="#' + id + '"]');
        if (link) link.classList.add('active');
      });
    }, { rootMargin: '-40% 0px -55% 0px' });
    sections.forEach(function (s) { sno.observe(s); });
  }
})();
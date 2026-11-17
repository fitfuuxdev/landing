(() => {
  'use strict';

  const root = document.documentElement;
  const body = document.body;
  const reduceQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  const fineQuery = window.matchMedia('(hover: hover) and (pointer: fine)');
  let reduceMotion = reduceQuery.matches;
  let lenis = null;
  let rafId = 0;
  let scrollQueued = false;

  const $ = (selector, ctx = document) => ctx.querySelector(selector);
  const $$ = (selector, ctx = document) => Array.from(ctx.querySelectorAll(selector));
  const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

  /* ------------------------------------------------------------------
     Year
  ------------------------------------------------------------------ */
  const yearEl = $('#year');
  if (yearEl) yearEl.textContent = String(new Date().getFullYear());

  /* ------------------------------------------------------------------
     Hero intro
  ------------------------------------------------------------------ */
  const revealHero = () => {
    root.classList.add('is-loaded');
  };
  requestAnimationFrame(() => window.setTimeout(revealHero, 80));

  /* ------------------------------------------------------------------
     Lenis — desktop wheel smoothing only, native touch scrolling
  ------------------------------------------------------------------ */
  const initLenis = () => {
    if (reduceMotion || !fineQuery.matches || window.innerWidth < 1100) return;
    if (typeof window.Lenis !== 'function') return;

    lenis = new window.Lenis({
      duration: 1.08,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
      syncTouch: false,
      wheelMultiplier: .9,
      touchMultiplier: 1.3,
      autoRaf: false
    });
    root.classList.add('has-lenis');

    const raf = (time) => {
      lenis.raf(time);
      rafId = requestAnimationFrame(raf);
    };
    rafId = requestAnimationFrame(raf);
  };
  initLenis();

  reduceQuery.addEventListener?.('change', (event) => {
    reduceMotion = event.matches;
    if (reduceMotion && lenis) {
      cancelAnimationFrame(rafId);
      lenis.destroy();
      lenis = null;
      root.classList.remove('has-lenis');
    } else if (!reduceMotion && !lenis) {
      initLenis();
    }
  });

  /* ------------------------------------------------------------------
     Header, scroll progress, background drift, nav state
  ------------------------------------------------------------------ */
  const header = $('#site-header');
  const pageFooter = $('.footer');
  const progressBar = $('.scroll-progress span');
  const pageBgImage = $('.page-bg img');
  const manifesto = $('.manifesto');
  const manifestoImage = $('.manifesto__bg img');
  const navLinks = $$('.nav [data-nav]').map((link) => ({
    link,
    section: document.getElementById(link.dataset.nav)
  }));
  let lastActive = '';

  const updateNavState = () => {
    if (!navLinks.length) return;
    const probe = window.scrollY + window.innerHeight * .34;
    let active = '';
    for (const item of navLinks) {
      if (!item.section) continue;
      if (item.section.offsetTop <= probe && item.section.offsetTop + item.section.offsetHeight > probe) {
        active = item.link.dataset.nav;
      }
    }
    if (active === lastActive) return;
    lastActive = active;
    navLinks.forEach(({ link }) => {
      const isActive = link.dataset.nav === active;
      link.classList.toggle('is-active', isActive);
      if (isActive) link.setAttribute('aria-current', 'location');
      else link.removeAttribute('aria-current');
    });
  };

  const updateScrollState = () => {
    scrollQueued = false;
    const y = window.scrollY || window.pageYOffset || 0;
    const max = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
    const ratio = clamp(y / max, 0, 1);

    header?.classList.toggle('is-scrolled', y > 24);
    if (progressBar) progressBar.style.transform = `scaleX(${ratio})`;
    if (pageBgImage) pageBgImage.style.setProperty('--bg-shift', `${Math.min(y * .013, 24)}px`);
    root.style.setProperty('--orbital-rot', `${(y * .045) % 360}deg`);

    if (pageFooter && header) {
      const footerTop = pageFooter.getBoundingClientRect().top;
      const overLight = footerTop <= header.offsetHeight;
      header.classList.toggle('on-light', overLight && !body.classList.contains('menu-open'));
    }

    if (manifesto && manifestoImage && !reduceMotion) {
      const rect = manifesto.getBoundingClientRect();
      if (rect.bottom > -120 && rect.top < window.innerHeight + 120) {
        const p = clamp((window.innerHeight - rect.top) / (window.innerHeight + rect.height), 0, 1);
        manifestoImage.style.setProperty('--manifesto-shift', `${(p - .5) * 48}px`);
      }
    }

    updateNavState();
  };

  const queueScrollState = () => {
    if (scrollQueued) return;
    scrollQueued = true;
    requestAnimationFrame(updateScrollState);
  };

  window.addEventListener('scroll', queueScrollState, { passive: true });
  window.addEventListener('resize', queueScrollState, { passive: true });
  updateScrollState();

  /* ------------------------------------------------------------------
     Anchor navigation (works with and without Lenis)
  ------------------------------------------------------------------ */
  const closeMenuRef = { current: null };

  const scrollToTarget = (target) => {
    const headerHeight = header?.offsetHeight || 82;
    const offset = -(headerHeight + 12);

    if (lenis) {
      lenis.scrollTo(target, { offset, duration: 1.25 });
    } else {
      const top = target.getBoundingClientRect().top + window.scrollY + offset;
      window.scrollTo({ top, behavior: reduceMotion ? 'auto' : 'smooth' });
    }
  };

  $$('a[href^="#"]').forEach((link) => {
    link.addEventListener('click', (event) => {
      const hash = link.getAttribute('href');
      if (!hash || hash === '#') return;
      const target = hash === '#top' ? document.getElementById('top') : document.querySelector(hash);
      if (!target) return;

      event.preventDefault();
      if (body.classList.contains('menu-open')) closeMenuRef.current?.();
      window.setTimeout(() => {
        if (hash === '#top') {
          if (lenis) lenis.scrollTo(0, { duration: 1.2 });
          else window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' });
        } else {
          scrollToTarget(target);
        }
        if (history.replaceState) history.replaceState(null, '', hash);
      }, body.classList.contains('menu-open') ? 260 : 0);
    });
  });

  /* ------------------------------------------------------------------
     Mobile navigation
  ------------------------------------------------------------------ */
  const menuButton = $('.menu-btn');
  const mobileMenu = $('#mobile-menu');
  const mobileLinks = mobileMenu ? $$('[data-mobile-link]', mobileMenu) : [];
  const brandLink = $('.brand');
  const main = $('#main');
  const footer = $('.footer');
  let menuIsOpen = false;
  let lastFocused = null;

  const focusableInMenu = () => mobileMenu ? $$('a[href], button:not([disabled])', mobileMenu).filter((el) => el.offsetParent !== null) : [];

  const openMenu = () => {
    if (!mobileMenu || !menuButton) return;
    menuIsOpen = true;
    lastFocused = document.activeElement;
    body.classList.add('menu-open');
    mobileMenu.setAttribute('aria-hidden', 'false');
    mobileMenu.inert = false;
    menuButton.setAttribute('aria-expanded', 'true');
    menuButton.setAttribute('aria-label', 'Закрыть меню');
    if (brandLink) brandLink.tabIndex = -1;
    if (main) main.inert = true;
    if (footer) footer.inert = true;
    if (header) header.classList.add('is-scrolled');
    if (header) header.classList.remove('on-light');
    if (lenis) lenis.stop();
    document.body.style.overflow = 'hidden';
    window.setTimeout(() => mobileLinks[0]?.focus({ preventScroll: true }), 160);
  };

  const closeMenu = ({ returnFocus = true } = {}) => {
    if (!mobileMenu || !menuButton || !menuIsOpen) return;
    menuIsOpen = false;
    body.classList.remove('menu-open');
    mobileMenu.setAttribute('aria-hidden', 'true');
    mobileMenu.inert = true;
    menuButton.setAttribute('aria-expanded', 'false');
    menuButton.setAttribute('aria-label', 'Открыть меню');
    if (brandLink) brandLink.removeAttribute('tabindex');
    if (main) main.inert = false;
    if (footer) footer.inert = false;
    document.body.style.overflow = '';
    if (header) header.classList.toggle('is-scrolled', (window.scrollY || 0) > 24);
    if (lenis) lenis.start();
    queueScrollState();
    if (returnFocus) {
      const target = lastFocused instanceof HTMLElement ? lastFocused : menuButton;
      target.focus({ preventScroll: true });
    }
  };
  closeMenuRef.current = closeMenu;

  if (mobileMenu) mobileMenu.inert = true;

  menuButton?.addEventListener('click', () => {
    if (menuIsOpen) closeMenu();
    else openMenu();
  });

  mobileLinks.forEach((link) => link.addEventListener('click', () => closeMenu({ returnFocus: false })));

  document.addEventListener('keydown', (event) => {
    if (!menuIsOpen) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      closeMenu();
      return;
    }
    if (event.key !== 'Tab') return;
    const menuFocusables = focusableInMenu();
    if (!menuFocusables.length) return;
    const first = menuFocusables[0];
    const last = menuFocusables[menuFocusables.length - 1];
    const active = document.activeElement;

    if (event.shiftKey) {
      if (active === first || active === menuButton || !mobileMenu.contains(active)) {
        event.preventDefault();
        last.focus();
      }
    } else if (active === last) {
      event.preventDefault();
      menuButton?.focus();
    }
  });

  window.addEventListener('resize', () => {
    if (menuIsOpen && window.innerWidth > 1180) closeMenu({ returnFocus: false });
  }, { passive: true });

  /* ------------------------------------------------------------------
     Reveal on scroll
  ------------------------------------------------------------------ */
  const revealTargets = $$('[data-reveal], .reveal-lines, .manifesto__quote, .contact__title');

  if ('IntersectionObserver' in window && !reduceMotion) {
    const revealObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-in');
        revealObserver.unobserve(entry.target);
      });
    }, { threshold: .08, rootMargin: '0px 0px -7% 0px' });

    revealTargets.forEach((target) => revealObserver.observe(target));
  } else {
    revealTargets.forEach((target) => target.classList.add('is-in'));
  }

  /* ------------------------------------------------------------------
     Cursor
  ------------------------------------------------------------------ */
  const cursor = $('.cursor');
  if (cursor && fineQuery.matches && !reduceMotion && window.matchMedia('(min-width: 981px)').matches) {
    root.classList.add('has-cursor');
    let pointerX = window.innerWidth / 2;
    let pointerY = window.innerHeight / 2;
    let currentX = pointerX;
    let currentY = pointerY;
    let cursorRaf = 0;
    let visible = false;

    const cursorLabel = $('.cursor__label', cursor);

    const renderCursor = () => {
      currentX += (pointerX - currentX) * .18;
      currentY += (pointerY - currentY) * .18;
      cursor.style.transform = `translate3d(${currentX}px, ${currentY}px, 0)`;
      if (visible) cursor.classList.remove('is-hidden');
      if (Math.abs(pointerX - currentX) > .1 || Math.abs(pointerY - currentY) > .1) {
        cursorRaf = requestAnimationFrame(renderCursor);
      } else {
        cursorRaf = 0;
      }
    };

    const moveCursor = (event) => {
      pointerX = event.clientX;
      pointerY = event.clientY;
      if (!visible) {
        visible = true;
        cursor.classList.remove('is-hidden');
      }
      if (!cursorRaf) cursorRaf = requestAnimationFrame(renderCursor);
    };

    const setCursorHover = (target) => {
      const field = target.closest('input, textarea, select, [contenteditable="true"]');
      if (field) {
        cursor.classList.add('is-hidden');
        return;
      }
      const labelled = target.closest('[data-cursor]');
      const interactive = target.closest('a, button, [role="button"]');
      if (labelled) {
        cursorLabel.textContent = labelled.dataset.cursor || '';
        cursor.classList.add('is-hover');
        cursor.classList.remove('is-link', 'is-hidden');
      } else if (interactive) {
        cursor.classList.add('is-link');
        cursor.classList.remove('is-hover', 'is-hidden');
      } else {
        cursor.classList.remove('is-hover', 'is-link', 'is-hidden');
      }
    };

    window.addEventListener('pointermove', moveCursor, { passive: true });
    document.addEventListener('pointerover', (event) => setCursorHover(event.target), { passive: true });
    document.addEventListener('pointerout', (event) => {
      if (!event.relatedTarget) cursor.classList.add('is-hidden');
    }, { passive: true });
    document.addEventListener('mouseleave', () => cursor.classList.add('is-hidden'));
    window.addEventListener('scroll', () => { if (!cursorRaf) cursorRaf = requestAnimationFrame(renderCursor); }, { passive: true });
  }

  /* ------------------------------------------------------------------
     Spotlight cards
  ------------------------------------------------------------------ */
  $$('.spotlight').forEach((card) => {
    card.addEventListener('pointermove', (event) => {
      if (event.pointerType !== 'mouse' || reduceMotion) return;
      const rect = card.getBoundingClientRect();
      card.style.setProperty('--mx', `${event.clientX - rect.left}px`);
      card.style.setProperty('--my', `${event.clientY - rect.top}px`);
    }, { passive: true });
  });

  /* ------------------------------------------------------------------
     Works carousel — native scroll, buttons, drag on desktop
  ------------------------------------------------------------------ */
  const worksViewport = $('#works-viewport');
  const worksTrack = $('#works-track');
  const worksPrev = $('#works-prev');
  const worksNext = $('#works-next');
  const worksCurrent = $('#works-current');
  const worksProgress = $('#works-progress-bar');
  const workCards = worksTrack ? Array.from(worksTrack.children) : [];

  if (worksViewport && worksTrack && workCards.length) {
    let currentIndex = 0;
    let suppressClick = false;

    const getStep = () => {
      if (workCards.length < 2) return worksViewport.clientWidth;
      const gap = parseFloat(getComputedStyle(worksTrack).columnGap || getComputedStyle(worksTrack).gap) || 0;
      return workCards[0].getBoundingClientRect().width + gap;
    };

    const cardScrollPositions = () => {
      const pad = parseFloat(getComputedStyle(worksTrack).paddingLeft) || 0;
      return workCards.map((card) => Math.max(0, card.offsetLeft - pad));
    };

    const setIndex = (index) => {
      currentIndex = clamp(index, 0, workCards.length - 1);
      if (worksCurrent) worksCurrent.textContent = String(currentIndex + 1).padStart(2, '0');
      if (worksProgress) worksProgress.style.transform = `scaleX(${(currentIndex + 1) / workCards.length})`;
      if (worksPrev) worksPrev.disabled = currentIndex === 0;
      if (worksNext) worksNext.disabled = currentIndex === workCards.length - 1;
    };

    const goTo = (index) => {
      const positions = cardScrollPositions();
      const next = clamp(index, 0, positions.length - 1);
      worksViewport.scrollTo({ left: positions[next], behavior: reduceMotion ? 'auto' : 'smooth' });
      setIndex(next);
    };

    const updateWorksIndex = () => {
      const positions = cardScrollPositions();
      const scrollLeft = worksViewport.scrollLeft;
      let nearest = 0;
      let distance = Infinity;
      positions.forEach((position, index) => {
        const d = Math.abs(position - scrollLeft);
        if (d < distance) {
          nearest = index;
          distance = d;
        }
      });
      if (nearest !== currentIndex) setIndex(nearest);
      else setIndex(currentIndex);
    };

    worksPrev?.addEventListener('click', () => goTo(currentIndex - 1));
    worksNext?.addEventListener('click', () => goTo(currentIndex + 1));
    worksViewport.addEventListener('scroll', updateWorksIndex, { passive: true });
    worksViewport.addEventListener('keydown', (event) => {
      if (event.key === 'ArrowRight') {
        event.preventDefault();
        goTo(currentIndex + 1);
      } else if (event.key === 'ArrowLeft') {
        event.preventDefault();
        goTo(currentIndex - 1);
      } else if (event.key === 'Home') {
        event.preventDefault();
        goTo(0);
      } else if (event.key === 'End') {
        event.preventDefault();
        goTo(workCards.length - 1);
      }
    });

    // Drag-to-scroll with the mouse. Touch keeps native momentum.
    let dragging = false;
    let dragStartX = 0;
    let dragStartScroll = 0;
    let dragDistance = 0;

    worksViewport.addEventListener('pointerdown', (event) => {
      if (event.pointerType !== 'mouse' || event.button !== 0) return;
      dragging = true;
      dragDistance = 0;
      dragStartX = event.clientX;
      dragStartScroll = worksViewport.scrollLeft;
      worksViewport.classList.add('is-dragging');
    });

    worksViewport.addEventListener('pointermove', (event) => {
      if (!dragging) return;
      const delta = event.clientX - dragStartX;
      dragDistance = Math.abs(delta);
      if (dragDistance > 4) {
        event.preventDefault();
        worksViewport.scrollLeft = dragStartScroll - delta;
      }
    }, { passive: false });

    const endDrag = () => {
      if (!dragging) return;
      dragging = false;
      worksViewport.classList.remove('is-dragging');
      if (dragDistance > 7) {
        suppressClick = true;
        const positions = cardScrollPositions();
        let nearest = 0;
        let distance = Infinity;
        positions.forEach((position, index) => {
          const d = Math.abs(position - worksViewport.scrollLeft);
          if (d < distance) { nearest = index; distance = d; }
        });
        goTo(nearest);
        window.setTimeout(() => { suppressClick = false; }, 60);
      }
    };

    window.addEventListener('pointerup', endDrag);
    window.addEventListener('pointercancel', endDrag);
    worksViewport.addEventListener('click', (event) => {
      if (!suppressClick) return;
      event.preventDefault();
      event.stopPropagation();
    }, true);
    worksViewport.addEventListener('dragstart', (event) => event.preventDefault());
    worksViewport.addEventListener('load', updateWorksIndex, true);

    setIndex(0);
    window.addEventListener('resize', updateWorksIndex, { passive: true });
  }

  /* ------------------------------------------------------------------
     Count-up facts
  ------------------------------------------------------------------ */
  const factValues = $$('.fact__value[data-count]');
  const setFinalFact = (el) => {
    const target = Number(el.dataset.count || 0);
    const pad = Number(el.dataset.pad || 0);
    const suffix = el.dataset.suffix || '';
    el.textContent = `${pad ? String(target).padStart(pad, '0') : String(target)}${suffix}`;
  };
  factValues.forEach((el) => {
    if (reduceMotion || !('IntersectionObserver' in window)) setFinalFact(el);
  });

  const animateCount = (el) => {
    const target = Number(el.dataset.count || 0);
    const pad = Number(el.dataset.pad || 0);
    const duration = 1200;
    const start = performance.now();
    const suffix = el.dataset.suffix || (target === 100 ? '%' : '');

    const tick = (now) => {
      const progress = clamp((now - start) / duration, 0, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const value = Math.round(target * eased);
      el.textContent = `${pad ? String(value).padStart(pad, '0') : value}${progress === 1 ? suffix : ''}`;
      if (progress < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  };

  if ('IntersectionObserver' in window && !reduceMotion) {
    const factObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        animateCount(entry.target);
        factObserver.unobserve(entry.target);
      });
    }, { threshold: .5 });
    factValues.forEach((el) => {
      // The 100% fact is the third one; suffix is added in the counter.
      if (Number(el.dataset.count) === 100) el.dataset.suffix = '%';
      factObserver.observe(el);
    });
  }

  /* ------------------------------------------------------------------
     Brief generator + Telegram handoff
  ------------------------------------------------------------------ */
  const briefForm = $('#brief-form');
  const briefStatus = $('#brief-status');
  const toast = $('#toast');
  let toastTimer = 0;

  const showToast = (message, duration = 5200) => {
    if (!toast) return;
    window.clearTimeout(toastTimer);
    toast.textContent = message;
    toast.classList.add('is-visible');
    toastTimer = window.setTimeout(() => toast.classList.remove('is-visible'), duration);
  };

  const copyText = async (text) => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
        return true;
      }
    } catch (error) {
      // fall through to the legacy path
    }
    try {
      const area = document.createElement('textarea');
      area.value = text;
      area.setAttribute('readonly', '');
      area.style.cssText = 'position:fixed;left:-9999px;top:0;opacity:0;pointer-events:none;';
      document.body.appendChild(area);
      area.focus();
      area.select();
      const copied = document.execCommand('copy');
      area.remove();
      return copied;
    } catch (error) {
      return false;
    }
  };

  if (briefForm) {
    const fields = {
      name: $('#brief-name'),
      contact: $('#brief-contact'),
      about: $('#brief-about')
    };
    const errorFor = (field) => document.getElementById(`${field.id}-error`);
    const validators = {
      name: (value) => value.trim().length >= 2,
      contact: (value) => value.trim().length >= 3,
      about: (value) => value.trim().length >= 5
    };

    const validateField = (field) => {
      const valid = validators[field.name]?.(field.value) ?? true;
      const error = errorFor(field);
      field.setAttribute('aria-invalid', valid ? 'false' : 'true');
      if (error) error.hidden = valid;
      return valid;
    };

    Object.values(fields).forEach((field) => {
      field?.addEventListener('input', () => {
        if (field.getAttribute('aria-invalid') === 'true') validateField(field);
      });
    });

    briefForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      const results = Object.values(fields).map((field) => (field ? validateField(field) : true));
      if (results.includes(false)) {
        const firstInvalid = Object.values(fields).find((field) => field?.getAttribute('aria-invalid') === 'true');
        firstInvalid?.focus();
        if (briefStatus) briefStatus.textContent = 'Проверьте выделенные поля.';
        return;
      }

      const submit = $('.btn--submit', briefForm);
      const submitLabel = $('.btn--submit > span', briefForm);
      const originalLabel = submitLabel?.textContent || 'Подготовить бриф';
      const message = [
        'Привет! Хочу обсудить сайт.',
        '',
        `Имя: ${fields.name.value.trim()}`,
        `Контакт: ${fields.contact.value.trim()}`,
        `Задача: ${fields.about.value.trim()}`,
        '',
        'Бриф сформирован на fitfuuxdev.github.io/landing'
      ].join('\n');

      if (submit) submit.disabled = true;
      if (submitLabel) submitLabel.textContent = 'Открываю Telegram…';

      const copied = copyText(message);
      const telegramWindow = window.open('https://t.me/Fitfuux', '_blank');
      if (telegramWindow) telegramWindow.opener = null;
      const didCopy = await copied;

      if (didCopy) {
        if (briefStatus) briefStatus.textContent = 'Бриф скопирован. Вставьте его в чат Telegram — и я отвечу.';
        showToast('Бриф скопирован. Вставьте его в открытый чат Telegram и отправьте.');
      } else {
        if (briefStatus) briefStatus.textContent = 'Не удалось скопировать автоматически. Скопируйте текст из полей вручную.';
        showToast('Telegram открыт. Скопируйте текст брифа из полей вручную.');
      }

      if (!telegramWindow) {
        if (briefStatus) briefStatus.textContent = 'Telegram не открылся автоматически. Напишите напрямую: @Fitfuux';
        showToast('Telegram заблокирован браузером. Напишите напрямую: @Fitfuux');
      }

      if (submitLabel) submitLabel.textContent = originalLabel;
      if (submit) submit.disabled = false;
      briefForm.classList.add('is-submitted');
    });
  }

  /* ------------------------------------------------------------------
     Lazy 3D hero
  ------------------------------------------------------------------ */
  const stage = $('#hero-stage');
  const canvas = $('#hero-canvas');

  const canUseWebGL = () => {
    try {
      const test = document.createElement('canvas');
      return Boolean(window.WebGLRenderingContext && (test.getContext('webgl2') || test.getContext('webgl') || test.getContext('experimental-webgl')));
    } catch (error) {
      return false;
    }
  };

  const loadHero3D = () => {
    if (!stage || !canvas) return;
    if (reduceMotion) return;
    if (navigator.connection?.saveData) return;
    if (!canUseWebGL()) {
      stage.classList.add('is-fallback');
      return;
    }

    const start3D = () => {
      const script = document.createElement('script');
      script.src = 'assets/js/hero3d.js';
      script.async = true;
      script.onload = () => {
        try {
          window.initFitfuuxHero3D?.({ canvas, stage, reducedMotion: reduceMotion });
        } catch (error) {
          stage.classList.add('is-fallback');
        }
      };
      script.onerror = () => stage.classList.add('is-fallback');
      document.head.appendChild(script);
    };

    // The WebGL library is intentionally loaded after the first paint.
    if ('requestIdleCallback' in window) {
      requestIdleCallback(() => {
        const three = document.createElement('script');
        three.src = 'assets/js/three.umd.min.js';
        three.async = true;
        three.onload = start3D;
        three.onerror = () => stage.classList.add('is-fallback');
        document.head.appendChild(three);
      }, { timeout: 2600 });
    } else {
      window.setTimeout(() => {
        const three = document.createElement('script');
        three.src = 'assets/js/three.umd.min.js';
        three.async = true;
        three.onload = start3D;
        three.onerror = () => stage.classList.add('is-fallback');
        document.head.appendChild(three);
      }, 1400);
    }
  };

  if (document.readyState === 'complete') loadHero3D();
  else window.addEventListener('load', loadHero3D, { once: true });

  /* ------------------------------------------------------------------
     Pointer interaction guard for touch + hover states
  ------------------------------------------------------------------ */
  if (!fineQuery.matches) {
    $$('[data-cursor]').forEach((el) => el.removeAttribute('data-cursor'));
  }

  // A little insurance for browser UI that hides content when JS fails late.
  window.setTimeout(() => {
    $$('[data-reveal]:not(.is-in)').forEach((el) => {
      const rect = el.getBoundingClientRect();
      if (rect.top < window.innerHeight * .92) el.classList.add('is-in');
    });
  }, 3000);
})();

/* clan-v3.js — interactions de la page de clan
   Camarilla Dauphinoise
   Aucune dépendance. Se désactive proprement si le HTML n'est pas là. */

(function () {
  'use strict';

  var root = document.querySelector('.clan-v3');
  if (!root) return;

  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------------------------------------------------------------
     1. Sélecteur de disciplines (onglets accessibles)
     --------------------------------------------------------------- */
  var disc = root.querySelector('[data-disc]');
  if (disc) {
    var tabs  = Array.prototype.slice.call(disc.querySelectorAll('.v3-disc__tab'));
    var panes = Array.prototype.slice.call(disc.querySelectorAll('.v3-disc__pane'));

    function select(index) {
      tabs.forEach(function (tab, i) {
        var on = i === index;
        tab.setAttribute('aria-selected', on ? 'true' : 'false');
        tab.tabIndex = on ? 0 : -1;
      });
      panes.forEach(function (pane, i) {
        var on = i === index;
        pane.classList.toggle('is-active', on);
        if (on) { pane.removeAttribute('hidden'); } else { pane.setAttribute('hidden', ''); }
        // relance les vidéos au changement d'onglet
        var vid = pane.querySelector('video');
        if (vid) { if (on) { vid.currentTime = 0; vid.play().catch(function () {}); } else { vid.pause(); } }
      });
    }

    tabs.forEach(function (tab, i) {
      tab.addEventListener('click', function () { select(i); });
      tab.addEventListener('keydown', function (e) {
        var next = null;
        if (e.key === 'ArrowDown' || e.key === 'ArrowRight') next = (i + 1) % tabs.length;
        if (e.key === 'ArrowUp'   || e.key === 'ArrowLeft')  next = (i - 1 + tabs.length) % tabs.length;
        if (e.key === 'Home') next = 0;
        if (e.key === 'End')  next = tabs.length - 1;
        if (next === null) return;
        e.preventDefault();
        select(next);
        tabs[next].focus();
      });
    });
  }

  /* ---------------------------------------------------------------
     2. Révélations au défilement
     --------------------------------------------------------------- */
  var reveals = root.querySelectorAll('.v3-reveal');
  if (reduce || !('IntersectionObserver' in window)) {
    Array.prototype.forEach.call(reveals, function (el) { el.classList.add('is-in'); });
  } else {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-in');
          io.unobserve(entry.target);
        }
      });
    }, { rootMargin: '0px 0px -12% 0px', threshold: 0.08 });
    Array.prototype.forEach.call(reveals, function (el) { io.observe(el); });
  }

  /* ---------------------------------------------------------------
     3. Jauge de sang + section active dans la barre collante
     --------------------------------------------------------------- */
  var fill     = root.querySelector('.v3-gauge__fill');
  var navLinks = Array.prototype.slice.call(root.querySelectorAll('.v3-subnav__links a'));
  var sections = navLinks
    .map(function (a) { return root.querySelector(a.getAttribute('href')); })
    .filter(Boolean);

  var ticking = false;
  function onScroll() {
    if (ticking) return;
    ticking = true;
    window.requestAnimationFrame(function () {
      // progression de lecture
      if (fill) {
        var rect = root.getBoundingClientRect();
        var total = rect.height - window.innerHeight;
        var done = total > 0 ? Math.min(1, Math.max(0, -rect.top / total)) : 0;
        fill.style.setProperty('--v3-progress', (done * 100).toFixed(1) + '%');
      }
      // section courante
      if (sections.length) {
        var current = 0;
        sections.forEach(function (sec, i) {
          if (sec.getBoundingClientRect().top <= window.innerHeight * 0.4) current = i;
        });
        navLinks.forEach(function (a, i) { a.classList.toggle('is-active', i === current); });
      }
      ticking = false;
    });
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
  onScroll();

  /* ---------------------------------------------------------------
     4. Visionneuse de galerie
     --------------------------------------------------------------- */
  var box = root.querySelector('[data-lightbox]');
  if (box) {
    var boxImg   = box.querySelector('img');
    var closeBtn = box.querySelector('[data-lightbox-close]');
    var opener   = null;

    function open(src, alt, trigger) {
      boxImg.src = src;
      boxImg.alt = alt || '';
      box.classList.add('is-open');
      opener = trigger;
      closeBtn.focus();
      document.body.style.overflow = 'hidden';
    }
    function close() {
      box.classList.remove('is-open');
      boxImg.src = '';
      document.body.style.overflow = '';
      if (opener) opener.focus();
    }

    root.querySelectorAll('[data-gallery] button').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var img = btn.querySelector('img');
        open(btn.getAttribute('data-full'), img ? img.alt : '', btn);
      });
    });

    closeBtn.addEventListener('click', close);
    box.addEventListener('click', function (e) { if (e.target === box) close(); });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && box.classList.contains('is-open')) close();
    });
  }
})();

/* BAW — shared storefront behaviour */
(function () {
  'use strict';
  document.documentElement.classList.add('js');
  var ILS = '₪';
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };

  function money(n) { return ILS + n.toLocaleString('he-IL'); }
  window.bawMoney = money;

  /* ---------- cart (session only — this is a preview) ---------- */
  var cart = [];
  try { cart = JSON.parse(sessionStorage.getItem('baw.cart') || '[]'); } catch (e) { cart = []; }
  function save() { try { sessionStorage.setItem('baw.cart', JSON.stringify(cart)); } catch (e) {} }
  function count() { return cart.reduce(function (s, i) { return s + i.q; }, 0); }

  /* BAW bundle rule: buy 4 pay for 3 · buy 8 pay for 6 (cheapest free) */
  function bundle(items) {
    var u = [];
    items.forEach(function (i) { for (var k = 0; k < i.q; k++) u.push(i.price); });
    u.sort(function (a, b) { return b - a; });
    var n = u.length, gross = u.reduce(function (s, p) { return s + p; }, 0);
    var free = n >= 8 ? 2 : (n >= 4 ? 1 : 0), disc = 0;
    for (var f = 0; f < free; f++) disc += u[n - 1 - f] || 0;
    return { gross: gross, disc: disc, net: gross - disc, units: n, free: free };
  }

  function renderCart() {
    var badge = $('#cartCount');
    if (badge) { badge.textContent = count(); badge.hidden = count() === 0; }
    var box = $('#cartItems');
    if (!box) return;
    if (!cart.length) {
      box.innerHTML = '<div class="cempty">הסל ריק כרגע.<br>' +
        'הוסיפו 4 פריטים — ' +
        'והזול ביניהם עלינו.</div>';
    } else {
      box.innerHTML = cart.map(function (i) {
        return '<div class="ci"><img src="' + i.img + '" alt="" loading="lazy">' +
          '<div style="flex:1;min-width:0"><b>' + i.name + '</b><span class="num">' + i.q + ' × ' + money(i.price) + '</span></div>' +
          '<button class="ib" aria-label="הסרה" data-rm="' + i.id + '">' +
          '<svg viewBox="0 0 24 24"><path d="M18 6 6 18M6 6l12 12"/></svg></button></div>';
      }).join('');
    }
    var b = bundle(cart), tot = $('#cartTotal'), note = $('#cartNote');
    if (tot) tot.textContent = money(b.net);
    if (note) {
      if (b.free) { note.textContent = 'מבצע הופעל — חסכתם ' + money(b.disc); note.hidden = false; }
      else if (b.units) { note.textContent = 'עוד ' + (4 - b.units) + ' פריטים — והזול ביניהם עלינו'; note.hidden = false; }
      else note.hidden = true;
    }
  }

  function toast(msg) {
    var t = $('#toast');
    if (!t) return;
    t.textContent = msg;
    t.classList.add('is-on');
    clearTimeout(t._t);
    t._t = setTimeout(function () { t.classList.remove('is-on'); }, 2400);
  }

  window.bawAdd = function (id, name, price, img, q) {
    q = q || 1;
    var f = cart.filter(function (i) { return i.id === id; })[0];
    if (f) f.q += q; else cart.push({ id: id, name: name, price: price, img: img, q: q });
    save(); renderCart();
    toast('נוסף לסל · ' + name.slice(0, 28));
  };

  document.addEventListener('click', function (e) {
    var rm = e.target.closest('[data-rm]');
    if (rm) { cart = cart.filter(function (i) { return i.id !== rm.getAttribute('data-rm'); }); save(); renderCart(); return; }
    var add = e.target.closest('[data-add]');
    if (add) {
      e.preventDefault();
      window.bawAdd(add.dataset.add, add.dataset.name, +add.dataset.price, add.dataset.img, +(add.dataset.qty || 1));
      if (add.classList.contains('card__add')) {
        add.classList.add('is-added');
        var old = add.textContent;
        add.textContent = 'נוסף ✓';
        setTimeout(function () { add.classList.remove('is-added'); add.textContent = old; }, 1500);
      }
      return;
    }
    var w = e.target.closest('.card__wish');
    if (w) { e.preventDefault(); w.classList.toggle('is-on'); return; }
    if (e.target.closest('[data-cart-open]')) { e.preventDefault(); $('#cart').classList.add('is-open'); return; }
    if (e.target.closest('[data-nav-open]')) { $('#mnav').classList.add('is-open'); return; }
    if (e.target.closest('[data-close]') || e.target.classList.contains('ov__bg')) {
      var ov = e.target.closest('.ov'); if (ov) ov.classList.remove('is-open');
      return;
    }
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') $$('.ov').forEach(function (o) { o.classList.remove('is-open'); });
  });
  renderCart();

  /* ---------- header: transparent over a full-bleed hero ---------- */
  var hdr = $('.hdr'), hero = $('.hero');
  if (hdr) {
    var onScroll = function () {
      var over = hero && window.scrollY < hero.offsetHeight - 90;
      hdr.classList.toggle('is-over', !!over);
      hdr.classList.toggle('is-stuck', window.scrollY > 8 && !over);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  /* ---------- hand-drawn strokes: measure, then draw on reveal ---------- */
  $$('.ink-draw path').forEach(function (p) {
    try {
      var len = Math.ceil(p.getTotalLength());
      p.parentNode.style.setProperty('--len', len);
      p.style.strokeDasharray = len; p.style.strokeDashoffset = reduce ? 0 : len;
    } catch (e) {}
  });

  /* ---------- reveal ---------- */
  var revs = $$('.rev, .ink-draw');
  if (reduce || !('IntersectionObserver' in window)) {
    revs.forEach(function (n) { n.classList.add('in'); });
  } else {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (en) {
        if (!en.isIntersecting) return;
        var d = +(en.target.dataset.d || 0);
        setTimeout(function () { en.target.classList.add('in'); }, d);
        io.unobserve(en.target);
      });
    }, { rootMargin: '0px 0px -6% 0px', threshold: .06 });
    revs.forEach(function (n) { io.observe(n); });
  }

  /* ---------- deal countdown: resets nightly ---------- */
  var cd = $('#clock');
  if (cd) {
    var end = new Date(); end.setHours(23, 59, 59, 999);
    var pad = function (n) { return String(n).padStart(2, '0'); };
    var tick = function () {
      var s = Math.max(0, Math.floor((end - Date.now()) / 1000));
      var u = cd.querySelectorAll('b');
      if (u.length >= 3) { u[0].textContent = pad(Math.floor(s / 3600)); u[1].textContent = pad(Math.floor(s % 3600 / 60)); u[2].textContent = pad(s % 60); }
    };
    tick(); setInterval(tick, 1000);
  }

  /* ---------- delivery ETA: 3–7 business days, skips Shabbat ---------- */
  var etas = $$('[data-eta]');
  if (etas.length) {
    var biz = function (days) { var d = new Date(), n = 0; while (n < days) { d.setDate(d.getDate() + 1); if (d.getDay() !== 6) n++; } return d; };
    var fmt = function (d) { return d.toLocaleDateString('he-IL', { weekday: 'long', day: 'numeric', month: 'long' }); };
    etas.forEach(function (n) { n.textContent = fmt(biz(3)) + ' – ' + fmt(biz(7)); });
  }

  /* ---------- count-up ---------- */
  var nums = $$('[data-count]');
  if (nums.length && !reduce && 'IntersectionObserver' in window) {
    var io2 = new IntersectionObserver(function (es) {
      es.forEach(function (en) {
        if (!en.isIntersecting) return;
        var el = en.target, to = +el.dataset.count, suf = el.dataset.suffix || '', t0 = performance.now();
        var step = function (t) {
          var p = Math.min(1, (t - t0) / 1200), e = 1 - Math.pow(1 - p, 3);
          el.textContent = Math.round(to * e).toLocaleString('he-IL') + suf;
          if (p < 1) requestAnimationFrame(step);
        };
        requestAnimationFrame(step); io2.unobserve(el);
      });
    }, { threshold: .4 });
    nums.forEach(function (n) { io2.observe(n); });
  }
})();

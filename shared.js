/*
  Quantica Lab website - shared behavior for all pages.
  Eksportuje QW (helpery + makePlayer symulacji), uruchamia ikony Lucide,
  czasteczki w hero (#dots) i animacje .reveal.
*/
(function () {
  "use strict";

  // ─── Constants ───
  var PHASE_MS = 950;
  var HOLD_MS = 3200;
  var REDUCED_MOTION = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // ─── Helpers (diagram player) ───
  function el(id) { return document.getElementById(id); }

  function setLink(link, cls) {
    link.classList.remove("on", "faded");
    if (cls) { link.classList.add(cls); }
  }

  function setNode(node, cls) {
    node.classList.remove("on", "faded", "blocked");
    if (cls) { node.classList.add(cls); }
  }

  function addRow(container, icon, text, cls) {
    var row = document.createElement("div");
    row.className = "cite" + (cls ? " " + cls : "");
    row.innerHTML = '<i data-lucide="' + icon + '" class="icon"></i>';
    var span = document.createElement("span");
    span.textContent = text;
    row.appendChild(span);
    container.appendChild(row);
    if (window.lucide) { window.lucide.createIcons(); }
    window.requestAnimationFrame(function () { row.classList.add("show"); });
  }

  function setCheck(checkEl) { checkEl.classList.add("on"); }

  // Generic scenario player: tabs, timers, auto-advance loop, autoplay on view.
  function makePlayer(cfg) {
    var timers = [];
    var ix = 0;
    var tabs = Array.prototype.slice.call(cfg.fig.querySelectorAll(".scn-tab"));

    function clearTimers() {
      timers.forEach(window.clearTimeout);
      timers = [];
    }

    function apply(i, animate) {
      clearTimers();
      ix = i;
      var s = cfg.scenarios[i];
      tabs.forEach(function (tab, tabIx) { tab.classList.toggle("on", tabIx === i); });
      cfg.nameEl.textContent = "SCENARIUSZ " + (i + 1) + "/" + cfg.scenarios.length;
      cfg.reset(s);
      var phases = cfg.phases(s);
      if (!animate) {
        phases.forEach(function (p) { p[1](); });
        return;
      }
      phases.forEach(function (p) {
        timers.push(window.setTimeout(p[1], p[0]));
      });
      var last = phases[phases.length - 1][0];
      timers.push(window.setTimeout(function () {
        apply((ix + 1) % cfg.scenarios.length, true);
      }, last + HOLD_MS));
    }

    tabs.forEach(function (tab) {
      tab.addEventListener("click", function () {
        apply(parseInt(tab.getAttribute("data-scn"), 10), !REDUCED_MOTION);
      });
    });

    if (REDUCED_MOTION) {
      apply(0, false);
    } else if ("IntersectionObserver" in window) {
      var started = false;
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting && !started) {
            started = true;
            apply(0, true);
            io.disconnect();
          }
        });
      }, { threshold: 0.35 });
      io.observe(cfg.fig);
    } else {
      apply(0, true);
    }

    // Keyboard shortcuts 1-3 select scenarios when the simulation is on screen
    document.addEventListener("keydown", function (event) {
      if (event.key !== "1" && event.key !== "2" && event.key !== "3") { return; }
      if (event.target.tagName === "INPUT" || event.target.tagName === "TEXTAREA") { return; }
      var rect = cfg.fig.getBoundingClientRect();
      if (rect.bottom < 0 || rect.top > window.innerHeight) { return; }
      var i = parseInt(event.key, 10) - 1;
      if (i < tabs.length) { apply(i, !REDUCED_MOTION); }
    });

    return { select: function (i) { apply(i, !REDUCED_MOTION); } };
  }

  // ─── Hero dot particles ───
  function initDots() {
    var canvas = document.getElementById("dots");
    if (!canvas) { return; }
    var ctx = canvas.getContext("2d");
    var dots = [];
    function resize() {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    }
    resize();
    window.addEventListener("resize", resize);
    for (var i = 0; i < 70; i++) {
      dots.push({
        x: Math.random(), y: Math.random(),
        r: 1 + Math.random() * 2.2,
        vx: (Math.random() - 0.5) * 0.0004,
        vy: (Math.random() - 0.5) * 0.0004,
        o: 0.12 + Math.random() * 0.5
      });
    }
    var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    function frame() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      dots.forEach(function (d) {
        d.x = (d.x + d.vx + 1) % 1;
        d.y = (d.y + d.vy + 1) % 1;
        ctx.beginPath();
        ctx.arc(d.x * canvas.width, d.y * canvas.height, d.r, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(210, 7, 87, " + d.o + ")";
        ctx.fill();
      });
      if (!reduced) { requestAnimationFrame(frame); }
    }
    frame();
  }

  // ─── Scroll reveal ───
  function initReveal() {
    var revealed = document.querySelectorAll(".reveal");
    if (REDUCED_MOTION || !("IntersectionObserver" in window)) {
      revealed.forEach(function (el) { el.classList.add("visible"); });
      return;
    }
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("visible");
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12 });
    revealed.forEach(function (el) { observer.observe(el); });
  }

  // ─── Init ───
  window.QW = {
    PHASE_MS: PHASE_MS,
    HOLD_MS: HOLD_MS,
    REDUCED_MOTION: REDUCED_MOTION,
    el: el,
    setLink: setLink,
    setNode: setNode,
    addRow: addRow,
    setCheck: setCheck,
    makePlayer: makePlayer
  };
  if (window.lucide) { window.lucide.createIcons(); }
  initDots();
  initReveal();
})();

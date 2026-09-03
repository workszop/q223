/*
  Quantica Lab website - shared behavior for all pages.
  Eksportuje QW (helpery + makePlayer symulacji), uruchamia ikony Lucide,
  czasteczki w hero (#dots), animacje .reveal i menu mobilne (.nav-toggle).
*/
(function () {
  "use strict";

  // ─── Constants ───
  var PHASE_MS = 1100;
  var HOLD_MS = 5500;
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
    // wymuszony reflow zamiast rAF: przejscie odpala sie takze w karcie w tle
    void row.offsetWidth;
    row.classList.add("show");
  }

  function setCheck(checkEl) { checkEl.classList.add("on"); }

  // Generic scenario player: tabs, timers, auto-advance loop, autoplay on view.
  // Publikuje stan na .fig: data-state (idle|playing|hold|done), data-scn, data-phase, data-manual.
  var players = [];

  function makePlayer(cfg) {
    var fig = cfg.fig;
    var timers = [];
    var ix = 0;
    var manual = false;      // po pierwszej interakcji: bez automatycznego przechodzenia dalej
    var started = false;
    var resumeOnVisible = false;
    var io = null;
    var tabs = Array.prototype.slice.call(fig.querySelectorAll(".scn-tab"));
    var statusLine = fig.querySelector(".scn-status");
    var statusText = statusLine ? statusLine.querySelector("span") : null;

    // Widoczna linia statusu nie jest regionem live (zmienia sie co ~1 s);
    // czytnik ekranu dostaje jeden komunikat na scenariusz.
    if (statusLine) { statusLine.removeAttribute("aria-live"); }
    var live = document.createElement("div");
    live.className = "sr-only";
    live.setAttribute("aria-live", "polite");
    fig.appendChild(live);

    var mode = document.createElement("span");
    mode.className = "scn-mode";
    mode.textContent = "auto";
    mode.title = "Scenariusze zmieniaja sie automatycznie - kliknij zakladke, aby zatrzymac";
    if (statusLine) { statusLine.appendChild(mode); }

    function setState(state) { fig.setAttribute("data-state", state); }
    function clearTimers() {
      timers.forEach(window.clearTimeout);
      timers = [];
    }
    function refreshIcons() { if (window.lucide) { window.lucide.createIcons(); } }

    function announce(i) {
      live.textContent = "Scenariusz " + (i + 1) + " z " + cfg.scenarios.length +
        (statusText ? ": " + statusText.textContent : "");
    }

    function apply(i, animate) {
      clearTimers();
      ix = i;
      var s = cfg.scenarios[i];
      tabs.forEach(function (tab, tabIx) {
        tab.classList.toggle("on", tabIx === i);
        tab.setAttribute("aria-pressed", tabIx === i ? "true" : "false");
      });
      cfg.nameEl.textContent = "SCENARIUSZ " + (i + 1) + "/" + cfg.scenarios.length;
      fig.setAttribute("data-scn", String(i));
      fig.setAttribute("data-phase", "0");
      fig.setAttribute("data-manual", manual ? "true" : "false");
      cfg.reset(s);
      refreshIcons();
      var phases = cfg.phases(s);

      function runPhase(p, n) {
        p[1]();
        refreshIcons();
        fig.setAttribute("data-phase", String(n + 1));
      }
      function finish() {
        setState(manual ? "done" : "hold");
        announce(i);
        if (!manual) {
          timers.push(window.setTimeout(function () {
            apply((ix + 1) % cfg.scenarios.length, true);
          }, HOLD_MS));
        }
      }

      if (!animate) {
        phases.forEach(runPhase);
        finish();
        return;
      }
      setState("playing");
      phases.forEach(function (p, n) {
        timers.push(window.setTimeout(function () { runPhase(p, n); }, p[0]));
      });
      timers.push(window.setTimeout(finish, phases[phases.length - 1][0]));
    }

    function select(i) {
      manual = true;
      started = true;
      if (io) { io.disconnect(); io = null; }
      apply(i, !REDUCED_MOTION);
    }

    tabs.forEach(function (tab) {
      tab.setAttribute("aria-pressed", "false");
      tab.addEventListener("click", function () {
        select(parseInt(tab.getAttribute("data-scn"), 10));
      });
    });

    setState("idle");
    if (REDUCED_MOTION) {
      apply(0, false);
    } else if ("IntersectionObserver" in window) {
      io = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting && !started) {
            started = true;
            apply(0, true);
            if (io) { io.disconnect(); io = null; }
          }
        });
      }, { threshold: 0.35 });
      io.observe(fig);
    } else {
      apply(0, true);
    }

    // Ukryta karta: przegladarka dlawi timery, a po powrocie odpala je hurtem.
    // Zatrzymujemy odtwarzanie i po powrocie odtwarzamy biezacy scenariusz od nowa.
    document.addEventListener("visibilitychange", function () {
      var state = fig.getAttribute("data-state");
      if (document.hidden) {
        if (timers.length) { clearTimers(); resumeOnVisible = true; }
      } else if (resumeOnVisible) {
        resumeOnVisible = false;
        if (state === "playing" || state === "hold") { apply(ix, true); }
      }
    });

    var player = { fig: fig, tabs: tabs, select: select };
    players.push(player);
    return player;
  }

  // Keyboard shortcuts 1-9 select scenarios of the simulation that is on screen (one listener for all players)
  document.addEventListener("keydown", function (event) {
    if (!/^[1-9]$/.test(event.key) || event.ctrlKey || event.metaKey || event.altKey) { return; }
    var t = event.target;
    if (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.tagName === "SELECT" || t.isContentEditable) { return; }
    var i = parseInt(event.key, 10) - 1;
    players.forEach(function (p) {
      var rect = p.fig.getBoundingClientRect();
      if (rect.bottom < 0 || rect.top > window.innerHeight) { return; }
      if (i < p.tabs.length) { p.select(i); }
    });
  });

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

  // ─── Mobile nav ───
  function initNav() {
    var nav = document.querySelector(".nav");
    var btn = nav && nav.querySelector(".nav-toggle");
    if (!btn) { return; }
    function setOpen(open) {
      nav.classList.toggle("open", open);
      btn.setAttribute("aria-expanded", open ? "true" : "false");
      btn.setAttribute("aria-label", open ? "Zamknij menu" : "Otwórz menu");
    }
    btn.addEventListener("click", function () { setOpen(!nav.classList.contains("open")); });
    nav.querySelectorAll(".nav-links a").forEach(function (a) {
      a.addEventListener("click", function () { setOpen(false); });
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && nav.classList.contains("open")) { setOpen(false); btn.focus(); }
    });
    var desktop = window.matchMedia("(min-width: 769px)");
    var onChange = function (e) { if (e.matches) { setOpen(false); } };
    if (desktop.addEventListener) { desktop.addEventListener("change", onChange); } else { desktop.addListener(onChange); }
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
    makePlayer: makePlayer,
    players: players
  };
  if (window.lucide) { window.lucide.createIcons(); }
  initNav();
  initDots();
  initReveal();
})();

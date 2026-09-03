/*
  Quantica Lab website - shared behavior for all pages.
  Odtwarzacz symulacji:
    - odtwarzacz: pauza / krok / powtorz / auto (pasek .scn-ctl w .scn-status),
    - dziennik zdarzen .scn-log zasilany z linii statusu przez przechwycony setter textContent
      (skrypty stron nie zmieniaja sposobu pisania statusu),
    - stany data-state: idle | playing | paused | hold | done,
    - podpowiedz klawiszy 1-N,
    - nowe helpery: addRow2 (wiersz dwuliniowy), showPreview / hidePreview (podglad wyniku).
  Eksportuje QW (helpery + makePlayer symulacji), uruchamia ikony Lucide,
  czasteczki w hero (#dots), animacje .reveal i menu mobilne (.nav-toggle).
*/
(function () {
  "use strict";

  // ─── Constants ───
  var PHASE_MS = 1100;
  var HOLD_MS = 5500;
  var LOG_MAX = 6;
  var REDUCED_MOTION = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // ─── Helpers (diagram player) ───
  function el(id) { return document.getElementById(id); }

  // Ikony Lucide tylko w podanym poddrzewie (createIcons bez root przebudowuje wszystkie ikony na stronie)
  function refreshIcons(root) {
    if (window.lucide) { window.lucide.createIcons({ root: root || document }); }
  }

  // "#d20757" -> "210, 7, 87" (do rgba() na canvasie; kolor z tokenu CSS, nie z kodu)
  function hexToRgb(hex) {
    var m = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(String(hex).trim());
    if (!m) { return null; }
    var h = m[1].length === 3 ? m[1].replace(/./g, function (c) { return c + c; }) : m[1];
    return [0, 2, 4].map(function (i) { return parseInt(h.substr(i, 2), 16); }).join(", ");
  }

  function setLink(link, cls) {
    link.classList.remove("on", "faded");
    if (cls) { link.classList.add(cls); }
  }

  function setNode(node, cls) {
    node.classList.remove("on", "faded", "blocked");
    if (cls) { node.classList.add(cls); }
  }

  function showRow(row) {
    // wymuszony reflow zamiast rAF: przejscie odpala sie takze w karcie w tle
    void row.offsetWidth;
    row.classList.add("show");
  }

  function addRow(container, icon, text, cls) {
    var row = document.createElement("div");
    row.className = "cite" + (cls ? " " + cls : "");
    row.innerHTML = '<i data-lucide="' + icon + '" class="icon"></i>';
    var span = document.createElement("span");
    span.textContent = text;
    row.appendChild(span);
    container.appendChild(row);
    refreshIcons(row);
    showRow(row);
  }

  // Wiersz dwuliniowy: tytul + szczegol (cytowany fragment, artykul, zrodlo)
  function addRow2(container, icon, title, detail, cls) {
    var row = document.createElement("div");
    row.className = "cite two" + (cls ? " " + cls : "");
    row.innerHTML = '<i data-lucide="' + icon + '" class="icon"></i>';
    var span = document.createElement("span");
    var b = document.createElement("b");
    b.textContent = title;
    var small = document.createElement("small");
    small.textContent = detail;
    span.appendChild(b);
    span.appendChild(small);
    row.appendChild(span);
    container.appendChild(row);
    refreshIcons(row);
    showRow(row);
  }

  // Podglad wyniku (.flow-preview): html to stala autorska ze skryptu strony, nie dane uzytkownika
  function showPreview(box, html) {
    box.innerHTML = html;
    showRow(box);
  }
  function hidePreview(box) {
    box.classList.remove("show");
    box.innerHTML = "";
  }

  function setCheck(checkEl) { checkEl.classList.add("on"); }

  // Generic scenario player: tabs, timers, pause/step/replay, auto-advance loop, autoplay on view.
  // Publikuje stan na .fig: data-state (idle|playing|paused|hold|done), data-scn, data-phase, data-manual.
  var players = [];

  function makePlayer(cfg) {
    var fig = cfg.fig;
    var timers = [];
    var holdTimer = null;
    var ix = 0;
    var manual = false;      // po pierwszej interakcji: bez automatycznego przechodzenia dalej
    var started = false;
    var resumeOnVisible = false;
    var io = null;
    var phases = [];
    var nextPhase = 0;
    var startTime = 0;
    var elapsed = 0;
    var tabs = Array.prototype.slice.call(fig.querySelectorAll(".scn-tab"));
    var statusLine = fig.querySelector(".scn-status");
    var statusText = statusLine ? statusLine.querySelector("span") : null;
    var N = cfg.scenarios.length;

    // Widoczna linia statusu nie jest regionem live (zmienia sie co ~1 s);
    // czytnik ekranu dostaje jeden komunikat na scenariusz.
    if (statusLine) { statusLine.removeAttribute("aria-live"); }
    var live = document.createElement("div");
    live.className = "sr-only";
    live.setAttribute("aria-live", "polite");
    fig.appendChild(live);

    // ─── Dziennik zdarzen: kazda zmiana linii statusu trafia do .scn-log ───
    var log = document.createElement("div");
    log.className = "scn-log";
    var lastLogText = null;
    var logCount = 0;
    function pushLog(text) {
      if (!text || text === lastLogText) { return; }
      lastLogText = text;
      logCount += 1;
      var prev = log.querySelector(".now");
      if (prev) { prev.classList.remove("now"); }
      var row = document.createElement("div");
      row.className = "scn-log-row now";
      var t = document.createElement("span");
      t.className = "scn-log-t";
      t.textContent = (logCount < 10 ? "0" : "") + logCount;
      var s = document.createElement("span");
      s.textContent = text;
      row.appendChild(t);
      row.appendChild(s);
      log.appendChild(row);
      while (log.children.length > LOG_MAX) { log.removeChild(log.firstChild); }
      showRow(row);
    }
    function clearLog() { log.innerHTML = ""; lastLogText = null; logCount = 0; }
    // Skrypty stron pisza "refs.status.textContent = ..." - przechwytujemy setter na tym jednym elemencie
    // (wlasna wlasciwosc przeslania Node.prototype.textContent), zapis trafi do dziennika synchronicznie.
    if (statusText) {
      statusText.classList.add("sr-only");
      var nativeText = Object.getOwnPropertyDescriptor(Node.prototype, "textContent");
      if (nativeText && nativeText.set) {
        Object.defineProperty(statusText, "textContent", {
          configurable: true,
          get: function () { return nativeText.get.call(this); },
          set: function (v) { nativeText.set.call(this, v); pushLog(String(v)); }
        });
      }
      // tekst poczatkowy z HTML ("system gotowy...") trafia do dziennika - stan idle nie jest pusty
      pushLog(statusText.textContent);
    }
    // .scn-panel: status + dziennik razem (na mobile panel jest przyklejony do dolu ekranu)
    if (statusLine) {
      var panel = document.createElement("div");
      panel.className = "scn-panel";
      statusLine.parentNode.insertBefore(panel, statusLine);
      panel.appendChild(statusLine);
      panel.appendChild(log);
    }

    // ─── Sterowanie: pauza / krok / powtorz / auto ───
    var ctl = document.createElement("div");
    ctl.className = "scn-ctl";
    function mkBtn(cls, icon, label) {
      var b = document.createElement("button");
      b.type = "button";
      b.className = "scn-btn " + cls;
      b.setAttribute("aria-label", label);
      b.title = label;
      b.setAttribute("data-icon", icon);
      b.innerHTML = '<i data-lucide="' + icon + '" class="icon"></i>';
      refreshIcons(b);
      ctl.appendChild(b);
      return b;
    }
    var btnPlay = mkBtn("scn-play", "pause", "Zatrzymaj");
    var btnStep = mkBtn("scn-step", "skip-forward", "Następny krok");
    var btnReplay = mkBtn("scn-replay", "rotate-ccw", "Odtwórz od nowa");
    var btnAuto = document.createElement("button");
    btnAuto.type = "button";
    btnAuto.className = "scn-btn scn-auto";
    btnAuto.textContent = "auto";
    btnAuto.title = "Automatyczne przechodzenie do kolejnych scenariuszy";
    ctl.appendChild(btnAuto);
    var hint = document.createElement("span");
    hint.className = "scn-hint";
    hint.textContent = "klawisze 1–" + N;
    ctl.appendChild(hint);
    if (statusLine) { statusLine.appendChild(ctl); }

    function setBtnIcon(btn, icon, label) {
      if (btn.getAttribute("data-icon") !== icon) {
        btn.setAttribute("data-icon", icon);
        btn.innerHTML = '<i data-lucide="' + icon + '" class="icon"></i>';
        refreshIcons(btn);
      }
      btn.setAttribute("aria-label", label);
      btn.title = label;
    }
    function updateCtl() {
      var st = fig.getAttribute("data-state");
      if (st === "playing") { setBtnIcon(btnPlay, "pause", "Zatrzymaj"); }
      else if (st === "paused") { setBtnIcon(btnPlay, "play", "Wznów"); }
      else { setBtnIcon(btnPlay, "play", "Odtwórz"); }
      btnStep.disabled = !(st === "playing" || st === "paused") || nextPhase >= phases.length;
      btnAuto.setAttribute("aria-pressed", manual ? "false" : "true");
      fig.setAttribute("data-manual", manual ? "true" : "false");
    }
    function setState(state) { fig.setAttribute("data-state", state); updateCtl(); }

    function clearTimers() {
      timers.forEach(window.clearTimeout);
      timers = [];
      if (holdTimer) { window.clearTimeout(holdTimer); holdTimer = null; }
    }

    function announce(i) {
      live.textContent = "Scenariusz " + (i + 1) + " z " + N +
        (statusText ? ": " + statusText.textContent : "");
    }

    function runPhase(n) {
      phases[n][1]();
      fig.setAttribute("data-phase", String(n + 1));
      nextPhase = n + 1;
      updateCtl();
    }
    // Przy prefers-reduced-motion scenariusze nie przelaczaja sie same (tresc nie zmienia sie bez udzialu uzytkownika)
    function armHold() {
      if (manual || REDUCED_MOTION) { return; }
      holdTimer = window.setTimeout(function () { apply((ix + 1) % N, !REDUCED_MOTION); }, HOLD_MS);
    }
    function finish() {
      clearTimers();
      setState(manual || REDUCED_MOTION ? "done" : "hold");
      announce(ix);
      armHold();
    }
    // Planuje pozostale fazy od biezacego "elapsed" (start, wznowienie po pauzie)
    function schedule() {
      if (nextPhase >= phases.length) { finish(); return; }
      for (var k = nextPhase; k < phases.length; k += 1) {
        (function (n) {
          timers.push(window.setTimeout(function () {
            runPhase(n);
            if (n === phases.length - 1) { finish(); }
          }, Math.max(0, phases[n][0] - elapsed)));
        }(k));
      }
      startTime = Date.now();
    }

    function apply(i, animate) {
      clearTimers();
      ix = i;
      var s = cfg.scenarios[i];
      tabs.forEach(function (tab, tabIx) {
        tab.classList.toggle("on", tabIx === i);
        tab.setAttribute("aria-pressed", tabIx === i ? "true" : "false");
      });
      fig.setAttribute("data-scn", String(i));
      fig.setAttribute("data-phase", "0");
      clearLog();
      cfg.reset(s);
      refreshIcons(fig);
      phases = cfg.phases(s);
      nextPhase = 0;
      elapsed = 0;

      if (!animate) {
        while (nextPhase < phases.length) { runPhase(nextPhase); }
        finish();
        return;
      }
      setState("playing");
      schedule();
    }

    function pause() {
      if (fig.getAttribute("data-state") !== "playing") { return; }
      clearTimers();
      elapsed += Date.now() - startTime;
      setState("paused");
    }
    function resume() {
      if (fig.getAttribute("data-state") !== "paused") { return; }
      setState("playing");
      schedule();
    }
    function step() {
      var st = fig.getAttribute("data-state");
      if (st === "playing") { pause(); }
      if (fig.getAttribute("data-state") !== "paused" || nextPhase >= phases.length) { return; }
      runPhase(nextPhase);
      elapsed = phases[nextPhase - 1][0];
      if (nextPhase >= phases.length) { finish(); } else { updateCtl(); }
    }
    function stopAuto() {
      manual = true;
      started = true;
      if (io) { io.disconnect(); io = null; }
    }
    function select(i) {
      stopAuto();
      apply(i, !REDUCED_MOTION);
    }

    tabs.forEach(function (tab) {
      tab.setAttribute("aria-pressed", "false");
      tab.addEventListener("click", function () {
        select(parseInt(tab.getAttribute("data-scn"), 10));
      });
    });
    btnPlay.addEventListener("click", function () {
      var st = fig.getAttribute("data-state");
      if (st === "playing") { stopAuto(); pause(); return; }
      if (st === "paused") { resume(); return; }
      stopAuto();
      apply(ix, !REDUCED_MOTION);
    });
    btnStep.addEventListener("click", function () { stopAuto(); step(); });
    btnReplay.addEventListener("click", function () { stopAuto(); apply(ix, !REDUCED_MOTION); });
    btnAuto.addEventListener("click", function () {
      var st = fig.getAttribute("data-state");
      if (!manual) {
        stopAuto();
        if (st === "hold") { clearTimers(); setState("done"); } else { updateCtl(); }
        return;
      }
      manual = false;
      started = true;
      if (io) { io.disconnect(); io = null; }
      if (st === "paused") { resume(); }
      else if (st === "done" && !REDUCED_MOTION) { setState("hold"); armHold(); }
      else if (st === "idle") { apply(ix, !REDUCED_MOTION); }
      else { updateCtl(); }
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
      }, { threshold: 0, rootMargin: "-30% 0px -30% 0px" });
      io.observe(fig);
    } else {
      apply(0, true);
    }

    // Ukryta karta: przegladarka dlawi timery. Pauzujemy i wznawiamy po powrocie.
    document.addEventListener("visibilitychange", function () {
      var st = fig.getAttribute("data-state");
      if (document.hidden) {
        if (st === "playing") { pause(); resumeOnVisible = true; }
        else if (st === "hold") { clearTimers(); resumeOnVisible = true; }
      } else if (resumeOnVisible) {
        resumeOnVisible = false;
        st = fig.getAttribute("data-state");
        if (st === "paused") { resume(); } else if (st === "hold") { armHold(); }
      }
    });

    var player = { fig: fig, tabs: tabs, select: select, pause: pause, resume: resume, step: step };
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
  // Petla rAF dziala tylko gdy hero jest na ekranie; canvas skalowany do devicePixelRatio.
  function initDots() {
    var canvas = document.getElementById("dots");
    if (!canvas) { return; }
    var ctx = canvas.getContext("2d");
    var dots = [];
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var w = 0;
    var h = 0;
    var running = false;
    var raf = 0;
    var rgb = hexToRgb(getComputedStyle(document.documentElement).getPropertyValue("--quantica-pink")) || "210, 7, 87";

    for (var i = 0; i < 70; i++) {
      dots.push({
        x: Math.random(), y: Math.random(),
        r: 1 + Math.random() * 2.2,
        vx: (Math.random() - 0.5) * 0.0004,
        vy: (Math.random() - 0.5) * 0.0004,
        o: 0.12 + Math.random() * 0.5
      });
    }
    function draw() {
      ctx.clearRect(0, 0, w, h);
      dots.forEach(function (d) {
        d.x = (d.x + d.vx + 1) % 1;
        d.y = (d.y + d.vy + 1) % 1;
        ctx.beginPath();
        ctx.arc(d.x * w, d.y * h, d.r, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(" + rgb + ", " + d.o + ")";
        ctx.fill();
      });
    }
    function frame() {
      draw();
      if (running) { raf = window.requestAnimationFrame(frame); }
    }
    function start() { if (running || REDUCED_MOTION) { return; } running = true; frame(); }
    function stop() { running = false; window.cancelAnimationFrame(raf); }
    function resize() {
      w = canvas.offsetWidth;
      h = canvas.offsetHeight;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (!running) { draw(); }
    }
    resize();
    window.addEventListener("resize", resize);
    if (REDUCED_MOTION || !("IntersectionObserver" in window)) { start(); return; }
    new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) { if (entry.isIntersecting) { start(); } else { stop(); } });
    }).observe(canvas);
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
    el: el,
    setLink: setLink,
    setNode: setNode,
    addRow: addRow,
    addRow2: addRow2,
    showPreview: showPreview,
    hidePreview: hidePreview,
    setCheck: setCheck,
    makePlayer: makePlayer
  };
  refreshIcons(document);
  initNav();
  initDots();
  initReveal();
})();

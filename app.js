// Quantica Lab – Interactive Effects

// Match hero paragraph width to h1 title width
(function(){
    var block = document.querySelector('.hero-text-block');
    if (!block) return;
    var span = block.querySelector('h1 span');
    if (!span) return;
    function sync() {
        block.style.maxWidth = '';
        var prev = span.style.display;
        span.style.display = 'inline';
        var w = span.getBoundingClientRect().width;
        span.style.display = prev;
        if (w > 0) block.style.maxWidth = Math.ceil(w) + 'px';
    }
    var resizeTimer;
    sync();
    window.addEventListener('resize', function() {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(sync, 100);
    }, { passive: true });
})();

// Mobile menu toggle
(function(){
    document.querySelectorAll('.menu-toggle').forEach(function(btn) {
        btn.addEventListener('click', function() {
            var nav = btn.closest('nav').querySelector('.nav-links');
            if (nav) nav.classList.toggle('active');
        });
    });
})();

// Grid glow follows cursor
(function(){
    var glow = document.getElementById('gridGlow');
    if (!glow) return;
    document.addEventListener('mousemove', function(e) {
        glow.style.left = e.clientX + 'px';
        glow.style.top = e.clientY + 'px';
    });
})();

// Parallax watermark on scroll
(function(){
    var watermarks = document.querySelectorAll('.watermark');
    if (!watermarks.length) return;
    window.addEventListener('scroll', function() {
        watermarks.forEach(function(el) {
            var rect = el.parentElement.getBoundingClientRect();
            var offset = (rect.top + rect.height / 2) * 0.08;
            if (el.parentElement.classList.contains('partner-section')) {
                return;
            }
            if (el.parentElement.classList.contains('demo-hero')) {
                el.style.transform = 'translateY(calc(-50% + ' + offset + 'px))';
            } else {
                el.style.transform = 'translate(-50%, calc(-50% + ' + offset + 'px))';
            }
        });
    }, { passive: true });
})();

// Accordion
(function(){
    document.querySelectorAll('.accordion-trigger').forEach(function(trigger) {
        trigger.addEventListener('click', function() {
            trigger.closest('.accordion-item').classList.toggle('open');
        });
    });
})();

// Theme toggle (dark/light)
(function(){
    var btn = document.getElementById('themeToggle');
    if (!btn) return;

    // Restore saved preference, default to light
    var saved = localStorage.getItem('ql-theme');
    if (saved !== 'dark') {
        document.body.classList.add('light');
    }

    btn.addEventListener('click', function() {
        document.body.classList.toggle('light');
        var isLight = document.body.classList.contains('light');
        localStorage.setItem('ql-theme', isLight ? 'light' : 'dark');
    });
})();

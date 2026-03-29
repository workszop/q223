// Quantica Lab – Interactive Effects (Typographic Redesign)

// Mobile menu toggle
(function(){
    document.querySelectorAll('.menu-toggle').forEach(function(btn) {
        btn.addEventListener('click', function() {
            var nav = btn.closest('nav').querySelector('.nav-links');
            if (nav) nav.classList.toggle('active');
        });
    });
})();

// Dropdown toggle
(function(){
    document.querySelectorAll('.dropdown-toggle').forEach(function(toggle) {
        toggle.addEventListener('click', function(e) {
            e.stopPropagation();
            var menu = toggle.parentElement.querySelector('.dropdown-menu');
            if (menu) menu.classList.toggle('active');
        });
    });
    document.addEventListener('click', function() {
        document.querySelectorAll('.dropdown-menu.active').forEach(function(m) {
            m.classList.remove('active');
        });
    });
})();

// Parallax watermark on scroll
(function(){
    var watermarks = document.querySelectorAll('.watermark');
    if (!watermarks.length) return;
    window.addEventListener('scroll', function() {
        window.requestAnimationFrame(function() {
            var scrollY = window.pageYOffset;
            watermarks.forEach(function(el) {
                el.style.transform = 'translate(-50%, calc(-50% + ' + (scrollY * 0.12) + 'px))';
            });
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

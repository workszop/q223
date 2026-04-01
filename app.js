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


// Accordion
(function(){
    document.querySelectorAll('.accordion-trigger').forEach(function(trigger) {
        trigger.addEventListener('click', function() {
            trigger.closest('.accordion-item').classList.toggle('open');
        });
    });
})();

// Theme toggle (light/dark)
(function(){
    var saved = localStorage.getItem('theme') || 'dark';
    document.body.setAttribute('data-theme', saved);

    var btn = document.getElementById('theme-toggle');
    if (btn) {
        btn.addEventListener('click', function() {
            var current = document.body.getAttribute('data-theme');
            var next = current === 'dark' ? 'light' : 'dark';
            document.body.setAttribute('data-theme', next);
            localStorage.setItem('theme', next);
        });
    }
})();

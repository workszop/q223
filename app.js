// Quantica Lab – Interactive Effects

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
            // Determine base transform based on parent class
            if (el.parentElement.classList.contains('partner-section')) {
                // partner watermark: bottom-right positioned
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

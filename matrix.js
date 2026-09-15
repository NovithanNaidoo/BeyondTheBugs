/* ═══════════════════════════════════════════════════════════════════════
   MATRIX RAIN — BeyondTheBugs
   ───────────────────────────────────────────────────────────────────────
   Falling columns of characters behind the page content, matching the
   effect used in the testing tool.

   The illusion comes from never clearing the canvas. Each frame paints a
   near-transparent rectangle of the page's background colour over
   everything, so older characters fade out gradually while new ones are
   drawn at full brightness — that is what produces the trailing tail.
   Clearing properly each frame would give you disconnected characters
   with no trail at all.

   No dependencies. Creates its own canvas, so a page only needs to load
   this file.
   ═══════════════════════════════════════════════════════════════════════ */
(function matrixRain() {
    'use strict';

    // Trailing animation is a common motion-sickness trigger.
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const CONFIG = {
        FONT_SIZE:  16,
        COLOUR:     '#28a745',                   // site green
        HEAD:       '#7fff6a',                   // brighter leading character
        FADE:       'rgba(10, 14, 39, 0.075)',   // matches #codeBackground
        SPEED_MS:   50,                          // frame interval
        RESET_ODDS: 0.975                        // higher = longer columns
    };

    const CHARS = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ' +
                  'abcdefghijklmnopqrstuvwxyz' +
                  '<>{}[]()#@!?/\\|=+-*&^%$';

    const canvas = document.createElement('canvas');
    canvas.id = 'matrixRain';
    canvas.style.cssText =
        'position:fixed;top:0;left:0;width:100%;height:100%;' +
        'pointer-events:none;' +      // must not block clicks
        'z-index:-1;' +               // behind page content
        'opacity:0.5;';               // keeps body text readable

    const ctx = canvas.getContext('2d');
    let width, height, columns, drops;

    function resize() {
        width  = canvas.width  = window.innerWidth;
        height = canvas.height = window.innerHeight;
        columns = Math.floor(width / CONFIG.FONT_SIZE);

        // Start each column at a random height so they do not all begin
        // falling in a single straight line on load.
        drops = Array.from({ length: columns },
            () => Math.floor(Math.random() * -50));
    }

    function draw() {
        // Translucent wash rather than a clear — this creates the trails.
        ctx.fillStyle = CONFIG.FADE;
        ctx.fillRect(0, 0, width, height);

        ctx.font = CONFIG.FONT_SIZE + 'px monospace';

        for (let i = 0; i < drops.length; i++) {
            const char = CHARS[Math.floor(Math.random() * CHARS.length)];
            const x = i * CONFIG.FONT_SIZE;
            const y = drops[i] * CONFIG.FONT_SIZE;

            // Leading character is brighter, which reads as the drop's head.
            ctx.fillStyle = CONFIG.HEAD;
            ctx.fillText(char, x, y);

            ctx.fillStyle = CONFIG.COLOUR;
            ctx.fillText(
                CHARS[Math.floor(Math.random() * CHARS.length)],
                x, y - CONFIG.FONT_SIZE
            );

            // Once a column runs off the bottom, restart it at random so the
            // columns stay out of sync with each other.
            if (y > height && Math.random() > CONFIG.RESET_ODDS) drops[i] = 0;
            drops[i]++;
        }
    }

    // Paced with requestAnimationFrame rather than setInterval, so it pauses
    // in a background tab instead of burning CPU while nobody is looking.
    let last = 0;
    function loop(now) {
        if (now - last >= CONFIG.SPEED_MS) {
            draw();
            last = now;
        }
        requestAnimationFrame(loop);
    }

    function start() {
        document.body.appendChild(canvas);
        resize();
        window.addEventListener('resize', resize);
        requestAnimationFrame(loop);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', start);
    } else {
        start();
    }
})();

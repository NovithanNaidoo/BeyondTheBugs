/* ═══════════════════════════════════════════════════════════════════════
   POLISH — BeyondTheBugs
   ───────────────────────────────────────────────────────────────────────
   Two effects that do most of the work in making a site feel built rather
   than assembled:

     1. A spotlight that follows the cursor across cards.
     2. Content that reveals itself as it scrolls into view.

   Both are applied from here rather than by hand in the markup, so adding
   a card to any page picks them up automatically and there is no class to
   remember.

   Both are skipped entirely for anyone who has asked for reduced motion.
   No dependencies.
   ═══════════════════════════════════════════════════════════════════════ */
(function polish() {
    'use strict';

    const STILL = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    /* Everything that should behave like a card. Kept in one place so the
       two effects below never drift apart on which elements they cover. */
    const CARDS = '.defect-card, .project-card, .card, .stat-strip';

    /* ── 1 · Cursor spotlight ────────────────────────────────────────────
       The card paints a soft radial highlight at --mx/--my (see style.css).
       Listening on the document rather than binding a handler to every
       card keeps this to one listener no matter how many cards exist, and
       means cards added later still work.

       Coordinates are written inside requestAnimationFrame: pointermove
       fires far more often than the screen refreshes, and setting a custom
       property forces style recalculation, so writing on every event is
       how this kind of effect ends up janky. */
    if (!STILL && window.matchMedia('(hover: hover)').matches) {
        let latest = null;      // most recent position seen
        let queued = false;     // is a frame already booked?

        document.addEventListener('pointermove', (e) => {
            latest = e;

            /* The flag has to live outside the event. Every pointermove
               delivers a brand new event object, so a marker set on the
               event itself is never seen again and a frame gets booked on
               every single move - which is the throttle doing nothing at
               all while looking like it works. */
            if (queued) return;
            queued = true;

            requestAnimationFrame(() => {
                queued = false;

                const ev = latest;
                if (!ev || !ev.target || !ev.target.closest) return;

                const card = ev.target.closest(CARDS);
                if (!card) return;

                const r = card.getBoundingClientRect();
                card.style.setProperty('--mx', (ev.clientX - r.left) + 'px');
                card.style.setProperty('--my', (ev.clientY - r.top) + 'px');
            });
        }, { passive: true });
    }

    /* ── 2 · Scroll reveals ──────────────────────────────────────────────
       Elements start slightly lowered and transparent, then settle as they
       enter the viewport. The class is added by script so the page still
       renders everything if JavaScript fails - progressive enhancement
       rather than content that depends on JS to become visible. */
    const revealTargets = document.querySelectorAll(
        [
            'section > .container > .row > [class*="col-"]',
            'section > .container > h2',
            'section > .container > p',
            '.defect-card',
            '.project-card',
            '.stat-strip',
            '.terminal'
        ].join(',')
    );

    if (STILL || !('IntersectionObserver' in window) || !revealTargets.length) {
        return;
    }

    revealTargets.forEach((el, i) => {
        el.classList.add('reveal');
        /* A small stagger within a row reads as one considered movement
           rather than several things twitching at once. Capped so a long
           list never ends with a visible wait. */
        el.style.setProperty('--reveal-delay', Math.min(i % 6, 5) * 60 + 'ms');
    });

    const io = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
            if (!entry.isIntersecting) return;
            entry.target.classList.add('is-revealed');
            io.unobserve(entry.target);   // reveal once, not on every pass
        });
    }, {
        /* Fire slightly before the element reaches the bottom edge, so it
           has finished arriving by the time it is properly in view. */
        rootMargin: '0px 0px -12% 0px',
        threshold: 0.08
    });

    revealTargets.forEach((el) => io.observe(el));
})();

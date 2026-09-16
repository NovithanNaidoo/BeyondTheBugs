/* ═══════════════════════════════════════════════════════════════════════
   LIVE TEST RUN — BeyondTheBugs
   ───────────────────────────────────────────────────────────────────────
   Replays a real execution of the EMERGEX automated test suite in a fake
   terminal: 118 tests across six layers, with the four documented defects
   failing exactly as they do in the recorded run of 6 September 2026.

   Self-contained — no libraries.
   ═══════════════════════════════════════════════════════════════════════ */
(function liveTestRun() {
    'use strict';

    const term   = document.getElementById('terminalBody');
    const runBtn = document.getElementById('runTestsBtn');
    if (!term || !runBtn) return;

    // Each line: [text, css class, delay in ms before the NEXT line].
    // Figures taken from the recorded run: 118 total, 114 passed, 4 failed.
    const SCRIPT = [
        ['novithan@beyondthebugs:~/EMERGEX.Tests$ dotnet test --settings .runsettings', 't-cmd', 700],
        ['', '', 120],
        ['  Determining projects to restore...', 't-dim', 280],
        ['  Restore complete (0.5s)', 't-dim', 320],
        ['  EMERGEX.Tests succeeded → bin/Debug/net9.0/EMERGEX.Tests.dll', 't-dim', 420],
        ['', '', 120],
        ['NUnit Adapter 4.6.0.0: Test execution started', '', 300],
        ['  Discovered 118 of 118 NUnit test cases', 't-dim', 500],
        ['', '', 200],

        ['── UI ─────────────────────────────────────────────', 't-head', 260],
        ['  ✓ PropertyDetail_ForVerifiedLandlord_RendersTheTrustBadge', 't-pass', 95],
        ['  ✓ PropertyDetail_NsfasBadge_AppearsOnlyWhenAccredited', 't-pass', 85],
        ['  ✓ SearchGrid_OnMobileViewport_StacksIntoASingleColumn', 't-pass', 85],
        ['  ✓ PropertyGrid_ImagesHaveDescriptiveAltText', 't-pass', 85],
        ['  ✓ ... 21 more', 't-dim', 240],
        ['  25 passed', 't-pass', 320],
        ['', '', 120],

        ['── Functional ─────────────────────────────────────', 't-head', 260],
        ['  ✓ Register_WithValidStudentDetails_CreatesAccountAndSignsIn', 't-pass', 95],
        ['  ✓ SignIn_AfterFiveFailures_IsThrottled', 't-pass', 85],
        ['  ✓ LoginForm_WithoutCsrfToken_DoesNotAuthenticate', 't-pass', 85],
        ['  ✗ LoginForm_WithoutCsrfToken_ReturnsACleanRejectionStatus', 't-fail', 240],
        ['      Expected: not 500   But was: 500', 't-dim', 100],
        ['      DEF-012 — 419 is not an IANA status code; Apache rewrites it', 't-warn', 200],
        ['  ✓ ... 35 more', 't-dim', 240],
        ['  38 passed, 1 failed', 't-warn', 320],
        ['', '', 120],

        ['── Integration ────────────────────────────────────', 't-head', 260],
        ['  ✓ SearchGrid_RendersExactlyWhatTheDatabaseReturns', 't-pass', 95],
        ['  ✓ Registration_StoresAHashedPasswordAndTheCorrectRole', 't-pass', 85],
        ['  ✓ EscrowSimulation_MovesThroughEveryStateInOrder', 't-pass', 85],
        ['  ✓ ... 6 more', 't-dim', 220],
        ['  9 passed', 't-pass', 320],
        ['', '', 120],

        ['── End-to-end ─────────────────────────────────────', 't-head', 260],
        ['  ✓ Student_CanSearchInstantBookAndCompleteTheSimulatedPayment', 't-pass', 110],
        ['  ✓ StudentRequestAndLandlordApproval_CompletesTheBookingJourney', 't-pass', 100],
        ['  ✓ NewLandlord_IsVerifiedByAdminAndTheBadgeReachesStudents', 't-pass', 100],
        ['  ✓ ... 2 more', 't-dim', 220],
        ['  5 passed', 't-pass', 320],
        ['', '', 120],

        ['── Regression ─────────────────────────────────────', 't-head', 260],
        ['  ✓ SecurityHeaders_ArePresentOnEveryResponse', 't-pass', 95],
        ['  ✓ Booking_WithTamperedPriceFields_PersistsTheDatabaseValues', 't-pass', 85],
        ['  ✗ Booking_OnAPropertyWithNoRoomsAvailable_IsRefused', 't-fail', 240],
        ['      DEF-010 — zero-room property accepted a booking', 't-warn', 160],
        ['  ✗ RegistrationForm_HidesStudentNumberForLandlords', 't-fail', 240],
        ['      DEF-013 — label{display:block} overrides [hidden]', 't-warn', 200],
        ['  ✓ ... 19 more', 't-dim', 240],
        ['  22 passed, 2 failed', 't-warn', 320],
        ['', '', 120],

        ['── Security ───────────────────────────────────────', 't-head', 260],
        ['  ✓ Search_WithSqlInjectionPayload_IsTreatedAsPlainText', 't-pass', 95],
        ['  ✓ SignIn_DoesNotRevealWhetherAnAccountExists', 't-pass', 85],
        ['  ✓ Upload_TrustsFileContentRatherThanTheDeclaredMimeType', 't-pass', 85],
        ['  ✗ UploadedDocuments_AreNotReadableWithoutASession', 't-fail', 260],
        ['      DEF-011 — anonymous request returned 200 with file contents', 't-warn', 200],
        ['  ✓ ... 12 more', 't-dim', 240],
        ['  15 passed, 1 failed', 't-warn', 400],
        ['', '', 180],

        ['═══════════════════════════════════════════════════', 't-head', 200],
        ['Test summary: total 118 · passed 114 · failed 4 · duration 46.5s', 't-head', 300],
        ['', '', 120],
        ['All 4 failures are documented defects, not broken tests.', 't-warn', 200],
        ['Each one asserts behaviour the application should have and does not,', 't-dim', 160],
        ['so it stays red until the code is fixed.', 't-dim', 300],
        ['', '', 150],
        ['novithan@beyondthebugs:~/EMERGEX.Tests$ ', 't-cmd', 0]
    ];

    let running = false;

    function typeLine(index) {
        if (index >= SCRIPT.length) {
            running = false;
            runBtn.disabled = false;
            runBtn.innerHTML = '<i class="fas fa-redo"></i> Run Again';
            term.insertAdjacentHTML('beforeend', '<span class="t-caret">&nbsp;</span>');
            return;
        }

        const [text, cls, delay] = SCRIPT[index];
        const line = document.createElement('div');
        if (cls) line.className = cls;
        line.textContent = text || ' ';   // blank lines still need height
        term.appendChild(line);
        term.scrollTop = term.scrollHeight;

        setTimeout(() => typeLine(index + 1), delay);
    }

    function runSuite() {
        if (running) return;
        running = true;
        term.innerHTML = '';
        runBtn.disabled = true;
        runBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Running...';
        typeLine(0);
    }

    // Idle state before anyone presses the button.
    term.innerHTML =
        '<div class="t-dim">Press "Run Test Suite" to replay a real execution ' +
        'of the EMERGEX automated test suite.</div>' +
        '<div class="t-cmd">novithan@beyondthebugs:~/EMERGEX.Tests$ ' +
        '<span class="t-caret">&nbsp;</span></div>';

    runBtn.addEventListener('click', runSuite);

    // Start automatically the first time the section scrolls into view, so a
    // visitor who simply scrolls still sees it happen.
    if ('IntersectionObserver' in window) {
        const section = document.getElementById('test-run');
        if (section) {
            const io = new IntersectionObserver(entries => {
                entries.forEach(e => {
                    if (e.isIntersecting) {
                        io.disconnect();
                        setTimeout(runSuite, 400);
                    }
                });
            }, { threshold: 0.35 });
            io.observe(section);
        }
    }
})();

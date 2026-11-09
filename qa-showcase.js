/* ═══════════════════════════════════════════════════════════════════════
   LIVE TEST RUN — BeyondTheBugs
   ───────────────────────────────────────────────────────────────────────
   Replays a real execution of the EMERGEX automated test suite in a fake
   terminal: 152 pytest functions producing 230 executions across seven
   layers, with the seven documented defects failing exactly as they do in
   test run TR-001 of 1 November 2026.

   Python 3.13 · pytest 8.3 · Playwright 0.6 · PyMySQL.

   Self-contained — no libraries.
   ═══════════════════════════════════════════════════════════════════════ */
(function liveTestRun() {
    'use strict';

    const term   = document.getElementById('terminalBody');
    const runBtn = document.getElementById('runTestsBtn');
    if (!term || !runBtn) return;

    const PROMPT = '(.venv) novithan@beyondthebugs:~/emergex-group-55/tests$ ';

    // Each line: [text, css class, delay in ms before the NEXT line].
    // Figures taken from TR-001: 230 collected, 224 executed, 217 passed,
    // 7 failed, 6 skipped, 6m 42s.
    const SCRIPT = [
        [PROMPT + 'pytest', 't-cmd', 700],
        ['', '', 120],
        ['============================= test session starts =============================', 't-dim', 320],
        ['platform win32 -- Python 3.13.7, pytest-8.3.4, pluggy-1.5.0', 't-dim', 300],
        ['rootdir: C:\\xampp\\htdocs\\emergex-group-55\\tests', 't-dim', 240],
        ['plugins: playwright-0.6.2, html-4.1.1, metadata-3.1.1', 't-dim', 320],
        ['collected 230 items', 't-dim', 500],
        ['', '', 200],

        ['── 00-smoke ───────────────────────────────────────', 't-head', 260],
        ['  ✓ test_the_application_is_reachable', 't-pass', 95],
        ['  ✓ test_the_database_holds_the_expected_reference_data', 't-pass', 85],
        ['  ✓ test_every_page_responds_before_the_suite_begins', 't-pass', 85],
        ['  4 passed', 't-pass', 320],
        ['', '', 120],

        ['── 01-ui ──────────────────────────────────────────', 't-head', 260],
        ['  ✓ test_all_campuses_are_listed', 't-pass', 95],
        ['  ✓ test_unconfirmed_campuses_carry_the_location_badge', 't-pass', 85],
        ['  ✓ test_a_figure_changes_when_the_data_changes', 't-pass', 85],
        ['  ✓ test_every_page_works_at_360px[390-844]', 't-pass', 85],
        ['  ✗ test_the_guardian_hint_does_not_promise_an_email', 't-fail', 240],
        ['      assert "receive the same confirmation" not in hint', 't-dim', 110],
        ['      DEF-07 — the form promises an email no release sends', 't-warn', 200],
        ['  ✓ ... 34 more', 't-dim', 240],
        ['  39 passed, 1 failed', 't-warn', 320],
        ['', '', 120],

        ['── 02-functional ──────────────────────────────────', 't-head', 260],
        ['  ✓ test_results_belong_only_to_the_selected_campus', 't-pass', 95],
        ['  ✓ test_adding_an_amenity_never_widens_the_results', 't-pass', 85],
        ['  ✓ test_a_deactivated_listing_disappears_from_search', 't-pass', 85],
        ['  ✗ test_a_name_longer_than_the_column_is_refused', 't-fail', 240],
        ['      assert len(stored) == 200, got 160', 't-dim', 110],
        ['      DEF-01 — a 200-character name was silently truncated', 't-warn', 200],
        ['  ✗ test_a_request_naming_no_rooms_is_refused', 't-fail', 240],
        ['      assert reference is None, got "RF-261101-3591"', 't-dim', 110],
        ['      DEF-02 — BR-06: request stored with zero rooms attached', 't-warn', 200],
        ['  ✗ test_rooms_must_belong_to_the_selected_campus', 't-fail', 240],
        ['      DEF-03 — BR-07: Cape Town request named a Bryanston room', 't-warn', 200],
        ['  ✓ ... 66 more', 't-dim', 240],
        ['  70 passed, 3 failed', 't-warn', 320],
        ['', '', 120],

        ['── 03-logic ───────────────────────────────────────', 't-head', 260],
        ['  ✓ test_monthly_plan_applies_no_discount', 't-pass', 95],
        ['  ✓ test_the_deposit_is_never_discounted', 't-pass', 85],
        ['  ✓ test_termly_instalment_count_rounds_up[10-4]', 't-pass', 85],
        ['  ✓ ... 10 more', 't-dim', 220],
        ['  13 passed', 't-pass', 320],
        ['', '', 120],

        ['── 04-integration ─────────────────────────────────', 't-head', 260],
        ['  ✓ test_every_field_survives_the_round_trip', 't-pass', 95],
        ['  ✓ test_both_tables_are_written_in_one_transaction', 't-pass', 85],
        ['  ✓ test_the_reference_is_unique_across_submissions', 't-pass', 85],
        ['  ✗ test_the_status_column_only_accepts_its_defined_values', 't-fail', 240],
        ['      DEF-06 — VARCHAR(20) accepted "not-a-real-status"', 't-warn', 200],
        ['  ✓ ... 33 more', 't-dim', 240],
        ['  36 passed, 1 failed', 't-warn', 320],
        ['', '', 120],

        ['── 05-security ────────────────────────────────────', 't-head', 260],
        ['  ✓ test_the_campus_parameter_resists_injection[\' OR 1=1--]', 't-pass', 95],
        ['  ✓ test_a_script_tag_in_a_listing_name_renders_as_text', 't-pass', 85],
        ['  ✓ test_a_submission_without_a_csrf_token_is_refused', 't-pass', 85],
        ['  ✗ test_the_move_in_month_is_checked_against_the_offered_range', 't-fail', 240],
        ['      posted move_in=1999-01 directly; stored unchanged', 't-dim', 110],
        ['      DEF-04 — the dropdown constrains the browser, not the request', 't-warn', 200],
        ['  ✗ test_the_campus_is_checked_against_the_campus_table', 't-fail', 240],
        ['      DEF-05 — refused by the foreign key, not by validation', 't-warn', 200],
        ['  ✓ ... 15 more', 't-dim', 240],
        ['  17 passed, 2 failed', 't-warn', 320],
        ['', '', 120],

        ['── 06-e2e ─────────────────────────────────────────', 't-head', 260],
        ['  ✓ test_a_campus_card_opens_the_search_already_filtered', 't-pass', 110],
        ['  ✓ test_the_shortlist_follows_the_student_between_pages', 't-pass', 100],
        ['  ✓ test_shortlisted_rooms_arrive_preselected_on_the_form', 't-pass', 100],
        ['  ✓ test_the_complete_journey_from_search_to_a_stored_request', 't-pass', 110],
        ['  ✓ ... 1 more', 't-dim', 220],
        ['  5 passed', 't-pass', 400],
        ['', '', 180],

        ['═══════════════════════════════════════════════════', 't-head', 200],
        ['SKIPPED [6] fallback tests move the configuration file aside', 't-dim', 260],
        ['=========== 217 passed, 7 failed, 6 skipped in 402.27s (0:06:42) ===========', 't-head', 320],
        ['', '', 120],
        ['All 7 failures are documented defects, not broken tests.', 't-warn', 200],
        ['Each one asserts behaviour the application should have and does not,', 't-dim', 160],
        ['so it stays red until the code is fixed.', 't-dim', 280],
        ['', '', 150],
        ['All seven were corrected. TR-002 returned 224 passed, 0 failed.', 't-pass', 300],
        ['', '', 150],
        [PROMPT, 't-cmd', 0]
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
        line.textContent = text || ' ';   // blank lines still need height
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
        '<div class="t-dim">Press "Run Test Suite" to replay test run TR-001 ' +
        'of the EMERGEX automated test suite.</div>' +
        '<div class="t-cmd">' + PROMPT +
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

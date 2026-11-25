# TEST_RESULTS — Dental Care BD (factory run #441, 2026-11-25 18:00 +06)

## Unit tests — 81/81 passed

Command: `node tests/test.js` (run 2026-11-25 ~18:12 +06, exit 0)

Coverage:
- i18n: EN/BN key parity, 117 keys, BN title Bengali, EN lang button Bengali.
- Dates: parse/validation, future-date rule, addDays across month, addMonths 6 (2026-05-31 → 2026-11-30; 2028-08-29 → 2029-02-28 clamp), daysBetween ±.
- Money: paisa parse (commas, decimals, rejects letters/3 decimals), Indian grouping format (1,25,000.00), Bengali digits.
- Teeth: 32 unique FDI teeth, quadrants, types, status cycle (healthy → watch → … → missing → healthy), summary counts (invalid tooth 99 ignored).
- Brushing: day-complete rule, streak (3 consecutive, gap → 1, partial day excluded, alive-from-yesterday, longest 3 survives gap), weekly 7-row data, validator errors (future/bad-date/no-session/duplicate).
- Visits: validator errors (future, clinic empty/too long, bad treatment, bad cost, cost > ৳10,00,000, notes > 300 chars), totalSpend, lastVisitDate, nextCheckup +6 months.
- Import: valid state accepted; wrong app/version, duplicate brush dates, bad tooth key/status, duplicate visit ids, negative cost all rejected; empty state valid.

## Headless-Chrome smoke — 57/57 @ 1280 and 57/57 @ 390

Command: `node tests/smoke.mjs 1280` and `node tests/smoke.mjs 390` (raw CDP, headless_shell-1187, file:// + ?asof=2026-11-25; exit 0 both)

Hand-verified in the smoke run:
- Today quick-log (morning + night) → streak 1, status "Complete day".
- Duplicate date and future date (2026-11-26) rejected inline, counts unchanged.
- Second log (2026-11-24, full day + floss) → streak 2; streak persists across reload.
- Tooth 11 click → Watch → Cavity; tooth 36 → Filled; summary "2 of 32 marked", "1 need attention" (after first click).
- Visit 1 (2026-11-20, checkup, ৳1,500) → total ৳1,500.00, last visit 2026-11-20; dashboard next checkup 2027-05-20 with day countdown.
- Visit 2 (root canal, ৳25,000, clinic `<script>alert(1)</script>`) → total ৳26,500.00; script count stays 3, name renders as inert text.
- BN toggle: title in Bengali, streak shows ২, total shows ২৬,৫০০; toggle back to EN.
- Data tab: JSON import round-trip accepted (2 visits kept); wrong-app import rejected with data intact; typed-DELETE erase clears brush + visits.
- 0 console/page errors, 0 failed requests, 0 network requests, no horizontal overflow at either width.
- Screenshots: tests/smoke-1280.png, tests/smoke-390.png (read by eye — clean render, Data tab end state).

## Repairs

0 app bugs found by tests. 2 build-hygiene fixes before testing: raw Bengali literals removed from index.html/js (lang-button label, taka constant, digit map) so all app sources are pure ASCII (Bengali only as \uXXXX escapes in js/i18n.js); i18n generator double-stringify bug fixed. No test-side fixes needed.

## Notes / known limits

- Streak rule is documented in-app: a day counts only when both morning and night are logged.
- Next checkup = last visit + 6 months (common recall interval, labelled as such in README).
- `?asof=` query param pins "today" for deterministic tests; production use ignores it when absent.

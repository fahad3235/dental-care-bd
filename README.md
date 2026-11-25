# Dental Care BD

Offline bilingual (English / বাংলা) dental care tracker for Bangladesh: log daily brushing, keep a 32-tooth FDI chart, record dentist visits and costs, and get a 6-month checkup reminder. Everything runs in the browser with no account, no network calls, and data stored only on the device.

Built by the Muse Project Factory (run #441, 2026-11-25, 18:00 Asia/Dhaka slot).

## Problem

Dental care in Bangladesh is mostly tracked on paper — if at all. People forget whether they brushed twice yesterday, lose track of which tooth had a cavity, and miss the 6-month checkup because no one reminds them. This app puts the three things that matter (daily brushing habit, per-tooth status, visit history + cost) in one offline tool a family can keep on a phone.

## Features

1. **Dashboard** — current and longest brushing streaks, teeth needing attention, total dental spend, next-checkup countdown, today's brushing quick-log (morning / night / floss), 7-day brushing bar chart, and recent visits.
2. **Brush log** — one entry per day (morning, night, floss), strict validation (no future dates, no duplicate days), 30-day history with delete. A day counts toward the streak only when both morning and night brushing are logged.
3. **Tooth chart** — interactive 32-tooth chart using standard FDI numbering (11–18, 21–28, 31–38, 41–48). Tap a tooth to cycle Healthy → Watch → Cavity → Filled → Crown → Missing. Counts of marked teeth and teeth needing attention are shown live.
4. **Dentist visits** — visit log with date, clinic/doctor, treatment type (checkup, cleaning, filling, extraction, root canal, braces, crown, whitening, other), cost in taka, and notes. Totals, last-visit date, and a next-checkup date (last visit + 6 months, a common recall interval) are computed automatically. All money is integer paisa — no float rounding.
5. **Data** — JSON export / strict import (only files exported by this app are accepted; wrong app, wrong version, duplicate dates/ids, bad records are all rejected with data kept intact), and typed-DELETE erase-all.
6. **Bilingual** — full English / বাংলা toggle, persisted, with Bengali digits. Works at 390px mobile width with no horizontal overflow. Zero network requests.

## Stack

- Vanilla HTML + CSS + JavaScript (no framework, no build step, no CDN)
- `localStorage` for persistence
- Node.js for unit tests; headless Chromium (raw CDP) for smoke tests

## Prerequisites

- Any modern browser (Chrome, Firefox, Safari, Edge). No server needed — open `index.html` directly.
- Node.js 18+ only if you want to run the tests.

## Install & run

```bash
git clone https://github.com/fahad3235/dental-care-bd.git
cd dental-care-bd
# Option A: open index.html in a browser
# Option B: serve locally
python3 -m http.server 8000
# then visit http://localhost:8000
```

## Development commands

```bash
node tests/test.js        # 81 node unit checks (logic + i18n + import validation)
node tests/smoke.mjs 1280 # 57 headless-Chrome smoke checks at desktop width
node tests/smoke.mjs 390  # 57 headless-Chrome smoke checks at mobile width
```

Smoke tests use the Playwright-cached `headless_shell` binary and pin "today" with `?asof=2026-11-25` for deterministic streak/date assertions.

## Data model

Stored under localStorage key `dentalCareBd.v1`:

```json
{
  "app": "dental-care-bd",
  "version": 1,
  "brush": [{ "date": "2026-11-25", "morning": true, "night": true, "floss": true }],
  "teeth": { "11": "cavity", "16": "filled" },
  "visits": [{ "id": "...", "date": "2026-11-20", "clinic": "Dhaka Dental Care",
               "treatment": "checkup", "costPaisa": 150000, "notes": "" }]
}
```

## Testing

- **81/81 node unit checks** — dates (leap/clamp edges), money (paisa parsing, Indian grouping), FDI tooth map (32 teeth, quadrants, types), streak math (3 consecutive, gap breaks, partial day excluded, alive-from-yesterday, longest survives gap), weekly chart data, brush/visit validators (future dates, duplicates, cost range, length limits), import validation (wrong app/version, duplicate brush dates, bad tooth keys/statuses, duplicate visit ids, negative cost).
- **57/57 headless-Chrome smoke checks at 1280px and 57/57 at 390px** — render, 5 tabs, today quick-log → streak 1, duplicate/future brush rejection, second log → streak 2, reload persistence, 32-tooth chart with click-cycling (watch → cavity → filled), visit validation, totals (৳1,500.00 then ৳26,500.00), next checkup 2027-05-20, XSS clinic name rendered inert (no extra script tag), Bengali toggle (২ streak, ২৬,৫০০ total), JSON import round-trip + bad-import rejection with data intact, typed-DELETE erase, zero horizontal overflow, 0 console/page errors, 0 failed requests.

Hand-verified scenarios: 2026-11-23/24/25 full days → streak 3; gap day → streak resets to 1; 2026-05-31 + 6 months → 2026-11-30 (clamp rule); 2026-08-29 + 6 months → 2027-02-28.

## Deployment

Static site — deploy anywhere (GitHub Pages, Netlify, any static host). GitHub Pages: enable Pages on the `main` branch, root folder.

## Limitations

- **Not medical advice.** Tooth statuses are the user's own notes; only a dentist can diagnose. The 6-month recall is a common interval, not a prescription — follow your dentist's advice.
- Data lives in one browser's localStorage. Use Export to back up; clearing browser data erases it. No sync across devices.
- No reminders/notifications — the app must be opened to see the checkup countdown.
- Costs are user-entered; the app has no price list and makes no claim about real clinic fees.

## Status

Complete MVP. All tests green (81 unit + 57 smoke @ 1280 + 57 smoke @ 390).

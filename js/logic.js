// Dental Care BD - pure logic (no DOM). Shared by the app and node tests.
// All money is integer paisa. All dates are local 'YYYY-MM-DD' strings.
(function (root) {
  'use strict';

  var APP_ID = 'dental-care-bd';
  var DATA_VERSION = 1;
  var STATUSES = ['healthy', 'watch', 'cavity', 'filled', 'crown', 'missing'];
  var TREATMENTS = ['checkup', 'cleaning', 'filling', 'extraction', 'root-canal', 'braces', 'crown', 'whitening', 'other'];
  // FDI numbering, display order: upper right -> upper left, lower left -> lower right
  var TEETH_UPPER = [18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28];
  var TEETH_LOWER = [48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38];
  var ALL_TEETH = TEETH_UPPER.concat(TEETH_LOWER);
  var MAX_COST_TAKA = 1000000;
  var MAX_CLINIC_LEN = 60;
  var MAX_NOTES_LEN = 300;

  function emptyState() {
    return { app: APP_ID, version: DATA_VERSION, brush: [], teeth: {}, visits: [] };
  }

  function pad2(n) { return (n < 10 ? '0' : '') + n; }

  function dateToStr(d) {
    return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate());
  }

  function parseDateParts(s) {
    if (typeof s !== 'string') return null;
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
    if (!m) return null;
    var y = +m[1], mo = +m[2], d = +m[3];
    if (mo < 1 || mo > 12 || d < 1 || d > 31) return null;
    var dt = new Date(y, mo - 1, d);
    if (dt.getFullYear() !== y || dt.getMonth() !== mo - 1 || dt.getDate() !== d) return null;
    return { y: y, m: mo, d: d };
  }

  function isValidDateStr(s) { return parseDateParts(s) !== null; }

  function todayStr(now) { return dateToStr(now || new Date()); }

  function isFutureDate(s, now) {
    if (!isValidDateStr(s)) return false;
    return s > todayStr(now);
  }

  function addDays(s, n) {
    var p = parseDateParts(s);
    if (!p) return null;
    return dateToStr(new Date(p.y, p.m - 1, p.d + n));
  }

  function addMonths(s, months) {
    var p = parseDateParts(s);
    if (!p) return null;
    var targetMonth = p.m - 1 + months;
    var y = p.y + Math.floor(targetMonth / 12);
    var m = ((targetMonth % 12) + 12) % 12;
    var lastDay = new Date(y, m + 1, 0).getDate();
    var d = Math.min(p.d, lastDay);
    return dateToStr(new Date(y, m, d));
  }

  function daysBetween(a, b) {
    var pa = parseDateParts(a), pb = parseDateParts(b);
    if (!pa || !pb) return null;
    var ms = new Date(pb.y, pb.m - 1, pb.d) - new Date(pa.y, pa.m - 1, pa.d);
    return Math.round(ms / 86400000);
  }

  // ---- money (integer paisa) ----
  function parseTakaToPaisa(v) {
    if (typeof v === 'number') v = String(v);
    if (typeof v !== 'string') return null;
    var s = v.replace(/[\s,]/g, '');
    if (s === '') return null;
    if (!/^\d+(\.\d{1,2})?$/.test(s)) return null;
    var parts = s.split('.');
    var paisa = parseInt(parts[0], 10) * 100;
    if (parts[1]) paisa += parseInt((parts[1] + '00').slice(0, 2), 10);
    return paisa;
  }

  // Indian digit grouping: 125000.00 -> "1,25,000.00"
  function formatPaisa(paisa) {
    var neg = paisa < 0;
    var abs = Math.abs(paisa);
    var whole = Math.floor(abs / 100);
    var frac = abs % 100;
    var s = String(whole);
    var last3 = s.slice(-3);
    var rest = s.slice(0, -3);
    var grouped = rest.replace(/(\d)(?=(\d{2})+$)/g, '$1,');
    var out = (grouped ? grouped + ',' + last3 : last3) + '.' + pad2(frac);
    return neg ? '-' + out : out;
  }

  function formatInt(n) {
    var s = String(Math.abs(n));
    var last3 = s.slice(-3);
    var rest = s.slice(0, -3);
    var grouped = rest.replace(/(\d)(?=(\d{2})+$)/g, '$1,');
    var out = grouped ? grouped + ',' + last3 : last3;
    return n < 0 ? '-' + out : out;
  }

  function toBengaliDigits(s) {
    var map = { '0': '\u09e6', '1': '\u09e7', '2': '\u09e8', '3': '\u09e9', '4': '\u09ea', '5': '\u09eb', '6': '\u09ec', '7': '\u09ed', '8': '\u09ee', '9': '\u09ef' };
    return String(s).replace(/[0-9]/g, function (ch) { return map[ch]; });
  }

  // ---- teeth ----
  function toothQuadrant(n) {
    if (n >= 11 && n <= 18) return 'upper-right';
    if (n >= 21 && n <= 28) return 'upper-left';
    if (n >= 31 && n <= 38) return 'lower-left';
    return 'lower-right';
  }

  function toothType(n) {
    var pos = n % 10; // 1 central, 2 lateral, 3 canine, 4/5 premolar, 6/7/8 molar
    if (pos === 1) return 'central-incisor';
    if (pos === 2) return 'lateral-incisor';
    if (pos === 3) return 'canine';
    if (pos === 4 || pos === 5) return 'premolar';
    return 'molar';
  }

  function nextStatus(cur) {
    var i = STATUSES.indexOf(cur);
    if (i < 0) return 'watch';
    return STATUSES[(i + 1) % STATUSES.length];
  }

  function teethSummary(teeth) {
    var counts = { healthy: 0, watch: 0, cavity: 0, filled: 0, crown: 0, missing: 0 };
    var marked = 0;
    ALL_TEETH.forEach(function (n) {
      var s = (teeth || {})[String(n)];
      if (s && counts.hasOwnProperty(s)) { counts[s]++; marked++; }
    });
    return { counts: counts, marked: marked, attention: counts.watch + counts.cavity, unmarked: 32 - marked };
  }

  // ---- brushing ----
  function brushDayComplete(entry) { return !!(entry && entry.morning && entry.night); }

  function brushSessions(entry) {
    if (!entry) return 0;
    return (entry.morning ? 1 : 0) + (entry.night ? 1 : 0);
  }

  // Streak = consecutive COMPLETE days (morning + night) ending today or yesterday.
  function computeStreak(brush, today) {
    var byDate = {};
    (brush || []).forEach(function (e) { byDate[e.date] = e; });
    function complete(d) { return brushDayComplete(byDate[d]); }
    var cursor = complete(today) ? today : addDays(today, -1);
    var current = 0;
    while (cursor && complete(cursor)) { current++; cursor = addDays(cursor, -1); }
    // longest: scan all complete dates
    var dates = Object.keys(byDate).filter(function (d) { return complete(d); }).sort();
    var longest = 0, run = 0, prev = null;
    dates.forEach(function (d) {
      if (prev !== null && daysBetween(prev, d) === 1) run++;
      else run = 1;
      if (run > longest) longest = run;
      prev = d;
    });
    return { current: current, longest: longest };
  }

  function weeklyBrush(brush, today) {
    var byDate = {};
    (brush || []).forEach(function (e) { byDate[e.date] = e; });
    var out = [];
    for (var i = 6; i >= 0; i--) {
      var d = addDays(today, -i);
      var e = byDate[d];
      out.push({ date: d, sessions: brushSessions(e), complete: brushDayComplete(e) });
    }
    return out;
  }

  function validateBrush(entry, existing, now) {
    var errors = [];
    if (!entry || typeof entry !== 'object') return ['invalid'];
    if (!isValidDateStr(entry.date)) errors.push('badDate');
    else if (isFutureDate(entry.date, now)) errors.push('futureDate');
    if (!entry.morning && !entry.night) errors.push('noSession');
    if (errors.length === 0 && (existing || []).some(function (e) { return e.date === entry.date; })) {
      errors.push('duplicateDate');
    }
    return errors;
  }

  // ---- visits ----
  function validateVisit(v, now) {
    var errors = [];
    if (!v || typeof v !== 'object') return ['invalid'];
    if (!isValidDateStr(v.date)) errors.push('badDate');
    else if (isFutureDate(v.date, now)) errors.push('futureDate');
    if (typeof v.clinic !== 'string' || v.clinic.trim().length === 0) errors.push('clinicRequired');
    else if (v.clinic.trim().length > MAX_CLINIC_LEN) errors.push('clinicTooLong');
    if (TREATMENTS.indexOf(v.treatment) < 0) errors.push('badTreatment');
    var paisa = parseTakaToPaisa(v.cost);
    if (paisa === null) errors.push('badCost');
    else if (paisa < 0 || paisa > MAX_COST_TAKA * 100) errors.push('costRange');
    if (typeof v.notes === 'string' && v.notes.length > MAX_NOTES_LEN) errors.push('notesTooLong');
    return errors;
  }

  function totalSpend(visits) {
    return (visits || []).reduce(function (sum, v) { return sum + (v.costPaisa || 0); }, 0);
  }

  function lastVisitDate(visits) {
    if (!visits || !visits.length) return null;
    var dates = visits.map(function (v) { return v.date; }).sort();
    return dates[dates.length - 1];
  }

  // Recommended checkup: 6 months after the most recent visit (a common recall interval).
  function nextCheckup(visits) {
    var last = lastVisitDate(visits);
    if (!last) return null;
    return addMonths(last, 6);
  }

  function daysUntil(dateStr, today) {
    var n = daysBetween(today, dateStr);
    return n;
  }

  // ---- import validation ----
  function isPlainObject(x) { return x !== null && typeof x === 'object' && !Array.isArray(x); }

  function validateImport(data) {
    var errors = [];
    if (!isPlainObject(data)) return ['notObject'];
    if (data.app !== APP_ID) errors.push('wrongApp');
    if (data.version !== DATA_VERSION) errors.push('wrongVersion');
    if (!Array.isArray(data.brush)) errors.push('brushNotArray');
    if (!isPlainObject(data.teeth)) errors.push('teethNotObject');
    if (!Array.isArray(data.visits)) errors.push('visitsNotArray');
    if (errors.length) return errors;
    var seenDates = {};
    data.brush.forEach(function (e, i) {
      if (!isPlainObject(e) || !isValidDateStr(e.date)) { errors.push('brushBad[' + i + ']'); return; }
      if (typeof e.morning !== 'boolean' || typeof e.night !== 'boolean') { errors.push('brushBad[' + i + ']'); return; }
      if (e.floss !== undefined && typeof e.floss !== 'boolean') { errors.push('brushBad[' + i + ']'); return; }
      if (seenDates[e.date]) errors.push('brushDup[' + i + ']');
      seenDates[e.date] = true;
    });
    Object.keys(data.teeth).forEach(function (k) {
      if (ALL_TEETH.indexOf(parseInt(k, 10)) < 0 || STATUSES.indexOf(data.teeth[k]) < 0) {
        errors.push('teethBad[' + k + ']');
      }
    });
    var seenIds = {};
    data.visits.forEach(function (v, i) {
      if (!isPlainObject(v) || !isValidDateStr(v.date)) { errors.push('visitBad[' + i + ']'); return; }
      if (typeof v.id !== 'string' || !v.id) { errors.push('visitBad[' + i + ']'); return; }
      if (seenIds[v.id]) errors.push('visitDup[' + i + ']');
      seenIds[v.id] = true;
      if (typeof v.clinic !== 'string' || !v.clinic.trim() || v.clinic.length > MAX_CLINIC_LEN) { errors.push('visitBad[' + i + ']'); return; }
      if (TREATMENTS.indexOf(v.treatment) < 0) { errors.push('visitBad[' + i + ']'); return; }
      if (typeof v.costPaisa !== 'number' || v.costPaisa < 0 || v.costPaisa > MAX_COST_TAKA * 100 || Math.floor(v.costPaisa) !== v.costPaisa) { errors.push('visitBad[' + i + ']'); return; }
      if (v.notes !== undefined && (typeof v.notes !== 'string' || v.notes.length > MAX_NOTES_LEN)) { errors.push('visitBad[' + i + ']'); return; }
    });
    return errors;
  }

  function newId() {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
    return 'id-' + Date.now().toString(36) + '-' + Math.floor(Math.random() * 1e9).toString(36);
  }

  var api = {
    APP_ID: APP_ID, DATA_VERSION: DATA_VERSION, STATUSES: STATUSES, TREATMENTS: TREATMENTS,
    TEETH_UPPER: TEETH_UPPER, TEETH_LOWER: TEETH_LOWER, ALL_TEETH: ALL_TEETH,
    MAX_COST_TAKA: MAX_COST_TAKA, MAX_CLINIC_LEN: MAX_CLINIC_LEN, MAX_NOTES_LEN: MAX_NOTES_LEN,
    emptyState: emptyState, pad2: pad2, dateToStr: dateToStr, parseDateParts: parseDateParts,
    isValidDateStr: isValidDateStr, todayStr: todayStr, isFutureDate: isFutureDate,
    addDays: addDays, addMonths: addMonths, daysBetween: daysBetween,
    parseTakaToPaisa: parseTakaToPaisa, formatPaisa: formatPaisa, formatInt: formatInt,
    toBengaliDigits: toBengaliDigits,
    toothQuadrant: toothQuadrant, toothType: toothType, nextStatus: nextStatus,
    teethSummary: teethSummary, brushDayComplete: brushDayComplete, brushSessions: brushSessions,
    computeStreak: computeStreak, weeklyBrush: weeklyBrush, validateBrush: validateBrush,
    validateVisit: validateVisit, totalSpend: totalSpend, lastVisitDate: lastVisitDate,
    nextCheckup: nextCheckup, daysUntil: daysUntil, validateImport: validateImport, newId: newId
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.DentalLogic = api;
})(typeof window !== 'undefined' ? window : globalThis);

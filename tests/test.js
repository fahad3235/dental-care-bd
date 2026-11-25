// Dental Care BD - node unit tests. Run: node tests/test.js
// Exits 0 only if every check passes.
const L = require('../js/logic.js');
const I18N = require('../js/i18n.js');

let pass = 0, fail = 0;
function check(name, cond, extra) {
  if (cond) { pass++; console.log('  PASS ' + name); }
  else { fail++; console.log('  FAIL ' + name + (extra !== undefined ? ' :: ' + extra : '')); }
}
const NOW = new Date(2026, 10, 25, 12, 0, 0); // 2026-11-25 local
const TODAY = '2026-11-25';

// ---- i18n parity ----
check('i18n: EN and BN have identical keys',
  JSON.stringify(Object.keys(I18N.en).sort()) === JSON.stringify(Object.keys(I18N.bn).sort()));
check('i18n: 117 keys', Object.keys(I18N.en).length === 117, String(Object.keys(I18N.en).length));
check('i18n: BN title is Bengali', /[\u0980-\u09FF]/.test(I18N.bn.appTitle));
check('i18n: EN lang button is Bengali', I18N.en.langBtn === 'বাংলা');

// ---- dates ----
check('parseDateParts valid', JSON.stringify(L.parseDateParts('2026-02-28')) === JSON.stringify({ y: 2026, m: 2, d: 28 }));
check('parseDateParts rejects 2026-02-30', L.parseDateParts('2026-02-30') === null);
check('parseDateParts rejects garbage', L.parseDateParts('tomorrow') === null);
check('isFutureDate: tomorrow is future', L.isFutureDate('2026-11-26', NOW) === true);
check('isFutureDate: today is not future', L.isFutureDate('2026-11-25', NOW) === false);
check('addDays crosses month', L.addDays('2026-11-25', 6) === '2026-12-01');
check('addDays negative', L.addDays('2026-11-25', -1) === '2026-11-24');
check('addMonths 6 from May 31 -> Nov 30', L.addMonths('2026-05-31', 6) === '2026-11-30');
check('addMonths clamps Feb 29 -> Feb 28', L.addMonths('2028-08-29', 6) === '2029-02-28');
check('daysBetween 3 days', L.daysBetween('2026-11-22', '2026-11-25') === 3);
check('daysBetween negative', L.daysBetween('2026-11-25', '2026-11-22') === -3);

// ---- money ----
check('parseTaka 1500 -> 150000 paisa', L.parseTakaToPaisa('1500') === 150000);
check('parseTaka 1500.50 -> 150050', L.parseTakaToPaisa('1500.50') === 150050);
check('parseTaka strips commas', L.parseTakaToPaisa('1,25,000') === 12500000);
check('parseTaka rejects letters', L.parseTakaToPaisa('12a') === null);
check('parseTaka rejects 3 decimals', L.parseTakaToPaisa('1.234') === null);
check('formatPaisa 12500000 -> 1,25,000.00', L.formatPaisa(12500000) === '1,25,000.00');
check('formatPaisa 150050 -> 1,500.50', L.formatPaisa(150050) === '1,500.50');
check('formatPaisa 0 -> 0.00', L.formatPaisa(0) === '0.00');
check('formatInt 125000 -> 1,25,000', L.formatInt(125000) === '1,25,000');
check('toBengaliDigits 2026 -> ২০২৬', L.toBengaliDigits('2026') === '২০২৬');

// ---- teeth ----
check('32 teeth', L.ALL_TEETH.length === 32);
check('upper 16 / lower 16', L.TEETH_UPPER.length === 16 && L.TEETH_LOWER.length === 16);
check('no duplicate teeth', new Set(L.ALL_TEETH).size === 32);
check('toothQuadrant 11 upper-right', L.toothQuadrant(11) === 'upper-right');
check('toothQuadrant 28 upper-left', L.toothQuadrant(28) === 'upper-left');
check('toothQuadrant 31 lower-left', L.toothQuadrant(31) === 'lower-left');
check('toothQuadrant 48 lower-right', L.toothQuadrant(48) === 'lower-right');
check('toothType 11 central-incisor', L.toothType(11) === 'central-incisor');
check('toothType 13 canine', L.toothType(13) === 'canine');
check('toothType 14 premolar', L.toothType(14) === 'premolar');
check('toothType 16 molar', L.toothType(16) === 'molar');
check('nextStatus healthy -> watch', L.nextStatus('healthy') === 'watch');
check('nextStatus missing -> healthy', L.nextStatus('missing') === 'healthy');
check('nextStatus unknown -> watch', L.nextStatus('bogus') === 'watch');
check('teethSummary empty', JSON.stringify(L.teethSummary({})) === JSON.stringify({ counts: { healthy: 0, watch: 0, cavity: 0, filled: 0, crown: 0, missing: 0 }, marked: 0, attention: 0, unmarked: 32 }));
check('teethSummary counts', (function () {
  const s = L.teethSummary({ '11': 'cavity', '16': 'watch', '21': 'filled', '36': 'missing', '99': 'cavity' });
  return s.counts.cavity === 1 && s.counts.watch === 1 && s.counts.filled === 1 && s.counts.missing === 1 && s.marked === 4 && s.attention === 2 && s.unmarked === 28;
})());

// ---- brushing ----
check('brushDayComplete both', L.brushDayComplete({ morning: true, night: true }) === true);
check('brushDayComplete one only', L.brushDayComplete({ morning: true, night: false }) === false);
check('brushSessions 1', L.brushSessions({ morning: true, night: false }) === 1);
check('streak 3 consecutive complete', L.computeStreak([
  { date: '2026-11-23', morning: true, night: true },
  { date: '2026-11-24', morning: true, night: true },
  { date: '2026-11-25', morning: true, night: true }], TODAY).current === 3);
check('streak gap breaks current', L.computeStreak([
  { date: '2026-11-23', morning: true, night: true },
  { date: '2026-11-25', morning: true, night: true }], TODAY).current === 1);
check('streak partial day does not count', L.computeStreak([
  { date: '2026-11-24', morning: true, night: true },
  { date: '2026-11-25', morning: true, night: false }], TODAY).current === 1);
check('streak alive from yesterday', L.computeStreak([
  { date: '2026-11-23', morning: true, night: true },
  { date: '2026-11-24', morning: true, night: true }], TODAY).current === 2);
check('streak longest survives gap', L.computeStreak([
  { date: '2026-11-10', morning: true, night: true },
  { date: '2026-11-11', morning: true, night: true },
  { date: '2026-11-12', morning: true, night: true },
  { date: '2026-11-25', morning: true, night: true }], TODAY).longest === 3);
check('streak empty is 0/0', JSON.stringify(L.computeStreak([], TODAY)) === JSON.stringify({ current: 0, longest: 0 }));
check('weeklyBrush 7 rows, today last', (function () {
  const w = L.weeklyBrush([{ date: '2026-11-25', morning: true, night: false }], TODAY);
  return w.length === 7 && w[6].date === TODAY && w[6].sessions === 1 && w[6].complete === false && w[0].date === '2026-11-19';
})());
check('validateBrush ok', L.validateBrush({ date: TODAY, morning: true, night: true, floss: false }, [], NOW).length === 0);
check('validateBrush future rejected', L.validateBrush({ date: '2026-11-26', morning: true, night: false }, [], NOW).includes('futureDate'));
check('validateBrush bad date rejected', L.validateBrush({ date: '2026-02-30', morning: true, night: false }, [], NOW).includes('badDate'));
check('validateBrush no session rejected', L.validateBrush({ date: TODAY, morning: false, night: false }, [], NOW).includes('noSession'));
check('validateBrush duplicate rejected', L.validateBrush({ date: TODAY, morning: true, night: false }, [{ date: TODAY, morning: true, night: true }], NOW).includes('duplicateDate'));

// ---- visits ----
function validVisit(over) {
  return Object.assign({ date: '2026-11-20', clinic: 'Dhaka Dental Care', treatment: 'checkup', cost: '1500', notes: '' }, over || {});
}
check('validateVisit ok', L.validateVisit(validVisit(), NOW).length === 0);
check('validateVisit future rejected', L.validateVisit(validVisit({ date: '2026-11-26' }), NOW).includes('futureDate'));
check('validateVisit empty clinic', L.validateVisit(validVisit({ clinic: '  ' }), NOW).includes('clinicRequired'));
check('validateVisit clinic too long', L.validateVisit(validVisit({ clinic: 'x'.repeat(61) }), NOW).includes('clinicTooLong'));
check('validateVisit bad treatment', L.validateVisit(validVisit({ treatment: 'surgery' }), NOW).includes('badTreatment'));
check('validateVisit bad cost', L.validateVisit(validVisit({ cost: 'abc' }), NOW).includes('badCost'));
check('validateVisit cost over max', L.validateVisit(validVisit({ cost: '1000001' }), NOW).includes('costRange'));
check('validateVisit notes too long', L.validateVisit(validVisit({ notes: 'x'.repeat(301) }), NOW).includes('notesTooLong'));
check('totalSpend sums paisa', L.totalSpend([{ costPaisa: 150000 }, { costPaisa: 250050 }]) === 400050);
check('lastVisitDate picks latest', L.lastVisitDate([{ date: '2026-05-10' }, { date: '2026-11-20' }, { date: '2026-01-01' }]) === '2026-11-20');
check('lastVisitDate empty null', L.lastVisitDate([]) === null);
check('nextCheckup +6 months', L.nextCheckup([{ date: '2026-05-20' }]) === '2026-11-20');
check('nextCheckup empty null', L.nextCheckup([]) === null);
check('daysUntil future', L.daysUntil('2026-11-30', TODAY) === 5);
check('daysUntil past', L.daysUntil('2026-11-20', TODAY) === -5);

// ---- import validation ----
function validState() {
  return { app: 'dental-care-bd', version: 1,
    brush: [{ date: '2026-11-25', morning: true, night: true, floss: true }],
    teeth: { '11': 'cavity', '16': 'filled' },
    visits: [{ id: 'v1', date: '2026-11-20', clinic: 'Dhaka Dental Care', treatment: 'checkup', costPaisa: 150000, notes: '' }] };
}
check('validateImport valid state', L.validateImport(validState()).length === 0);
check('validateImport wrong app', L.validateImport(Object.assign(validState(), { app: 'other-app' })).includes('wrongApp'));
check('validateImport wrong version', L.validateImport(Object.assign(validState(), { version: 2 })).includes('wrongVersion'));
check('validateImport not object', L.validateImport('nope').includes('notObject'));
check('validateImport dup brush date', L.validateImport(Object.assign(validState(), { brush: [
  { date: '2026-11-25', morning: true, night: true },
  { date: '2026-11-25', morning: false, night: true } ] })).some(function (e) { return e.indexOf('brushDup') === 0; }));
check('validateImport bad tooth key', L.validateImport(Object.assign(validState(), { teeth: { '99': 'cavity' } })).some(function (e) { return e.indexOf('teethBad') === 0; }));
check('validateImport bad tooth status', L.validateImport(Object.assign(validState(), { teeth: { '11': 'rotten' } })).some(function (e) { return e.indexOf('teethBad') === 0; }));
check('validateImport dup visit id', L.validateImport(Object.assign(validState(), { visits: [
  { id: 'v1', date: '2026-11-20', clinic: 'A', treatment: 'checkup', costPaisa: 100 },
  { id: 'v1', date: '2026-11-21', clinic: 'B', treatment: 'filling', costPaisa: 200 } ] })).some(function (e) { return e.indexOf('visitDup') === 0; }));
check('validateImport negative cost', L.validateImport(Object.assign(validState(), { visits: [
  { id: 'v1', date: '2026-11-20', clinic: 'A', treatment: 'checkup', costPaisa: -5 } ] })).some(function (e) { return e.indexOf('visitBad') === 0; }));
check('validateImport empty state valid', L.validateImport(L.emptyState()).length === 0);

console.log('\n' + pass + '/' + (pass + fail) + ' unit checks passed');
if (fail) { console.log(fail + ' FAILED'); process.exit(1); }

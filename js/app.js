// Dental Care BD - app wiring (DOM). Pure logic lives in js/logic.js.
(function () {
  'use strict';
  var L = window.DentalLogic;
  var I18N = window.I18N;
  var STORE_KEY = 'dentalCareBd.v1';
  var LANG_KEY = 'dentalCareBd.lang';
  var TAKA = '\u09f3';

  var params = new URLSearchParams(location.search);
  var asof = params.get('asof');
  var TODAY = (asof && L.isValidDateStr(asof)) ? asof : L.todayStr(new Date());

  var lang = 'en';
  try { lang = localStorage.getItem(LANG_KEY) || 'en'; } catch (e) { lang = 'en'; }
  if (lang !== 'bn') lang = 'en';

  var state = load();

  function load() {
    try {
      var raw = localStorage.getItem(STORE_KEY);
      if (!raw) return L.emptyState();
      var data = JSON.parse(raw);
      if (L.validateImport(data).length) return L.emptyState();
      return data;
    } catch (e) { return L.emptyState(); }
  }
  function save() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); } catch (e) { /* storage full/blocked */ }
  }
  function t(key, vars) {
    var s = (I18N[lang] && I18N[lang][key]) || I18N.en[key] || key;
    if (vars) Object.keys(vars).forEach(function (k) { s = s.split('{' + k + '}').join(String(vars[k])); });
    return s;
  }
  function fmtNum(n) {
    var s = L.formatInt(n);
    return lang === 'bn' ? L.toBengaliDigits(s) : s;
  }
  function fmtMoney(paisa) {
    var s = L.formatPaisa(paisa);
    return TAKA + ' ' + (lang === 'bn' ? L.toBengaliDigits(s) : s);
  }
  function fmtDate(s) { return lang === 'bn' ? L.toBengaliDigits(s) : s; }
  function $(id) { return document.getElementById(id); }
  function setText(id, txt) { var el = $(id); if (el) el.textContent = txt; }

  var toastTimer = null;
  function toast(msg) {
    var el = $('toast');
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { el.classList.remove('show'); }, 2500);
  }

  // ---------- language ----------
  function applyLang() {
    document.documentElement.lang = lang === 'bn' ? 'bn' : 'en';
    setText('appTitle', t('appTitle'));
    setText('appTagline', t('appTagline'));
    setText('langBtn', t('langBtn'));
    setText('tabBtn-dashboard', t('tabDashboard'));
    setText('tabBtn-brush', t('tabBrush'));
    setText('tabBtn-teeth', t('tabTeeth'));
    setText('tabBtn-visits', t('tabVisits'));
    setText('tabBtn-data', t('tabData'));
    setText('dashTitle', t('dashTitle'));
    setText('lblStreakCurrent', t('streakCurrent'));
    setText('lblStreakLongest', t('streakLongest'));
    setText('lblStreakDays1', t('streakDays'));
    setText('lblStreakDays2', t('streakDays'));
    setText('lblAttention', t('teethAttention'));
    setText('lblTotalSpend', t('totalSpend'));
    setText('lblNextCheckup', t('nextCheckup'));
    setText('lblTodayBrush', t('todayBrush'));
    setText('lblMorning', t('morning'));
    setText('lblNight', t('night'));
    setText('lblFloss', t('floss'));
    setText('todaySave', t('markDone'));
    setText('streakHint', t('streakHint'));
    setText('lblWeekChart', t('weekChart'));
    setText('weekLegend', t('weekLegend'));
    setText('lblRecentVisits', t('recentVisits'));
    setText('brushTitle', t('brushTitle'));
    setText('brushHint', t('brushHint'));
    setText('lblLogDate', t('logDate'));
    setText('lblBrushMorning', t('morning'));
    setText('lblBrushNight', t('night'));
    setText('lblBrushFloss', t('floss'));
    setText('brushSubmit', t('addLog'));
    setText('historyTitle', t('historyTitle'));
    setText('brushEmpty', t('noBrush'));
    setText('teethTitle', t('teethTitle'));
    setText('teethHint', t('teethHint'));
    setText('lblUpperJaw', t('upperJaw'));
    setText('lblLowerJaw', t('lowerJaw'));
    setText('tapHint', t('tapHint'));
    setText('visitsTitle', t('visitsTitle'));
    setText('lblVisitDate', t('visitDate'));
    setText('lblClinic', t('clinic'));
    setText('lblTreatment', t('treatment'));
    setText('lblCost', t('cost'));
    setText('lblNotes', t('notes'));
    setText('visitSubmit', t('addVisit'));
    setText('lblTotalSpend2', t('totalSpendLabel'));
    setText('lblLastVisit', t('lastVisit'));
    setText('visitsListTitle', t('visitsList'));
    setText('visitsEmpty', t('noVisitsYet'));
    setText('dataTitle', t('dataTitle'));
    setText('exportBtn', t('exportBtn'));
    setText('importBtnLabel', t('importBtn'));
    setText('importHint', t('importHint'));
    setText('eraseTitle', t('eraseTitle'));
    setText('eraseHint', t('eraseHint'));
    setText('eraseBtn', t('eraseBtn'));
    setText('footerNote', t('footerNote'));
    $('visitClinic').placeholder = t('clinicPh');
    $('visitNotes').placeholder = t('notesPh');
    $('eraseInput').placeholder = t('erasePlaceholder');
    buildTreatmentOptions();
    buildLegend();
  }

  var TREATMENT_KEY = {
    'checkup': 'treatment_checkup', 'cleaning': 'treatment_cleaning', 'filling': 'treatment_filling',
    'extraction': 'treatment_extraction', 'root-canal': 'treatment_rootCanal', 'braces': 'treatment_braces',
    'crown': 'treatment_crown', 'whitening': 'treatment_whitening', 'other': 'treatment_other'
  };
  function buildTreatmentOptions() {
    var sel = $('visitTreatment');
    var cur = sel.value;
    sel.innerHTML = '';
    L.TREATMENTS.forEach(function (tr) {
      var opt = document.createElement('option');
      opt.value = tr;
      opt.textContent = t(TREATMENT_KEY[tr]);
      sel.appendChild(opt);
    });
    if (cur) sel.value = cur;
  }
  function buildLegend() {
    var el = $('legend');
    el.innerHTML = '';
    L.STATUSES.forEach(function (s) {
      var span = document.createElement('span');
      span.className = 'pill status-' + s;
      span.textContent = t('status_' + s);
      el.appendChild(span);
    });
  }

  // ---------- tabs ----------
  document.querySelectorAll('.tab').forEach(function (btn) {
    btn.addEventListener('click', function () {
      document.querySelectorAll('.tab').forEach(function (b) { b.classList.remove('active'); });
      btn.classList.add('active');
      document.querySelectorAll('.panel').forEach(function (p) { p.classList.add('hidden'); });
      $('tab-' + btn.dataset.tab).classList.remove('hidden');
    });
  });
  $('langBtn').addEventListener('click', function () {
    lang = lang === 'en' ? 'bn' : 'en';
    try { localStorage.setItem(LANG_KEY, lang); } catch (e) { /* ignore */ }
    applyLang();
    renderAll();
  });

  // ---------- dashboard ----------
  function renderDashboard() {
    var streak = L.computeStreak(state.brush, TODAY);
    setText('streakCurrent', fmtNum(streak.current));
    setText('streakLongest', fmtNum(streak.longest));
    var summary = L.teethSummary(state.teeth);
    setText('attentionCount', fmtNum(summary.attention));
    setText('lblAttentionSub', t('markedCount', { n: fmtNum(summary.marked) }));
    setText('totalSpend', fmtMoney(L.totalSpend(state.visits)));
    setText('lblSpendSub', t('totalSpendLabel'));
    var next = L.nextCheckup(state.visits);
    if (!next) {
      setText('nextCheckup', '-');
      setText('nextCheckupSub', t('noVisitYet'));
    } else {
      setText('nextCheckup', fmtDate(next));
      var d = L.daysUntil(next, TODAY);
      setText('nextCheckupSub', d > 0 ? t('checkupIn', { n: fmtNum(d) }) : d < 0 ? t('checkupOverdue', { n: fmtNum(-d) }) : t('checkupToday'));
    }
    // today quick toggles
    var todayEntry = null;
    state.brush.forEach(function (e) { if (e.date === TODAY) todayEntry = e; });
    $('todayMorning').checked = !!(todayEntry && todayEntry.morning);
    $('todayNight').checked = !!(todayEntry && todayEntry.night);
    $('todayFloss').checked = !!(todayEntry && todayEntry.floss);
    setText('todayStatus', todayEntry
      ? (L.brushDayComplete(todayEntry) ? t('completeDay') : t('sessionsLabel', { n: fmtNum(L.brushSessions(todayEntry)) }))
      : '');
    // week chart
    var week = L.weeklyBrush(state.brush, TODAY);
    var chart = $('weekChart');
    chart.innerHTML = '';
    week.forEach(function (day) {
      var col = document.createElement('div');
      col.className = 'bar-col';
      var bar = document.createElement('div');
      bar.className = 'bar' + (day.complete ? '' : day.sessions === 1 ? ' partial' : ' zero');
      bar.style.height = (day.sessions / 2 * 100) + '%';
      bar.title = day.date + ': ' + day.sessions + '/2';
      var lab = document.createElement('div');
      lab.className = 'bar-label';
      lab.textContent = fmtNum(parseInt(day.date.slice(8, 10), 10));
      col.appendChild(bar);
      col.appendChild(lab);
      chart.appendChild(col);
    });
    // recent visits
    var ul = $('recentVisits');
    ul.innerHTML = '';
    var sorted = state.visits.slice().sort(function (a, b) { return b.date < a.date ? -1 : 1; }).slice(0, 3);
    if (!sorted.length) {
      var li = document.createElement('li');
      li.textContent = t('noVisits');
      ul.appendChild(li);
    } else {
      sorted.forEach(function (v) {
        ul.appendChild(visitRow(v, false));
      });
    }
  }

  function visitRow(v, withDelete) {
    var li = document.createElement('li');
    var left = document.createElement('div');
    var title = document.createElement('div');
    title.textContent = fmtDate(v.date) + ' \u00b7 ' + t(TREATMENT_KEY[v.treatment]) + ' \u00b7 ' + fmtMoney(v.costPaisa);
    var meta = document.createElement('div');
    meta.className = 'meta';
    meta.textContent = v.clinic + (v.notes ? ' \u2014 ' + v.notes : '');
    left.appendChild(title);
    left.appendChild(meta);
    li.appendChild(left);
    if (withDelete) {
      var del = document.createElement('button');
      del.className = 'btn btn-secondary';
      del.type = 'button';
      del.textContent = t('deleteBtn');
      del.addEventListener('click', function () {
        if (!confirm(t('deleteConfirm'))) return;
        state.visits = state.visits.filter(function (x) { return x.id !== v.id; });
        save();
        renderAll();
        toast(t('deletedMsg'));
      });
      li.appendChild(del);
    }
    return li;
  }

  // ---------- brush ----------
  function renderBrush() {
    $('brushDate').value = TODAY;
    var ul = $('brushHistory');
    ul.innerHTML = '';
    var sorted = state.brush.slice().sort(function (a, b) { return b.date < a.date ? -1 : 1; }).slice(0, 30);
    $('brushEmpty').style.display = sorted.length ? 'none' : '';
    sorted.forEach(function (e) {
      var li = document.createElement('li');
      var left = document.createElement('div');
      var title = document.createElement('div');
      title.textContent = fmtDate(e.date) + ' \u00b7 ' + t('sessionsLabel', { n: fmtNum(L.brushSessions(e)) }) +
        (e.floss ? ' \u00b7 ' + t('floss') : '');
      var meta = document.createElement('div');
      meta.className = 'meta';
      meta.textContent = (e.morning ? t('morning') : '') + (e.morning && e.night ? ' + ' : '') + (e.night ? t('night') : '');
      if (L.brushDayComplete(e)) meta.textContent += ' \u00b7 ' + t('completeDay');
      left.appendChild(title);
      left.appendChild(meta);
      li.appendChild(left);
      var del = document.createElement('button');
      del.className = 'btn btn-secondary';
      del.type = 'button';
      del.textContent = t('deleteBtn');
      del.addEventListener('click', function () {
        if (!confirm(t('deleteConfirm'))) return;
        state.brush = state.brush.filter(function (x) { return x.date !== e.date; });
        save();
        renderAll();
        toast(t('deletedMsg'));
      });
      li.appendChild(del);
      ul.appendChild(li);
    });
  }

  $('brushForm').addEventListener('submit', function (ev) {
    ev.preventDefault();
    var entry = {
      date: $('brushDate').value,
      morning: $('brushMorning').checked,
      night: $('brushNight').checked,
      floss: $('brushFloss').checked
    };
    var errs = L.validateBrush(entry, state.brush, new Date(TODAY + 'T12:00:00'));
    var errEl = $('brushError');
    if (errs.length) {
      errEl.textContent = errs.map(function (e) { return t('err_' + e); }).join(' ');
      return;
    }
    errEl.textContent = '';
    state.brush.push(entry);
    save();
    renderAll();
    toast(t('logAdded'));
  });

  $('todaySave').addEventListener('click', function () {
    var entry = {
      date: TODAY,
      morning: $('todayMorning').checked,
      night: $('todayNight').checked,
      floss: $('todayFloss').checked
    };
    var existing = state.brush.filter(function (e) { return e.date !== TODAY; });
    var errs = L.validateBrush(entry, existing, new Date(TODAY + 'T12:00:00'));
    if (errs.length) {
      setText('todayStatus', errs.map(function (e) { return t('err_' + e); }).join(' '));
      return;
    }
    state.brush = existing;
    state.brush.push(entry);
    save();
    renderAll();
    toast(t('savedMsg'));
  });

  // ---------- teeth ----------
  function buildJaw(el, teeth) {
    el.innerHTML = '';
    teeth.forEach(function (n) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'tooth';
      btn.dataset.tooth = String(n);
      btn.textContent = String(n);
      btn.addEventListener('click', function () {
        var cur = state.teeth[String(n)] || 'healthy';
        var next = L.nextStatus(cur);
        if (next === 'healthy') delete state.teeth[String(n)];
        else state.teeth[String(n)] = next;
        save();
        renderTeeth();
        renderDashboard();
        var detail = fmtNum(n) + ' \u00b7 ' + t('quad_' + ({ 'upper-right': 'upperRight', 'upper-left': 'upperLeft', 'lower-left': 'lowerLeft', 'lower-right': 'lowerRight' })[L.toothQuadrant(n)]) +
          ' \u00b7 ' + t('type_' + ({ 'central-incisor': 'central', 'lateral-incisor': 'lateral', 'canine': 'canine', 'premolar': 'premolar', 'molar': 'molar' })[L.toothType(n)]) +
          ' \u00b7 ' + t('status_' + (state.teeth[String(n)] || 'healthy'));
        setText('toothDetail', detail);
        toast(t('toothUpdated'));
      });
      el.appendChild(btn);
    });
  }

  function renderTeeth() {
    buildJaw($('jawUpper'), L.TEETH_UPPER);
    buildJaw($('jawLower'), L.TEETH_LOWER);
    document.querySelectorAll('.tooth').forEach(function (btn) {
      var s = state.teeth[btn.dataset.tooth] || 'healthy';
      btn.classList.add('status-' + s);
      btn.title = btn.dataset.tooth + ': ' + t('status_' + s);
    });
    var summary = L.teethSummary(state.teeth);
    setText('teethSummary', t('markedCount', { n: fmtNum(summary.marked) }) + ' \u00b7 ' + t('attentionCount', { n: fmtNum(summary.attention) }));
  }

  // ---------- visits ----------
  function renderVisits() {
    $('visitDate').value = TODAY;
    setText('totalSpend2', fmtMoney(L.totalSpend(state.visits)));
    var last = L.lastVisitDate(state.visits);
    setText('lastVisit', last ? fmtDate(last) : '-');
    var ul = $('visitList');
    ul.innerHTML = '';
    var sorted = state.visits.slice().sort(function (a, b) { return b.date < a.date ? -1 : 1; });
    $('visitsEmpty').style.display = sorted.length ? 'none' : '';
    sorted.forEach(function (v) { ul.appendChild(visitRow(v, true)); });
  }

  $('visitForm').addEventListener('submit', function (ev) {
    ev.preventDefault();
    var v = {
      date: $('visitDate').value,
      clinic: $('visitClinic').value.trim(),
      treatment: $('visitTreatment').value,
      cost: $('visitCost').value.trim(),
      notes: $('visitNotes').value.trim()
    };
    var errs = L.validateVisit(v, new Date(TODAY + 'T12:00:00'));
    var errEl = $('visitError');
    if (errs.length) {
      errEl.textContent = errs.map(function (e) { return t('err_' + e); }).join(' ');
      return;
    }
    errEl.textContent = '';
    state.visits.push({
      id: L.newId(), date: v.date, clinic: v.clinic, treatment: v.treatment,
      costPaisa: L.parseTakaToPaisa(v.cost), notes: v.notes
    });
    save();
    $('visitClinic').value = '';
    $('visitCost').value = '';
    $('visitNotes').value = '';
    renderAll();
    toast(t('visitAdded'));
  });

  // ---------- data ----------
  $('exportBtn').addEventListener('click', function () {
    var blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'dental-care-bd-export.json';
    a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
    setText('dataMsg', t('savedMsg'));
  });

  $('importFile').addEventListener('change', function () {
    var file = this.files && this.files[0];
    if (!file) return;
    var reader = new FileReader();
    reader.onload = function () {
      var ok = false;
      try {
        var data = JSON.parse(reader.result);
        if (L.validateImport(data).length === 0) { state = data; save(); renderAll(); ok = true; }
      } catch (e) { ok = false; }
      setText('dataMsg', ok ? t('importOk') : t('importBad'));
      if (ok) toast(t('importOk'));
    };
    reader.readAsText(file);
    this.value = '';
  });

  $('eraseBtn').addEventListener('click', function () {
    if ($('eraseInput').value.trim() !== 'DELETE') {
      setText('dataMsg', t('eraseHint'));
      return;
    }
    state = L.emptyState();
    save();
    $('eraseInput').value = '';
    renderAll();
    setText('dataMsg', t('eraseDone'));
    toast(t('eraseDone'));
  });

  function renderAll() {
    renderDashboard();
    renderBrush();
    renderTeeth();
    renderVisits();
  }

  applyLang();
  renderAll();
})();

// Headless-Chrome smoke test for Dental Care BD.
// Drives the Playwright-cached headless_shell over CDP with Node's built-in
// WebSocket (no npm deps). Run from the project root:
//   node tests/smoke.mjs [1280|390]
// Exits 0 only if every check passes.
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CHROME = path.join(process.env.HOME, '.cache/ms-playwright/chromium_headless_shell-1187/chrome-linux/headless_shell');
const PORT = 9233;
const WIDTH = parseInt(process.argv[2] || '1280', 10);
const HEIGHT = WIDTH <= 480 ? 844 : 800;
const URL = 'file://' + path.join(ROOT, 'index.html') + '?asof=2026-11-25';

let pass = 0, fail = 0;
function check(name, cond, extra) {
  if (cond) { pass++; console.log('  PASS ' + name); }
  else { fail++; console.log('  FAIL ' + name + (extra ? ' :: ' + extra : '')); }
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function waitFor(fn, timeout = 15000, label = 'condition') {
  const t0 = Date.now();
  while (Date.now() - t0 < timeout) {
    try { if (await fn()) return true; } catch { /* retry */ }
    await sleep(150);
  }
  throw new Error('timeout waiting for ' + label);
}

const chrome = spawn(CHROME, [
  '--headless=new', '--no-sandbox', '--disable-gpu',
  '--remote-debugging-port=' + PORT,
  '--window-size=' + WIDTH + ',' + HEIGHT,
  'about:blank',
], { stdio: 'ignore' });

let ws;
try {
  let targets = null;
  for (let i = 0; i < 40; i++) {
    try {
      const res = await fetch(`http://127.0.0.1:${PORT}/json/list`);
      targets = await res.json();
      break;
    } catch { await sleep(250); }
  }
  if (!targets) throw new Error('DevTools endpoint never came up');

  const pageTarget = targets.find((t) => t.type === 'page');
  ws = new WebSocket(pageTarget.webSocketDebuggerUrl);
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });

  let id = 0;
  const pending = new Map();
  const consoleErrors = [];
  const failedReqs = [];
  ws.onmessage = (ev) => {
    const msg = JSON.parse(ev.data);
    if (msg.id && pending.has(msg.id)) { pending.get(msg.id)(msg); pending.delete(msg.id); }
    if (msg.method === 'Runtime.exceptionThrown') {
      consoleErrors.push(msg.params.exceptionDetails.text + ' ' + (msg.params.exceptionDetails.exception?.description || ''));
    }
    if (msg.method === 'Runtime.consoleAPICalled' && msg.params.type === 'error') {
      consoleErrors.push(msg.params.args.map((a) => a.value || a.description || '').join(' '));
    }
    if (msg.method === 'Network.loadingFailed') {
      failedReqs.push(msg.params.errorText);
    }
  };
  const send = (method, params = {}) => new Promise((resolve) => {
    const mid = ++id;
    pending.set(mid, resolve);
    ws.send(JSON.stringify({ id: mid, method, params }));
  });
  const evalJs = async (expr) => {
    const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true });
    if (r.result?.exceptionDetails) throw new Error('page JS error: ' + JSON.stringify(r.result.exceptionDetails));
    return r.result?.result?.value;
  };
  const setVal = async (elId, value) => {
    await evalJs(`document.getElementById("${elId}").value = ${JSON.stringify(value)}`);
    await evalJs(`document.getElementById("${elId}").dispatchEvent(new Event("input", { bubbles: true }))`);
  };
  const setCheck = async (elId, on) => {
    await evalJs(`document.getElementById("${elId}").checked = ${on}`);
  };
  const clickTab = async (name) => {
    await evalJs(`[...document.querySelectorAll(".tab")].find(b => b.dataset.tab === "${name}").click()`);
    await sleep(250);
  };
  const brushCount = () => evalJs('(JSON.parse(localStorage.getItem("dentalCareBd.v1") || "{}").brush || []).length');
  const visitCount = () => evalJs('(JSON.parse(localStorage.getItem("dentalCareBd.v1") || "{}").visits || []).length');

  await send('Runtime.enable');
  await send('Page.enable');
  await send('Network.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: WIDTH, height: HEIGHT, deviceScaleFactor: 1, mobile: WIDTH <= 480 });
  await send('Page.navigate', { url: URL });
  await waitFor(async () => (await evalJs('document.readyState')) === 'complete', 15000, 'page load');
  await sleep(500);
  await evalJs('localStorage.clear()');
  await send('Page.navigate', { url: URL });
  await waitFor(async () => (await evalJs('document.readyState')) === 'complete', 15000, 'reload');
  await sleep(500);

  console.log(`smoke @ ${WIDTH}x${HEIGHT}: ${URL}`);
  check('page title', (await evalJs('document.title')).includes('Dental Care BD'));
  check('app heading rendered', (await evalJs('document.querySelector("h1").textContent')) === 'Dental Care BD');
  check('5 tabs rendered', (await evalJs('document.querySelectorAll(".tab").length')) === 5);
  check('dashboard streak 0', (await evalJs('document.getElementById("streakCurrent").textContent')) === '0');
  check('dashboard attention 0', (await evalJs('document.getElementById("attentionCount").textContent')) === '0');
  check('dashboard total 0.00', (await evalJs('document.getElementById("totalSpend").textContent')).includes('0.00'));
  check('dashboard next checkup empty', (await evalJs('document.getElementById("nextCheckup").textContent')) === '-');
  check('week chart 7 bars', (await evalJs('document.querySelectorAll("#weekChart .bar").length')) === 7);
  check('no console errors on load', consoleErrors.length === 0, consoleErrors.join(' | '));
  check('no failed requests on load', failedReqs.length === 0, failedReqs.join(' | '));

  // ---- Today quick log: morning + night -> streak 1 ----
  await setCheck('todayMorning', true);
  await setCheck('todayNight', true);
  await evalJs('document.getElementById("todaySave").click()');
  await sleep(400);
  check('today log saved', (await brushCount()) === 1);
  check('streak now 1', (await evalJs('document.getElementById("streakCurrent").textContent')) === '1');
  check('today status complete day', (await evalJs('document.getElementById("todayStatus").textContent')).includes('Complete day'));

  // ---- Brush tab: duplicate date rejected, future rejected ----
  await clickTab('brush');
  await setVal('brushDate', '2026-11-25');
  await setCheck('brushMorning', true);
  await evalJs('document.querySelector("#brushForm button[type=submit]").click()');
  await sleep(300);
  check('duplicate date shows error', (await evalJs('document.getElementById("brushError").textContent')).length > 0);
  check('duplicate adds nothing', (await brushCount()) === 1);
  await setVal('brushDate', '2026-11-26');
  await setCheck('brushMorning', true);
  await setCheck('brushNight', true);
  await evalJs('document.querySelector("#brushForm button[type=submit]").click()');
  await sleep(300);
  check('future date shows error', (await evalJs('document.getElementById("brushError").textContent')).includes('future'));
  check('future adds nothing', (await brushCount()) === 1);

  // ---- Brush tab: add yesterday full day -> streak 2 ----
  await setVal('brushDate', '2026-11-24');
  await setCheck('brushMorning', true);
  await setCheck('brushNight', true);
  await setCheck('brushFloss', true);
  await evalJs('document.querySelector("#brushForm button[type=submit]").click()');
  await sleep(400);
  check('second log saved', (await brushCount()) === 2);
  check('history shows 2 rows', (await evalJs('document.querySelectorAll("#brushHistory li").length')) === 2);
  await clickTab('dashboard');
  check('streak now 2', (await evalJs('document.getElementById("streakCurrent").textContent')) === '2');

  // ---- Reload persistence ----
  await send('Page.navigate', { url: URL });
  await waitFor(async () => (await evalJs('document.readyState')) === 'complete', 15000, 'reload 2');
  await sleep(500);
  check('streak persists after reload', (await evalJs('document.getElementById("streakCurrent").textContent')) === '2');
  check('brush log persists after reload', (await brushCount()) === 2);

  // ---- Tooth chart: 32 teeth, click cycles status ----
  await clickTab('teeth');
  check('32 tooth buttons', (await evalJs('document.querySelectorAll(".tooth").length')) === 32);
  check('upper jaw 16', (await evalJs('document.querySelectorAll("#jawUpper .tooth").length')) === 16);
  check('lower jaw 16', (await evalJs('document.querySelectorAll("#jawLower .tooth").length')) === 16);
  await evalJs('document.querySelector(\'.tooth[data-tooth="11"]\').click()');
  await sleep(300);
  check('tooth 11 now watch', (await evalJs('document.querySelector(\'.tooth[data-tooth="11"]\').className')).includes('status-watch'));
  check('summary marked 1', (await evalJs('document.getElementById("teethSummary").textContent')).includes('1 of 32'));
  check('summary attention 1', (await evalJs('document.getElementById("teethSummary").textContent')).includes('1 need attention'));
  check('tooth detail shows 11 + Watch', (await evalJs('document.getElementById("toothDetail").textContent')).includes('Watch'));
  await evalJs('document.querySelector(\'.tooth[data-tooth="11"]\').click()');
  await sleep(300);
  check('tooth 11 now cavity', (await evalJs('document.querySelector(\'.tooth[data-tooth="11"]\').className')).includes('status-cavity'));
  await evalJs('document.querySelector(\'.tooth[data-tooth="36"]\').click()');
  await sleep(200);
  await evalJs('document.querySelector(\'.tooth[data-tooth="36"]\').click()');
  await sleep(200);
  await evalJs('document.querySelector(\'.tooth[data-tooth="36"]\').click()');
  await sleep(300);
  check('tooth 36 now filled', (await evalJs('document.querySelector(\'.tooth[data-tooth="36"]\').className')).includes('status-filled'));
  check('summary marked 2', (await evalJs('document.getElementById("teethSummary").textContent')).includes('2 of 32'));

  // ---- Visits: validation + add + totals + checkup ----
  await clickTab('visits');
  await evalJs('document.querySelector("#visitForm button[type=submit]").click()');
  await sleep(300);
  check('empty visit submit shows error', (await evalJs('document.getElementById("visitError").textContent')).length > 0);
  check('empty visit adds nothing', (await visitCount()) === 0);
  await setVal('visitDate', '2026-11-20');
  await setVal('visitClinic', 'Dhaka Dental Care');
  await evalJs('document.getElementById("visitTreatment").value = "checkup"');
  await setVal('visitCost', '1500');
  await setVal('visitNotes', 'routine checkup');
  await evalJs('document.querySelector("#visitForm button[type=submit]").click()');
  await sleep(400);
  check('visit 1 saved', (await visitCount()) === 1);
  check('total spend 1,500.00', (await evalJs('document.getElementById("totalSpend2").textContent')).includes('1,500.00'));
  check('last visit 2026-11-20', (await evalJs('document.getElementById("lastVisit").textContent')) === '2026-11-20');
  await clickTab('dashboard');
  check('next checkup 2027-05-20', (await evalJs('document.getElementById("nextCheckup").textContent')) === '2027-05-20');
  check('checkup countdown shown', (await evalJs('document.getElementById("nextCheckupSub").textContent')).includes('day'));

  // ---- Second visit: root canal 25000, XSS-safe clinic name ----
  await clickTab('visits');
  await setVal('visitDate', '2026-11-22');
  await setVal('visitClinic', '<script>alert(1)</script>');
  await evalJs('document.getElementById("visitTreatment").value = "root-canal"');
  await setVal('visitCost', '25000');
  await evalJs('document.querySelector("#visitForm button[type=submit]").click()');
  await sleep(400);
  check('visit 2 saved', (await visitCount()) === 2);
  check('total spend 26,500.00', (await evalJs('document.getElementById("totalSpend2").textContent')).includes('26,500.00'));
  check('XSS clinic renders as text, no new script tag', (await evalJs('document.querySelectorAll("script").length')) === 3);
  check('XSS clinic text visible inert', (await evalJs('document.getElementById("visitList").textContent')).includes('<script>alert(1)</script>'));

  // ---- Language toggle ----
  await evalJs('document.getElementById("langBtn").click()');
  await sleep(400);
  check('BN title renders', (await evalJs('document.querySelector("h1").textContent')).includes('ডেন্টাল'));
  check('BN streak shows Bengali digit ২', (await evalJs('document.getElementById("streakCurrent").textContent')) === '২');
  check('BN total spend Bengali digits', (await evalJs('document.getElementById("totalSpend2").textContent')).includes('২৬,৫০০'));
  await evalJs('document.getElementById("langBtn").click()');
  await sleep(400);
  check('back to EN title', (await evalJs('document.querySelector("h1").textContent')) === 'Dental Care BD');

  // ---- Data tab: import round-trip then erase ----
  await clickTab('data');
  const exported = await evalJs('localStorage.getItem("dentalCareBd.v1")');
  const importOk = await evalJs(`(async () => {
    const file = new File([${JSON.stringify(exported)}], "dental-care-bd-export.json", { type: "application/json" });
    const dt = new DataTransfer(); dt.items.add(file);
    const input = document.getElementById("importFile");
    input.files = dt.files;
    input.dispatchEvent(new Event("change", { bubbles: true }));
    await new Promise(r => setTimeout(r, 400));
    return document.getElementById("dataMsg").textContent;
  })()`);
  check('import round-trip accepted', importOk.includes('Import complete'), importOk);
  check('import kept 2 visits', (await visitCount()) === 2);
  const importBad = await evalJs(`(async () => {
    const file = new File(['{"app":"wrong","version":1,"brush":[],"teeth":{},"visits":[]}'], "bad.json", { type: "application/json" });
    const dt = new DataTransfer(); dt.items.add(file);
    const input = document.getElementById("importFile");
    input.files = dt.files;
    input.dispatchEvent(new Event("change", { bubbles: true }));
    await new Promise(r => setTimeout(r, 400));
    return document.getElementById("dataMsg").textContent;
  })()`);
  check('bad import rejected', importBad.includes('rejected'), importBad);
  check('bad import kept data', (await visitCount()) === 2);
  await setVal('eraseInput', 'DELETE');
  await evalJs('document.getElementById("eraseBtn").click()');
  await sleep(400);
  check('erase cleared visits', (await visitCount()) === 0);
  check('erase cleared brush', (await brushCount()) === 0);
  check('erase message shown', (await evalJs('document.getElementById("dataMsg").textContent')).includes('erased'));

  // ---- Layout + errors ----
  check('no horizontal overflow', (await evalJs('document.documentElement.scrollWidth <= window.innerWidth')) === true,
    'scrollWidth=' + (await evalJs('document.documentElement.scrollWidth')) + ' innerWidth=' + (await evalJs('window.innerWidth')));
  check('no console errors at end', consoleErrors.length === 0, consoleErrors.join(' | '));
  check('no failed requests at end', failedReqs.length === 0, failedReqs.join(' | '));

  // screenshot for eyeball check
  const shot = await send('Page.captureScreenshot', { format: 'png' });
  if (shot.result?.data) fs.writeFileSync(path.join(ROOT, 'tests', `smoke-${WIDTH}.png`), Buffer.from(shot.result.data, 'base64'));

  console.log(`\n${pass}/${pass + fail} smoke checks passed @ ${WIDTH}`);
  if (fail) { console.log(fail + ' FAILED'); process.exitCode = 1; }
} catch (err) {
  console.error('SMOKE ERROR:', err.message);
  process.exitCode = 1;
} finally {
  try { if (ws) ws.close(); } catch { /* ignore */ }
  chrome.kill();
}

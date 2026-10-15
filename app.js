/* ARTIME Stock - PWA front end. Talks to the Google Apps Script web app (no password). */
(() => {
'use strict';

const CFG = window.APP_CONFIG || {};
const APP_NAME = CFG.appName || 'ARTIME';
const TAGLINE = CFG.tagline || 'Stock Management';
const CLOCK_ITEMS = ['Clock Hands', 'PVC Ring', 'PVC Paper', 'Glass', 'Iron Ring', 'Machine', 'Iron Plate', 'Tikkla'];
// Dial = a stand-alone item (no category). It is never bought, only made: one dial uses 1 each of Clock Hands, PVC Ring, PVC Paper, Glass, Iron Ring, Machine, Iron Plate and Tikkla of its size.
// The Google Sheet ("Dial Recipe" tab) does the real deduction; this list is only used to show the parts on screen.
const isDial = (c) => /^DIL-/.test(c || '');
const isFormRoute = (n) => n === 'in' || n === 'out' || n === 'dial';
function dialParts(code) {
  const sz = String(code).slice(4); const s = (sz === '12' || sz === '18') ? '12-18' : sz;
  return ['HND-' + s, 'PVR-' + s, 'PVP-' + s, 'GLS-' + s, 'IRR-' + s, 'MCH-ALL', 'IRP-' + s, sz === '06' ? 'TIK-06' : 'TIK-08-18'];
}
const CAT_NAME = { clock: 'Clock Items', packing: 'Packaging Items' };

/* ================= helpers ================= */
const $ = (s, r = document) => r.querySelector(s);
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const num = (n) => Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 });
const cap = (s) => (s ? s[0].toUpperCase() + s.slice(1) : '');
const uniq = (a) => [...new Set(a)];
const iso = (d) => d.toLocaleDateString('en-CA');
const today = () => iso(new Date());
const ago = (n) => { const d = new Date(); d.setDate(d.getDate() - n); return iso(d); };
const parseISO = (s) => { const [y, m, d] = String(s).split('-').map(Number); return new Date(y, (m || 1) - 1, d || 1); };
const dLong = (s) => parseISO(s).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
const dShort = (s) => parseISO(s).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
const dRel = (s) => (s === today() ? 'Today' : s === ago(1) ? 'Yesterday' : dShort(s));
const sizeLabel = (s) => (!s || s === 'n/a' ? '' : String(s).replace(/\s*in$/i, ' Inch'));
const unitLabel = (u) => cap(u || 'pcs');
const isStandalone = () => (window.matchMedia && matchMedia('(display-mode: standalone)').matches) || window.navigator.standalone === true;
const newId = () => 'e' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6).padEnd(4, '0');

const store = {
  get(k, d) { try { const v = localStorage.getItem('artime.' + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem('artime.' + k, JSON.stringify(v)); } catch (e) { /* storage full or blocked */ } }
};

/* ================= icons ================= */
const P = {
  home: '<path d="M3 11.5 12 4l9 7.5"/><path d="M5.5 10v10h13V10"/><path d="M10 20v-5.5h4V20"/>',
  cube: '<path d="M21 8l-9-5-9 5v8l9 5 9-5V8z"/><path d="M3 8l9 5 9-5"/><path d="M12 13v8"/>',
  grid: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
  up: '<path d="M12 19V5"/><path d="M5 12l7-7 7 7"/>',
  down: '<path d="M12 5v14"/><path d="M19 12l-7 7-7-7"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/>',
  bell: '<path d="M6 8a6 6 0 0112 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.9 1.9 0 003.4 0"/>',
  menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
  right: '<path d="M9 6l6 6-6 6"/>',
  left: '<path d="M15 6l-6 6 6 6"/>',
  chev: '<path d="M6 9l6 6 6-6"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  minus: '<path d="M5 12h14"/>',
  cal: '<rect x="3.5" y="5" width="17" height="15.5" rx="2.5"/><path d="M3.5 10h17M8 3v4M16 3v4"/>',
  truck: '<path d="M2.5 6.5h11v10h-11z"/><path d="M13.5 9.5h4l3 3.5v3.5h-7"/><circle cx="7" cy="18" r="1.8"/><circle cx="17" cy="18" r="1.8"/>',
  file: '<path d="M14 3H6.5a1 1 0 00-1 1v16a1 1 0 001 1h11a1 1 0 001-1V8z"/><path d="M14 3v5h4.5M9 13h6M9 17h6"/>',
  pencil: '<path d="M4 20l1-4L16.5 4.5a2 2 0 013 3L8 19z"/><path d="M14.5 6.5l3 3"/>',
  gear: '<circle cx="12" cy="12" r="3"/><path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M5.3 18.7l2.1-2.1M16.6 7.4l2.1-2.1"/>',
  chart: '<path d="M5 20v-7M11 20V5M17 20v-10"/><path d="M3 20.5h18"/>',
  alert: '<circle cx="12" cy="12" r="9"/><path d="M12 7.5v5.5"/><path d="M12 16.5v.5"/>',
  warn: '<path d="M12 3.5L2.5 20h19z"/><path d="M12 10v4.5M12 17.3v.4"/>',
  layers: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><path d="M14 17.5h7M17.5 14v7"/>',
  more: '<path d="M4 8h16M4 12h16M4 16h16"/>',
  refresh: '<path d="M20 11a8 8 0 00-14.5-3.5L4 9"/><path d="M4 4v5h5"/><path d="M4 13a8 8 0 0014.5 3.5L20 15"/><path d="M20 20v-5h-5"/>',
  check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
  x: '<path d="M6 6l12 12M18 6L6 18"/>',
  download: '<path d="M12 4v11"/><path d="M7 11l5 5 5-5"/><path d="M4 20h16"/>'
};
const ic = (n, s = 22, sw = 1.9) => `<svg class="ic ${n === 'chev' || n === 'right' ? 'chev' : ''}" width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${P[n] || ''}</svg>`;

/* ---- little product illustrations (48x48) ---- */
const ART = {
  box: '<path d="M24 5l17 9-17 9-17-9z" fill="#e2b87e"/><path d="M7 14l17 9v20L7 34z" fill="#c4914f"/><path d="M41 14L24 23v20l17-9z" fill="#a97a3b"/><path d="M19 8l17 9-5 2.7-17-9z" fill="#f1dfc2" opacity=".85"/>',
  thm: '<path d="M6 17l18-8 18 8-18 8z" fill="#fff" stroke="#cdd5e1"/><path d="M6 17v6l18 8v-6z" fill="#e5e9f0"/><path d="M42 17v6l-18 8v-6z" fill="#cfd6e1"/><path d="M6 25v6l18 8v-6z" fill="#dfe4ec"/><path d="M42 25v6l-18 8v-6z" fill="#c3ccd9"/>',
  hands: '<circle cx="24" cy="24" r="17" fill="#fff" stroke="#cfd6e1" stroke-width="2"/><path d="M24 24V11" stroke="#1f2937" stroke-width="3.2" stroke-linecap="round"/><path d="M24 24l9 5" stroke="#1f2937" stroke-width="3.2" stroke-linecap="round"/><circle cx="24" cy="24" r="2.6" fill="#e03a3e"/>',
  ring: '<circle cx="24" cy="24" r="14" fill="none" stroke="#d7dde6" stroke-width="7"/><circle cx="24" cy="24" r="14" fill="none" stroke="#ffffff" stroke-width="2" stroke-dasharray="14 74" stroke-linecap="round"/>',
  ironring: '<circle cx="24" cy="24" r="14" fill="none" stroke="#6b7685" stroke-width="7"/><circle cx="24" cy="24" r="14" fill="none" stroke="#a9b2bf" stroke-width="2" stroke-dasharray="14 74" stroke-linecap="round"/>',
  paper: '<rect x="11" y="6" width="26" height="36" rx="3" fill="#fff" stroke="#cfd6e1" stroke-width="2"/><path d="M16 15h16M16 21h16M16 27h10" stroke="#b9c2cf" stroke-width="2.4" stroke-linecap="round"/>',
  glass: '<circle cx="24" cy="24" r="16" fill="#d9ecfb" stroke="#9cc7ea" stroke-width="2"/><path d="M14 19a11 11 0 016-6" stroke="#fff" stroke-width="3" stroke-linecap="round" fill="none"/>',
  plate: '<ellipse cx="24" cy="29" rx="17" ry="8" fill="#6f7a89"/><ellipse cx="24" cy="25" rx="17" ry="8" fill="#a8b1bf"/><ellipse cx="24" cy="25" rx="9" ry="3.8" fill="#c9d0da"/>',
  machine: '<g stroke="#5f6b7c" stroke-width="5" stroke-linecap="round"><path d="M24 6v6M24 36v6M6 24h6M36 24h6M11.3 11.3l4.2 4.2M32.5 32.5l4.2 4.2M11.3 36.7l4.2-4.2M32.5 15.5l4.2-4.2"/></g><circle cx="24" cy="24" r="12" fill="#6f7b8d"/><circle cx="24" cy="24" r="5" fill="#e6eaf0"/>',
  tikkla: '<circle cx="16" cy="18" r="6" fill="#e9b949"/><circle cx="32" cy="18" r="6" fill="#d9a22a"/><circle cx="24" cy="31" r="6" fill="#f0c968"/>',
  kerosene: '<rect x="11" y="14" width="26" height="28" rx="5" fill="#3b82f6"/><rect x="11" y="14" width="26" height="8" rx="4" fill="#2f6fdc"/><path d="M17 14V9a3 3 0 013-3h8a3 3 0 013 3v5" fill="none" stroke="#1e50a8" stroke-width="3"/><circle cx="24" cy="31" r="5" fill="#fff" opacity=".85"/>',
  tape: '<circle cx="24" cy="24" r="16" fill="#f0a21a"/><circle cx="24" cy="24" r="7" fill="#fff"/><circle cx="24" cy="24" r="7" fill="none" stroke="#d98d0a" stroke-width="2"/>',
  battery: '<rect x="10" y="14" width="26" height="22" rx="4" fill="#22a06b"/><rect x="36" y="21" width="4" height="8" rx="1.5" fill="#22a06b"/><path d="M22 18l-4 8h5l-2 6 8-9h-5z" fill="#fff"/>',
  color: '<path d="M24 5c7 9 12 14 12 22a12 12 0 01-24 0c0-8 5-13 12-22z" fill="#b8742f"/><path d="M18 28a6 6 0 004 6" stroke="#fff" stroke-width="3" stroke-linecap="round" fill="none" opacity=".7"/>',
  panni: '<path d="M11 10h26l3 30H8z" fill="#cfe5f7" stroke="#9cc7ea" stroke-width="2"/><path d="M11 10h26" stroke="#7fb3df" stroke-width="3"/><path d="M17 20h14" stroke="#fff" stroke-width="3" stroke-linecap="round"/>',
  leker: '<rect x="14" y="17" width="20" height="25" rx="5" fill="#d6483f"/><rect x="19" y="8" width="10" height="10" rx="2" fill="#3b4658"/><rect x="18" y="26" width="12" height="9" rx="2" fill="#fff" opacity=".85"/>'
};
function artKey(base) {
  const b = String(base).toLowerCase();
  if (b.includes('box')) return 'box';
  if (b.includes('thermacol') || b.includes('thermocol')) return 'thm';
  if (b.includes('hand')) return 'hands';
  if (b.includes('iron ring')) return 'ironring';
  if (b.includes('ring')) return 'ring';
  if (b.includes('paper')) return 'paper';
  if (b.includes('glass')) return 'glass';
  if (b.includes('plate')) return 'plate';
  if (b.includes('machine')) return 'machine';
  if (b.includes('tikkla')) return 'tikkla';
  if (b.includes('kerosene')) return 'kerosene';
  if (b.includes('tape')) return 'tape';
  if (b.includes('battery')) return 'battery';
  if (b.includes('color') || b.includes('colour')) return 'color';
  if (b.includes('panni')) return 'panni';
  if (b.includes('leker')) return 'leker';
  return 'box';
}
const art = (base, size = 56) => `<span class="art" style="width:${size}px;height:${size}px"><svg viewBox="0 0 48 48" width="${Math.round(size * 0.78)}" height="${Math.round(size * 0.78)}" aria-hidden="true">${ART[artKey(base)]}</svg></span>`;

/* ================= state ================= */
const S = {
  url: store.get('url', '') || CFG.scriptUrl || '',
  items: store.get('items', []),
  history: store.get('history', []),
  queue: store.get('queue', []),
  failed: store.get('failed', []),
  synced: store.get('synced', null),
  loading: false, syncing: false, error: '',
  filter: { q: '', cat: 'all', status: 'all' },
  homeRange: 7, repRange: 7,
  form: {},
  sheet: null,
  busy: false,
  installEvt: null
};
const saveQueue = () => { store.set('queue', S.queue); store.set('failed', S.failed); };

/* ================= data model ================= */
function parseName(name) {
  const m = /^(.*?)\s*\((Offline|Online)\)\s*$/i.exec(name || '');
  return m ? { base: m[1].trim(), variant: cap(m[2].toLowerCase()) } : { base: String(name || '').trim(), variant: null };
}

function items() {
  const pend = {};
  S.queue.forEach((e) => {
    pend[e.code] = (pend[e.code] || 0) + (e.type === 'in' ? 1 : -1) * Number(e.qty);
    if (e.type === 'out' && isDial(e.code)) dialParts(e.code).forEach((c) => { pend[c] = (pend[c] || 0) - Number(e.qty); });
  });
  return S.items.map((r) => {
    const p = parseName(r.item);
    const d = pend[r.code] || 0;
    const eff = r.stock + d;
    const cat = isDial(r.code) ? 'dial' : r.cat || (CLOCK_ITEMS.includes(p.base) ? 'clock' : 'packing');
    const st = isDial(r.code) || (r.status === '-' && d === 0) ? 'none' : eff <= 0 ? 'out' : eff <= r.min ? 'low' : 'ok';
    const sz = sizeLabel(r.size);
    return Object.assign({}, r, p, { cat, pend: d, eff, st, sz, title: r.item + (sz ? ' - ' + sz : '') });
  });
}

function moves() {
  return S.queue.map((e) => Object.assign({}, e, { pending: true })).concat(S.history);
}
function sortMoves(list) {
  return list.slice().sort((a, b) => (b.date > a.date ? 1 : b.date < a.date ? -1 : 0) || String(b.id || '').localeCompare(String(a.id || '')) || (b.row || 0) - (a.row || 0));
}
function tsOf(e) {
  let ms = e.ts;
  if (!ms && e.id && /^e[0-9a-z]{8}/.test(e.id)) ms = parseInt(e.id.slice(1, 9), 36);
  if (!ms || ms < 1.5e12 || ms > 4.1e12) return '';
  const d = new Date(ms);
  if (iso(d) !== e.date) return '';
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}
const when = (e) => { const t = tsOf(e); return dRel(e.date) + (t ? ', ' + t : ''); };

const ST = {
  out: { cls: 'out', label: 'Out of Stock' },
  low: { cls: 'low', label: 'Reorder Soon' },
  ok: { cls: 'ok', label: 'In Stock' },
  none: { cls: 'none', label: 'No Entries' }
};
const pill = (st) => `<span class="pill ${ST[st].cls}">${ST[st].label}</span>`;

/* ================= API ================= */
async function apiGet() {
  const r = await fetch(S.url, { redirect: 'follow' });
  return r.json();
}
async function apiPost(body) {
  const r = await fetch(S.url, { method: 'POST', redirect: 'follow', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(body) });
  return r.json();
}
function applyData(j) {
  if (Array.isArray(j.items)) { S.items = j.items; store.set('items', S.items); }
  if (Array.isArray(j.history)) { S.history = j.history; store.set('history', S.history); }
  S.synced = Date.now(); store.set('synced', S.synced);
  S.error = '';
}
const errText = (e) => {
  const m = String((e && e.message) || e || '');
  if (/Failed to fetch|NetworkError|Load failed/i.test(m)) return navigator.onLine ? 'Could not reach Google Sheets. Check the link in More.' : 'You are offline.';
  if (/JSON|Unexpected token/i.test(m)) return 'The Google Sheets link did not answer correctly. Check it is deployed for "Anyone".';
  return m;
};

async function refresh(quiet) {
  if (!S.url || S.loading) return;
  if (S.queue.length) { await sync(true); return; }
  S.loading = true; softRender();
  try {
    const j = await apiGet();
    if (!j.ok) throw new Error(j.error || 'Sheet error');
    applyData(j);
  } catch (e) {
    S.error = errText(e);
    if (!quiet) toast(S.error, true);
  } finally { S.loading = false; softRender(); }
}

async function sync(quiet) {
  if (S.syncing || !S.queue.length || !S.url) return;
  S.syncing = true; softRender();
  const batch = S.queue.slice();
  try {
    const j = await apiPost({ entries: batch.map(({ id, type, code, qty, date, party, ref, note }) => ({ id, type, code, qty, date, party, ref, note })) });
    if (!j.ok) throw new Error(j.error || 'Sheet error');
    const res = {};
    (j.results || []).forEach((r) => { res[r.id] = r; });
    const done = new Set();
    batch.forEach((e) => {
      const r = res[e.id];
      if (!r) return;
      if (r.status === 'ok' || r.status === 'dup') done.add(e.id);
      else if (r.status === 'error') { done.add(e.id); S.failed.push(Object.assign({}, e, { msg: r.msg })); }
    });
    S.queue = S.queue.filter((e) => !done.has(e.id));
    saveQueue();
    applyData(j);
  } catch (e) {
    S.error = errText(e);
    if (!quiet) toast('Saved on this phone. ' + S.error, true);
  } finally { S.syncing = false; softRender(); }
}

/* ================= router ================= */
function route() {
  const h = location.hash.replace(/^#\/?/, '') || 'home';
  const [name, qs] = h.split('?');
  return { name, q: new URLSearchParams(qs || '') };
}
let lastRouteKey = '';
function onRoute() {
  const r = route();
  const key = location.hash;
  if (r.name === 'items') S.filter = { q: '', cat: r.q.get('cat') || 'all', status: r.q.get('status') || 'all' };
  if (isFormRoute(r.name)) {
    const f = ensureForm(r.name);
    f.date = today();
    const code = r.q.get('code');
    if (code && r.name === 'dial') f.dcode = code;
    else if (code) f.wantCode = code;
  }
  lastRouteKey = key;
  S.sheet = null;
  render();
  window.scrollTo(0, 0);
  if (r.name === 'items' && r.q.get('focus')) setTimeout(() => { const i = $('#q'); if (i) i.focus(); }, 50);
}

/* ================= render ================= */
function render() {
  const r = route();
  const isForm = isFormRoute(r.name);
  const app = $('#app');
  app.className = isForm ? 'noNav' : '';
  let top = '', body = '';
  switch (r.name) {
    case 'in': case 'out': top = topForm(r.name); body = vForm(r.name); break;
    case 'dial': top = topForm('dial'); body = vDial(); break;
    case 'items': top = topPlain('Items', 'View and manage all items', true); body = vItems(); break;
    case 'categories': top = topPlain('Categories', 'Manage item categories', true); body = vCategories(); break;
    case 'reports': top = topPlain('Reports', 'Stock movement over time'); body = vReports(); break;
    case 'more': top = topPlain('More'); body = vMore(); break;
    default: top = topHome(); body = vHome();
  }
  app.innerHTML = top + body;
  $('#nav').innerHTML = isForm ? '' : navHTML(r.name);
  renderSheet();
  if (isForm) updateFormDynamic();
}
// refresh without clobbering what the person is typing
function softRender() {
  const r = route();
  const ae = document.activeElement;
  if (isFormRoute(r.name)) { updateFormDynamic(); return; }
  if (ae && (ae.tagName === 'INPUT' || ae.tagName === 'SELECT')) { if (r.name === 'items') renderItemList(); return; }
  render();
}

function topHome() {
  const alerts = items().filter((i) => i.st === 'out' || i.st === 'low').length;
  return `<header class="top">
    <a class="ibtn" href="#/more" aria-label="Menu">${ic('menu', 26)}</a>
    <div class="grow"><h1>${esc(APP_NAME)}</h1><div class="sub">${esc(TAGLINE)}</div></div>
    <a class="ibtn" href="#/items?focus=1" aria-label="Search">${ic('search', 26)}</a>
    <a class="ibtn" href="#/items?status=alert" aria-label="Low stock alerts">${ic('bell', 26)}${alerts ? '<span class="dot"></span>' : ''}</a>
  </header>${syncLine()}`;
}
function topPlain(title, sub, back) {
  return `<header class="top plain">${back ? `<a class="ibtn" href="#/home" aria-label="Back">${ic('left', 26)}</a>` : ''}<div class="grow"><h1>${esc(title)}</h1>${sub ? `<div class="sub">${esc(sub)}</div>` : ''}</div></header>`;
}
function topForm(type) {
  if (type === 'dial') return `<header class="top center"><a class="ibtn" href="#/home" aria-label="Back">${ic('left', 26)}</a>
    <div class="grow"><h1>Dial Out</h1><div class="sub">Make dials - the parts go out together</div></div><span class="spacer"></span></header>`;
  return `<header class="top center"><a class="ibtn" href="#/home" aria-label="Back">${ic('left', 26)}</a>
    <div class="grow"><h1>Stock ${type === 'in' ? 'In' : 'Out'}</h1><div class="sub">${type === 'in' ? 'Add incoming stock to inventory' : 'Remove stock from inventory'}</div></div><span class="spacer"></span></header>`;
}
function syncLine() {
  const n = S.queue.length;
  let cls = '', txt = '';
  if (S.syncing || S.loading) { cls = 'busy'; txt = S.syncing ? 'Saving to Google Sheets...' : 'Updating...'; }
  else if (n) { cls = 'warn'; txt = `${n} ${n === 1 ? 'entry' : 'entries'} waiting to sync. Tap to retry`; }
  else if (S.error) { cls = 'bad'; txt = S.error + ' Tap to retry'; }
  else if (S.synced) { txt = 'Synced ' + ago_(S.synced); }
  else { txt = 'Not synced yet. Tap to load'; }
  return `<button class="syncline ${cls}" data-act="sync"><span class="pip"></span>${esc(txt)}</button>`;
}
function ago_(ms) {
  const m = Math.round((Date.now() - ms) / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return m + ' min ago';
  const h = Math.round(m / 60);
  return h < 24 ? h + ' h ago' : dShort(iso(new Date(ms)));
}

function navHTML(name) {
  const on = (n) => (n === name || (n === 'items' && name === 'categories') ? 'on' : '');
  return `<a class="n ${on('home') || (name === 'home' ? 'on' : '')}" href="#/home">${ic('home', 26)}Home</a>
    <a class="n ${on('items')}" href="#/items">${ic('cube', 26)}Items</a>
    <span class="fabwrap"><button class="fab" data-act="add" aria-label="Add stock entry">${ic('plus', 30, 2.4)}</button></span>
    <a class="n ${on('reports')}" href="#/reports">${ic('chart', 26)}Reports</a>
    <a class="n ${on('more')}" href="#/more">${ic('more', 26)}More</a>`;
}

/* ---------- Home ---------- */
function vHome() {
  const its = items();
  if (!S.url) return `<div class="banner bad">No Google Sheets link yet. <button data-act="go-more">Add it in More</button></div>`;
  if (!its.length) {
    return S.loading || S.syncing
      ? `<div class="card empty"><b>Loading your stock...</b>One moment.</div>`
      : `<div class="card empty"><b>No stock data yet</b>${esc(S.error || 'Tap the sync line above to load from Google Sheets.')}</div>`;
  }
  const total = its.length;
  const stock = its.filter((i) => !isDial(i.code)).reduce((a, i) => a + i.eff, 0);
  const outN = its.filter((i) => i.st === 'out').length;
  const lowN = its.filter((i) => i.st === 'low').length;
  const alerts = its.filter((i) => i.st === 'out' || i.st === 'low').sort((a, b) => (a.st === 'out' ? 0 : 1) - (b.st === 'out' ? 0 : 1) || a.eff - b.eff).slice(0, 4);
  const nm = {}; its.forEach((i) => { nm[i.code] = i.title; });
  const recent = sortMoves(moves()).slice(0, 4);
  const c = chartData(S.homeRange);
  const showInstall = S.installEvt && !isStandalone();
  return `${showInstall ? `<div class="install"><span class="t"><b>Install ARTIME Stock</b><small>Opens full screen like a normal app</small></span><button data-act="install">Install</button></div>` : ''}
  <section class="stats">
    <a class="stat blue" href="#/items"><span class="ico">${ic('cube', 24)}</span><span><small>Total Items</small><b>${num(total)}</b></span></a>
    <a class="stat green" href="#/items?status=ok"><span class="ico">${ic('layers', 24)}</span><span><small>Total Stock</small><b>${num(stock)}</b></span></a>
    <a class="stat red" href="#/items?status=out"><span class="ico">${ic('alert', 26, 2.2)}</span><span><small>Out of Stock</small><b>${outN}</b></span></a>
    <a class="stat amber" href="#/items?status=low"><span class="ico">${ic('warn', 24, 2.1)}</span><span><small>Reorder Soon</small><b>${lowN}</b></span></a>
  </section>
  <section class="two">
    <a class="card navcard" href="#/items"><span class="ico">${ic('cube', 26)}</span><span class="t"><b>Items</b><small>View and manage all items</small></span>${ic('right', 20)}</a>
    <a class="card navcard" href="#/categories"><span class="ico g">${ic('grid', 26)}</span><span class="t"><b>Categories</b><small>Manage item categories</small></span>${ic('right', 20)}</a>
  </section>
  <section class="card sec">
    <div class="sec-h"><h2>Low Stock Alerts</h2><a class="link" href="#/items?status=alert">View All ${ic('right', 16, 2.4)}</a></div>
    ${alerts.length ? alerts.map((i) => itemRow(i)).join('') : `<div class="empty"><b>Nothing is running low</b>Items show here when they reach their reorder level.</div>`}
  </section>
  <section class="dual">
    <div class="card">
      <div class="sec-h"><h2>Recent Stock Activity</h2><a class="link" href="#/reports">View All ${ic('right', 16, 2.4)}</a></div>
      ${recent.length ? recent.map((e) => actRow(e, nm)).join('') : `<div class="empty"><b>No movements yet</b>Add your first Stock In or Stock Out.</div>`}
    </div>
    <div class="card">
      <div class="sec-h"><h2>Stock Overview</h2><label class="sel"><select data-bind="homeRange" aria-label="Range"><option value="7"${S.homeRange === 7 ? ' selected' : ''}>Last 7 Days</option><option value="14"${S.homeRange === 14 ? ' selected' : ''}>Last 14 Days</option><option value="30"${S.homeRange === 30 ? ' selected' : ''}>Last 30 Days</option></select>${ic('chev', 16)}</label></div>
      ${chartBlock(c)}
    </div>
  </section>`;
}

function itemRow(i) {
  return `<button class="row" data-act="open-item" data-code="${esc(i.code)}">${art(i.base, 56)}
    <span class="mid"><b>${esc(i.title)}</b><small>${esc(i.code)}</small></span>
    <span class="pillcol">${pill(i.st)}</span>
    <span class="end"><b>${num(i.eff)}</b><small>${esc(unitLabel(i.unit))}</small></span></button>`;
}
function actRow(e, nm) {
  const inn = e.type === 'in';
  return `<div class="act"><span class="aic ${inn ? 'in' : 'out'}">${ic(inn ? 'up' : 'down', 22, 2.2)}</span>
    <div class="am"><b>Stock ${inn ? 'In' : 'Out'}</b><span>${esc(nm[e.code] || e.code)}</span></div>
    <div class="ar"><b class="${inn ? 'g' : 'r'}">${inn ? '+' : '-'}${num(e.qty)}</b><span class="${e.pending ? 'pend' : ''}">${e.pending ? 'Waiting to sync' : esc(when(e))}</span></div></div>`;
}

/* ---------- chart ---------- */
function chartData(days) {
  const ds = []; for (let k = days - 1; k >= 0; k--) ds.push(ago(k));
  const m = {}; ds.forEach((d) => { m[d] = { i: 0, o: 0 }; });
  let ti = 0, to = 0;
  moves().forEach((e) => { const b = m[e.date]; if (!b) return; const q = Number(e.qty) || 0; if (e.type === 'in') { b.i += q; ti += q; } else { b.o += q; to += q; } });
  return { ds, m, ti, to };
}
function niceStep(peak) {
  const p = Math.pow(10, Math.floor(Math.log10(peak)));
  const r = peak / p;
  return Math.max(1, (r <= 2 ? 0.5 : r <= 5 ? 1 : 2) * p);
}
function chartBlock(c) {
  const { ds, m } = c;
  const peak = Math.max(1, ...ds.map((d) => Math.max(m[d].i, m[d].o)));
  const step = niceStep(peak), top = Math.ceil(peak / step) * step;
  const W = 360, H = 190, L = 34, R = 6, T = 8, B = 26, pw = W - L - R, ph = H - T - B, gw = pw / ds.length;
  const bw = Math.min(14, gw * (ds.length <= 7 ? 0.32 : 0.36));
  let g = '';
  for (let v = 0; v <= top; v += step) {
    const y = T + ph - (v / top) * ph;
    g += `<line x1="${L}" x2="${W - R}" y1="${y}" y2="${y}" stroke="#e7ebf1" stroke-width="1"/><text x="${L - 6}" y="${y + 3.5}" text-anchor="end">${num(v)}</text>`;
  }
  const every = Math.ceil(ds.length / 7);
  ds.forEach((d, k) => {
    const cx = L + gw * k + gw / 2;
    const hi = (m[d].i / top) * ph, ho = (m[d].o / top) * ph;
    if (m[d].i) g += `<rect x="${(cx - bw - 0.8).toFixed(1)}" y="${(T + ph - hi).toFixed(1)}" width="${bw.toFixed(1)}" height="${hi.toFixed(1)}" rx="2" fill="#2fae8a"/>`;
    if (m[d].o) g += `<rect x="${(cx + 0.8).toFixed(1)}" y="${(T + ph - ho).toFixed(1)}" width="${bw.toFixed(1)}" height="${ho.toFixed(1)}" rx="2" fill="#ec5757"/>`;
    if ((ds.length - 1 - k) % every === 0) g += `<text x="${cx}" y="${H - 8}" text-anchor="middle">${esc(dShort(d))}</text>`;
  });
  return `<div class="legend"><span><i style="background:#2fae8a"></i>Stock In</span><span><i style="background:#ec5757"></i>Stock Out</span></div>
    <div class="chart"><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Stock in and out per day">${g}</svg></div>
    <div class="tot"><div><span class="aic in">${ic('up', 20, 2.2)}</span><span><small>Total In</small><b>${num(c.ti)}</b></span></div>
    <div><span class="aic out">${ic('down', 20, 2.2)}</span><span><small>Total Out</small><b>${num(c.to)}</b></span></div></div>`;
}

/* ---------- Items ---------- */
function filtered() {
  const f = S.filter, q = f.q.trim().toLowerCase();
  return items().filter((i) => {
    if (f.cat !== 'all' && i.cat !== f.cat) return false;
    if (f.status === 'alert' ? !(i.st === 'out' || i.st === 'low') : f.status !== 'all' && i.st !== f.status) return false;
    if (q && !(i.title + ' ' + i.code + ' ' + i.applies).toLowerCase().includes(q)) return false;
    return true;
  });
}
function vItems() {
  const f = S.filter;
  const chip = (act, v, cur, label) => `<button class="chip ${v === cur ? 'on' : ''}" data-act="${act}" data-v="${v}">${label}</button>`;
  return `<div class="search">${ic('search', 20)}<input id="q" type="search" placeholder="Search item or code" value="${esc(f.q)}" data-bind="q" autocomplete="off"></div>
    <div class="chips">${chip('fc', 'all', f.cat, 'All')}${chip('fc', 'packing', f.cat, 'Packaging Items')}${chip('fc', 'clock', f.cat, 'Clock Items')}</div>
    <div class="chips">${chip('fs', 'all', f.status, 'Any status')}${chip('fs', 'alert', f.status, 'Needs attention')}${chip('fs', 'out', f.status, 'Out of Stock')}${chip('fs', 'low', f.status, 'Reorder Soon')}${chip('fs', 'ok', f.status, 'In Stock')}</div>
    <div id="itemlist">${itemListHTML()}</div>`;
}
function itemListHTML() {
  const list = filtered();
  if (!S.items.length) return `<div class="card empty sec"><b>No items loaded</b>Open Home and tap the sync line.</div>`;
  if (!list.length) return `<div class="card empty sec"><b>No items match</b>Try a different search or filter.</div>`;
  return `<div class="count">${list.length} ${list.length === 1 ? 'item' : 'items'}</div><div class="card">${list.map(itemRow).join('')}</div>`;
}
function renderItemList() { const el = $('#itemlist'); if (el) el.innerHTML = itemListHTML(); }

/* ---------- Categories ---------- */
function vCategories() {
  const its = items();
  const card = (key, icon, cls) => {
    const l = its.filter((i) => i.cat === key);
    const need = l.filter((i) => i.st === 'out' || i.st === 'low').length;
    return `<a class="card catcard" href="#/items?cat=${key}"><span class="ico ${cls}">${ic(icon, 28)}</span>
      <span class="t"><b>${CAT_NAME[key]}</b><small>${l.length} items, ${num(l.reduce((a, i) => a + i.eff, 0))} in stock</small>
      <small>${need ? `<span class="${l.some((i) => i.st === 'out') ? 'r' : ''}" style="font-weight:600">${need} need attention</span>` : 'All good'}</small></span>${ic('right', 20)}</a>`;
  };
  if (!its.length) return `<div class="card empty"><b>No items loaded</b>Open Home and tap the sync line.</div>`;
  return `<div class="cats">${card('packing', 'cube', '')}${card('clock', 'gear', 'c')}</div>`;
}

/* ---------- Reports ---------- */
function vReports() {
  const its = items(); const nm = {}; its.forEach((i) => { nm[i.code] = i.title; });
  const c = chartData(S.repRange);
  const from = ago(S.repRange - 1);
  const list = sortMoves(moves().filter((e) => e.date >= from));
  const used = {};
  list.forEach((e) => { if (e.type === 'out') used[e.code] = (used[e.code] || 0) + Number(e.qty); });
  const top = Object.entries(used).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const max = top.length ? top[0][1] : 1;
  const chip = (v, label) => `<button class="chip ${S.repRange === v ? 'on' : ''}" data-act="rrange" data-v="${v}">${label}</button>`;
  let log = '', lastDay = '';
  list.slice(0, 120).forEach((e) => {
    if (e.date !== lastDay) { lastDay = e.date; log += `<div class="daygroup">${esc(dRel(e.date))}${e.date === today() || e.date === ago(1) ? ', ' + esc(dShort(e.date)) : ''}</div>`; }
    log += actRow(e, nm);
  });
  return `<div class="chips" style="margin-top:0">${chip(7, 'Last 7 Days')}${chip(14, 'Last 14 Days')}${chip(30, 'Last 30 Days')}${chip(90, 'Last 90 Days')}</div>
    <div class="card sec">${chartBlock(c)}</div>
    <div class="card sec"><div class="sec-h"><h2>Most used</h2></div>
      ${top.length ? top.map(([code, q]) => `<div class="row plain"><div style="display:flex;justify-content:space-between;gap:10px"><b style="font-weight:600">${esc(nm[code] || code)}</b><b class="r">-${num(q)}</b></div><div class="bar"><i style="width:${Math.max(4, (q / max) * 100)}%"></i></div></div>`).join('') : `<div class="empty">No stock out in this period.</div>`}
    </div>
    <div class="card sec" style="overflow:hidden"><div class="sec-h"><h2>All movements</h2></div>
      ${list.length ? log : `<div class="empty"><b>No movements</b>Nothing recorded in this period.</div>`}</div>`;
}

/* ---------- More ---------- */
function vMore() {
  const q = S.queue, f = S.failed;
  const nm = {}; items().forEach((i) => { nm[i.code] = i.title; });
  const ent = (e, x) => `<div class="q"><span class="aic ${e.type}" style="width:38px;height:38px">${ic(e.type === 'in' ? 'up' : 'down', 18, 2.2)}</span><div class="m"><b>${e.type === 'in' ? '+' : '-'}${num(e.qty)} ${esc(nm[e.code] || e.code)}</b><small>${esc(dShort(e.date))}${e.msg ? ' - ' + esc(e.msg) : ''}</small></div><button class="x" data-act="${x}" data-id="${esc(e.id)}">Discard</button></div>`;
  const installable = S.installEvt && !isStandalone();
  const ios = /iphone|ipad|ipod/i.test(navigator.userAgent) && !isStandalone();
  return `<div class="card group"><h2>Google Sheet connection</h2><p>Paste the Web app link that ends with /exec.</p>
      <label class="field">${ic('file', 20)}<input id="url" type="url" inputmode="url" placeholder="https://script.google.com/macros/s/.../exec" value="${esc(S.url)}" data-bind="url" autocomplete="off"></label>
      <div class="btns"><button class="btn" data-act="save-url">Save and sync</button>${CFG.scriptUrl && S.url !== CFG.scriptUrl ? '<button class="btn ghost" data-act="reset-url">Use default link</button>' : ''}</div>
      <div class="kv" style="margin-top:8px"><span>Last sync</span><b>${S.synced ? esc(ago_(S.synced)) : 'Never'}</b></div>
      ${S.error ? `<div class="banner bad" style="margin:8px 0 0">${esc(S.error)}</div>` : ''}</div>
    <div class="card group"><h2>Waiting to sync</h2><p>${q.length ? 'Saved on this phone. They are sent to the sheet as soon as you are online.' : 'Everything is saved to the sheet.'}</p>
      ${q.map((e) => ent(e, 'discard')).join('')}
      ${q.length ? `<div class="btns"><button class="btn" data-act="sync">${ic('refresh', 18)}Sync now</button></div>` : ''}</div>
    ${f.length ? `<div class="card group"><h2>Not saved</h2><p>The sheet rejected these entries. Fix the cause, then enter them again.</p>${f.map((e) => ent(e, 'discard-failed')).join('')}</div>` : ''}
    <div class="card group"><h2>Install app</h2><p>${isStandalone() ? 'Installed. You are using the app version.' : installable ? 'Add ARTIME Stock to your home screen so it opens like a normal app.' : ios ? 'On iPhone: tap the Share button, then Add to Home Screen.' : 'Use your browser menu and choose Install app or Add to Home screen.'}</p>
      ${installable ? `<div class="btns"><button class="btn" data-act="install">${ic('download', 18)}Install</button></div>` : ''}</div>
    <div class="card group"><h2>This phone</h2><div class="kv"><span>Items cached</span><b>${S.items.length}</b></div><div class="kv"><span>Movements cached</span><b>${S.history.length}</b></div>
      <div class="btns"><button class="btn ghost" data-act="refresh">${ic('refresh', 18)}Reload from sheet</button></div></div>`;
}

/* ---------- Stock In / Out form ---------- */
function ensureForm(type) {
  if (!S.form[type]) S.form[type] = { t: type, cat: 'packing', base: null, variant: null, size: null, qty: 1, date: today(), party: '', ref: '', note: '', used: '' };
  return S.form[type];
}
function resolve(f) {
  if (f.wantCode) {                      // opened from an item or shortcut: jump to that item once data is there
    const it = items().find((i) => i.code === f.wantCode);
    if (it) { Object.assign(f, { cat: it.cat, base: it.base, variant: it.variant, size: it.size }); f.wantCode = null; }
    else if (S.items.length) f.wantCode = null;
  }
  const its = items().filter((i) => i.cat === f.cat && !isDial(i.code));
  const bases = uniq(its.map((i) => i.base));
  if (!bases.includes(f.base)) f.base = bases[0] || null;
  const rows = its.filter((i) => i.base === f.base);
  const variants = uniq(rows.map((r) => r.variant).filter(Boolean));
  f.variant = variants.length ? (variants.includes(f.variant) ? f.variant : variants[0]) : null;
  const rv = rows.filter((r) => r.variant === f.variant);
  const sizes = uniq(rv.map((r) => r.size));
  if (!sizes.includes(f.size)) f.size = sizes[0] || null;
  return { bases, variants, sizes, row: rv.find((r) => r.size === f.size) || null };
}
function vForm(type) {
  const f = ensureForm(type);
  const R = resolve(f);
  const tab = (k, icon) => `<button class="tab ${f.cat === k ? 'on' : ''}" data-act="fcat" data-v="${k}">${ic(icon, 22)}${CAT_NAME[k]}</button>`;
  const hasSize = !(R.sizes.length === 1 && (R.sizes[0] === 'n/a' || !R.sizes[0]));
  const sup = uniq(S.history.filter((e) => e.type === 'in' && e.party).map((e) => e.party)).slice(0, 40);
  const usedFor = uniq(['Order', 'Production', 'Damaged', 'Sample'].concat(S.history.filter((e) => e.type === 'out' && e.party).map((e) => e.party))).slice(0, 40);
  const unit = unitLabel(R.row ? R.row.unit : 'pcs');
  return `<div class="form ${type}">
    <div class="tabs">${tab('clock', 'gear')}${tab('packing', 'cube')}</div>
    <label class="fl" for="item">Item<i>*</i></label>
    <div class="field">${ic('cube', 22)}<select id="item" data-bind="base">${R.bases.map((b) => `<option ${b === f.base ? 'selected' : ''}>${esc(b)}</option>`).join('')}</select>${ic('chev', 20)}</div>
    ${hasSize ? `<div class="fl">Size<i>*</i></div><div class="sizes">${R.sizes.map((s) => `<button class="size ${s === f.size ? 'on' : ''}" data-act="fsize" data-v="${esc(s)}">${esc(sizeLabel(s) || s)}</button>`).join('')}</div>` : ''}
    ${R.variants.length > 1 ? `<div class="fl">Type<i>*</i></div><div class="seg">${R.variants.map((v) => `<button class="size ${v === f.variant ? 'on' : ''}" data-act="fvar" data-v="${esc(v)}">${esc(v)}</button>`).join('')}</div>` : ''}
    <div id="fcard"></div>
    <label class="fl" for="qty">Quantity<i>*</i></label>
    <div class="qty"><button data-act="qminus" aria-label="Decrease">${ic('minus', 22, 2.2)}</button><input id="qty" type="number" inputmode="decimal" min="0" step="any" value="${esc(f.qty)}" data-bind="qty"><button data-act="qplus" aria-label="Increase">${ic('plus', 22, 2.2)}</button><span class="unit">${esc(unit)}</span></div>
    <div class="hint" id="qhint"></div>
    <div class="fl" style="margin-top:8px">Date<i>*</i></div>
    <div class="field datef" data-act="pick">${ic('cal', 22)}<span class="val">${esc(dLong(f.date))}</span>${ic('chev', 20)}<input id="date" type="date" value="${esc(f.date)}" data-bind="date" aria-label="Date"></div>
    <div class="pair">
      <div>${type === 'in'
        ? `<label class="fl" for="party">Supplier</label><div class="field">${ic('truck', 22)}<input id="party" list="dl-party" placeholder="Supplier name" value="${esc(f.party)}" data-bind="party" autocomplete="off"><datalist id="dl-party">${sup.map((s) => `<option value="${esc(s)}">`).join('')}</datalist></div>`
        : `<label class="fl" for="used">Used for</label><div class="field">${ic('layers', 22)}<input id="used" list="dl-used" placeholder="Order, Sample..." value="${esc(f.used)}" data-bind="used" autocomplete="off"><datalist id="dl-used">${usedFor.map((s) => `<option value="${esc(s)}">`).join('')}</datalist></div>`}</div>
      <div><label class="fl" for="ref">Reference No.</label><div class="field">${ic('file', 22)}<input id="ref" placeholder="${type === 'in' ? 'Invoice / GRN No.' : 'Voucher / Order No.'}" value="${esc(f.ref)}" data-bind="ref" autocomplete="off"></div></div>
    </div>
    <label class="fl" for="note">Notes <small>(optional)</small></label>
    <div class="field">${ic('pencil', 20)}<input id="note" placeholder="Add notes..." value="${esc(f.note)}" data-bind="note" autocomplete="off"></div>
    <button class="submit" id="fsubmit" data-act="submit">${ic(type === 'in' ? 'up' : 'down', 24, 2.2)}<span>${type === 'in' ? 'Add Stock In' : 'Remove Stock Out'}</span></button>
  </div>`;
}
function formState(type) {
  const f = ensureForm(type); const R = resolve(f); const row = R.row;
  const q = Number(f.qty);
  const avail = row ? row.eff : 0;
  let err = '';
  if (!row) err = 'Choose an item.';
  else if (!(q > 0)) err = 'Enter a quantity above 0.';
  else if (type === 'out' && q > avail) err = avail > 0 ? `Only ${num(avail)} ${unitLabel(row.unit)} available.` : 'This item is out of stock.';
  return { f, R, row, q, avail, err, ok: !err };
}
function updateFormDynamic() {
  const r = route(); if (r.name === 'dial') { updateDial(); return; }
  if (r.name !== 'in' && r.name !== 'out') return;
  const type = r.name; const st = formState(type); const row = st.row;
  const card = $('#fcard'); if (!card) return;
  if (!row) { card.innerHTML = `<div class="empty-card">${S.items.length ? 'No matching item.' : 'No items loaded yet. Go back and sync first.'}</div>`; }
  else {
    const stCls = row.st === 'out' ? 'r' : row.st === 'low' ? 'a' : 'g';
    card.innerHTML = `<div class="pcard"><div class="head">${art(row.base, 76)}<div><b>${esc(row.code)}</b><small>${esc(row.title)}</small></div></div>
      <div class="nums"><div><small>Current Stock</small><b class="${stCls}">${num(row.eff)}</b><span>${esc(unitLabel(row.unit))}</span></div>
      <div><small>Reorder Level</small><b class="a">${num(row.min)}</b><span>${esc(unitLabel(row.unit))}</span></div>
      <div><small>Unit</small><b class="u">${esc(unitLabel(row.unit))}</b></div></div></div>`;
  }
  const hint = $('#qhint');
  if (hint) {
    if (type === 'out' && row) { hint.textContent = st.err && st.q > 0 ? st.err : `Max available: ${num(st.avail)} ${unitLabel(row.unit)}`; hint.className = 'hint' + (st.err && st.q > 0 ? ' bad' : ''); }
    else { hint.textContent = ''; hint.className = 'hint'; }
  }
  const btn = $('#fsubmit'); if (btn) btn.disabled = !st.ok;
}
async function submitForm(type) {
  if (S.busy) return;                       // ignore double taps while the popup is up
  const st = formState(type); if (!st.ok) return;
  S.busy = true;
  const f = st.f;
  const e = { id: newId(), ts: Date.now(), type, code: st.row.code, qty: st.q, date: f.date || today(), party: (type === 'in' ? f.party : f.used).trim(), ref: f.ref.trim(), note: f.note.trim() };
  S.queue.push(e); saveQueue();
  const unit = unitLabel(st.row.unit);
  const pop = { kind: type, title: 'Added to Stock ' + (type === 'in' ? 'In' : 'Out'), item: st.row.title, qty: (type === 'in' ? '+' : '-') + num(e.qty) + ' ' + unit, status: 'busy', msg: 'Saving to Google Sheets...' };
  f.qty = 1; f.ref = ''; f.note = '';
  render();
  const t0 = Date.now();
  showPopup(pop);

  let outcome;
  if (!navigator.onLine || !S.url) outcome = 'offline';
  else {
    await sync(true);
    outcome = S.failed.some((x) => x.id === e.id) ? 'rejected' : S.queue.some((x) => x.id === e.id) ? 'offline' : 'saved';
  }
  const now = items().find((i) => i.code === e.code);
  pop.now = now ? 'Stock now ' + num(now.eff) + ' ' + unit : '';
  if (outcome === 'saved') { pop.status = 'ok'; pop.msg = 'Saved to Google Sheets'; }
  else if (outcome === 'offline') { pop.status = 'warn'; pop.msg = 'Saved on this phone. It will sync when you are online.'; }
  else { pop.status = 'bad'; pop.kind = 'bad'; pop.title = 'Not added'; pop.msg = 'The sheet rejected it: ' + (S.failed.find((x) => x.id === e.id) || {}).msg; }
  showPopup(pop);
  if (outcome === 'rejected') return;      // stays until the person taps OK
  const wait = Math.max(t0 + 2000 - Date.now(), 1000);   // at least 2 seconds in total
  clearTimeout(popT);
  popT = setTimeout(closePopup, wait);
}

/* ---------- confirmation popup ---------- */
let popT;
function showPopup(p) {
  const icon = p.status === 'busy' ? '<span class="spin"></span>' : p.status === 'bad' ? ic('x', 34, 2.6) : p.status === 'warn' ? ic('check', 34, 2.6) : ic('check', 34, 2.6);
  $('#popup').innerHTML = `<div class="pop-scrim"><div class="pop ${p.kind} ${p.status}" role="alertdialog" aria-live="assertive" aria-label="${esc(p.title)}">
    <div class="pop-ic">${icon}</div><h3>${esc(p.title)}</h3>
    <div class="pop-item">${esc(p.item)}</div><div class="pop-qty">${esc(p.qty)}</div>
    ${p.now ? `<div class="pop-sub">${esc(p.now)}</div>` : ''}
    <div class="pop-msg">${esc(p.msg)}</div>
    ${p.status === 'bad' ? '<button class="pop-ok" data-act="pop-ok">OK</button>' : ''}</div></div>`;
}
function closePopup() { clearTimeout(popT); $('#popup').innerHTML = ''; S.busy = false; }

/* ---------- sheets ---------- */
function renderSheet() {
  const el = $('#sheet'); const s = S.sheet;
  if (!s) { el.innerHTML = ''; return; }
  if (s.type === 'add') {
    el.innerHTML = `<div class="scrim" data-act="close"><div class="sheet" role="dialog" aria-label="New entry"><div class="grab"></div><h3>New entry</h3><div class="acts">
      <a class="bigact in" href="#/in">${ic('up', 34, 2.2)}<span><b>Stock In</b><small>Add incoming stock</small></span></a>
      <a class="bigact out" href="#/out">${ic('down', 34, 2.2)}<span><b>Stock Out</b><small>Record outgoing stock</small></span></a>
      <a class="bigact dial" href="#/dial">${ic('gear', 34, 2.2)}<span><b>Dial Out</b><small>Make dials - all parts go out together</small></span></a></div></div></div>`;
    return;
  }
  const it = items().find((i) => i.code === s.code);
  if (!it) { el.innerHTML = ''; return; }
  const nm = {}; items().forEach((i) => { nm[i.code] = i.title; });
  const mv = sortMoves(moves().filter((e) => e.code === it.code)).slice(0, 6);
  el.innerHTML = `<div class="scrim" data-act="close"><div class="sheet" role="dialog" aria-label="${esc(it.title)}"><div class="grab"></div>
    <div class="hd">${art(it.base, 64)}<div style="flex:1;min-width:0"><b>${esc(it.title)}</b><small>${esc(it.code)}</small></div>${pill(it.st)}</div>
    <div class="nums"><div><small>Current Stock</small><b>${num(it.eff)}</b></div><div><small>Reorder Level</small><b>${num(it.min)}</b></div><div><small>Unit</small><b style="font-size:17px;line-height:2">${esc(unitLabel(it.unit))}</b></div></div>
    ${isDial(it.code) ? `<div class="two" style="margin-top:0"><a class="bigact dial" style="padding:14px" href="#/dial?code=${encodeURIComponent(it.code)}">${ic('gear', 26, 2.2)}<b style="font-size:17px">Dial Out</b></a></div>` : `<div class="two" style="margin-top:0"><a class="bigact in" style="padding:14px" href="#/in?code=${encodeURIComponent(it.code)}">${ic('up', 26, 2.2)}<b style="font-size:17px">Stock In</b></a><a class="bigact out" style="padding:14px" href="#/out?code=${encodeURIComponent(it.code)}">${ic('down', 26, 2.2)}<b style="font-size:17px">Stock Out</b></a></div>`}
    <h4>Recent movements</h4>${mv.length ? mv.map((e) => actRow(e, nm)).join('') : '<div class="empty" style="padding:14px">No movements for this item yet.</div>'}</div></div>`;
}

/* ---------- toast ---------- */
let toastT;
function toast(msg, bad) {
  const t = $('#toast'); t.textContent = msg; t.className = 'show' + (bad ? ' bad' : '');
  clearTimeout(toastT); toastT = setTimeout(() => { t.className = ''; }, 3600);
}

/* ================= events ================= */
document.addEventListener('click', (ev) => {
  const el = ev.target.closest('[data-act]'); if (!el) return;
  const act = el.dataset.act, v = el.dataset.v;
  const r = route(); const type = r.name;
  switch (act) {
    case 'sync': S.queue.length ? sync() : refresh(); break;
    case 'refresh': refresh(); break;
    case 'add': S.sheet = { type: 'add' }; renderSheet(); break;
    case 'close': if (ev.target === el) { S.sheet = null; renderSheet(); } break;
    case 'open-item': S.sheet = { type: 'item', code: el.dataset.code }; renderSheet(); break;
    case 'go-more': location.hash = '#/more'; break;
    case 'fc': S.filter.cat = v; render(); break;
    case 'fs': S.filter.status = v; render(); break;
    case 'rrange': S.repRange = Number(v); render(); break;
    case 'fcat': ensureForm(type).cat = v; render(); break;
    case 'fsize': ensureForm(type).size = v; render(); break;
    case 'dsize': ensureForm('dial').dcode = v; render(); break;
    case 'fvar': ensureForm(type).variant = v; render(); break;
    case 'qplus': case 'qminus': {
      const f = ensureForm(type); const n = Number(f.qty) || 0;
      f.qty = Math.max(0, n + (act === 'qplus' ? 1 : -1));
      const i = $('#qty'); if (i) i.value = f.qty; updateFormDynamic(); break;
    }
    case 'pick': { const i = $('#date'); if (i && i.showPicker) { try { i.showPicker(); } catch (e) { /* not supported */ } } break; }
    case 'submit': if (type === 'dial') submitDial(); else submitForm(type); break;
    case 'pop-ok': closePopup(); break;
    case 'save-url': {
      const val = ($('#url').value || '').trim();
      if (!/^https:\/\/script\.google\.com\/.+\/exec/.test(val)) { toast('That does not look like a Web app link ending in /exec.', true); break; }
      S.url = val; store.set('url', val); S.error = ''; toast('Link saved'); refresh(); break;
    }
    case 'reset-url': S.url = CFG.scriptUrl; store.set('url', S.url); render(); refresh(); break;
    case 'discard': S.queue = S.queue.filter((e) => e.id !== el.dataset.id); saveQueue(); render(); break;
    case 'discard-failed': S.failed = S.failed.filter((e) => e.id !== el.dataset.id); saveQueue(); render(); break;
    case 'install': if (S.installEvt) { S.installEvt.prompt(); S.installEvt = null; render(); } break;
    default: break;
  }
});
document.addEventListener('input', (ev) => {
  const el = ev.target.closest('[data-bind]'); if (!el) return;
  const k = el.dataset.bind, r = route(), type = r.name;
  if (k === 'q') { S.filter.q = el.value; renderItemList(); return; }
  if (k === 'url') return;
  if (!isFormRoute(type)) return;
  const f = ensureForm(type);
  if (k === 'qty') { f.qty = el.value; updateFormDynamic(); }
  else if (k === 'date') { f.date = el.value || today(); const v = $('.datef .val'); if (v) v.textContent = dLong(f.date); }
  else if (k === 'party' || k === 'ref' || k === 'note' || k === 'used') f[k] = el.value;
});
document.addEventListener('change', (ev) => {
  const el = ev.target.closest('[data-bind]'); if (!el) return;
  const k = el.dataset.bind, r = route(), type = r.name;
  if (k === 'base') { const f = ensureForm(type); f.base = el.value; f.size = null; f.variant = null; render(); }
  else if (k === 'homeRange') { S.homeRange = Number(el.value); render(); }
});
document.addEventListener('keydown', (ev) => { if (ev.key === 'Escape' && S.sheet) { S.sheet = null; renderSheet(); } });
window.addEventListener('hashchange', onRoute);
window.addEventListener('online', () => { if (S.queue.length) sync(true); else refresh(true); });
window.addEventListener('offline', () => softRender());
let lastVis = 0;
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && Date.now() - lastVis > 30000) { lastVis = Date.now(); S.queue.length ? sync(true) : refresh(true); }
});
window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); S.installEvt = e; if (['more', 'home'].includes(route().name)) render(); });
window.addEventListener('appinstalled', () => { S.installEvt = null; toast('App installed'); });

/* ---------- Dial Out form ---------- */
function dialState() {
  const f = ensureForm('dial');
  const ds = items().filter((i) => isDial(i.code));
  if (!ds.some((d) => d.code === f.dcode)) f.dcode = ds.length ? ds[0].code : null;
  const row = ds.find((d) => d.code === f.dcode) || null;
  const q = Number(f.qty);
  const byCode = {}; items().forEach((i) => { byCode[i.code] = i; });
  const parts = row ? dialParts(row.code).map((c) => byCode[c]).filter(Boolean) : [];
  const short = parts.filter((p) => p.eff < q);
  let err = '';
  if (!row) err = 'Choose a dial size.'; else if (!(q > 0)) err = 'Enter a quantity above 0.';
  return { f, ds, row, q, parts, short, err, ok: !err };
}
function vDial() {
  const st = dialState(); const f = st.f;
  const usedFor = uniq(['Production', 'Order', 'Sample'].concat(S.history.filter((e) => e.type === 'out' && e.party).map((e) => e.party))).slice(0, 40);
  return `<div class="form dial">
    <div class="fl">Dial size<i>*</i></div>
    <div class="sizes">${st.ds.map((d) => `<button class="size ${d.code === f.dcode ? 'on' : ''}" data-act="dsize" data-v="${esc(d.code)}">${esc(sizeLabel(d.size) || d.size)}</button>`).join('') || '<div class="empty-card">No dial items loaded yet. Go back and sync first.</div>'}</div>
    <div id="fcard"></div>
    <label class="fl" for="qty">How many dials<i>*</i></label>
    <div class="qty"><button data-act="qminus" aria-label="Decrease">${ic('minus', 22, 2.2)}</button><input id="qty" type="number" inputmode="decimal" min="0" step="any" value="${esc(f.qty)}" data-bind="qty"><button data-act="qplus" aria-label="Increase">${ic('plus', 22, 2.2)}</button><span class="unit">Pcs</span></div>
    <div class="hint" id="qhint"></div>
    <div class="fl" style="margin-top:8px">Date<i>*</i></div>
    <div class="field datef" data-act="pick">${ic('cal', 22)}<span class="val">${esc(dLong(f.date))}</span>${ic('chev', 20)}<input id="date" type="date" value="${esc(f.date)}" data-bind="date" aria-label="Date"></div>
    <div class="pair">
      <div><label class="fl" for="used">Used for</label><div class="field">${ic('layers', 22)}<input id="used" list="dl-used" placeholder="Production" value="${esc(f.used)}" data-bind="used" autocomplete="off"><datalist id="dl-used">${usedFor.map((x) => `<option value="${esc(x)}">`).join('')}</datalist></div></div>
      <div><label class="fl" for="ref">Reference No.</label><div class="field">${ic('file', 22)}<input id="ref" placeholder="Voucher / Order No." value="${esc(f.ref)}" data-bind="ref" autocomplete="off"></div></div>
    </div>
    <label class="fl" for="note">Notes <small>(optional)</small></label>
    <div class="field">${ic('pencil', 20)}<input id="note" placeholder="Add notes..." value="${esc(f.note)}" data-bind="note" autocomplete="off"></div>
    <button class="submit" id="fsubmit" data-act="submit">${ic('down', 24, 2.2)}<span>Record Dial Out</span></button>
  </div>`;
}
function updateDial() {
  const st = dialState(); const card = $('#fcard'); if (!card) return;
  const q = st.q > 0 ? st.q : 0;
  if (st.row) {
    card.innerHTML = `<div class="pcard"><div class="head">${art('Dial', 76)}<div><b>${esc(st.row.code)}</b><small>${esc(st.row.title)}</small></div></div>
      <div class="parts-h">These parts go out for ${num(q)} dial${q === 1 ? '' : 's'} </div>
      ${st.parts.map((p) => `<div class="part"><span>${esc(p.title)}</span><span>${num(p.eff)} &rarr; <b class="${p.eff - q < 0 ? 'r' : ''}">${num(p.eff - q)}</b></span></div>`).join('')}</div>`;
  } else card.innerHTML = '';
  const hint = $('#qhint');
  if (hint) {
    if (st.row && st.short.length && q > 0) { hint.textContent = 'Not enough ' + st.short.map((p) => p.title).join(', ') + '. Stock will go below zero.'; hint.className = 'hint bad'; }
    else { hint.textContent = ''; hint.className = 'hint'; }
  }
  const btn = $('#fsubmit'); if (btn) btn.disabled = !st.ok;
}
async function submitDial() {
  if (S.busy) return;
  const st = dialState(); if (!st.ok) return;
  S.busy = true;
  const f = st.f;
  const e = { id: newId(), ts: Date.now(), type: 'out', code: st.row.code, qty: st.q, date: f.date || today(), party: (f.used || '').trim() || 'Production', ref: (f.ref || '').trim(), note: (f.note || '').trim() };
  S.queue.push(e); saveQueue();
  const pop = { kind: 'out', title: 'Dial Out recorded', item: st.row.title, qty: '-' + num(e.qty) + ' dial' + (e.qty === 1 ? '' : 's'), status: 'busy', msg: 'Saving to Google Sheets...' };
  f.qty = 1; f.ref = ''; f.note = '';
  render();
  const t0 = Date.now();
  showPopup(pop);
  let outcome;
  if (!navigator.onLine || !S.url) outcome = 'offline';
  else {
    await sync(true);
    outcome = S.failed.some((x) => x.id === e.id) ? 'rejected' : S.queue.some((x) => x.id === e.id) ? 'offline' : 'saved';
  }
  pop.now = 'All parts for this size were taken out';
  if (outcome === 'saved') { pop.status = 'ok'; pop.msg = 'Saved to Google Sheets'; }
  else if (outcome === 'offline') { pop.status = 'warn'; pop.msg = 'Saved on this phone. It will sync when you are online.'; }
  else { pop.status = 'bad'; pop.kind = 'bad'; pop.title = 'Not added'; pop.now = ''; pop.msg = 'The sheet rejected it: ' + (S.failed.find((x) => x.id === e.id) || {}).msg; }
  showPopup(pop);
  if (outcome === 'rejected') return;
  const wait = Math.max(t0 + 2000 - Date.now(), 1000);
  clearTimeout(popT);
  popT = setTimeout(closePopup, wait);
}

/* ================= boot ================= */
if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(() => {}));
}
onRoute();
lastVis = Date.now();
if (S.queue.length) sync(true); else refresh(true);
})();


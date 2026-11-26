const { app, BrowserWindow, WebContentsView, ipcMain, session, Menu } = require('electron');
const path = require('path'), fs = require('fs');

const ENGINES = {
  google: 'https://www.google.com/search?q=',
  duckduckgo: 'https://duckduckgo.com/?q=',
  brave: 'https://search.brave.com/search?q=',
  bing: 'https://www.bing.com/search?q=',
  yahoo: 'https://search.yahoo.com/search?p='
};
const QUICK = [
  { name: 'Scratch', url: 'https://scratch.mit.edu' },
  { name: 'Python', url: 'https://www.online-python.com' },
  { name: 'YouTube', url: 'https://www.youtube.com' },
  { name: 'GitHub', url: 'https://github.com' },
  { name: 'Google', url: 'https://www.google.com' }
];
let EDITION = 'Lazem';
try { EDITION = JSON.parse(fs.readFileSync(path.join(__dirname, 'edition.json'), 'utf8')).id || 'Lazem'; } catch (e) {}
const DEF = { engine: 'google', adblock: true, bg: '#0f172a', bgImage: '', bookmarks: [], tiles: null };
let settingsFile, settings = { ...DEF };
function load() { try { settings = { ...DEF, ...JSON.parse(fs.readFileSync(settingsFile, 'utf8')) }; } catch (e) {} }
function save() { fs.writeFileSync(settingsFile, JSON.stringify(settings, null, 2)); }

const okUrl = u => typeof u === 'string' && u.length < 2000 && /^https?:\/\/[^\s]+$/i.test(u);
const str = s => (typeof s === 'string' ? s : '').slice(0, 40);
function cleanTiles(v) {
  if (!Array.isArray(v) || v.length > 60) return null;
  const out = [];
  for (const t of v) {
    if (t && t.type === 'site' && okUrl(t.url)) out.push({ type: 'site', name: str(t.name) || t.url, url: t.url });
    else if (t && t.type === 'folder' && Array.isArray(t.items) && t.items.length <= 60)
      out.push({ type: 'folder', name: str(t.name) || 'Folder', items: t.items.filter(i => i && okUrl(i.url)).map(i => ({ type: 'site', name: str(i.name) || i.url, url: i.url })) });
    else return null;
  }
  return out;
}
let blocked = new Set(), blockedCount = 0;
function loadBlocklist() {
  const lines = fs.readFileSync(path.join(__dirname, 'blocklist.txt'), 'utf8').split('\n');
  blocked = new Set(lines.map(l => l.trim().toLowerCase()).filter(l => l && !l.startsWith('#')));
}
function isBlocked(host) {
  host = host.toLowerCase();
  while (host.includes('.')) { if (blocked.has(host)) return true; host = host.slice(host.indexOf('.') + 1); }
  return false;
}
const COSMETIC = `[id^="google_ads"],[id*="ad-slot"],[class*="adsbygoogle"],ins.adsbygoogle,[aria-label="advertisement" i],[class~="ad-banner"],[class~="ad-container"],[id^="div-gpt-ad"],iframe[src*="doubleclick"]{display:none!important}`;

let win, tabs = [], active = -1, nextId = 1;
const TOP = 112;
const homeUrl = () => 'file://' + path.join(__dirname, 'newtab.html');

function layout() {
  if (!win) return;
  const [w, h] = win.getContentSize();
  tabs.forEach(t => t.view.setBounds(t.id === active ? { x: 0, y: TOP, width: w, height: h - TOP } : { x: 0, y: 0, width: 0, height: 0 }));
}
function state() {
  return {
    tabs: tabs.map(t => ({ id: t.id, title: t.view.webContents.getTitle() || 'تبويب جديد', url: t.view.webContents.getURL() })),
    active, settings, engines: Object.keys(ENGINES), blockedCount,
    canBack: cur()?.view.webContents.navigationHistory.canGoBack() || false,
    canFwd: cur()?.view.webContents.navigationHistory.canGoForward() || false
  };
}
const cur = () => tabs.find(t => t.id === active);
function push() { if (win && !win.isDestroyed()) win.webContents.send('state', state()); }

function newTab(url) {
  const view = new WebContentsView({ webPreferences: { preload: path.join(__dirname, 'newtab-preload.js'), contextIsolation: true, sandbox: true } });
  const t = { id: nextId++, view };
  tabs.push(t); win.contentView.addChildView(view);
  const wc = view.webContents;
  ['page-title-updated', 'did-navigate', 'did-navigate-in-page', 'did-start-loading', 'did-stop-loading'].forEach(e => wc.on(e, push));
  wc.on('did-finish-load', () => { if (settings.adblock && !wc.getURL().startsWith('file:')) wc.insertCSS(COSMETIC).catch(() => {}); });
  wc.setWindowOpenHandler(({ url }) => { if (/^https?:\/\//i.test(url)) newTab(url); return { action: 'deny' }; });
  wc.on('will-navigate', (e, u) => { if (!/^https?:\/\//i.test(u) && u !== homeUrl()) e.preventDefault(); });
  wc.on('will-redirect', (e, u) => { if (!/^https?:\/\//i.test(u)) e.preventDefault(); });
  wc.loadURL(url || homeUrl());
  switchTab(t.id);
}
function switchTab(id) { active = id; layout(); push(); }
function closeTab(id) {
  const i = tabs.findIndex(t => t.id === id); if (i < 0) return;
  win.contentView.removeChildView(tabs[i].view); tabs[i].view.webContents.close(); tabs.splice(i, 1);
  if (!tabs.length) return newTab();
  if (active === id) active = tabs[Math.min(i, tabs.length - 1)].id;
  layout(); push();
}
function go(input) {
  input = (input || '').trim(); if (!input) return;
  let url;
  if (/^https?:\/\//i.test(input)) url = input;
  else if (/^[a-z][a-z0-9+.-]*:/i.test(input) && !/^localhost(:\d+)?/i.test(input) && !/^[^\s\/]+:\d+/.test(input)) return; // block file:, javascript:, data:, etc.
  else if (/^[^\s]+\.[a-z]{2,}(\/.*)?$/i.test(input) || /^localhost(:\d+)?/.test(input)) url = 'https://' + input;
  else url = ENGINES[settings.engine] + encodeURIComponent(input);
  cur().view.webContents.loadURL(url);
}

app.whenReady().then(() => {
  settingsFile = path.join(app.getPath('userData'), 'settings.json'); load(); loadBlocklist();
  session.defaultSession.setPermissionRequestHandler((wc, perm, cb) => cb(false));
  session.defaultSession.setPermissionCheckHandler(() => false);
  session.defaultSession.webRequest.onBeforeRequest((d, cb) => {
    if (settings.adblock && d.resourceType !== 'mainFrame') {
      try { if (isBlocked(new URL(d.url).hostname)) { blockedCount++; return cb({ cancel: true }); } } catch (e) {}
    }
    cb({});
  });
  win = new BrowserWindow({ width: 1280, height: 800, title: 'Lazem Browser (' + EDITION + ')', backgroundColor: '#0f172a',
    webPreferences: { preload: path.join(__dirname, 'ui-preload.js'), contextIsolation: true } });
  Menu.setApplicationMenu(null);
  win.loadFile('ui.html');
  win.on('resize', layout);
  win.webContents.once('did-finish-load', () => newTab(process.env.LAZEM_START_URL));
  setInterval(push, 1500);

  ipcMain.on('new-tab', (e, u) => newTab(u));
  ipcMain.on('close-tab', (e, id) => closeTab(id));
  ipcMain.on('switch-tab', (e, id) => switchTab(id));
  ipcMain.on('go', (e, v) => { if (typeof v === 'string') go(v); });
  ipcMain.on('back', () => cur()?.view.webContents.navigationHistory.goBack());
  ipcMain.on('forward', () => cur()?.view.webContents.navigationHistory.goForward());
  ipcMain.on('reload', () => cur()?.view.webContents.reload());
  ipcMain.on('home', () => cur()?.view.webContents.loadURL(homeUrl()));
  ipcMain.on('set', (e, k, v) => {
    if (!(k in DEF) || k === 'bookmarks') return;
    if (k === 'engine' && !ENGINES[v]) return;
    if (k === 'adblock') v = !!v;
    if (k === 'bg' && !/^#[0-9a-f]{6}$/i.test(v)) return;
    if (k === 'tiles') { v = cleanTiles(v); if (!v) return; }
    if (k === 'bgImage' && v && !/^https?:\/\/[^\s"'()\\]+$/i.test(v)) return;
    settings[k] = v; save(); push(); });
  ipcMain.on('bookmark', () => {
    const u = cur().view.webContents.getURL(); if (!u || u.startsWith('file:')) return;
    const i = settings.bookmarks.findIndex(b => b.url === u);
    if (i >= 0) settings.bookmarks.splice(i, 1); else settings.bookmarks.push({ name: cur().view.webContents.getTitle() || u, url: u });
    save(); push();
  });
  ipcMain.handle('newtab-data', () => ({ quick: QUICK.map(q => ({ type: 'site', ...q })), settings, edition: EDITION }));
    ipcMain.handle('is-blocked-test', (e, h) => isBlocked(h));
});
app.on('window-all-closed', () => app.quit());

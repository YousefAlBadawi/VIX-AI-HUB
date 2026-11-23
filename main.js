'use strict';
/**
 * VIX-AI HUB — main process
 * One hub for AI chat sites that have no desktop app.
 */
const { app, BrowserWindow, Menu, Tray, ipcMain, globalShortcut, shell,
        session, nativeTheme, dialog, clipboard, Notification } = require('electron');
const path = require('path');
const fs = require('fs');
const https = require('https');

const APP_ID = 'com.vixai.hub';
const UPDATE_REPO = 'YousefAlBadawi/VIX-AI-HUB'; // GitHub repo used for update checks

app.setAppUserModelId(APP_ID);

/* ------------------------------------------------------------------ */
/* Tiny JSON store (userData/sites.json + settings.json)               */
/* ------------------------------------------------------------------ */
const userDataPath = () => app.getPath('userData');
const storeFile = (name) => path.join(userDataPath(), name + '.json');

function readStore(name, fallback) {
  try {
    return JSON.parse(fs.readFileSync(storeFile(name), 'utf8'));
  } catch {
    return fallback;
  }
}
function writeStore(name, data) {
  fs.mkdirSync(userDataPath(), { recursive: true });
  fs.writeFileSync(storeFile(name), JSON.stringify(data, null, 2));
}

const DEFAULT_SITES = [
  { id: 'zai',       name: 'Z.ai',       url: 'https://chat.z.ai/',          color: '#6366F1' },
  { id: 'deepseek',  name: 'DeepSeek',   url: 'https://chat.deepseek.com/',  color: '#4D6BFE' },
  { id: 'kimi',      name: 'Kimi',       url: 'https://www.kimi.com/',       color: '#7C5CFF' },
  { id: 'qwen',      name: 'Qwen',       url: 'https://chat.qwen.ai/',       color: '#615CED' },
  { id: 'grok',      name: 'Grok',       url: 'https://grok.com/',           color: '#1F2937' },
  { id: 'lechat',    name: 'Le Chat',    url: 'https://chat.mistral.ai/',    color: '#FF7000' },
  { id: 'notebooklm',name: 'NotebookLM', url: 'https://notebooklm.google.com/', color: '#1A73E8' },
  { id: 'perplexity',name: 'Perplexity', url: 'https://www.perplexity.ai/',  color: '#20808D' },
  { id: 'huggingchat',name: 'HuggingChat', url: 'https://huggingface.co/chat/', color: '#FFD21E' },
  { id: 'poe',       name: 'Poe',        url: 'https://poe.com/',            color: '#8B5CF6' }
];

const DEFAULT_SETTINGS = {
  theme: 'system',        // 'system' | 'dark' | 'light'
  closeAction: 'tray',    // 'tray' | 'exit'
  lastSiteId: null,       // restore last open site
  dismissedUpdate: null   // version whose banner was dismissed
};

function getSites() {
  const s = readStore('sites', null);
  if (Array.isArray(s) && s.length) return s;
  writeStore('sites', DEFAULT_SITES);
  return DEFAULT_SITES;
}
function getSettings() {
  return Object.assign({}, DEFAULT_SETTINGS, readStore('settings', {}));
}

/* ------------------------------------------------------------------ */
/* Window / tray                                                       */
/* ------------------------------------------------------------------ */
let mainWindow = null;
let tray = null;
let trayHintShown = false;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 900,
    minHeight: 560,
    show: false,
    backgroundColor: '#0B0E1A',
    icon: path.join(__dirname, 'build', 'icon-256.png'),
    autoHideMenuBar: true,
    title: 'VIX-AI HUB',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      spellcheck: true
    }
  });

  mainWindow.loadFile(path.join(__dirname, 'renderer', 'index.html'));
  mainWindow.once('ready-to-show', () => mainWindow.show());

  mainWindow.on('close', (e) => {
    const settings = getSettings();
    if (settings.closeAction === 'tray' && !app.isQuitting) {
      e.preventDefault();
      mainWindow.hide();
      if (!trayHintShown) {
        trayHintShown = true;
        if (Notification.isSupported()) {
          new Notification({
            title: 'VIX-AI HUB',
            body: 'Still running in the tray. Double-click the tray icon to reopen, or use Ctrl+Alt+H.',
            icon: path.join(__dirname, 'build', 'tray.png')
          }).show();
        }
      }
    }
  });

  mainWindow.on('closed', () => { mainWindow = null; });
}

function showMainWindow() {
  if (!mainWindow) return createWindow();
  if (mainWindow.isMinimized()) mainWindow.restore();
  mainWindow.show();
  mainWindow.focus();
}

function createTray() {
  tray = new Tray(path.join(__dirname, 'build', 'tray-32.png'));
  tray.setToolTip('VIX-AI HUB');
  const menu = Menu.buildFromTemplate([
    { label: 'Show VIX-AI HUB', click: showMainWindow },
    { type: 'separator' },
    { label: 'Quit', click: () => { app.isQuitting = true; app.quit(); } }
  ]);
  tray.setContextMenu(menu);
  tray.on('double-click', showMainWindow);
}

/* ------------------------------------------------------------------ */
/* Menu + shortcuts                                                    */
/* ------------------------------------------------------------------ */
function buildMenu() {
  const template = [
    {
      label: 'File',
      submenu: [
        { label: 'New Tab', accelerator: 'CmdOrCtrl+T', click: () => mainWindow?.webContents.send('shortcut', 'new-tab') },
        { label: 'Close Tab', accelerator: 'CmdOrCtrl+W', click: () => mainWindow?.webContents.send('shortcut', 'close-tab') },
        { type: 'separator' },
        { label: 'Settings', accelerator: 'CmdOrCtrl+,', click: () => mainWindow?.webContents.send('shortcut', 'settings') },
        { type: 'separator' },
        { label: 'Quit', accelerator: 'CmdOrCtrl+Q', click: () => { app.isQuitting = true; app.quit(); } }
      ]
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'copy' }, { role: 'paste' }, { role: 'cut' }, { role: 'selectAll' },
        { type: 'separator' },
        { label: 'Find Site', accelerator: 'CmdOrCtrl+F', click: () => mainWindow?.webContents.send('shortcut', 'find') }
      ]
    },
    {
      label: 'View',
      submenu: [
        { label: 'Reload', accelerator: 'CmdOrCtrl+R', click: () => mainWindow?.webContents.send('shortcut', 'reload') },
        { label: 'Zoom In', accelerator: 'CmdOrCtrl+=', click: () => mainWindow?.webContents.send('shortcut', 'zoom-in') },
        { label: 'Zoom Out', accelerator: 'CmdOrCtrl+-', click: () => mainWindow?.webContents.send('shortcut', 'zoom-out') },
        { label: 'Reset Zoom', accelerator: 'CmdOrCtrl+0', click: () => mainWindow?.webContents.send('shortcut', 'zoom-reset') },
        { type: 'separator' },
        { role: 'togglefullscreen' }
      ]
    },
    {
      label: 'Tabs',
      submenu: [1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => ({
        label: `Tab ${n}`,
        accelerator: `CmdOrCtrl+${n}`,
        click: () => mainWindow?.webContents.send('shortcut', 'switch-tab', n - 1)
      }))
    },
    {
      label: 'Help',
      submenu: [
        { label: 'Check for Updates', click: () => checkForUpdates(true) },
        { label: 'About VIX-AI HUB', click: () => mainWindow?.webContents.send('shortcut', 'about') }
      ]
    }
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

/* ------------------------------------------------------------------ */
/* Session hardening: permissions, downloads, UA, popups                */
/* ------------------------------------------------------------------ */
function setupSession() {
  const ses = session.fromPartition('persist:vixai');

  // Strip Electron from the UA so sites treat us like a normal Chrome browser.
  const ua = ses.getUserAgent()
    .replace(/\s*Electron\/\S+/i, '')
    .replace(/\s*VIX-AI HUB\/\S+/i, '');
  ses.setUserAgent(ua);

  const ALLOWED = new Set(['media', 'notifications', 'fullscreen', 'pointerLock',
    'clipboard-sanitized-write', 'display-capture', 'mediaKeySystem']);
  ses.setPermissionRequestHandler((wc, permission, cb) => {
    cb(ALLOWED.has(permission));
  });
  ses.setPermissionCheckHandler(() => true);

  // Downloads -> user's Downloads folder, with a completion notification.
  ses.on('will-download', (event, item) => {
    try {
      const dir = app.getPath('downloads');
      let target = path.join(dir, item.getFilename());
      let i = 1;
      const ext = path.extname(target);
      const base = target.slice(0, target.length - ext.length);
      while (fs.existsSync(target)) target = `${base} (${i++})${ext}`;
      item.setSavePath(target);
      item.once('done', (_e, state) => {
        if (Notification.isSupported()) {
          new Notification({
            title: state === 'completed' ? 'Download complete' : 'Download failed',
            body: state === 'completed' ? item.getFilename() : `${item.getFilename()} — ${state}`,
            icon: path.join(__dirname, 'build', 'tray.png')
          }).show();
        }
      });
    } catch { /* let Electron show the save dialog instead */ }
  });

  return ses;
}

/* Popups: OAuth logins open as small child windows (they need window.opener),
   everything else becomes a new tab inside the hub. */
const POPUP_HOSTS = ['accounts.google.com', 'accounts.youtube.com', 'login.microsoftonline.com',
  'appleid.apple.com', 'login.live.com', 'auth.openai.com', 'clerk.', 'okta.com', 'auth0.com'];

app.on('web-contents-created', (_event, contents) => {
  contents.setWindowOpenHandler(({ url }) => {
    if (!/^https?:/i.test(url)) return { action: 'deny' };
    let host = '';
    try { host = new URL(url).hostname; } catch { return { action: 'deny' }; }
    const isPopup = POPUP_HOSTS.some(h => host === h || host.endsWith('.' + h));
    if (isPopup) {
      return {
        action: 'allow',
        overrideBrowserWindowOptions: {
          width: 520, height: 680, autoHideMenuBar: true,
          backgroundColor: '#0B0E1A',
          icon: path.join(__dirname, 'build', 'icon-256.png'),
          webPreferences: { session: contents.session }
        }
      };
    }
    mainWindow?.webContents.send('open-url-as-tab', url);
    return { action: 'deny' };
  });
});

// Security: webviews get a locked-down configuration.
app.on('web-contents-created', (_e, contents) => {
  contents.on('will-attach-webview', (event, webPreferences, params) => {
    delete webPreferences.preload;
    webPreferences.nodeIntegration = false;
    webPreferences.contextIsolation = true;
    if (!params.partition || !params.partition.startsWith('persist:vixai')) {
      params.partition = 'persist:vixai';
    }
  });
});

/* ------------------------------------------------------------------ */
/* Update check (GitHub Releases)                                      */
/* ------------------------------------------------------------------ */
function fetchJSON(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { headers: { 'User-Agent': 'VIX-AI-HUB-Updater' }, timeout: 10000 }, (res) => {
      if (res.statusCode < 200 || res.statusCode >= 300) { res.resume(); return reject(new Error('HTTP ' + res.statusCode)); }
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => { try { resolve(JSON.parse(Buffer.concat(chunks).toString())); } catch (e) { reject(e); } });
    });
    req.on('timeout', () => req.destroy(new Error('timeout')));
    req.on('error', reject);
  });
}

function cmpVersions(a, b) {
  const pa = String(a).replace(/^v/, '').split('.').map(Number);
  const pb = String(b).replace(/^v/, '').split('.').map(Number);
  for (let i = 0; i < 3; i++) {
    if ((pa[i] || 0) !== (pb[i] || 0)) return (pa[i] || 0) - (pb[i] || 0);
  }
  return 0;
}

async function checkForUpdates(manual = false) {
  const current = app.getVersion();
  try {
    const rel = await fetchJSON(`https://api.github.com/repos/${UPDATE_REPO}/releases/latest`);
    const latest = (rel.tag_name || '').replace(/^v/, '');
    if (latest && cmpVersions(latest, current) > 0) {
      mainWindow?.webContents.send('update-available', { current, latest, url: rel.html_url, notes: rel.body || '' });
    } else if (manual) {
      mainWindow?.webContents.send('update-status', { current, latest, upToDate: true });
    }
  } catch (e) {
    if (manual) mainWindow?.webContents.send('update-status', { current, error: String(e.message || e) });
  }
}

/* ------------------------------------------------------------------ */
/* IPC surface for the renderer                                        */
/* ------------------------------------------------------------------ */
function registerIPC() {
  ipcMain.handle('sites:get', () => getSites());

  ipcMain.handle('sites:add', (_e, site) => {
    const sites = getSites();
    const name = String(site?.name || '').trim().slice(0, 40);
    let url = String(site?.url || '').trim();
    if (!name) throw new Error('Name is required');
    if (!/^https?:\/\//i.test(url)) url = 'https://' + url;
    const u = new URL(url); // throws on invalid
    if (!/^https?:$/.test(u.protocol)) throw new Error('Only http(s) URLs are allowed');
    const id = 'site-' + Date.now().toString(36);
    const entry = {
      id,
      name,
      url: u.href,
      color: /^#[0-9a-fA-F]{6}$/.test(site.color) ? site.color : '#6366F1'
    };
    sites.push(entry);
    writeStore('sites', sites);
    return entry;
  });

  ipcMain.handle('sites:remove', (_e, id) => {
    let sites = getSites();
    sites = sites.filter((s) => s.id !== id);
    writeStore('sites', sites);
    return sites;
  });

  ipcMain.handle('settings:get', () => getSettings());

  ipcMain.handle('settings:set', (_e, patch) => {
    const s = getSettings();
    const next = Object.assign({}, s, patch);
    if (!['system', 'dark', 'light'].includes(next.theme)) next.theme = 'system';
    if (!['tray', 'exit'].includes(next.closeAction)) next.closeAction = 'tray';
    writeStore('settings', next);
    if (patch.theme) nativeTheme.themeSource = next.theme;
    return next;
  });

  ipcMain.handle('app:info', () => ({
    version: app.getVersion(),
    repo: UPDATE_REPO,
    electron: process.versions.electron,
    chrome: process.versions.chrome,
    platform: process.platform
  }));

  ipcMain.handle('updates:check', () => checkForUpdates(true));

  ipcMain.handle('shell:open', (_e, url) => {
    if (/^https?:\/\//i.test(url)) shell.openExternal(url);
  });

  ipcMain.handle('clipboard:write', (_e, text) => clipboard.writeText(String(text)));

  ipcMain.on('window:minimize', () => mainWindow?.minimize());
  ipcMain.on('window:maximize', () => mainWindow?.isMaximized() ? mainWindow.unmaximize() : mainWindow?.maximize());
  ipcMain.on('window:close', () => mainWindow?.close());
}

/* ------------------------------------------------------------------ */
/* Boot                                                                */
/* ------------------------------------------------------------------ */
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on('second-instance', showMainWindow);

  app.whenReady().then(() => {
    setupSession();
    const settings = getSettings();
    nativeTheme.themeSource = settings.theme || 'system';
    createWindow();
    createTray();
    buildMenu();
    registerIPC();

    globalShortcut.register('CommandOrControl+Alt+H', () => {
      if (mainWindow?.isVisible() && mainWindow.isFocused()) mainWindow.hide();
      else showMainWindow();
    });

    // Non-fatal update check shortly after launch.
    setTimeout(() => checkForUpdates(false), 4000);

    app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
  });

  app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });

  app.on('before-quit', () => { app.isQuitting = true; globalShortcut.unregisterAll(); });
}

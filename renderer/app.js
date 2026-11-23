'use strict';
/* VIX-AI HUB — renderer logic (tabs, sidebar, settings, updates) */

const $ = (sel) => document.querySelector(sel);
const els = {
  banner: $('#update-banner'), bannerText: $('#update-banner .update-text'),
  app: $('#app'), siteList: $('#site-list'), search: $('#site-search'),
  tabs: $('#tabs'), views: $('#views'), home: $('#home'), homeGrid: $('#home-grid'),
  modalAdd: $('#modal-add'), addName: $('#add-name'), addUrl: $('#add-url'),
  addColor: $('#add-color'), addError: $('#add-error'), colorPresets: $('#color-presets'),
  modalSettings: $('#modal-settings'), modalConfirm: $('#modal-confirm'),
  confirmText: $('#confirm-text'), toast: $('#toast')
};

const state = {
  sites: [],
  settings: {},
  tabs: [],          // [{ id, siteId, webviewEl, tabEl }]
  activeTabId: null
};

/* ------------------------------------------------------------------ */
/* utils                                                               */
/* ------------------------------------------------------------------ */
function hostOf(url) { try { return new URL(url).hostname.replace(/^www\./, ''); } catch { return url; } }
function letterOf(name) { return (name.trim()[0] || '?').toUpperCase(); }
function siteById(id) { return state.sites.find((s) => s.id === id) || null; }
function siteColor(site) { return site.color || '#6366F1'; }

let toastTimer = null;
function toast(msg) {
  els.toast.textContent = msg;
  els.toast.classList.remove('hidden');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => els.toast.classList.add('hidden'), 2400);
}

function applyTheme() {
  const want = state.settings.theme || 'system';
  const dark = want === 'system'
    ? window.matchMedia('(prefers-color-scheme: dark)').matches
    : want === 'dark';
  document.body.classList.toggle('light', !dark);
}
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
  if ((state.settings.theme || 'system') === 'system') applyTheme();
});

/* ------------------------------------------------------------------ */
/* sidebar + home grid                                                 */
/* ------------------------------------------------------------------ */
function renderSidebar() {
  const q = els.search.value.trim().toLowerCase();
  els.siteList.innerHTML = '';
  const activeSiteId = activeTab()?.siteId;
  for (const site of state.sites) {
    if (q && !site.name.toLowerCase().includes(q) && !site.url.toLowerCase().includes(q)) continue;
    const item = document.createElement('div');
    item.className = 'site-item' + (site.id === activeSiteId ? ' active' : '');
    item.dataset.id = site.id;
    item.innerHTML = `
      <span class="site-dot" style="background:${siteColor(site)}"></span>
      <span class="site-name"></span>
      <button class="site-remove" title="Remove site">×</button>`;
    item.querySelector('.site-name').textContent = site.name;
    item.addEventListener('click', () => openSite(site.id));
    item.querySelector('.site-remove').addEventListener('click', (e) => {
      e.stopPropagation();
      askRemove(site);
    });
    els.siteList.appendChild(item);
  }
  if (!els.siteList.children.length) {
    const empty = document.createElement('div');
    empty.className = 'site-item';
    empty.style.cursor = 'default';
    empty.textContent = q ? 'No matching sites' : 'No sites yet — add one below';
    els.siteList.appendChild(empty);
  }
}

function renderHome() {
  els.homeGrid.innerHTML = '';
  for (const site of state.sites) {
    const card = document.createElement('div');
    card.className = 'site-card';
    card.style.setProperty('--card-color', siteColor(site));
    card.innerHTML = `
      <button class="card-remove" title="Remove site">×</button>
      <div class="card-letter"></div>
      <div class="card-name"></div>
      <div class="card-host"></div>`;
    card.querySelector('.card-letter').textContent = letterOf(site.name);
    card.querySelector('.card-name').textContent = site.name;
    card.querySelector('.card-host').textContent = hostOf(site.url);
    card.addEventListener('click', () => openSite(site.id));
    card.querySelector('.card-remove').addEventListener('click', (e) => {
      e.stopPropagation();
      askRemove(site);
    });
    els.homeGrid.appendChild(card);
  }
  if (!state.sites.length) {
    const empty = document.createElement('p');
    empty.className = 'home-hint';
    empty.textContent = 'No sites yet — click "Add site" below to add your first AI site.';
    els.homeGrid.appendChild(empty);
  }
}

/* ------------------------------------------------------------------ */
/* tabs + webviews                                                     */
/* ------------------------------------------------------------------ */
function activeTab() { return state.tabs.find((t) => t.id === state.activeTabId) || null; }

function openSite(siteId, { focus = true } = {}) {
  const site = siteById(siteId);
  if (!site) return;
  let entry = state.tabs.find((t) => t.siteId === siteId);
  if (!entry) {
    const id = 'tab-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    // webview
    const wv = document.createElement('webview');
    wv.setAttribute('src', site.url);
    wv.setAttribute('partition', 'persist:vixai');
    wv.setAttribute('allowpopups', '');
    wv.setAttribute('webpreferences', 'contextIsolation=yes, nodeIntegration=no, autoplayPolicy=document-user-activation-required');
    els.views.appendChild(wv);
    // tab
    const tabEl = document.createElement('div');
    tabEl.className = 'tab';
    tabEl.dataset.id = id;
    tabEl.innerHTML = `
      <span class="tab-dot" style="background:${siteColor(site)}"></span>
      <span class="tab-label"></span>
      <button class="tab-close" title="Close tab">×</button>`;
    tabEl.querySelector('.tab-label').textContent = site.name;
    tabEl.addEventListener('click', (e) => { if (!e.target.closest('.tab-close')) activateTab(id); });
    tabEl.querySelector('.tab-close').addEventListener('click', (e) => { e.stopPropagation(); closeTab(id); });
    els.tabs.appendChild(tabEl);

    entry = { id, siteId, webviewEl: wv, tabEl };
    state.tabs.push(entry);

    wv.addEventListener('page-title-updated', (e) => {
      if (e.title && tabEl.isConnected) tabEl.querySelector('.tab-label').textContent = e.title.slice(0, 30);
    });
  }
  if (focus) activateTab(entry.id);
}

function activateTab(id) {
  state.activeTabId = id;
  for (const t of state.tabs) {
    const on = t.id === id;
    t.tabEl.classList.toggle('active', on);
    t.webviewEl.classList.toggle('hidden', !on);
  }
  const anyActive = state.tabs.some((t) => t.id === id);
  els.home.classList.toggle('hidden', anyActive);
  renderSidebar();
  const t = activeTab();
  if (t) {
    els.settings && saveLastSite(t.siteId);
    t.webviewEl.blur(); t.webviewEl.focus();
  }
}

function saveLastSite(siteId) {
  if (state.settings.lastSiteId === siteId) return;
  state.settings.lastSiteId = siteId;
  window.vix.setSettings({ lastSiteId: siteId }).then((s) => { state.settings = s; });
}

function closeTab(id) {
  const idx = state.tabs.findIndex((t) => t.id === id);
  if (idx === -1) return;
  const [t] = state.tabs.splice(idx, 1);
  t.webviewEl.remove();
  t.tabEl.remove();
  if (state.activeTabId === id) {
    const next = state.tabs[Math.min(idx, state.tabs.length - 1)];
    if (next) activateTab(next.id);
    else { state.activeTabId = null; els.home.classList.remove('hidden'); renderSidebar(); }
  }
}

/* ------------------------------------------------------------------ */
/* modals                                                              */
/* ------------------------------------------------------------------ */
const PRESETS = ['#6366F1', '#22D3EE', '#4D6BFE', '#7C5CFF', '#1A73E8', '#FF7000',
  '#F59E0B', '#10B981', '#EF4444', '#EC4899', '#8B5CF6', '#64748B'];

function openAddModal() {
  els.addName.value = '';
  els.addUrl.value = '';
  els.addColor.value = PRESETS[Math.floor(Math.random() * PRESETS.length)];
  els.addError.classList.add('hidden');
  renderPresets();
  els.modalAdd.classList.remove('hidden');
  els.addName.focus();
}
function renderPresets() {
  els.colorPresets.innerHTML = '';
  for (const c of PRESETS) {
    const b = document.createElement('button');
    b.className = 'preset' + (c.toLowerCase() === els.addColor.value.toLowerCase() ? ' selected' : '');
    b.style.background = c;
    b.title = c;
    b.addEventListener('click', () => { els.addColor.value = c; renderPresets(); });
    els.colorPresets.appendChild(b);
  }
}
async function saveAddModal() {
  const name = els.addName.value.trim();
  const url = els.addUrl.value.trim();
  els.addError.classList.add('hidden');
  try {
    const site = await window.vix.addSite({ name, url, color: els.addColor.value });
    state.sites = await window.vix.getSites();
    renderSidebar(); renderHome();
    els.modalAdd.classList.add('hidden');
    toast(`Added "${site.name}"`);
    openSite(site.id);
  } catch (e) {
    els.addError.textContent = String(e.message || e);
    els.addError.classList.remove('hidden');
  }
}

let pendingRemove = null;
function askRemove(site) {
  pendingRemove = site;
  els.confirmText.textContent = `Remove "${site.name}" (${hostOf(site.url)}) from the hub? You can add it again later. This does not delete your site account or logins.`;
  els.modalConfirm.classList.remove('hidden');
}
async function confirmRemove() {
  if (!pendingRemove) return;
  const site = pendingRemove;
  pendingRemove = null;
  els.modalConfirm.classList.add('hidden');
  state.sites = await window.vix.removeSite(site.id);
  const t = state.tabs.find((t) => t.siteId === site.id);
  if (t) closeTab(t.id);
  renderSidebar(); renderHome();
  toast(`Removed "${site.name}"`);
}

/* ---------- settings modal ---------- */
function syncSettingsUI() {
  document.querySelectorAll('#seg-theme button').forEach((b) =>
    b.classList.toggle('active', b.dataset.value === (state.settings.theme || 'system')));
  document.querySelectorAll('#seg-close button').forEach((b) =>
    b.classList.toggle('active', b.dataset.value === (state.settings.closeAction || 'tray')));
  $('#chk-restore').checked = state.settings.restoreLast !== false;
}
function openSettings() {
  syncSettingsUI();
  els.modalSettings.classList.remove('hidden');
}
async function patchSettings(patch) {
  state.settings = await window.vix.setSettings(patch);
  applyTheme();
}

/* ------------------------------------------------------------------ */
/* update banner                                                       */
/* ------------------------------------------------------------------ */
function showUpdateBanner(info) {
  if (state.settings.dismissedUpdate === info.latest) return;
  els.bannerText.textContent = `Version ${info.latest} is available — you have ${info.current}.`;
  els.banner.dataset.url = info.url;
  els.banner.classList.remove('hidden');
  els.app.classList.add('has-banner');
}

/* ------------------------------------------------------------------ */
/* boot                                                                */
/* ------------------------------------------------------------------ */
async function init() {
  state.sites = await window.vix.getSites();
  state.settings = await window.vix.getSettings();

  applyTheme();
  renderSidebar();
  renderHome();

  const info = await window.vix.appInfo();
  $('#about-line').textContent = `VIX-AI HUB v${info.version} · Electron ${info.electron} · Chrome ${info.chrome}`;

  // restore last site (setting: restoreLast, default true)
  const lastId = state.settings.lastSiteId;
  if (state.settings.restoreLast !== false && lastId && siteById(lastId)) {
    openSite(lastId);
  }

  /* --- wiring --- */
  $('#btn-home').addEventListener('click', () => {
    state.activeTabId = null;
    for (const t of state.tabs) { t.tabEl.classList.remove('active'); t.webviewEl.classList.add('hidden'); }
    els.home.classList.remove('hidden');
    renderSidebar();
  });
  $('#btn-add').addEventListener('click', openAddModal);
  $('#btn-settings').addEventListener('click', openSettings);
  $('#btn-newtab').addEventListener('click', () => {
    // new tab = focus home to pick a site (no blank-tab concept for sites)
    $('#btn-home').click();
    els.search.focus();
  });
  els.search.addEventListener('input', renderSidebar);

  // window controls
  $('#win-min').addEventListener('click', () => window.vix.minimize());
  $('#win-max').addEventListener('click', () => window.vix.maximize());
  $('#win-close').addEventListener('click', () => window.vix.close());

  // add modal
  $('#add-save').addEventListener('click', saveAddModal);
  $('#add-cancel').addEventListener('click', () => els.modalAdd.classList.add('hidden'));
  els.modalAdd.addEventListener('click', (e) => { if (e.target === els.modalAdd) els.modalAdd.classList.add('hidden'); });
  els.addUrl.addEventListener('keydown', (e) => { if (e.key === 'Enter') saveAddModal(); });
  els.addName.addEventListener('keydown', (e) => { if (e.key === 'Enter') els.addUrl.focus(); });

  // confirm modal
  $('#confirm-ok').addEventListener('click', confirmRemove);
  $('#confirm-cancel').addEventListener('click', () => els.modalConfirm.classList.add('hidden'));

  // settings modal
  $('#settings-close').addEventListener('click', () => els.modalSettings.classList.add('hidden'));
  els.modalSettings.addEventListener('click', (e) => { if (e.target === els.modalSettings) els.modalSettings.classList.add('hidden'); });
  $('#seg-theme').addEventListener('click', (e) => {
    const b = e.target.closest('button'); if (b) patchSettings({ theme: b.dataset.value });
  });
  $('#seg-close').addEventListener('click', (e) => {
    const b = e.target.closest('button'); if (b) patchSettings({ closeAction: b.dataset.value });
  });
  $('#chk-restore').addEventListener('change', (e) => patchSettings({ restoreLast: e.target.checked }));
  $('#btn-check-update').addEventListener('click', async () => {
    $('#update-status-line').textContent = 'Checking…';
    await window.vix.checkUpdates();
    setTimeout(() => { $('#update-status-line').textContent = 'Looks for a newer release on GitHub at launch.'; }, 4000);
  });
  $('#btn-repo').addEventListener('click', () => window.vix.openExternal(`https://github.com/${info.repo}`));

  // update banner buttons
  $('#update-get').addEventListener('click', () => {
    window.vix.openExternal(els.banner.dataset.url || `https://github.com/${info.repo}/releases/latest`);
  });
  $('#update-dismiss').addEventListener('click', async () => {
    els.banner.classList.add('hidden');
    els.app.classList.remove('has-banner');
    const m = els.bannerText.textContent.match(/Version (\S+) is available/);
    if (m) await patchSettings({ dismissedUpdate: m[1] });
  });

  // keyboard (renderer-side): Esc closes modals
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      for (const m of [els.modalAdd, els.modalSettings, els.modalConfirm]) m.classList.add('hidden');
    }
  });

  // events from main
  window.vix.onShortcut((action, arg) => {
    switch (action) {
      case 'new-tab': $('#btn-newtab').click(); break;
      case 'close-tab': if (activeTab()) closeTab(activeTab().id); break;
      case 'settings': openSettings(); break;
      case 'find': els.search.focus(); els.search.select(); break;
      case 'reload': { const t = activeTab(); if (t) t.webviewEl.reloadIgnoringCache(); break; }
      case 'zoom-in': { const t = activeTab(); if (t) t.webviewEl.setZoomLevel(Math.min(5, t.webviewEl.getZoomLevel() + 0.5)); break; }
      case 'zoom-out': { const t = activeTab(); if (t) t.webviewEl.setZoomLevel(Math.max(-5, t.webviewEl.getZoomLevel() - 0.5)); break; }
      case 'zoom-reset': { const t = activeTab(); if (t) t.webviewEl.setZoomLevel(0); break; }
      case 'switch-tab': {
        const t = state.tabs[arg];
        if (t) activateTab(t.id);
        break;
      }
      case 'about': openSettings(); break;
    }
  });
  window.vix.onOpenUrlAsTab((url) => {
    // turn a popup URL into a temp tab (e.g. share links)
    const site = { id: 'ext-' + Date.now().toString(36), name: hostOf(url), url, color: '#64748B' };
    state.sites.push(site);
    openSiteTemp(site, url);
  });

  window.vix.onUpdateAvailable(showUpdateBanner);
  window.vix.onUpdateStatus((st) => {
    const line = $('#update-status-line');
    if (st.upToDate) line.textContent = `You are up to date (v${st.current}).`;
    else if (st.error) line.textContent = 'Could not check for updates (offline or rate-limited).';
  });

  // simulate the hub's own CSP-safe favicon fetch: none needed; letters used.
}

/* Temp tab for external URLs opened from webviews (not persisted as a site). */
function openSiteTemp(site, url) {
  const id = 'tab-' + Date.now().toString(36);
  const wv = document.createElement('webview');
  wv.setAttribute('src', url);
  wv.setAttribute('partition', 'persist:vixai');
  wv.setAttribute('allowpopups', '');
  els.views.appendChild(wv);
  const tabEl = document.createElement('div');
  tabEl.className = 'tab';
  tabEl.dataset.id = id;
  tabEl.innerHTML = `
    <span class="tab-dot" style="background:${site.color}"></span>
    <span class="tab-label"></span>
    <button class="tab-close" title="Close tab">×</button>`;
  tabEl.querySelector('.tab-label').textContent = site.name;
  tabEl.addEventListener('click', (e) => { if (!e.target.closest('.tab-close')) activateTab(id); });
  tabEl.querySelector('.tab-close').addEventListener('click', (e) => {
    e.stopPropagation(); closeTab(id);
    // clean temp site from state so sidebar stays clean
    state.sites = state.sites.filter((s) => s.id !== site.id);
    renderSidebar();
  });
  els.tabs.appendChild(tabEl);
  state.tabs.push({ id, siteId: site.id, webviewEl: wv, tabEl, temp: true });
  activateTab(id);
}

init().catch((e) => console.error('init failed', e));

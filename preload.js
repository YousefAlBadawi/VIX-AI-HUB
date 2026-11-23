'use strict';
/**
 * VIX-AI HUB — preload
 * Exposes a minimal, typed bridge between the hub page and the main process.
 */
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('vix', {
  // data
  getSites:     () => ipcRenderer.invoke('sites:get'),
  addSite:      (site) => ipcRenderer.invoke('sites:add', site),
  removeSite:   (id) => ipcRenderer.invoke('sites:remove', id),
  getSettings:  () => ipcRenderer.invoke('settings:get'),
  setSettings:  (patch) => ipcRenderer.invoke('settings:set', patch),
  appInfo:      () => ipcRenderer.invoke('app:info'),
  checkUpdates: () => ipcRenderer.invoke('updates:check'),

  // actions
  openExternal: (url) => ipcRenderer.invoke('shell:open', url),
  copyText:     (text) => ipcRenderer.invoke('clipboard:write', text),

  minimize: () => ipcRenderer.send('window:minimize'),
  maximize: () => ipcRenderer.send('window:maximize'),
  close:     () => ipcRenderer.send('window:close'),

  // events from main
  onShortcut: (cb) => {
    const handler = (_e, action, arg) => cb(action, arg);
    ipcRenderer.on('shortcut', handler);
    return () => ipcRenderer.removeListener('shortcut', handler);
  },
  onOpenUrlAsTab: (cb) => {
    const handler = (_e, url) => cb(url);
    ipcRenderer.on('open-url-as-tab', handler);
    return () => ipcRenderer.removeListener('open-url-as-tab', handler);
  },
  onUpdateAvailable: (cb) => {
    const handler = (_e, info) => cb(info);
    ipcRenderer.on('update-available', handler);
    return () => ipcRenderer.removeListener('update-available', handler);
  },
  onUpdateStatus: (cb) => {
    const handler = (_e, status) => cb(status);
    ipcRenderer.on('update-status', handler);
    return () => ipcRenderer.removeListener('update-status', handler);
  }
});

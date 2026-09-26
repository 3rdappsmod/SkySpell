"use strict";

const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("skyspell", {
  openTextFile: () => ipcRenderer.invoke("dialog:open-text-file"),
  saveTextFile: (defaultName, content) => ipcRenderer.invoke("dialog:save-text-file", { defaultName, content }),

  getSettings: () => ipcRenderer.invoke("store:get-settings"),
  setSettings: (settings) => ipcRenderer.invoke("store:set-settings", settings),

  confirmDiscard: () => ipcRenderer.invoke("document:confirm-discard"),
  cancelSpelling: () => ipcRenderer.invoke("spellcheck:cancel"),
  onSpellProgress: (callback) => {
    const handler = (_event, progress) => callback(progress);
    ipcRenderer.on("spellcheck:progress", handler);
    return () => ipcRenderer.removeListener("spellcheck:progress", handler);
  },

  checkSpelling: (text) => ipcRenderer.invoke("spellcheck:check", text),

  writeClipboard: (text) => ipcRenderer.invoke("clipboard:write-text", text),
  getAppVersion: () => ipcRenderer.invoke("app:get-version"),
  getLocale: () => ipcRenderer.invoke("app:get-locale"),

  onMenuAction: (callback) => {
    const handler = (_event, action) => callback(action);
    ipcRenderer.on("menu:action", handler);
    return () => ipcRenderer.removeListener("menu:action", handler);
  },

  onUpdateStatus: (callback) => {
    const handler = (_event, payload) => callback(payload);
    ipcRenderer.on("update:status", handler);
    return () => ipcRenderer.removeListener("update:status", handler);
  }
});

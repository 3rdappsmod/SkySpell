"use strict";

const { app, BrowserWindow, ipcMain, dialog, clipboard } = require("electron");
const path = require("path");
const fs = require("fs");

const store = require("./store");
const { buildMenu } = require("./menu");
const { setupAutoUpdater } = require("./updater");
const { t } = require("./i18n");
const spellChecker = require("./spellChecker");

const appIconPng = path.join(__dirname, "..", "..", "assets", "icons", "512x512.png");

let mainWindow = null;
let updater = null;
// 요청 사양에 따라 OS 로캘과 관계없이 한국어로 표시한다.
const locale = "ko";
const L = (key) => t(locale, key);

function textFileFilters() {
  return [
    { name: L("textFiles"), extensions: ["txt", "md", "log"] },
    { name: L("allFiles"), extensions: ["*"] }
  ];
}

function createWindow() {
  const bounds = store.get("windowBounds");

  mainWindow = new BrowserWindow({
    x: bounds.x,
    y: bounds.y,
    width: bounds.width,
    height: bounds.height,
    minWidth: 860,
    minHeight: 560,
    backgroundColor: "#f0f9ff",
    icon: appIconPng,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });

  mainWindow.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
  mainWindow.webContents.on("will-prevent-unload", (event) => {
    if (confirmDiscard()) event.preventDefault();
  });
  mainWindow.webContents.on("will-navigate", (event) => event.preventDefault());

  if (bounds.maximized) mainWindow.maximize();

  mainWindow.loadFile(path.join(__dirname, "..", "renderer", "index.html"));

  const persistBounds = () => {
    if (!mainWindow) return;
    const maximized = mainWindow.isMaximized();
    const b = mainWindow.getNormalBounds();
    store.set("windowBounds", { ...b, maximized });
  };
  mainWindow.on("resize", persistBounds);
  mainWindow.on("move", persistBounds);
  mainWindow.on("close", persistBounds);

  buildMenu(mainWindow, locale);
  updater = setupAutoUpdater(mainWindow, locale);

  mainWindow.webContents.on("did-finish-load", () => {
    if (!app.isPackaged) return;
    updater.checkForUpdates();
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  createWindow();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

function confirmDiscard() {
  return dialog.showMessageBoxSync(mainWindow, {
    type: "warning", title: "저장하지 않은 변경 사항",
    message: "저장하지 않은 글이 있습니다. 변경 사항을 버리시겠습니까?",
    buttons: ["계속 작성", "변경 사항 버리기"], defaultId: 0, cancelId: 0,
    noLink: true
  }) === 1;
}
ipcMain.handle("document:confirm-discard", () => confirmDiscard());

// ---- IPC: 파일 다이얼로그 ----

ipcMain.handle("dialog:open-text-file", async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: L("openTextFileTitle"),
    properties: ["openFile"],
    filters: textFileFilters()
  });
  if (result.canceled || result.filePaths.length === 0) return { canceled: true };

  const filePath = result.filePaths[0];
  const content = fs.readFileSync(filePath, "utf-8");
  return { canceled: false, filePath, fileName: path.basename(filePath), content };
});

ipcMain.handle("dialog:save-text-file", async (_event, { defaultName, content }) => {
  const result = await dialog.showSaveDialog(mainWindow, {
    title: L("saveAsTitle"),
    defaultPath: defaultName || "text.txt",
    filters: textFileFilters()
  });
  if (result.canceled || !result.filePath) return { canceled: true };

  fs.writeFileSync(result.filePath, content, "utf-8");
  return { canceled: false, filePath: result.filePath };
});

// ---- IPC: 설정 (electron-store) ----

ipcMain.handle("store:get-settings", () => store.get("settings"));

ipcMain.handle("store:set-settings", (_event, settings) => {
  store.set("settings", { ...store.get("settings"), ...settings });
  return store.get("settings");
});

// ---- IPC: 맞춤법 검사 ----

ipcMain.handle("spellcheck:cancel", () => spellChecker.cancel());

ipcMain.handle("spellcheck:check", async (event, text) => {
  try {
    const result = await spellChecker.checkText(text, (progress) => {
      if (!event.sender.isDestroyed()) event.sender.send("spellcheck:progress", progress);
    });
    return { ok: true, ...result };
  } catch (err) {
    if (err.name === "AbortError") return { ok: false, canceled: true };
    return { ok: false, error: err.message || String(err) };
  }
});

// ---- IPC: 기타 ----

ipcMain.handle("clipboard:write-text", async (_event, text) => {
  await clipboard.writeText(text);
  return true;
});

ipcMain.handle("app:get-version", () => app.getVersion());

ipcMain.handle("app:get-locale", () => locale);

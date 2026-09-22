"use strict";
// 별도 임시 프로필로 실제 Electron 창과 IPC를 검사한다.
const { app, BrowserWindow, ipcMain, Menu, dialog, clipboard } = require("electron");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const assert = require("node:assert/strict");
const profile = fs.mkdtempSync(path.join(os.tmpdir(), "skyspell-gui-"));
app.setPath("userData", profile);
require("../src/main/main");
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const guard = setTimeout(() => { console.error("GUI test timed out"); app.exit(1); }, 90000);

app.whenReady().then(async () => {
  const win = BrowserWindow.getAllWindows()[0];
  const errors = [];
  win.webContents.on("console-message", (_event, details) => {
    if (details.level === "error") errors.push(details.message);
  });
  const evaluate = (script) => win.webContents.executeJavaScript(script);
  const waitFor = async (script) => {
    for (let i = 0; i < 350; i++) {
      if (await evaluate(script)) return;
      await sleep(100);
    }
    throw new Error(`Timed out: ${script}`);
  };
  const input = async (text) => evaluate(`document.getElementById('inputText').value = ${JSON.stringify(text)}; document.getElementById('inputText').dispatchEvent(new Event('input'));`);
  await waitFor("document.getElementById('countDisplay')?.textContent.includes('공백포함')");
  assert.equal(Menu.getApplicationMenu().items[0].label, "파일(&F)");
  assert.equal(win.webContents.getLastWebPreferences().sandbox, true);
  await input("안녕 hello");
  assert.equal(await evaluate("document.getElementById('countDisplay').textContent"), "8/1000(글자 수, 공백포함)");
  await evaluate("document.querySelector('[data-value=byte]').click()");
  assert.equal(await evaluate("document.getElementById('countDisplay').textContent"), "10/1000(바이트 수(2 byte), 공백포함)");
  await evaluate("document.getElementById('includeSpacesToggle').click()");
  assert.equal(await evaluate("document.getElementById('countDisplay').textContent"), "9/1000(바이트 수(2 byte), 공백제외)");
  await evaluate("document.getElementById('includeSpacesToggle').click()");
  await input("가".repeat(434));
  assert.equal(await evaluate("document.getElementById('countDisplay').textContent"), "868/1000(바이트 수(2 byte), 공백포함)");
  await evaluate("document.getElementById('limitInput').value = 100; document.getElementById('limitInput').dispatchEvent(new Event('change'));");
  assert.equal(await evaluate("document.getElementById('countDisplay').classList.contains('over-limit')"), true);
  await evaluate("document.getElementById('limitInput').value = 1000; document.getElementById('limitInput').dispatchEvent(new Event('change'));");

  if (process.argv.includes("--live")) {
    await input("안녕하새요. 오늘은 날씨가 조아요.\n\n만나서 반갑슴니다.");
    await evaluate("document.getElementById('btnCheck').click()");
    await waitFor("!document.getElementById('btnCheck').disabled");
    const result = await evaluate("({status: document.getElementById('statusLine').textContent, text: document.getElementById('resultView').innerText, copyDisabled: document.getElementById('btnCopyResult').disabled})");
    console.log("LIVE_NAVER", JSON.stringify(result));
    assert.equal(result.copyDisabled, false, result.status);
    assert.ok(result.text.includes("\n\n"));
    assert.ok(result.text.includes("안녕하세요"));
    fs.writeFileSync(path.join(profile, "live.png"), (await win.webContents.capturePage()).toPNG());
  }

  ipcMain.removeHandler("spellcheck:check");
  let requestCount = 0;
  ipcMain.handle("spellcheck:check", async () => {
    requestCount++;
    await sleep(350);
    return { ok: true, html: '<em class="red_text">안녕하세요</em>', errors: 1 };
  });
  await input("안녕하새요");
  await evaluate("document.getElementById('btnCheck').click()");
  win.webContents.send("menu:action", "spell-check");
  await input("검사 중 새 원문");
  await waitFor("!document.getElementById('btnCheck').disabled");
  assert.equal(requestCount, 1);
  assert.equal(await evaluate("document.getElementById('btnApply').disabled"), true);
  assert.equal(await evaluate("document.getElementById('inputText').value"), "검사 중 새 원문");
  await input("안녕하새요");
  await evaluate("document.getElementById('btnCheck').click()");
  await waitFor("!document.getElementById('btnApply').disabled");
  await evaluate("document.querySelector('[data-value=char]').click()");
  assert.equal(await evaluate("document.getElementById('resultCountLabel').textContent"), "5/1000(글자 수, 공백포함)");
  await evaluate("document.getElementById('btnCopyResult').click()");
  await sleep(100);
  assert.equal(await clipboard.readText(), "안녕하세요");
  await evaluate("document.getElementById('btnApply').click()");
  assert.equal(await evaluate("document.getElementById('inputText').value"), "안녕하세요");
  assert.equal(await evaluate("document.getElementById('btnApply').disabled"), true);

  const textFile = path.join(profile, "원문.txt");
  fs.writeFileSync(textFile, "파일 열기 확인\n둘째 줄");
  dialog.showOpenDialog = async () => ({ canceled: false, filePaths: [textFile] });
  await evaluate("document.getElementById('btnOpen').click()");
  await waitFor("document.getElementById('inputText').value.includes('파일 열기 확인')");
  const saveFile = path.join(profile, "저장.txt");
  dialog.showSaveDialog = async () => ({ canceled: false, filePath: saveFile });
  await evaluate("document.getElementById('btnSave').click()");
  await sleep(100);
  assert.equal(fs.readFileSync(saveFile, "utf8"), fs.readFileSync(textFile, "utf8"));

  await evaluate("document.getElementById('btnDarkMode').click()");
  assert.equal(await evaluate("document.body.classList.contains('theme-dark')"), true);
  await sleep(250);
  fs.writeFileSync(path.join(profile, "dark.png"), (await win.webContents.capturePage()).toPNG());
  win.webContents.reload();
  await waitFor("document.body.classList.contains('theme-dark')");
  await evaluate("document.getElementById('btnDarkMode').click()");
  await input("안녕하새요");
  await evaluate("document.getElementById('btnCheck').click()");
  await waitFor("!document.getElementById('btnApply').disabled");
  fs.writeFileSync(path.join(profile, "light.png"), (await win.webContents.capturePage()).toPNG());
  win.setSize(860, 560);
  await sleep(200);
  fs.writeFileSync(path.join(profile, "compact.png"), (await win.webContents.capturePage()).toPNG());
  ipcMain.removeHandler("spellcheck:check");
  ipcMain.handle("spellcheck:check", () => { throw new Error("테스트 네트워크 실패"); });
  await evaluate("document.getElementById('btnCheck').click()");
  await waitFor("document.getElementById('statusLine').textContent.includes('테스트 네트워크 실패')");
  assert.equal(await evaluate("document.getElementById('btnCheck').disabled"), false);
  assert.equal(await evaluate("document.getElementById('btnApply').disabled"), true);
  assert.deepEqual(errors, []);
  console.log("GUI_SMOKE_PASS", profile);
  clearTimeout(guard);
  app.exit(0);
}).catch((error) => { console.error(error); clearTimeout(guard); app.exit(1); });

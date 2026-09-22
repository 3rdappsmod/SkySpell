"use strict";

(function () {
  const els = {
    inputText: document.getElementById("inputText"),
    resultView: document.getElementById("resultView"),
    inputCountLabel: document.getElementById("inputCountLabel"),
    resultCountLabel: document.getElementById("resultCountLabel"),
    countDisplay: document.getElementById("countDisplay"),
    unitToggle: document.getElementById("unitToggle"),
    includeSpacesToggle: document.getElementById("includeSpacesToggle"),
    limitInput: document.getElementById("limitInput"),
    statusLine: document.getElementById("statusLine"),
    btnCheck: document.getElementById("btnCheck"),
    btnApply: document.getElementById("btnApply"),
    btnCopyResult: document.getElementById("btnCopyResult"),
    btnClear: document.getElementById("btnClear"),
    btnOpen: document.getElementById("btnOpen"),
    btnSave: document.getElementById("btnSave"),
    btnDarkMode: document.getElementById("btnDarkMode"),
    btnAbout: document.getElementById("btnAbout"),
    aboutModal: document.getElementById("aboutModal"),
    appVersion: document.getElementById("appVersion"),
    toast: document.getElementById("toast")
  };

  const state = {
    locale: "ko",
    charCounter: { unit: "char", includeSpaces: true, limit: 1000 },
    correctedText: "",
    revision: 0,
    checking: false
  };

  let toastTimer = null;
  function showToast(message) {
    els.toast.textContent = message;
    els.toast.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => els.toast.classList.remove("show"), 2200);
  }

  function setStatus(message, kind) {
    els.statusLine.textContent = message || "";
    els.statusLine.classList.remove("error", "success");
    if (kind) els.statusLine.classList.add(kind);
  }

  // ---------- 글자수 세기 ----------

  function refreshCharCount() {
    const text = els.inputText.value;
    const result = window.SkySpellCharCounter.formatCount(text, state.charCounter, state.locale);

    els.countDisplay.textContent = result.label;
    els.countDisplay.classList.toggle("over-limit", result.overLimit);
    els.inputCountLabel.textContent = result.label;
    els.inputCountLabel.classList.toggle("over-limit", result.overLimit);
    if (state.correctedText) {
      const corrected = window.SkySpellCharCounter.formatCount(state.correctedText, state.charCounter, state.locale);
      els.resultCountLabel.textContent = corrected.label;
      els.resultCountLabel.classList.toggle("over-limit", corrected.overLimit);
    }
  }

  function persistCharCounterSettings() {
    window.skyspell.setSettings({ charCounter: { ...state.charCounter } });
  }

  els.unitToggle.addEventListener("click", (event) => {
    const btn = event.target.closest(".seg-btn");
    if (!btn) return;
    state.charCounter.unit = btn.dataset.value;
    els.unitToggle.querySelectorAll(".seg-btn").forEach((b) => b.classList.toggle("active", b === btn));
    refreshCharCount();
    persistCharCounterSettings();
  });

  els.includeSpacesToggle.addEventListener("change", () => {
    state.charCounter.includeSpaces = els.includeSpacesToggle.checked;
    refreshCharCount();
    persistCharCounterSettings();
  });

  els.limitInput.addEventListener("change", () => {
    const value = parseInt(els.limitInput.value, 10);
    state.charCounter.limit = Number.isFinite(value) && value >= 0 ? value : 0;
    els.limitInput.value = state.charCounter.limit;
    refreshCharCount();
    persistCharCounterSettings();
  });

  function invalidateResult() {
    state.revision++;
    state.correctedText = "";
    els.btnApply.disabled = true;
    els.btnCopyResult.disabled = true;
    els.resultCountLabel.textContent = "";
    renderResult(null);
    setStatus("");
    refreshCharCount();
  }

  els.inputText.addEventListener("input", invalidateResult);

  // ---------- 맞춤법 검사 ----------

  function renderResult(segments) {
    els.resultView.innerHTML = "";
    if (!segments || segments.length === 0) {
      const hint = document.createElement("span");
      hint.className = "empty-hint";
      hint.textContent = window.SkySpellI18n.t("resultPlaceholder");
      els.resultView.appendChild(hint);
      return;
    }

    const typeLabelKeys = {
      spelling: "legendSpelling",
      spacing: "legendSpacing",
      ambiguous: "legendAmbiguous",
      statistical: "legendStatistical"
    };

    for (const seg of segments) {
      const lines = seg.text.split("\n");
      const container = seg.type === "plain" ? document.createDocumentFragment() : document.createElement("mark");
      if (seg.type !== "plain") {
        container.className = seg.type;
        container.title = window.SkySpellI18n.t(typeLabelKeys[seg.type] || "");
      }
      lines.forEach((line, idx) => {
        if (idx > 0) container.appendChild(document.createElement("br"));
        if (line) container.appendChild(document.createTextNode(line));
      });
      els.resultView.appendChild(container);
    }
  }

  async function runSpellCheck() {
    if (state.checking) return;
    const text = els.inputText.value;
    if (!text.trim()) {
      setStatus(window.SkySpellI18n.t("emptyInputWarning"), "error");
      return;
    }

    invalidateResult();
    const revision = state.revision;
    state.checking = true;
    els.btnCheck.disabled = true;
    els.btnApply.disabled = true;
    setStatus(window.SkySpellI18n.t("checking"));

    let result;
    try {
      result = await window.skyspell.checkSpelling(text);
    } catch (error) {
      result = { ok: false, error: error.message || String(error) };
    } finally {
      state.checking = false;
      els.btnCheck.disabled = false;
    }
    if (revision !== state.revision) return;

    if (!result.ok) {
      setStatus(window.SkySpellI18n.t("checkFailed", { msg: result.error }), "error");
      return;
    }

    const parsed = window.SkySpellParser.parseSpellHtml(result.html);
    state.correctedText = parsed.correctedText;
    renderResult(parsed.segments);

    const resultCount = window.SkySpellCharCounter.formatCount(parsed.correctedText, state.charCounter, state.locale);
    els.resultCountLabel.textContent = resultCount.label;
    els.resultCountLabel.classList.toggle("over-limit", resultCount.overLimit);

    els.btnApply.disabled = parsed.correctedText === text;
    els.btnCopyResult.disabled = false;

    if (result.errors > 0) {
      setStatus(window.SkySpellI18n.t("errorsFound", { n: result.errors }), "error");
    } else {
      setStatus(window.SkySpellI18n.t("noErrors"), "success");
    }
  }

  els.btnCheck.addEventListener("click", runSpellCheck);

  els.btnApply.addEventListener("click", () => {
    if (!state.correctedText) return;
    els.inputText.value = state.correctedText;
    invalidateResult();
    showToast(window.SkySpellI18n.t("appliedCorrection"));
  });

  els.btnCopyResult.addEventListener("click", async () => {
    const text = state.correctedText;
    if (!text) {
      showToast(window.SkySpellI18n.t("nothingToCopy"));
      return;
    }
    await window.skyspell.writeClipboard(text);
    showToast(window.SkySpellI18n.t("copiedToClipboard"));
  });

  els.btnClear.addEventListener("click", () => {
    els.inputText.value = "";
    invalidateResult();
  });

  // ---------- 파일 ----------

  els.btnOpen.addEventListener("click", async () => {
    try {
      const result = await window.skyspell.openTextFile();
      if (result.canceled) return;
      els.inputText.value = result.content;
      invalidateResult();
      showToast(window.SkySpellI18n.t("fileOpened"));
    } catch (error) { setStatus(error.message, "error"); }
  });

  els.btnSave.addEventListener("click", async () => {
    try {
      const result = await window.skyspell.saveTextFile("skyspell.txt", els.inputText.value);
      if (result.canceled) return;
      showToast(window.SkySpellI18n.t("fileSaved"));
    } catch (error) { setStatus(error.message, "error"); }
  });

  // ---------- 다크 모드 ----------

  function applyDarkMode(enabled) {
    document.body.classList.toggle("theme-dark", enabled);
  }

  els.btnDarkMode.addEventListener("click", () => {
    const enabled = !document.body.classList.contains("theme-dark");
    applyDarkMode(enabled);
    window.skyspell.setSettings({ darkMode: enabled });
  });

  // ---------- 정보 모달 ----------

  function toggleModal(modal, show) {
    modal.classList.toggle("hidden", !show);
  }

  els.btnAbout.addEventListener("click", () => toggleModal(els.aboutModal, true));
  document.querySelectorAll("[data-close='about']").forEach((el) => {
    el.addEventListener("click", () => toggleModal(els.aboutModal, false));
  });

  // ---------- 메뉴 액션 / 업데이트 상태 ----------

  window.skyspell.onMenuAction((action) => {
    switch (action) {
      case "new":
      case "reset":
        els.btnClear.click();
        break;
      case "open":
        els.btnOpen.click();
        break;
      case "save":
        els.btnSave.click();
        break;
      case "spell-check":
        runSpellCheck();
        break;
      case "toggle-dark-mode":
        els.btnDarkMode.click();
        break;
      case "about":
        toggleModal(els.aboutModal, true);
        break;
    }
  });

  window.skyspell.onUpdateStatus((payload) => {
    if (payload && payload.message) showToast(payload.message);
  });

  // ---------- 초기화 ----------

  async function init() {
    const locale = await window.skyspell.getLocale();
    state.locale = locale;
    window.SkySpellI18n.init(locale);

    const settings = await window.skyspell.getSettings();
    if (settings.charCounter) state.charCounter = { ...state.charCounter, ...settings.charCounter };
    applyDarkMode(!!settings.darkMode);

    els.unitToggle.querySelectorAll(".seg-btn").forEach((b) => b.classList.toggle("active", b.dataset.value === state.charCounter.unit));
    els.includeSpacesToggle.checked = state.charCounter.includeSpaces;
    els.limitInput.value = state.charCounter.limit;
    refreshCharCount();

    const version = await window.skyspell.getAppVersion();
    els.appVersion.textContent = version;
  }

  init();
})();

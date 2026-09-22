"use strict";

/**
 * 초경량 i18n. 한국어 로캘이면 ko(=HTML 원문), 그 외에는 자동으로 en 을 사용한다.
 * index.html 의 data-i18n / data-i18n-placeholder / data-i18n-title / data-i18n-value 를 치환한다.
 */
(function (global) {
  const STRINGS = {
    appTitle: { ko: "SkySpell", en: "SkySpell" },
    inputPlaceholder: { ko: "맞춤법을 검사할 문장을 입력하세요...", en: "Type or paste text to check..." },
    resultPlaceholder: {
      ko: "맞춤법 검사 결과가 여기에 표시됩니다.",
      en: "The spell check result will appear here."
    },

    runCheck: { ko: "맞춤법 검사", en: "Check Spelling" },
    applyAll: { ko: "교정 적용", en: "Apply Corrections" },
    copyResult: { ko: "결과 복사", en: "Copy Result" },
    copyOriginal: { ko: "원본 복사", en: "Copy Original" },
    clear: { ko: "지우기", en: "Clear" },
    openFile: { ko: "파일 열기", en: "Open File" },
    saveFile: { ko: "저장", en: "Save" },

    originalPane: { ko: "원본", en: "Original" },
    resultPane: { ko: "교정 결과", en: "Corrected" },

    legendTitle: { ko: "표시 범례", en: "Legend" },
    legendSpelling: { ko: "철자 오류", en: "Spelling" },
    legendSpacing: { ko: "띄어쓰기 오류", en: "Spacing" },
    legendAmbiguous: { ko: "모호한 표현", en: "Ambiguous" },
    legendStatistical: { ko: "통계적 교정", en: "Statistical" },

    charCounterTitle: { ko: "글자수 세기", en: "Character Count" },
    unitLabel: { ko: "단위", en: "Unit" },
    unitChar: { ko: "글자 수", en: "Characters" },
    unitByte: { ko: "바이트 수", en: "Bytes" },
    includeSpacesLabel: { ko: "공백 포함", en: "Include spaces" },
    limitLabel: { ko: "제한", en: "Limit" },

    checking: { ko: "검사 중...", en: "Checking..." },
    noErrors: { ko: "오류가 없습니다.", en: "No issues found." },
    errorsFound: { ko: "{n}개의 오류를 찾았습니다.", en: "{n} issue(s) found." },
    emptyInputWarning: { ko: "검사할 텍스트를 입력해주세요.", en: "Please enter text to check." },
    checkFailed: { ko: "맞춤법 검사에 실패했습니다: {msg}", en: "Spell check failed: {msg}" },

    copiedToClipboard: { ko: "클립보드에 복사했습니다.", en: "Copied to clipboard." },
    appliedCorrection: { ko: "교정 내용을 적용했습니다.", en: "Corrections applied." },
    nothingToCopy: { ko: "복사할 내용이 없습니다.", en: "Nothing to copy." },
    fileOpened: { ko: "파일을 불러왔습니다.", en: "File loaded." },
    fileSaved: { ko: "파일을 저장했습니다.", en: "File saved." },

    settingsTitle: { ko: "설정", en: "Settings" },
    about: { ko: "SkySpell 정보", en: "About SkySpell" },
    version: { ko: "버전", en: "Version" },
    close: { ko: "닫기", en: "Close" },
    aboutDescription: {
      ko: "하늘색 테마의 크로스플랫폼 한국어 맞춤법 검사 · 글자수 세기 프로그램입니다.",
      en: "A cross-platform Korean spell checker and character counter with a sky-blue theme."
    },
    aboutDisclaimer: {
      ko: "네이버 맞춤법 검사기의 비공식 엔드포인트를 사용합니다. 네이버 정책 변경 시 일시적으로 동작하지 않을 수 있습니다.",
      en: "Uses Naver's unofficial spell-checker endpoint. It may stop working if Naver changes its service."
    },
    aboutLibs: { ko: "사용 기술: Electron", en: "Built with Electron" },
    githubRepo: { ko: "GitHub 저장소", en: "GitHub repository" }
  };

  let currentLocale = "ko";

  function t(key, params) {
    const entry = STRINGS[key];
    if (!entry) return key;
    let str = entry[currentLocale] || entry.ko;
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        str = str.replace(new RegExp("\\{" + k + "\\}", "g"), v);
      }
    }
    return str;
  }

  function applyDom() {
    document.documentElement.lang = currentLocale;

    document.querySelectorAll("[data-i18n]").forEach((el) => {
      el.textContent = t(el.dataset.i18n);
    });
    document.querySelectorAll("[data-i18n-placeholder]").forEach((el) => {
      el.placeholder = t(el.dataset.i18nPlaceholder);
    });
    document.querySelectorAll("[data-i18n-title]").forEach((el) => {
      el.title = t(el.dataset.i18nTitle);
    });
    document.querySelectorAll("[data-i18n-value]").forEach((el) => {
      el.value = t(el.dataset.i18nValue);
    });
  }

  function init(locale) {
    currentLocale = locale === "ko" ? "ko" : "en";
    applyDom();
  }

  global.SkySpellI18n = {
    init,
    t,
    get locale() {
      return currentLocale;
    }
  };
})(window);

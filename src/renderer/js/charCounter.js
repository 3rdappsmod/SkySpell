"use strict";

/**
 * 글자수/바이트 수 계산 순수 로직 (DOM 미사용). 브라우저(window)와 Node(module.exports)
 * 양쪽에서 그대로 로드할 수 있도록 UMD 스타일로 작성한다.
 *
 * 바이트 수는 옛 자기소개서/문서작성기에서 흔히 쓰는 "한글(및 기타 비-ASCII 문자) 2바이트,
 * 영문·숫자·기호·공백 1바이트" 관례를 따른다 (실제 UTF-8 인코딩 바이트 수와는 다름).
 */
(function (global) {
  function countLength(text, options) {
    const includeSpaces = options && options.includeSpaces !== undefined ? options.includeSpaces : true;
    const source = includeSpaces ? text || "" : (text || "").replace(/\s/g, "");
    const codePoints = Array.from(source);

    let bytes = 0;
    for (const ch of codePoints) {
      bytes += ch.codePointAt(0) <= 0x7f ? 1 : 2;
    }

    return { chars: codePoints.length, bytes };
  }

  function formatCount(text, settings, locale) {
    const unit = (settings && settings.unit) || "char";
    const includeSpaces = settings && settings.includeSpaces !== undefined ? settings.includeSpaces : true;
    const limit = (settings && settings.limit) || 0;
    const isKo = locale !== "en";

    const { chars, bytes } = countLength(text, { includeSpaces });
    const current = unit === "byte" ? bytes : chars;

    const unitLabel = isKo
      ? unit === "byte"
        ? "바이트 수(2 byte)"
        : "글자 수"
      : unit === "byte"
        ? "bytes(2 byte)"
        : "characters";

    const spaceLabel = isKo ? (includeSpaces ? "공백포함" : "공백제외") : includeSpaces ? "spaces included" : "spaces excluded";

    return {
      current,
      chars,
      bytes,
      limit,
      overLimit: limit > 0 && current > limit,
      label: `${current}/${limit}(${unitLabel}, ${spaceLabel})`
    };
  }

  const api = { countLength, formatCount };

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  } else {
    global.SkySpellCharCounter = api;
  }
})(typeof window !== "undefined" ? window : globalThis);

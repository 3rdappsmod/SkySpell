"use strict";

/**
 * 네이버 맞춤법 검사 응답의 html 조각(message.result.html)을 구조화된 세그먼트 배열로 변환하는
 * 순수 로직 (DOM 미사용 — DOMParser 대신 정규식으로 처리해 메인/렌더러/테스트(Node) 어디서나 동작).
 * py-hanspell(hanspell/spell_checker.py)의 태그 → 오류유형 매핑을 그대로 따른다.
 */
(function (global) {
  const TYPE_MAP = { red: "spelling", green: "spacing", violet: "ambiguous", blue: "statistical" };
  const EM_RE = /<(?:em|span)\b[^>]*\bclass=["'](red|green|violet|blue)_text["'][^>]*>([\s\S]*?)<\/(?:em|span)>/gi;

  function decodeSegment(text) {
    return text
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<[^>]*>/g, "")
      .replace(/&(#x[0-9a-f]+|#\d+|nbsp|quot|apos|lt|gt|amp);/gi, (entity, code) => {
        const named = { nbsp: " ", quot: '"', apos: "'", lt: "<", gt: ">", amp: "&" };
        if (code[0] !== "#") return named[code.toLowerCase()] || entity;
        const value = code[1].toLowerCase() === "x" ? parseInt(code.slice(2), 16) : Number(code.slice(1));
        return value >= 0 && value <= 0x10ffff ? String.fromCodePoint(value) : entity;
      });
  }

  function parseSpellHtml(html) {
    const segments = [];
    if (!html) return { segments, correctedText: "", errorCounts: {} };

    let lastIndex = 0;
    let match;
    EM_RE.lastIndex = 0;
    while ((match = EM_RE.exec(html)) !== null) {
      if (match.index > lastIndex) {
        segments.push({ type: "plain", text: decodeSegment(html.slice(lastIndex, match.index)) });
      }
      segments.push({ type: TYPE_MAP[match[1].toLowerCase()], text: decodeSegment(match[2]) });
      lastIndex = EM_RE.lastIndex;
    }
    if (lastIndex < html.length) {
      segments.push({ type: "plain", text: decodeSegment(html.slice(lastIndex)) });
    }

    const correctedText = segments.map((s) => s.text).join("");
    const errorCounts = segments.reduce((acc, s) => {
      if (s.type !== "plain") acc[s.type] = (acc[s.type] || 0) + 1;
      return acc;
    }, {});

    return { segments, correctedText, errorCounts };
  }

  const api = { parseSpellHtml, TYPE_MAP };

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  } else {
    global.SkySpellParser = api;
  }
})(typeof window !== "undefined" ? window : globalThis);

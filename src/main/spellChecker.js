"use strict";

// 비공식 네이버 API. 원문은 검사할 때만 네이버로 전송한다.
const SPELLER_URL = "https://m.search.naver.com/p/csearch/ocontent/util/SpellerProxy";
const PASSPORT_KEY_URL = "https://search.naver.com/search.naver?query=" + encodeURIComponent("맞춤법검사기");
const USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/131.0.0.0 Safari/537.36";
const MAX_CHUNK_LENGTH = 490;

function splitIntoChunks(text) {
  const chunks = [];
  let start = 0;
  while (start < text.length) {
    let end = Math.min(start + MAX_CHUNK_LENGTH, text.length);
    if (end < text.length) {
      const boundary = Math.max(text.lastIndexOf("\n", end - 1), text.lastIndexOf(" ", end - 1));
      if (boundary >= start) end = boundary + 1;
      // UTF-16 서로게이트 쌍을 중간에서 자르지 않는다.
      if (/[\uD800-\uDBFF]/.test(text[end - 1])) end--;
    }
    chunks.push(text.slice(start, end));
    start = end;
  }
  return chunks;
}

function createSpellChecker({ fetchImpl = globalThis.fetch, pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms)) } = {}) {
  let passportKey = "";
  let pendingKey = null;
  let busy = false;

  async function request(url) {
    try {
      const response = await fetchImpl(url, {
        headers: { "user-agent": USER_AGENT, referer: "https://search.naver.com/" },
        signal: AbortSignal.timeout(15000)
      });
      if (!response.ok) throw new Error(`네이버 응답 오류 (HTTP ${response.status})`);
      return response;
    } catch (error) {
      if (error.name === "TimeoutError" || error.name === "AbortError") {
        throw new Error("네이버 응답 시간이 초과되었습니다. 잠시 후 다시 시도하세요.", { cause: error });
      }
      throw error;
    }
  }

  async function getKey() {
    if (passportKey) return passportKey;
    if (!pendingKey) {
      pendingKey = (async () => {
        const html = await (await request(PASSPORT_KEY_URL)).text();
        const match = /passportKey=([a-zA-Z0-9]+)/.exec(html);
        if (!match) throw new Error("네이버 인증 정보를 찾지 못했습니다. 서비스 변경 또는 접속 제한일 수 있습니다.");
        passportKey = match[1];
        return passportKey;
      })().finally(() => { pendingKey = null; });
    }
    return pendingKey;
  }

  async function checkChunk(chunk) {
    for (let attempt = 0; attempt < 2; attempt++) {
      const params = new URLSearchParams({ color_blindness: "0", q: chunk, passportKey: await getKey() });
      const data = await (await request(`${SPELLER_URL}?${params}`)).json();
      const message = data && data.message;
      if (message && message.error) {
        passportKey = "";
        if (attempt === 0) continue;
        throw new Error("네이버 인증에 실패했습니다. 잠시 후 다시 시도하세요.");
      }
      const result = message && message.result;
      if (!result || typeof result.html !== "string" || !result.html.trim()) {
        throw new Error("네이버 검사 결과 형식이 변경되었거나 비어 있습니다.");
      }
      return { html: result.html, errors: Number(result.errata_count) || 0 };
    }
  }

  async function checkText(text) {
    if (typeof text !== "string") throw new Error("검사할 문장을 입력하세요.");
    if (!text.trim()) return { html: "", errors: 0 };
    if (busy) throw new Error("이미 맞춤법 검사가 진행 중입니다.");
    busy = true;
    try {
      const result = { html: "", errors: 0 };
      // 줄바꿈과 청크 가장자리 공백은 API의 정규화에 맡기지 않고 보존한다.
      const parts = text.split(/(\r\n|\r|\n)/);
      let requests = 0;
      for (const part of parts) {
        for (const chunk of splitIntoChunks(part)) {
          const core = chunk.trim();
          if (!core) { result.html += chunk; continue; }
          const leading = chunk.slice(0, chunk.length - chunk.trimStart().length);
          const trailing = chunk.slice(chunk.trimEnd().length);
          if (requests++) await pause(200);
          const checked = await checkChunk(core);
          result.html += leading + checked.html + trailing;
          result.errors += checked.errors;
        }
      }
      return result;
    } finally {
      busy = false;
    }
  }
  return { checkText };
}

module.exports = { ...createSpellChecker(), createSpellChecker, splitIntoChunks };

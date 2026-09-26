"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const { createSpellChecker, splitIntoChunks } = require("../src/main/spellChecker");

function service(handler) {
  const calls = [];
  const fetchImpl = async (url, options) => {
    calls.push(url);
    assert.ok(options.signal);
    if (!url.includes("SpellerProxy")) return { ok: true, text: async () => "passportKey=abc123" };
    const text = new URL(url).searchParams.get("q");
    return { ok: true, json: async () => handler ? handler(text) : ({ message: { result: { html: text, errata_count: 0 } } }) };
  };
  return { checker: createSpellChecker({ fetchImpl, pause: async () => {} }), calls };
}

test("긴 글의 분할은 공백 경계와 이모지를 손실 없이 보존한다", () => {
  for (const text of ["가".repeat(489) + "😀끝", "가".repeat(490) + " 다음", "가 나\n".repeat(1000)]) {
    const chunks = splitIntoChunks(text);
    assert.equal(chunks.join(""), text);
    assert.ok(chunks.every((chunk) => chunk.length <= 490 && !/[\uD800-\uDBFF]$/.test(chunk)));
  }
});

test("네이버가 제거하는 가장자리 공백과 빈 줄을 보존하고 키를 한 번만 발급한다", async () => {
  const { checker, calls } = service();
  const input = "  안녕\n\n 하세요\t\r\n" + "가 ".repeat(600);
  const output = await checker.checkText(input);
  assert.equal(output.html, input);
  assert.equal(calls.filter((url) => !url.includes("SpellerProxy")).length, 1);
});

test("만료된 키를 갱신하고 한 번만 재시도한다", async () => {
  let tries = 0;
  const { checker, calls } = service(() => ++tries === 1 ? { message: { error: "expired" } } : { message: { result: { html: "안녕", errata_count: 1 } } });
  assert.equal((await checker.checkText("안녕")).errors, 1);
  assert.equal(calls.length, 4);
});

test("비정상 응답을 빈 교정문으로 적용하지 않는다", async () => {
  for (const response of [{}, { message: { result: {} } }, { message: { result: { html: "" } } }]) {
    const { checker } = service(() => response);
    await assert.rejects(checker.checkText("안녕"), /결과 형식/);
  }
});

test("네트워크 시간초과 후에도 다음 검사를 실행할 수 있다", async () => {
  const checker = createSpellChecker({ fetchImpl: async () => { throw Object.assign(new Error(), { name: "TimeoutError" }); } });
  await assert.rejects(checker.checkText("안녕"), /시간이 초과/);
  await assert.rejects(checker.checkText("다음"), /시간이 초과/);
});

test("중복 검사 요청은 추가 네트워크 호출 없이 거절한다", async () => {
  let release;
  const gate = new Promise((resolve) => { release = resolve; });
  const checker = createSpellChecker({ fetchImpl: async () => { await gate; throw new Error("offline"); } });
  const first = checker.checkText("첫 번째");
  await assert.rejects(checker.checkText("두 번째"), /진행 중/);
  release();
  await assert.rejects(first, /offline/);
});

test("진행 상황은 실제 검사 청크만 집계한다", async () => {
  const { checker } = service();
  const progress = [];
  await checker.checkText("첫째\n\n둘째", (value) => progress.push(value));
  assert.deepEqual(progress, [{ completed: 0, total: 2 }, { completed: 1, total: 2 }, { completed: 2, total: 2 }]);
});

test("취소는 진행 중 요청을 중단하고 후속 검사를 허용한다", async () => {
  let entered;
  const started = new Promise((resolve) => { entered = resolve; });
  let blocking = true;
  const checker = createSpellChecker({ fetchImpl: async (url, { signal }) => {
    if (!url.includes("SpellerProxy")) return { ok: true, text: async () => "passportKey=abc" };
    if (!blocking) return { ok: true, json: async () => ({ message: { result: { html: "다음" } } }) };
    entered();
    return new Promise((_resolve, reject) => signal.addEventListener("abort", () => reject(signal.reason), { once: true }));
  } });
  const pending = checker.checkText("첫 문장\n둘째 문장");
  await started;
  checker.cancel();
  await assert.rejects(pending, { name: "AbortError" });
  blocking = false;
  assert.equal((await checker.checkText("다음")).html, "다음");
});

test("청크 사이 대기 중 취소하면 추가 요청을 보내지 않는다", async () => {
  let entered;
  let requests = 0;
  const started = new Promise((resolve) => { entered = resolve; });
  const checker = createSpellChecker({
    fetchImpl: async (url) => !url.includes("SpellerProxy")
      ? { ok: true, text: async () => "passportKey=abc" }
      : { ok: true, json: async () => { requests++; return { message: { result: { html: "문장" } } }; } },
    pause: (_ms, signal) => { entered(); return new Promise((_resolve, reject) => signal.addEventListener("abort", () => reject(signal.reason), { once: true })); }
  });
  const pending = checker.checkText("첫째\n둘째");
  await started;
  checker.cancel();
  await assert.rejects(pending, { name: "AbortError" });
  assert.equal(requests, 1);
});

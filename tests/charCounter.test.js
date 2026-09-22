"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const { countLength, formatCount } = require("../src/renderer/js/charCounter");

test("countLength: 영문/숫자/기호는 1바이트로 계산한다", () => {
  const { chars, bytes } = countLength("abc123!", { includeSpaces: true });
  assert.equal(chars, 7);
  assert.equal(bytes, 7);
});

test("countLength: 한글은 2바이트로 계산한다", () => {
  const { chars, bytes } = countLength("안녕하세요", { includeSpaces: true });
  assert.equal(chars, 5);
  assert.equal(bytes, 10);
});

test("countLength: 공백 포함 여부에 따라 결과가 달라진다", () => {
  const text = "안녕 하세요"; // 한글 5자 + 공백 1
  const withSpaces = countLength(text, { includeSpaces: true });
  const withoutSpaces = countLength(text, { includeSpaces: false });

  assert.equal(withSpaces.chars, 6);
  assert.equal(withSpaces.bytes, 11); // 한글 5자*2 + 공백 1*1
  assert.equal(withoutSpaces.chars, 5);
  assert.equal(withoutSpaces.bytes, 10);
});

test("countLength: 혼합 문자열(한글+영문+공백)", () => {
  const { chars, bytes } = countLength("안녕 hello", { includeSpaces: true });
  // 한글 2자(4바이트) + 공백(1) + hello 5자(5바이트) = 8자, 10바이트
  assert.equal(chars, 8);
  assert.equal(bytes, 10);
});

test("formatCount: 사용자가 제시한 예시 형식과 일치한다", () => {
  const text = "가".repeat(434); // 434자 * 2바이트 = 868바이트
  const result = formatCount(text, { unit: "byte", includeSpaces: true, limit: 1000 }, "ko");
  assert.equal(result.current, 868);
  assert.equal(result.label, "868/1000(바이트 수(2 byte), 공백포함)");
});

test("formatCount: 글자 수 모드 + 공백 제외", () => {
  const result = formatCount("가 나 다", { unit: "char", includeSpaces: false, limit: 10 }, "ko");
  assert.equal(result.current, 3);
  assert.equal(result.label, "3/10(글자 수, 공백제외)");
});

test("formatCount: 제한 초과 시 overLimit 플래그가 true", () => {
  const result = formatCount("a".repeat(20), { unit: "char", includeSpaces: true, limit: 10 }, "ko");
  assert.equal(result.overLimit, true);
});

test("formatCount: 제한이 0이면 초과로 취급하지 않는다", () => {
  const result = formatCount("a".repeat(20), { unit: "char", includeSpaces: true, limit: 0 }, "ko");
  assert.equal(result.overLimit, false);
});

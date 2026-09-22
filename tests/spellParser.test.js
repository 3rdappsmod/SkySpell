"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const { parseSpellHtml } = require("../src/renderer/js/spellParser");

test("parseSpellHtml: 오류가 없는 일반 텍스트", () => {
  const { segments, correctedText, errorCounts } = parseSpellHtml("이 문장은 정상입니다");
  assert.equal(segments.length, 1);
  assert.equal(segments[0].type, "plain");
  assert.equal(correctedText, "이 문장은 정상입니다");
  assert.deepEqual(errorCounts, {});
});

test("parseSpellHtml: 4가지 오류 유형을 각각의 type으로 분류한다", () => {
  const html =
    "먼저 <em class='red_text'>맞춤법</em> 그다음 " +
    "<em class='green_text'>띄어쓰기</em> 그리고 " +
    "<em class='violet_text'>모호한표현</em> 마지막 " +
    "<em class='blue_text'>통계교정</em> 끝";

  const { segments, correctedText, errorCounts } = parseSpellHtml(html);

  const types = segments.filter((s) => s.type !== "plain").map((s) => s.type);
  assert.deepEqual(types, ["spelling", "spacing", "ambiguous", "statistical"]);

  assert.equal(errorCounts.spelling, 1);
  assert.equal(errorCounts.spacing, 1);
  assert.equal(errorCounts.ambiguous, 1);
  assert.equal(errorCounts.statistical, 1);

  assert.equal(
    correctedText,
    "먼저 맞춤법 그다음 띄어쓰기 그리고 모호한표현 마지막 통계교정 끝"
  );
});

test("parseSpellHtml: <br> 태그를 줄바꿈으로 변환한다", () => {
  const { correctedText } = parseSpellHtml("첫째 줄<br>둘째 줄");
  assert.equal(correctedText, "첫째 줄\n둘째 줄");
});

test("parseSpellHtml: HTML 엔티티를 복원한다", () => {
  const { correctedText } = parseSpellHtml("A&amp;B &lt;태그&gt; &quot;인용&quot;&nbsp;끝");
  assert.equal(correctedText, 'A&B <태그> "인용" 끝');
});

test("parseSpellHtml: 빈 문자열이면 세그먼트가 비어있다", () => {
  const { segments, correctedText, errorCounts } = parseSpellHtml("");
  assert.deepEqual(segments, []);
  assert.equal(correctedText, "");
  assert.deepEqual(errorCounts, {});
});

test("parseSpellHtml: 오류 태그가 문장 맨 앞/뒤에 와도 정상 처리한다", () => {
  const html = "<em class='red_text'>맞흠법</em>은 어렵다<em class='green_text'> 그쵸</em>";
  const { segments, correctedText } = parseSpellHtml(html);
  assert.equal(segments[0].type, "spelling");
  assert.equal(segments[segments.length - 1].type, "spacing");
  assert.equal(correctedText, "맞흠법은 어렵다 그쵸");
});

test("큰따옴표 속성, span, 숫자 엔티티, 태그를 안전하게 처리한다", () => {
  const parsed = parseSpellHtml('<span class="red_text">&#xAC00;&#45208;</span><BR />&amp;lt;<script>text</script>');
  assert.equal(parsed.correctedText, "가나\n&lt;text");
  assert.equal(parsed.segments[0].type, "spelling");
});

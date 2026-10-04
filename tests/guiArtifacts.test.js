"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { createScreenshotWriter } = require("../scripts/gui-artifacts.cjs");

test("GUI smoke tests do not request screenshots by default on headless CI", async () => {
  let calls = 0;
  const save = createScreenshotWriter({
    capture: async () => { calls++; throw new Error("UnknownVizError"); }
  });
  await save("dark.png");
  await save("light.png");
  await save("compact.png");
  assert.equal(calls, 0);
});

test("Explicit screenshot failures remain visible with the artifact name", async () => {
  const cause = new Error("UnknownVizError");
  const save = createScreenshotWriter({ enabled: true, capture: async () => { throw cause; } });
  await assert.rejects(save("dark.png"), (error) => {
    assert.equal(error.message, "GUI screenshot failed: dark.png");
    assert.equal(error.cause, cause);
    return true;
  });
});

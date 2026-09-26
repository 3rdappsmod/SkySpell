"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const path = require("node:path");
const source = fs.readFileSync(path.join(__dirname, "../scripts/check-node.cjs"), "utf8");
const { engines } = require("../package.json");
test("Node 버전 검사와 package engines가 경계 버전에서 일치한다", () => {
  assert.equal(engines.node, "^22.13.0 || >=24.0.0");
  for (const [version, supported] of [["18.19.1", false], ["22.12.0", false], ["22.13.0", true], ["22.23.0", true], ["23.0.0", false], ["24.0.0", true], ["26.0.0", true]]) {
    let rejected = false;
    vm.runInNewContext(source, { process: { versions: { node: version }, version, exit: () => { rejected = true; } }, console: { error() {} } });
    assert.equal(!rejected, supported, version);
  }
});

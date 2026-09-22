"use strict";
const [major, minor] = process.versions.node.split(".").map(Number);
if (major < 22 || (major === 22 && minor < 12)) {
  console.error(`SkySpell 개발/빌드에는 Node.js 22.12 이상(권장 24 LTS)이 필요합니다. 현재: ${process.version}`);
  console.error("Node.js를 업데이트한 뒤 터미널을 다시 열어 주세요. Linux Bash에서는 hash -r 후 node -v로 확인하세요.");
  process.exit(1);
}

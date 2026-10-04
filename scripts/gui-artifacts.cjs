"use strict";

const fs = require("node:fs");
const path = require("node:path");

// Screenshots are diagnostic artifacts, not GUI assertions. Headless CI can
// exercise the app successfully even when Chromium cannot copy its surface.
function createScreenshotWriter({ enabled = false, directory, capture }) {
  return async (name) => {
    if (!enabled) return;
    try {
      const snapshot = await capture();
      if (snapshot.isEmpty()) throw new Error("Captured image is empty");
      fs.writeFileSync(path.join(directory, name), snapshot.toPNG());
    } catch (error) {
      throw new Error(`GUI screenshot failed: ${name}`, { cause: error });
    }
  };
}

module.exports = { createScreenshotWriter };

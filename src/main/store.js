"use strict";

const { default: Store } = require("electron-store");

const store = new Store({
  name: "skyspell-data",
  defaults: {
    windowBounds: { width: 1180, height: 780, x: undefined, y: undefined, maximized: false },
    settings: {
      darkMode: false,
      charCounter: {
        unit: "char", // 'char' | 'byte'
        includeSpaces: true,
        limit: 1000
      }
    }
  }
});

module.exports = store;

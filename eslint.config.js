"use strict";
const js = require("@eslint/js");
module.exports = [
  { ignores: ["dist/**", "node_modules/**"] },
  js.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "commonjs",
      globals: Object.fromEntries([
        "window", "document", "globalThis", "fetch", "AbortSignal", "AbortController", "URL", "URLSearchParams",
        "setTimeout", "clearTimeout", "console", "process", "Buffer", "__dirname"
      ].map((name) => [name, "readonly"]))
    },
    rules: { "no-unused-vars": ["error", { argsIgnorePattern: "^_" }] }
  }
];

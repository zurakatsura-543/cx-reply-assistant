const js = require("@eslint/js");
const globals = require("globals");
const tseslint = require("typescript-eslint");

module.exports = tseslint.config(js.configs.recommended, ...tseslint.configs.recommended, {
  files: ["**/*.ts"],
  languageOptions: {
    ecmaVersion: 2022,
    globals: {
      ...globals.node
    }
  }
});

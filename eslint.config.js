import js from "@eslint/js";

export default [
  js.configs.recommended,
  {
      rules: {
          "no-unused-vars": "warn",
          "no-undef": "error"
      },
      languageOptions: {
          ecmaVersion: 2022,
          sourceType: "module",
          globals: {
              document: "readonly",
              window: "readonly",
              localStorage: "readonly",
              console: "readonly",
              setTimeout: "readonly",
              clearTimeout: "readonly",
              URL: "readonly",
              alert: "readonly",
              Blob: "readonly",
              FileReader: "readonly",
              fetch: "readonly",
              Math: "readonly",
              Date: "readonly",
              isNaN: "readonly",
              Number: "readonly",
              parseFloat: "readonly",
              Promise: "readonly",
              process: "readonly"
          }
      }
  }
];

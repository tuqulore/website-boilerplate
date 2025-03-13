import js from "@eslint/js";
import prettier from "eslint-config-prettier/flat";
import { defineConfig, globalIgnores } from "eslint/config";
import globals from "globals";
import * as mdx from "eslint-plugin-mdx";
import react from "eslint-plugin-react";

export default defineConfig([
  {
    plugins: { js },
    extends: ["js/recommended"],
    files: ["**/*.{cjs,mjs,js,jsx}"],
  },
  {
    files: ["**/*.cjs"],
    languageOptions: { sourceType: "commonjs" },
  },
  {
    files: ["**/*.{mjs,js,jsx,mdx}"],
    languageOptions: { sourceType: "module" },
  },
  {
    files: [
      "**/*.cjs",
      "*.mjs",
      "lib/**/*.{mjs,js}",
      "src/_data/**/*.{mjs,js}",
    ],
    languageOptions: { globals: globals.node },
  },
  {
    ...react.configs.flat.recommended,
    files: ["**/*.jsx"],
    plugins: { react },
    languageOptions: {
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
      globals: {
        ...globals.serviceworker,
        ...globals.browser,
      },
    },
    rules: {
      "react/jsx-uses-react": "off",
    },
  },
  /*
  {
    ...mdx.flat,
    processor: mdx.createRemarkProcessor({ lintCodeBlocks: true }),
  },
  */
  mdx.configs.flatCodeBlocks,
  globalIgnores(["dist/"]),
  prettier,
]);

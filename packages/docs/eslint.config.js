import js from "@eslint/js";
import prettier from "eslint-config-prettier/flat";
import * as mdx from "eslint-plugin-mdx";
import react from "eslint-plugin-react";
import { defineConfig, globalIgnores } from "eslint/config";
import globals from "globals";

export default defineConfig([
  {
    files: ["**/*.{cjs,js,jsx}"],
    plugins: { js },
    extends: ["js/recommended"],
  },
  {
    files: ["**/*.cjs"],
    languageOptions: { sourceType: "commonjs" },
  },
  {
    files: ["**/*.{js,jsx}"],
    languageOptions: { sourceType: "module" },
  },
  {
    files: ["**/*.cjs", "*.js", "src/_data/**/*.js"],
    languageOptions: { globals: globals.node },
  },
  { ...react.configs.flat.recommended, files: ["**/*.{jsx,mdx}"] },
  {
    files: ["**/*.{jsx,mdx}"],
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
    settings: {
      react: { version: "18.3.0" },
    },
    rules: {
      "react/jsx-uses-react": "off",
      "react/react-in-jsx-scope": "off",
      "react/prop-types": "off",
      "react/no-unknown-property": "off",
    },
  },
  mdx.flat,
  globalIgnores(["dist/"]),
  prettier,
]);

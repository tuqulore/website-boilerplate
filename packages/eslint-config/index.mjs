import js from "@eslint/js";
import prettier from "eslint-config-prettier/flat";
import { defineConfig } from "eslint/config";
import globals from "globals";

/**
 * Base ESLint configuration for Node.js packages
 */
export const node = defineConfig([
  {
    files: ["**/*.{mjs,js}"],
    plugins: { js },
    extends: ["js/recommended"],
    languageOptions: { sourceType: "module", globals: globals.node },
  },
  prettier,
]);

export default node;

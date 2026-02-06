import js from "@eslint/js";
import prettier from "eslint-config-prettier/flat";
import globals from "globals";

/**
 * Base ESLint configuration for Node.js packages
 */
export const node = [
  {
    ...js.configs.recommended,
    files: ["**/*.{cjs,mjs,js}"],
  },
  {
    files: ["**/*.cjs"],
    languageOptions: { sourceType: "commonjs" },
  },
  {
    files: ["**/*.{mjs,js}"],
    languageOptions: { sourceType: "module", globals: globals.node },
  },
  prettier,
];

export default node;

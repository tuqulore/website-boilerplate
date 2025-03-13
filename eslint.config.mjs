import js from "@eslint/js";
import prettier from "eslint-config-prettier/flat";
import { defineConfig, globalIgnores } from "eslint/config";
import globals from "globals";

export default defineConfig([
  {
    plugins: { js },
    extends: ["js/recommended"],
    files: ["**/*.{cjs,mjs,js}"],
  },
  {
    files: ["**/*.cjs"],
    languageOptions: { sourceType: "commonjs" },
  },
  {
    files: ["**/*.{mjs,js}"],
    languageOptions: { sourceType: "module" },
  },
  {
    files: ["**/*.cjs", "*.mjs", "src/_data/**/*.{mjs,js}"],
    languageOptions: { globals: globals.node },
  },
  globalIgnores(["dist/"]),
  prettier,
]);

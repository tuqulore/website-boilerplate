import config from "@tuqulore/eslint-config";
import { defineConfig, globalIgnores } from "eslint/config";

export default defineConfig([...config, globalIgnores(["templates/**"])]);

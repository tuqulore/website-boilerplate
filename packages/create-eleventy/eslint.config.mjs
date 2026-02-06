import config from "@tuqulore/eslint-config";
import { globalIgnores } from "eslint/config";

export default [...config, globalIgnores(["templates/**"])];

import config from "@tuqulore-inc/eslint-config";
import { globalIgnores } from "eslint/config";

export default [...config, globalIgnores(["templates/"])];

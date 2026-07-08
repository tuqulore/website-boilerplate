import type { UserConfig } from "@11ty/eleventy";
import type { HydrateModuleResolver } from "./resolver.js";

export interface PluginOptions {
  /**
   * Preact version for esm.sh CDN (e.g., "10.26.4").
   * If not specified, the latest version will be used.
   */
  preactVersion?: string;
  /**
   * Convert an SSR-side hydrate module URL (e.g. `import.meta.url` inside a
   * `*.hydrate.jsx` file) into the browser URL where the compiled bundle is
   * served. Defaults to `createHydrateModuleResolver()` which assumes `src/**`
   * sources served under `/`.
   */
  resolveHydrateUrl?: HydrateModuleResolver;
}

/**
 * Eleventy plugin for Preact partial hydration with is-land
 */
declare function preactIslandPlugin(
  eleventyConfig: UserConfig,
  pluginOptions?: PluginOptions,
): void;

export default preactIslandPlugin;

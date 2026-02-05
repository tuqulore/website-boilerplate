import type { UserConfig } from "@11ty/eleventy";

export interface PluginOptions {
  /**
   * Preact version for esm.sh CDN (e.g., "10.26.4").
   * If not specified, the latest version will be used.
   */
  preactVersion?: string;
}

/**
 * Eleventy plugin for Preact partial hydration with is-land
 */
declare function preactIslandPlugin(
  eleventyConfig: UserConfig,
  pluginOptions?: PluginOptions,
): void;

export default preactIslandPlugin;

import type { UserConfig } from "@11ty/eleventy";

export interface PluginOptions {
  /**
   * Glob patterns for files to track as dependencies.
   * When any of these files change, the CSS will be rebuilt.
   * Useful for TailwindCSS which scans content files for class names.
   */
  contentGlob?: string | string[];
}

/**
 * Eleventy plugin for processing CSS with PostCSS
 */
declare function postcssPlugin(
  eleventyConfig: UserConfig,
  pluginOptions?: PluginOptions,
): void;

export default postcssPlugin;

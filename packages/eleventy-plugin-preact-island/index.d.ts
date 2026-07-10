import type { UserConfig } from "@11ty/eleventy";

export interface PluginOptions {
  /**
   * Preact version for esm.sh CDN (e.g., "10.26.4").
   * If not specified, the latest version will be used.
   */
  preactVersion?: string;
  /**
   * Bundle `*.client.{js,jsx,ts,tsx}` entries with esbuild. Set to `false` to
   * bring your own bundler; the plugin still adds the Eleventy ignore rule,
   * wires the SSR URL resolver, copies `is-land.js`, and injects the browser
   * setup.
   * @default true
   */
  bundle?: boolean;
}

/**
 * Eleventy plugin for Preact partial hydration with is-land
 */
declare function preactIslandPlugin(
  eleventyConfig: UserConfig,
  pluginOptions?: PluginOptions,
): void;

export default preactIslandPlugin;

import type { UserConfig } from "@11ty/eleventy";

export interface PluginOptions {
  /**
   * Override the Preact version used in the esm.sh CDN URL (e.g., "10.26.4").
   *
   * Defaults to the version of `preact` installed in the host project
   * (auto-detected from `preact/package.json`), so the CDN runtime stays in
   * sync with the SSR/bundle side by default. Set this only to force the CDN
   * side to a different version than the installed one.
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

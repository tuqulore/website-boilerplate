import type { UserConfig } from "@11ty/eleventy";

export interface PluginOptions {
  /**
   * @deprecated Ignored. Client dependencies are bundled from the installed
   * packages instead of being loaded from a CDN.
   */
  preactVersion?: string;
  /**
   * @deprecated Ignored. Client dependencies are bundled from the installed
   * packages instead of being loaded from a CDN.
   */
  devalueVersion?: string;
  /**
   * Bundle `*.client.{js,jsx,ts,tsx}` entries with esbuild. Set to `false` to
   * bring your own bundler; the plugin still adds the Eleventy ignore rule,
   * wires the SSR URL resolver, copies `is-land.js`, and writes and loads the
   * unbundled `__island-setup.js` for your bundler to process. The setup
   * imports `devalue` and the Preact mount module of
   * `@tuqulore-inc/eleventy-islands` by absolute path.
   * @default true
   */
  bundle?: boolean;
}

/**
 * Eleventy plugin for Preact partial hydration with is-land
 *
 * @deprecated Use `@tuqulore-inc/eleventy-islands`:
 * `addPlugin(islands, { adapter: preactAdapter, bundler: esbuildBundler() })`.
 */
declare function preactIslandPlugin(
  eleventyConfig: UserConfig,
  pluginOptions?: PluginOptions,
): void;

export default preactIslandPlugin;

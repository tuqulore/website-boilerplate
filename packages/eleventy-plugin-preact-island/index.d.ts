import type { UserConfig } from "@11ty/eleventy";

export interface PluginOptions {
  /**
   * Preact version for esm.sh CDN (e.g., "10.26.4").
   * If not specified, the latest version will be used.
   */
  preactVersion?: string;
  /**
   * Glob pattern for client entry points (e.g., `"./src/**\/*.client.jsx"`).
   * When provided, matching files are:
   * - Bundled with esbuild
   * - Ignored by Eleventy (not processed as templates)
   * When omitted, no bundling happens and no ignore rule is added.
   */
  entries?: string;
  /**
   * Source directory that contains client entry points. Used as esbuild
   * `outbase` and as the marker segment when converting SSR-side client module
   * URLs (e.g. `import.meta.url` inside a `*.client.jsx` file) to browser URLs.
   * Should match your Eleventy input directory.
   * @default "src"
   */
  srcDir?: string;
  /**
   * esbuild `outdir` for client entry bundles. Usually matches the Eleventy
   * output directory so bundled `.client.js` files land next to their siblings.
   * @default "dist"
   */
  outDir?: string;
  /**
   * URL path prefix where the compiled client module bundles are served.
   * @default "/"
   */
  urlPrefix?: string;
}

/**
 * Eleventy plugin for Preact partial hydration with is-land
 */
declare function preactIslandPlugin(
  eleventyConfig: UserConfig,
  pluginOptions?: PluginOptions,
): void;

export default preactIslandPlugin;

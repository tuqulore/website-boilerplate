import type { UserConfig } from "@11ty/eleventy";

export interface PluginOptions {
  /**
   * Glob pattern for hydration entry points.
   * Files matching this pattern will be bundled with esbuild and ignored by Eleventy.
   * Example: "./src/**\/*.hydrate.jsx"
   */
  hydrateGlob?: string;
}

/**
 * Eleventy plugin for Preact server-side rendering with JSX/MDX support
 *
 * Features:
 * - Adds JSX and MDX as template formats
 * - Renders Preact components to HTML using preact-render-to-string
 * - Bundles hydration entry points with esbuild
 * - Automatically registers Node.js loaders for JSX/MDX
 */
declare function preactPlugin(
  eleventyConfig: UserConfig,
  pluginOptions?: PluginOptions,
): void;

export default preactPlugin;

import type { UserConfig } from "@11ty/eleventy";

/**
 * Eleventy plugin for Preact server-side rendering with JSX/MDX support.
 *
 * Features:
 * - Adds JSX and MDX as template formats
 * - Renders Preact components to HTML using preact-render-to-string
 * - Automatically registers Node.js loaders for JSX/MDX
 *
 * Client-side bundling and partial hydration are handled by
 * `@tuqulore-inc/eleventy-plugin-preact-island`.
 */
declare function preactPlugin(eleventyConfig: UserConfig): void;

export default preactPlugin;

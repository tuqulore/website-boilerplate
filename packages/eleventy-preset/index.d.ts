import type { UserConfig } from "@11ty/eleventy";

/**
 * Eleventy preset for tuqulore website boilerplate
 *
 * Includes:
 * - @tuqulore-inc/eleventy-plugin-preact (JSX/MDX SSR)
 * - @tuqulore-inc/eleventy-plugin-preact-island (Partial hydration)
 * - @tuqulore-inc/eleventy-plugin-postcss (CSS processing)
 * - Markdown settings (breaks, linkify)
 * - Server options for CSS watching
 *
 * @param extend - Optional function to extend the configuration
 * @returns Eleventy configuration function
 *
 * @example
 * ```javascript
 * import preset from "@tuqulore-inc/eleventy-preset";
 *
 * export default preset((eleventyConfig) => {
 *   eleventyConfig.addPassthroughCopy({ "src/public/**": "/" });
 * });
 * ```
 */
declare function preset(
  extend?: (eleventyConfig: UserConfig) => void,
): (eleventyConfig: UserConfig) => { dir: { input: string; output: string } };

export default preset;

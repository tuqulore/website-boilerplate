import islands from "@tuqulore-inc/eleventy-islands";
import { esbuildBundler } from "@tuqulore-inc/eleventy-islands/esbuild";
import { preactAdapter } from "@tuqulore-inc/eleventy-islands/preact";

console.warn(
  "[eleventy-plugin-preact-island] WARN: This package is deprecated and will be removed in the next major version. Use `@tuqulore-inc/eleventy-islands` with `preactAdapter` from `/preact` and `esbuildBundler` from `/esbuild` instead.",
);

/**
 * Eleventy plugin for Preact partial hydration with is-land.
 *
 * @deprecated Use `@tuqulore-inc/eleventy-islands`:
 *   `addPlugin(islands, { adapter: preactAdapter, bundler: esbuildBundler() })`.
 * @param {import("@11ty/eleventy").UserConfig} eleventyConfig
 * @param {import("./index.js").PluginOptions} [pluginOptions]
 */
export default function (eleventyConfig, pluginOptions = {}) {
  const { bundle = true } = pluginOptions;

  for (const name of ["preactVersion", "devalueVersion"]) {
    if (pluginOptions[name] !== undefined) {
      console.warn(
        `[eleventy-plugin-preact-island] WARN: \`${name}\` is deprecated and ignored. Client dependencies are bundled from the installed packages.`,
      );
    }
  }

  islands(eleventyConfig, {
    adapter: preactAdapter,
    bundler: bundle ? esbuildBundler() : undefined,
  });
}

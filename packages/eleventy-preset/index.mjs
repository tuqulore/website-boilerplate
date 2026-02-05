import postcss from "@tuqulore/eleventy-plugin-postcss";
import preact from "@tuqulore/eleventy-plugin-preact";
import preactIsland from "@tuqulore/eleventy-plugin-preact-island";

/**
 * Eleventy preset for tuqulore website boilerplate
 * @param {(eleventyConfig: import("@11ty/eleventy").UserConfig) => void} [extend] - Optional function to extend the configuration
 * @returns {(eleventyConfig: import("@11ty/eleventy").UserConfig) => { dir: { input: string, output: string } }}
 */
export default function preset(extend = () => {}) {
  return (eleventyConfig) => {
    // Preact SSR + hydration
    eleventyConfig.addPlugin(preact, {
      hydrateGlob: "./src/**/*.hydrate.jsx",
    });

    // Preact partial hydration with is-land
    eleventyConfig.addPlugin(preactIsland);

    // PostCSS processing
    eleventyConfig.addPlugin(postcss, {
      contentGlob: ["src/**/*.{md,mdx,jsx}"],
    });

    // Watch generated CSS for dev server reload
    eleventyConfig.setServerOptions({
      watch: ["dist/**/*.css"],
    });

    // Markdown settings
    eleventyConfig.amendLibrary("md", (md) =>
      md.set({ breaks: true, linkify: true }),
    );

    // Apply user extensions
    extend(eleventyConfig);

    // Return directory configuration (not configurable via plugins)
    return {
      dir: {
        input: "src",
        output: "dist",
      },
    };
  };
}

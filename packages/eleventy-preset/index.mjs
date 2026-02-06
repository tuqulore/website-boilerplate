import Image from "@11ty/eleventy-img";
import postcss from "@tuqulore-inc/eleventy-plugin-postcss";
import preact from "@tuqulore-inc/eleventy-plugin-preact";
import preactIsland from "@tuqulore-inc/eleventy-plugin-preact-island";
import fg from "fast-glob";
import path from "node:path";

/**
 * Optimize images in src directory and output to dist
 */
const optimizeImages = async () => {
  const images = await fg(["src/**/*.{jpeg,jpg,png,webp,gif,tiff,avif,svg}"], {
    ignore: ["dist", "**/node_modules", "src/public"],
  });
  for (const image of images) {
    await Image(image, {
      filenameFormat: () => path.basename(image),
      formats: [null],
      sharpOptions: {
        animated: true,
      },
      outputDir: path.dirname(image).replace(/^src/, "dist"),
    });
  }
};

/**
 * Eleventy preset for tuqulore website boilerplate
 * @param {(eleventyConfig: import("@11ty/eleventy").UserConfig) => void} [extend] - Optional function to extend the configuration
 * @returns {(eleventyConfig: import("@11ty/eleventy").UserConfig) => void}
 */
export default function preset(extend = () => {}) {
  return (eleventyConfig) => {
    eleventyConfig.versionCheck(">=3.0");

    // Input & Output Directories
    eleventyConfig.setInputDirectory("src");
    eleventyConfig.setOutputDirectory("dist");

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

    // Copy static assets from src/public to root
    eleventyConfig.addPassthroughCopy({ "src/public/**": "/" });

    // Optimize images before build
    eleventyConfig.on("eleventy.before", optimizeImages);

    // Apply user extensions
    extend(eleventyConfig);
  };
}

import Image from "@11ty/eleventy-img";
import postcss from "@tuqulore-inc/eleventy-plugin-postcss";
import preact from "@tuqulore-inc/eleventy-plugin-preact";
import preactIsland from "@tuqulore-inc/eleventy-plugin-preact-island";
import fg from "fast-glob";
import path from "node:path";

// This preset's directory / URL convention.
const SRC_DIR = "src";
const OUT_DIR = "dist";
const URL_PREFIX = "/";

/**
 * Optimize images under SRC_DIR and output the same tree under OUT_DIR
 */
const optimizeImages = async () => {
  const images = await fg(
    [`${SRC_DIR}/**/*.{jpeg,jpg,png,webp,gif,tiff,avif,svg}`],
    {
      ignore: [OUT_DIR, "**/node_modules", `${SRC_DIR}/public`],
    },
  );
  for (const image of images) {
    await Image(image, {
      filenameFormat: () => path.basename(image),
      formats: [null],
      sharpOptions: {
        animated: true,
      },
      outputDir: path
        .dirname(image)
        .replace(new RegExp(`^${SRC_DIR}`), OUT_DIR),
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
    eleventyConfig.setInputDirectory(SRC_DIR);
    eleventyConfig.setOutputDirectory(OUT_DIR);

    // Preact SSR
    eleventyConfig.addPlugin(preact);

    // Preact partial hydration with is-land (owns client bundle + URL resolver)
    eleventyConfig.addPlugin(preactIsland, {
      entries: `./${SRC_DIR}/**/*.client.jsx`,
      srcDir: SRC_DIR,
      outDir: OUT_DIR,
      urlPrefix: URL_PREFIX,
    });

    // PostCSS processing
    eleventyConfig.addPlugin(postcss, {
      contentGlob: [`${SRC_DIR}/**/*.{md,mdx,jsx}`],
    });

    // Watch generated CSS for dev server reload
    eleventyConfig.setServerOptions({
      watch: [`${OUT_DIR}/**/*.css`],
    });

    // Markdown settings
    eleventyConfig.amendLibrary("md", (md) =>
      md.set({ breaks: true, linkify: true }),
    );

    // Copy static assets from SRC_DIR/public to root
    eleventyConfig.addPassthroughCopy({ [`${SRC_DIR}/public/**`]: "/" });

    // Optimize images before build
    eleventyConfig.on("eleventy.before", optimizeImages);

    // Apply user extensions
    extend(eleventyConfig);
  };
}

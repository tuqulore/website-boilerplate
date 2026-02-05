import Image from "@11ty/eleventy-img";
import fg from "fast-glob";
import path from "node:path";
import postcss from "@tuqulore/eleventy-plugin-postcss";
import preact from "@tuqulore/eleventy-plugin-preact";
import preactIsland from "@tuqulore/eleventy-plugin-preact-island";

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

/** @param {import("@11ty/eleventy").UserConfig} eleventyConfig */
export default (eleventyConfig) => {
  eleventyConfig.addPlugin(preact, {
    hydrateGlob: "./src/**/*.hydrate.jsx",
  });
  eleventyConfig.addPlugin(postcss, {
    contentGlob: ["src/**/*.{md,mdx,jsx}"],
  });
  eleventyConfig.addPlugin(preactIsland);
  eleventyConfig.amendLibrary("md", (md) =>
    md.set({ html: true, breaks: true, linkify: true }),
  );
  eleventyConfig.addWatchTarget("src/style/**/*.css");
  eleventyConfig.addPassthroughCopy({ "src/public/**": "/" });
  eleventyConfig.on("eleventy.before", optimizeImages);
  eleventyConfig.setServerOptions({
    watch: ["dist/**/*.css"],
  });
  return {
    dir: {
      input: "src",
      output: "dist",
    },
  };
};

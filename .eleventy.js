const fg = require("fast-glob");
const { basename, dirname } = require("path");
const Image = require("@11ty/eleventy-img");

const optimizeImages = async () => {
  const images = await fg(["src/**/*.{jpeg,jpg,png,webp,gif,tiff,avif,svg}"], {
    ignore: ["dist", "**/node_modules"],
  });
  for (const image of images) {
    await Image(image, {
      filenameFormat: () => basename(image),
      formats: [null],
      outputDir: dirname(image).replace(/^src/, "dist"),
    });
  }
};

module.exports = (eleventyConfig) => {
  eleventyConfig.addFilter("formatDate", (date) =>
    date.toLocaleDateString("ja-JP")
  );
  eleventyConfig.addPassthroughCopy("src/!(_*)/**/*.{ico,js,mp4,webm,pdf}");
  eleventyConfig.on("beforeBuild", optimizeImages);
  // NOTE: live reload not working when use postcss-cli directly
  eleventyConfig.setBrowserSyncConfig({ files: ["dist/style"] });
  return {
    dir: {
      input: "src",
      output: "dist",
    },
  };
};

const globby = require("globby");
const { basename, dirname } = require("path");
const Image = require("@11ty/eleventy-img");

const optimizeImages = async () => {
  const images = await globby(
    ["samples/hello-world/**/*.{jpeg,jpg,png,webp,gif,tiff,avif,svg}"],
    { gitignore: true }
  );
  for (const image of images) {
    await Image(image, {
      filenameFormat: () => basename(image),
      formats: [null],
      outputDir: dirname(image).replace(/^samples\/hello-world/, "dist"),
    });
  }
};

module.exports = (eleventyConfig) => {
  eleventyConfig.addFilter("formatDate", (date) =>
    date.toLocaleDateString("ja-JP")
  );
  eleventyConfig.addPassthroughCopy(
    "samples/hello-world/!(_*)/**/*.{ico,js,mp4,webm,pdf}"
  );
  eleventyConfig.on("beforeBuild", optimizeImages);
  // NOTE: live reload not working when use postcss-cli directly
  eleventyConfig.setBrowserSyncConfig({ files: ["dist/style"] });
  return {
    dir: {
      input: "samples/hello-world",
      output: "dist",
    },
  };
};

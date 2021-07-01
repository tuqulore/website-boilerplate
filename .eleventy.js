const globby = require("globby");
const { basename, dirname } = require("path");
const Image = require("@11ty/eleventy-img");
const CacheBuster = require("@mightyplow/eleventy-plugin-cache-buster");

(async () => {
  const images = await globby(
    ["src/**/*.{jpeg,jpg,png,webp,gif,tiff,avif,svg}"],
    { gitignore: true }
  );
  for (const image of images) {
    await Image(image, {
      filenameFormat: () => basename(image),
      formats: [null],
      outputDir: dirname(image).replace(/^src/, "dist"),
    });
  }
})();

module.exports = (eleventyConfig) => {
  if (process.env.NODE_ENV === "production") {
    eleventyConfig.addPlugin(CacheBuster({ outputDirectory: "dist" }));
  }
  eleventyConfig.addFilter("formatDate", (date) =>
    date.toLocaleDateString("ja-JP")
  );
  eleventyConfig.addPassthroughCopy("src/**/*.{js,mp4,webm}");
  // NOTE: live reload not working when use postcss-cli directly
  eleventyConfig.setBrowserSyncConfig({ files: ["dist/style"] });
  return {
    dir: {
      input: "src",
      output: "dist",
    },
  };
};

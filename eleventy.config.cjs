const fg = require("fast-glob");
const { basename, dirname } = require("node:path");
const { register } = require("node:module");
const { pathToFileURL } = require("node:url");
const Image = require("@11ty/eleventy-img");
const css = require("./lib/css.cjs");
const preact = require("./lib/preact.cjs");

const optimizeImages = async () => {
  const images = await fg(["src/**/*.{jpeg,jpg,png,webp,gif,tiff,avif,svg}"], {
    ignore: ["dist", "**/node_modules", "src/public"],
  });
  for (const image of images) {
    await Image(image, {
      filenameFormat: () => basename(image),
      formats: [null],
      sharpOptions: {
        animated: true,
      },
      outputDir: dirname(image).replace(/^src/, "dist"),
    });
  }
};

module.exports = (eleventyConfig) => {
  eleventyConfig.addTemplateFormats(["css", "jsx", "mdx"]);
  eleventyConfig.addExtension("css", css);
  eleventyConfig.addExtension(["jsx", "mdx"], preact);
  eleventyConfig.addTransform("doctype", function (content) {
    if (this.page.outputFileExtension === "html")
      return `<!doctype html>\n${content}`;
    return content;
  });
  eleventyConfig.amendLibrary("md", (md) =>
    md.set({ html: true, breaks: true, linkify: true }),
  );
  eleventyConfig.addPassthroughCopy({ "src/public/**": "/" });
  eleventyConfig.addPassthroughCopy({
    [require.resolve("@11ty/is-land/is-land.js")]: "/",
    [require.resolve("@11ty/is-land/is-land-autoinit.js")]: "/",
  });
  eleventyConfig.on("eleventy.before", () => {
    register("./lib/jsx-loader.mjs", pathToFileURL("./"));
    register("./lib/mdx-loader.mjs", pathToFileURL("./"));
  });
  eleventyConfig.on("eleventy.before", optimizeImages);
  return {
    dir: {
      input: "src",
      output: "dist",
    },
  };
};

const fg = require("fast-glob");
const { basename, dirname } = require("node:path");
const Image = require("@11ty/eleventy-img");
const css = require("./lib/css.cjs");
const jsx = require("./lib/jsx.cjs");

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
  eleventyConfig.addTemplateFormats("css");
  eleventyConfig.addExtension("css", css);
  eleventyConfig.addTemplateFormats("jsx");
  eleventyConfig.addExtension("jsx", jsx);
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
  eleventyConfig.on("eleventy.before", optimizeImages);
  return {
    dir: {
      input: "src",
      output: "dist",
    },
  };
};

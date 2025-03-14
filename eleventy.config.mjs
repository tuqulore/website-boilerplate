import Image from "@11ty/eleventy-img";
import fg from "fast-glob";
import path from "node:path";
import url from "node:url";
import css from "./lib/css.mjs";

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

export default (eleventyConfig) => {
  eleventyConfig.addTemplateFormats("css");
  eleventyConfig.addExtension("css", css);
  eleventyConfig.addFilter("date", (date) => date.toLocaleDateString("ja-JP"));
  eleventyConfig.addFilter("origin", (url) => new URL(url).origin);
  eleventyConfig.amendLibrary("md", (md) =>
    md.set({ html: true, breaks: true, linkify: true }),
  );
  eleventyConfig.addWatchTarget("src/style/**/*.css");
  eleventyConfig.addPassthroughCopy({ "src/public/**": "/" });
  eleventyConfig.addPassthroughCopy({
    [url.fileURLToPath(import.meta.resolve("@11ty/is-land/is-land.js"))]: "/",
    [url.fileURLToPath(
      import.meta.resolve("@11ty/is-land/is-land-autoinit.js"),
    )]: "/",
  });
  eleventyConfig.on("eleventy.before", optimizeImages);
  return {
    dir: {
      input: "src",
      output: "dist",
    },
  };
};

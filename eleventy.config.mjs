import fg from "fast-glob";
import path from "node:path";
import url from "node:url";
import Image from "@11ty/eleventy-img";
import postcss from "postcss";
import postcssrc from "postcss-load-config";

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
  eleventyConfig.addFilter("date", (date) => date.toLocaleDateString("ja-JP"));
  eleventyConfig.addFilter("origin", (url) => new URL(url).origin);
  eleventyConfig.addBundle("css", {
    transforms: [
      async function (css) {
        const { page } = this;
        const { plugins, options } = await postcssrc();
        const result = await postcss(plugins).process(css, {
          ...options,
          from: page.inputPath,
        });
        return result.css;
      },
    ],
  });
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
  eleventyConfig.on("eleventyConfig.before", optimizeImages);
  return {
    dir: {
      input: "src",
      output: "dist",
    },
  };
};

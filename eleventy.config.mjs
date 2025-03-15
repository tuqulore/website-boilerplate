import Image from "@11ty/eleventy-img";
import fg from "fast-glob";
import module from "node:module";
import path from "node:path";
import url from "node:url";
import css from "./lib/css.mjs";
import * as preact from "./lib/preact.mjs";
import { build, context } from "esbuild";

module.register("./lib/mdx-loader.mjs", url.pathToFileURL("./"));
module.register("./lib/jsx-loader.mjs", url.pathToFileURL("./"));

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

const transformJsx = async ({ runMode }) => {
  /** @type {import("esbuild").BuildOptions} */
  const options = {
    entryPoints: ["./src/**/*.hydrate.jsx"],
    outdir: "dist",
    outbase: "src",
    jsx: "automatic",
    jsxImportSource: "preact",
  };
  const ctx = await context(options);
  if (runMode === "build") {
    await build(options);
  } else {
    ctx.watch();
  }
};

export default (eleventyConfig) => {
  eleventyConfig.addTemplateFormats(["hydrate.jsx", "jsx", "mdx"]);
  eleventyConfig.addExtension("hydrate.jsx", preact.hydrate);
  eleventyConfig.addExtension(["jsx", "mdx"], preact.template);
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
  eleventyConfig.on("eleventy.before", transformJsx);
  return {
    dir: {
      input: "src",
      output: "dist",
    },
  };
};

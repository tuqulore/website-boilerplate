import Image from "@11ty/eleventy-img";
import fg from "fast-glob";
import module from "node:module";
import path from "node:path";
import url from "node:url";
import css from "./lib/css.mjs";
import preact from "./lib/preact.mjs";
import * as esbuild from "esbuild";

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
    bundle: true,
    entryPoints: ["./src/**/*.hydrate.jsx"],
    external: ["preact"],
    format: "esm",
    jsx: "automatic",
    jsxImportSource: "preact",
    outbase: "src",
    outdir: "dist",
  };
  const ctx = await esbuild.context(options);
  if (runMode === "build") {
    await esbuild.build(options);
    await esbuild.stop();
  } else {
    ctx.watch();
  }
};

export default (eleventyConfig) => {
  eleventyConfig.addTemplateFormats(["jsx", "mdx"]);
  eleventyConfig.ignores.add("src/**/*.hydrate.jsx");
  eleventyConfig.addExtension(["jsx", "mdx"], preact);
  eleventyConfig.addTemplateFormats("css");
  eleventyConfig.addExtension("css", css);
  eleventyConfig.amendLibrary("md", (md) =>
    md.set({ html: true, breaks: true, linkify: true }),
  );
  eleventyConfig.addWatchTarget("src/style/**/*.css");
  eleventyConfig.addPassthroughCopy({ "src/public/**": "/" });
  eleventyConfig.addPassthroughCopy({
    [url.fileURLToPath(import.meta.resolve("@11ty/is-land/is-land.js"))]: "/",
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

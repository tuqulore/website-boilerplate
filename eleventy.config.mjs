import Image from "@11ty/eleventy-img";
import preset from "@tuqulore/eleventy-preset";
import fg from "fast-glob";
import path from "node:path";

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

export default preset((eleventyConfig) => {
  eleventyConfig.addPassthroughCopy({ "src/public/**": "/" });
  eleventyConfig.on("eleventy.before", optimizeImages);
});

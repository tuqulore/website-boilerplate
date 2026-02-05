import module from "node:module";
import url from "node:url";
import render from "preact-render-to-string";
import { jsx } from "preact/jsx-runtime";
import * as esbuild from "esbuild";

// Register Node.js loaders for JSX/MDX support
module.register(import.meta.resolve("./loaders/mdx.mjs"), url.pathToFileURL("./"));
module.register(import.meta.resolve("./loaders/jsx.mjs"), url.pathToFileURL("./"));

/**
 * Eleventy plugin for Preact server-side rendering with JSX/MDX support
 * @param {import("@11ty/eleventy").UserConfig} eleventyConfig
 * @param {Object} pluginOptions
 * @param {string} [pluginOptions.hydrateGlob] - Glob pattern for hydration entry points
 */
export default function (eleventyConfig, pluginOptions = {}) {
  try {
    eleventyConfig.versionCheck(">=3.0");
  } catch (e) {
    console.log(`[eleventy-plugin-preact] WARN: ${e.message}`);
  }

  const { hydrateGlob } = pluginOptions;

  // Add JSX and MDX as template formats
  eleventyConfig.addTemplateFormats(["jsx", "mdx"]);

  // Ignore hydration entry points (they are bundled separately)
  if (hydrateGlob) {
    // Convert glob to ignore pattern (remove leading ./)
    const ignorePattern = hydrateGlob.replace(/^\.\//, "");
    eleventyConfig.ignores.add(ignorePattern);
  }

  // Add extension handler for JSX and MDX
  eleventyConfig.addExtension(["jsx", "mdx"], {
    key: "11ty.js",
    compile: () => {
      return async function (data) {
        const content = await this.defaultRenderer(data);
        return render(jsx(content.type, content.props, content.key));
      };
    },
  });

  // Setup esbuild for hydration bundles
  if (hydrateGlob) {
    const transformJsx = async ({ runMode }) => {
      /** @type {import("esbuild").BuildOptions} */
      const options = {
        bundle: true,
        entryPoints: [hydrateGlob],
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

    eleventyConfig.on("eleventy.before", transformJsx);
  }
}

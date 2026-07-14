import module from "node:module";
import url from "node:url";
import render from "preact-render-to-string";
import { jsx } from "preact/jsx-runtime";
import { _runWithEleventyData } from "./eleventy.js";

// Register Node.js loaders for JSX/MDX support
module.register(
  import.meta.resolve("./loaders/mdx.js"),
  url.pathToFileURL("./"),
);
module.register(
  import.meta.resolve("./loaders/jsx.js"),
  url.pathToFileURL("./"),
);

/**
 * Eleventy plugin for Preact server-side rendering with JSX/TSX/MDX support.
 *
 * SSR only: registers `.jsx` / `.tsx` / `.mdx` template formats and renders
 * Preact components to HTML using preact-render-to-string. Client-side
 * bundling and partial hydration are handled by
 * `@tuqulore-inc/eleventy-plugin-preact-island`.
 *
 * @param {import("@11ty/eleventy").UserConfig} eleventyConfig
 */
export default function (eleventyConfig) {
  try {
    eleventyConfig.versionCheck(">=3.0");
  } catch (e) {
    console.log(`[eleventy-plugin-preact] WARN: ${e.message}`);
  }

  eleventyConfig.addTemplateFormats(["jsx", "tsx", "mdx"]);

  eleventyConfig.addExtension(["jsx", "tsx", "mdx"], {
    key: "11ty.js",
    compile: () => {
      return async function (data) {
        return _runWithEleventyData(data, async () => {
          const content = await this.defaultRenderer(data);
          const html = render(
            jsx(content.type, content.props, content.key),
          ).trimStart();
          // NOTE: preact-render-to-string does not emit a DOCTYPE, so full-page
          // outputs land in quirks mode. Prepend only when the render actually
          // starts with <html> to leave partial / island renders untouched.
          // trimStart しているのは MDX/JSX の出力先頭に改行や BOM 等の空白が
          // 混ざり得るためで、その影響で startsWith 判定が外れないようにする。
          return html.startsWith("<html") ? `<!doctype html>${html}` : html;
        });
      };
    },
  });
}

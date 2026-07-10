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
 * Eleventy plugin for Preact server-side rendering with JSX/MDX support.
 *
 * SSR only: registers `.jsx` / `.mdx` template formats and renders Preact
 * components to HTML using preact-render-to-string. Client-side bundling and
 * partial hydration are handled by `@tuqulore-inc/eleventy-plugin-preact-island`.
 *
 * @param {import("@11ty/eleventy").UserConfig} eleventyConfig
 */
export default function (eleventyConfig) {
  try {
    eleventyConfig.versionCheck(">=3.0");
  } catch (e) {
    console.log(`[eleventy-plugin-preact] WARN: ${e.message}`);
  }

  // Add JSX and MDX as template formats
  eleventyConfig.addTemplateFormats(["jsx", "mdx"]);

  // Add extension handler for JSX and MDX
  eleventyConfig.addExtension(["jsx", "mdx"], {
    key: "11ty.js",
    compile: () => {
      return async function (data) {
        return _runWithEleventyData(data, async () => {
          const content = await this.defaultRenderer(data);
          const html = render(jsx(content.type, content.props, content.key));
          // NOTE: preact-render-to-string does not emit a DOCTYPE, so full-page
          // outputs land in quirks mode. Prepend only when the render actually
          // starts with <html> to leave partial / island renders untouched.
          return html.startsWith("<html") ? `<!doctype html>${html}` : html;
        });
      };
    },
  });
}

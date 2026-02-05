import fg from "fast-glob";
import postcss from "postcss";
import postcssrc from "postcss-load-config";

/**
 * Eleventy plugin for processing CSS with PostCSS
 * @param {import("@11ty/eleventy").UserConfig} eleventyConfig - Eleventy configuration object
 * @param {Object} pluginOptions - Plugin options
 * @param {string|string[]} [pluginOptions.contentGlob] - Glob patterns for dependency tracking
 */
export default function (eleventyConfig, pluginOptions = {}) {
  try {
    eleventyConfig.versionCheck(">=3.0");
  } catch (e) {
    console.log(`[eleventy-plugin-postcss] WARN: ${e.message}`);
  }

  const { contentGlob = [] } = pluginOptions;
  const contentPatterns = Array.isArray(contentGlob)
    ? contentGlob
    : [contentGlob];

  eleventyConfig.addTemplateFormats("css");
  eleventyConfig.addExtension("css", {
    outputFileExtension: "css",
    compile: async function (content, inputPath) {
      if (contentPatterns.length > 0) {
        const deps = await fg(contentPatterns);
        this.addDependencies(inputPath, deps);
      }
      const { plugins, options } = await postcssrc();
      const result = await postcss(plugins).process(content, {
        ...options,
        from: inputPath,
      });
      return () => result.css;
    },
  });
}

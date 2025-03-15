import postcss from "postcss";
import postcssrc from "postcss-load-config";

export default {
  outputFileExtension: "css",
  compile: async (content, inputPath) => {
    const { plugins, options } = await postcssrc();
    const result = await postcss(plugins).process(content, {
      ...options,
      from: inputPath,
    });
    return () => result.css;
  },
};

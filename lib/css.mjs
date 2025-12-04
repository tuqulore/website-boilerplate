import fg from "fast-glob";
import postcss from "postcss";
import postcssrc from "postcss-load-config";

export default {
  outputFileExtension: "css",
  compile: async function (content, inputPath) {
    const deps = await fg(["src/**/*.{md,mdx,jsx}"]);
    this.addDependencies(inputPath, deps);
    const { plugins, options } = await postcssrc();
    const result = await postcss(plugins).process(content, {
      ...options,
      from: inputPath,
    });
    return () => result.css;
  },
};

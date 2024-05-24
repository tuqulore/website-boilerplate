const postcss = require("postcss");
const postcssrc = require("postcss-load-config");

module.exports = {
  outputFileExtension: "css",
  compile: async (input) => {
    const { plugins, options } = await postcssrc();
    const output = await postcss(plugins).process(input, options);
    return () => output.css;
  },
};

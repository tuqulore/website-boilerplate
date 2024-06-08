const { join } = require("node:path");
const { h } = require("preact");
const { render } = require("preact-render-to-string");

module.exports = {
  outputFileExtension: "html",
  compile: async (_, path) => {
    const mdx = await import(join("..", path));
    return (data) => render(h(mdx.default, data));
  },
  getData: async (path) => {
    const mdx = await import(join("..", path));
    return mdx.data;
  },
};

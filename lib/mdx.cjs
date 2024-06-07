const { join } = require("node:path");
const { register } = require("node:module");
const { pathToFileURL } = require("node:url");
const { h } = require("preact");
const { render } = require("preact-render-to-string");

module.exports = {
  outputFileExtension: "html",
  init: () => {
    register("./mdx-loader.mjs", pathToFileURL("./lib/"));
  },
  compile: async (_, path) => {
    const mdx = await import(join("..", path));
    return (data) => render(h(mdx.default, data));
  },
  getData: async (path) => {
    const mdx = await import(join("..", path));
    return mdx.data;
  },
};

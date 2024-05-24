const { join } = require("node:path");
const { h } = require("preact");
const { render } = require("preact-render-to-string");

module.exports = {
  outputFileExtension: "html",
  init: () => {
    require("@babel/register")({
      extensions: [".jsx"],
    });
  },
  compile: (_, path) => {
    return (data) => render(h(require(join("..", path)).default, data));
  },
  getData: (path) => require(join("..", path)).data,
};

const typography = require("@tailwindcss/typography");
const forms = require("@tailwindcss/forms");

module.exports = {
  content: [
    "samples/hello-world/**/*.js",
    "samples/hello-world/**/*.njk",
    "samples/hello-world/**/*.md",
  ],
  important: true,
  theme: {
    extend: {
      container: {
        center: true,
      },
    },
  },
  plugins: [typography, forms],
};

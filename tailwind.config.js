const typography = require("@tailwindcss/typography");
const forms = require("@tailwindcss/forms");

module.exports = {
  content: ["src/**/*.js", "src/**/*.njk", "src/**/*.md"],
  important: true,
  theme: {
    extend: {},
  },
  plugins: [typography, forms],
};

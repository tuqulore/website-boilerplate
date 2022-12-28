const typography = require("@tailwindcss/typography");
const jumpuUi = require("@jumpu-ui/tailwindcss");

/** @type {import('tailwindcss/types').Config} */
module.exports = {
  content: ["src/**/*.js", "src/**/*.njk", "src/**/*.md"],
  important: true,
  theme: {
    extend: {},
  },
  plugins: [typography, ...jumpuUi],
};

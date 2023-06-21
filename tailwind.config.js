const typography = require("@tailwindcss/typography");
const jumpu = require("@jumpu-ui/tailwindcss");

/** @type {import('tailwindcss/types').Config} */
module.exports = {
  content: ["src/**/*.js", "src/**/*.njk", "src/**/*.md"],
  theme: {
    extend: {},
  },
  plugins: [typography, ...jumpu],
};

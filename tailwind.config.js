const typography = require("@tailwindcss/typography");
const jumpu = require("@jumpu-ui/tailwindcss");

/** @type {import('tailwindcss/types').Config} */
module.exports = {
  content: ["src/**/*.{njk,md}"],
  theme: {
    extend: {},
  },
  plugins: [typography, ...jumpu],
};

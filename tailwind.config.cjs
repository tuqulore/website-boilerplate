const typography = require("@tailwindcss/typography");
const { addDynamicIconSelectors } = require("@iconify/tailwind");
const jumpu = require("@jumpu-ui/tailwindcss");

/** @type {import('tailwindcss/types').Config} */
module.exports = {
  content: ["src/**/*.{js,md,mdx}"],
  theme: {
    extend: {},
  },
  plugins: [typography, addDynamicIconSelectors(), ...jumpu],
};

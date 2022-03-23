const markdownIt = require("markdown-it");
const typography = require("@tailwindcss/typography");
const jumpuUi = require("@jumpu-ui/tailwindcss");

module.exports = {
  content: {
    files: ["src/**/*.{js,njk,md}"],
    transform: {
      md: (content) =>
        markdownIt({ html: true, breaks: true, linkify: true }).render(content),
    },
  },
  important: true,
  theme: {
    extend: {},
  },
  plugins: [typography, ...jumpuUi],
};

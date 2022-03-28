module.exports = ({ env }) => ({
  map: false,
  plugins: {
    "postcss-import": { root: "src/style" },
    "tailwindcss/nesting": {},
    tailwindcss: {},
    autoprefixer: {},
    cssnano: env === "production" ? {} : false,
  },
});

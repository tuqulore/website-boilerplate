module.exports = ({ env }) => ({
  map: false,
  plugins: {
    "postcss-import": {},
    "tailwindcss/nesting": {},
    tailwindcss: {},
    autoprefixer: {},
    cssnano: env === "production" ? {} : false,
  },
});

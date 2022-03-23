module.exports = ({ env }) => ({
  map: false,
  plugins: {
    "postcss-import": {},
    "tailwindcss/nesting": {},
    tailwindcss: {},
    autoprefixer: {},
    "postcss-csso": env === "production" ? {} : false,
  },
});

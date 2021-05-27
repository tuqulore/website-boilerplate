module.exports = ({ env }) => ({
  map: false,
  plugins: {
    "postcss-import": {},
    tailwindcss: {},
    "postcss-nested": {},
    autoprefixer: {},
    "postcss-csso": env === "production" ? {} : false,
  },
});

module.exports = ({ env }) => ({
  map: false,
  plugins: {
    "postcss-import": {},
    "tailwindcss/nesting": {}, // 参照: https://tailwindcss.com/docs/using-with-preprocessors#nesting
    tailwindcss: {},
    autoprefixer: {},
    "postcss-csso": env === "production" ? {} : false,
  },
});

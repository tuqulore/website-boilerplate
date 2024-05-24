module.exports = ({ env }) => ({
  map: false,
  from: undefined,
  plugins: {
    "postcss-import": { root: "src" },
    "tailwindcss/nesting": {},
    tailwindcss: {},
    autoprefixer: {},
    cssnano: env === "production" ? {} : false,
  },
});

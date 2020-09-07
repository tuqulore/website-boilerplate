module.exports = ({ env }) => ({
  map: false,
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
    cssnano: env === 'production'
      ? { preset: 'default' }
      : false,
  },
});

const typography = require('@tailwindcss/typography');

module.exports = {
  future: {
    removeDeprecatedGapUtilities: true,
    purgeLayersByDefault: true,
  },
  purge: [
    'src/script/**/*.js',
    'src/template/**/*.njk',
  ],
  important: true,
  theme: {
    extend: {},
  },
  variants: {},
  plugins: [
    typography,
  ],
};

module.exports = {
  presets: [
    [
      "@babel/preset-react",
      { runtime: "automatic", importSource: "preact", throwIfNamespace: false },
    ],
  ],
  plugins: ["@babel/plugin-transform-modules-commonjs"],
};

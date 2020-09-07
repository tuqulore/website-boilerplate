module.exports = {
  extends: [
    'airbnb-base',
  ],
  env: {
    commonjs: true,
    es2020: true,
    node: true,
  },
  parserOptions: {
    ecmaVersion: 11,
  },
  rules: {
    'import/no-extraneous-dependencies': ['error', {
      devDependencies: ['**/*.config.js'],
    }],
  },
};

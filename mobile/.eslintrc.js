module.exports = {
  root: true,
  extends: '@react-native',
  parserOptions: {
    requireConfigFile: false,
  },
  rules: {
    'react-native/no-inline-styles': 'off',
  },
  ignorePatterns: [
    'babel.config.js',
    'metro.config.js',
    'jest.config.js',
    '.prettierrc.js',
    'index.js',
  ],
};

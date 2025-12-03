module.exports = {
  root: true,
  extends: '@react-native',
  parserOptions: {
    requireConfigFile: false,
  },
  ignorePatterns: [
    'babel.config.js',
    'metro.config.js',
    'jest.config.js',
    '.prettierrc.js',
    'index.js',
  ],
};

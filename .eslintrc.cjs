module.exports = {
  root: true,
  env: { node: true, es2021: true },
  parser: '@typescript-eslint/parser',
  parserOptions: { sourceType: 'module', ecmaVersion: 'latest' },
  plugins: ['@typescript-eslint', 'import'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:import/recommended',
    'plugin:import/typescript'
  ],
  settings: {
    'import/resolver': {
      typescript: true
    }
  },
  rules: {
    'import/order': ['warn', { 'newlines-between': 'always' }]
  },
  ignorePatterns: ['dist', 'node_modules']
};


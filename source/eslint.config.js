import globals from 'globals';
export default [{ ignores: ['**/dist/**', '**/node_modules/**', 'infra/mongodb/**'] }, {
  files: ['**/*.js', '**/*.jsx'], languageOptions: { ecmaVersion: 'latest', sourceType: 'module', globals: {...globals.node, ...globals.browser}, parserOptions: {ecmaFeatures: {jsx: true}} },
  rules: {'no-unreachable': 'error', 'no-constant-condition': 'error', 'no-dupe-keys': 'error', 'no-undef': 'error'}
}];

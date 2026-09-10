import js from '@eslint/js';
import globals from 'globals';

export default [
  { ignores: ['dist/**', 'artifacts/**', 'node_modules/**'] },
  js.configs.recommended,
  { files: ['js/**/*.js'], languageOptions: { globals: globals.browser }, rules: { 'no-unused-vars': ['error', { caughtErrors: 'none' }] } },
  { files: ['scripts/**/*.mjs'], languageOptions: { globals: { ...globals.node, ...globals.browser } } }
];

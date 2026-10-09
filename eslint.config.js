import js from '@eslint/js';
import globals from 'globals';

export const config = [
  { ignores: ['dist/'] },
  js.configs.recommended,
  { languageOptions: { globals: { ...globals.browser } } },
];

// ESLint exige un export par défaut pour sa configuration : exception à la règle des exports nommés.
export default config;

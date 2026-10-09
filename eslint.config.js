import js from '@eslint/js';
import globals from 'globals';

export const config = [
  { ignores: ['dist/', 'node_modules/'] },
  js.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: { ...globals.browser },
    },
  },
  {
    files: ['*.config.js', 'tests/e2e/**'],
    languageOptions: {
      globals: { ...globals.node },
    },
  },
];

// ESLint exige un export par défaut pour son fichier de configuration.
export default config;

import { defineConfig } from 'vite';

// GitHub Pages sert le site sous /<nom-du-dépôt>/ : les chemins des fichiers
// construits doivent en tenir compte, y compris en aperçu (vite preview).
// En développement (npm run dev), on reste à la racine.
const PAGES_BASE_PATH = '/tambour/';

// Vite exige un export par défaut pour son fichier de configuration :
// c'est la seule exception à la règle des exports nommés.
export default defineConfig(({ command, isPreview }) => ({
  base: command === 'build' || isPreview ? PAGES_BASE_PATH : '/',
}));

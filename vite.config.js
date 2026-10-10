import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

// GitHub Pages sert le site sous /<nom-du-dépôt>/ : les chemins des fichiers
// construits doivent en tenir compte, y compris en aperçu (vite preview).
// En développement (npm run dev), on reste à la racine.
const PAGES_BASE_PATH = '/tambour/';

/** Un mois : les sons et les polices ne changent pas d'une version à l'autre. */
const ASSET_CACHE_SECONDS = 60 * 60 * 24 * 30;

// Installable sur téléphone et utilisable hors ligne. L'interface est mise en cache dès la
// première visite ; les sons (18 Mo au total) le sont au fil de l'écoute, kit par kit, pour
// ne pas tout télécharger d'un coup.
const pwa = VitePWA({
  registerType: 'autoUpdate',
  includeAssets: ['favicon.svg', 'icons/apple-touch-icon.png'],
  manifest: {
    name: 'Tambour',
    short_name: 'Tambour',
    description: 'Un tambour en ligne, jouable au clavier, à la souris et au toucher.',
    lang: 'fr',
    display: 'standalone',
    orientation: 'any',
    background_color: '#120f0d',
    theme_color: '#120f0d',
    icons: [
      { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
      {
        src: 'icons/icon-maskable-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  },
  workbox: {
    globPatterns: ['**/*.{js,css,html,svg,png}', 'sounds/*/manifest.json'],
    runtimeCaching: [
      {
        urlPattern: ({ url }) => /\/sounds\/.+\.(ogg|mp3)$/.test(url.pathname),
        handler: 'CacheFirst',
        options: {
          cacheName: 'tambour-sons',
          expiration: { maxAgeSeconds: ASSET_CACHE_SECONDS },
          cacheableResponse: { statuses: [0, 200] },
        },
      },
      {
        urlPattern: ({ url }) =>
          ['fonts.googleapis.com', 'fonts.gstatic.com'].includes(url.hostname),
        handler: 'StaleWhileRevalidate',
        options: {
          cacheName: 'tambour-polices',
          expiration: { maxAgeSeconds: ASSET_CACHE_SECONDS },
          cacheableResponse: { statuses: [0, 200] },
        },
      },
    ],
  },
});

// Vite exige un export par défaut pour son fichier de configuration :
// c'est la seule exception à la règle des exports nommés.
export default defineConfig(({ command, isPreview }) => ({
  base: command === 'build' || isPreview ? PAGES_BASE_PATH : '/',
  plugins: [pwa],
}));

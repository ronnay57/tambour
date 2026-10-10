import { defineConfig, devices } from '@playwright/test';

const PORT = 4173;

// Un Chromium déjà installé peut être imposé (ex. : environnement sans téléchargement).
const executablePath = process.env.PLAYWRIGHT_CHROMIUM_PATH || undefined;

// Playwright exige un export par défaut pour son fichier de configuration.
export default defineConfig({
  testDir: 'tests/e2e',
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: 'retain-on-failure',
  },
  projects: [
    {
      name: 'ordinateur',
      use: { ...devices['Desktop Chrome'], launchOptions: { executablePath } },
    },
    { name: 'mobile', use: { ...devices['Pixel 7'], launchOptions: { executablePath } } },
  ],
  webServer: {
    command: `npx vite --port ${PORT} --strictPort`,
    port: PORT,
    reuseExistingServer: !process.env.CI,
  },
});

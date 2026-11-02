import { VitePWA } from 'vite-plugin-pwa';
import { loadEnv } from 'vite';
import { defineConfig } from 'vitest/config';

const RANKING_ENV = ['VITE_SUPABASE_URL', 'VITE_SUPABASE_PUBLISHABLE_KEY'];

export default defineConfig(({ command, mode, isPreview }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_');
  const missing = RANKING_ENV.filter((name) => !env[name]);
  if (command === 'build' && missing.length) throw new Error(`Missing ${missing.join(', ')} in .env`);
  return {
    base: command === 'build' || isPreview ? '/flags-quiz/' : '/',
    plugins: [
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['icons/apple-touch-icon.png'],
        manifest: {
          name: 'Bandeiras do mundo',
          short_name: 'Bandeiras',
          description: 'Aprenda as bandeiras do mundo.',
          lang: 'pt-BR',
          start_url: '.',
          scope: '.',
          display: 'standalone',
          theme_color: '#2f6fde',
          background_color: '#f2f6fb',
          icons: [
            { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
            { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
            { src: 'icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
          ],
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,svg,png}'],
        },
      }),
    ],
    test: { environment: 'node' },
  };
});

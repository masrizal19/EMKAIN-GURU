import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import fs from 'fs';
import {defineConfig} from 'vite';

// Plugin to ensure 404.html is generated for SPA fallback on static hosting (GitHub Pages, etc.)
function spaFallbackPlugin() {
  return {
    name: 'spa-fallback-plugin',
    closeBundle() {
      const distIndex = path.resolve(__dirname, 'dist', 'index.html');
      const dist404 = path.resolve(__dirname, 'dist', '404.html');
      if (fs.existsSync(distIndex)) {
        try {
          fs.copyFileSync(distIndex, dist404);
        } catch (e) {
          // ignore
        }
      }
    }
  };
}

export default defineConfig(() => {
  return {
    base: '/',
    plugins: [react(), tailwindcss(), spaFallbackPlugin()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});

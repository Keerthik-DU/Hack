import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

import { Plugin } from 'vite';
import { getCspHeaderString } from './src/config/csp';

function cspHeaderPlugin(): Plugin {
  return {
    name: 'vite-plugin-csp-header',
    configureServer(server) {
      server.middlewares.use((_req, res, next) => {
        res.setHeader('Content-Security-Policy', getCspHeaderString());
        next();
      });
    },
    configurePreviewServer(server) {
      server.middlewares.use((_req, res, next) => {
        res.setHeader('Content-Security-Policy', getCspHeaderString());
        next();
      });
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), cspHeaderPlugin()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  worker: {
    format: 'es',
  },
});

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { Plugin } from 'vite';
import { getCspHeaderString } from './src/config/csp';
import { SECURITY_HEADERS } from './src/config/security-headers';

function cspHeaderPlugin(isDev: boolean): Plugin {
  return {
    name: 'vite-plugin-csp-header',
    configureServer(server) {
      server.middlewares.use((_req, res, next) => {
        if (!isDev) {
          res.setHeader('Content-Security-Policy', getCspHeaderString());
        }
        for (const [name, value] of Object.entries(SECURITY_HEADERS)) {
          res.setHeader(name, value);
        }
        next();
      });
    },
    configurePreviewServer(server) {
      server.middlewares.use((_req, res, next) => {
        res.setHeader('Content-Security-Policy', getCspHeaderString());
        for (const [name, value] of Object.entries(SECURITY_HEADERS)) {
          res.setHeader(name, value);
        }
        next();
      });
    },
    transformIndexHtml(html) {
      if (isDev) {
        // Strip out the Content-Security-Policy meta tag in dev mode so that
        // Vite HMR and inline development scripts are not blocked by the browser.
        return html.replace(/<meta[^>]*http-equiv=["']Content-Security-Policy["'][^>]*>/i, '<!-- CSP meta tag removed in dev mode -->');
      }
      return html;
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig(({ command }) => {
  const isDev = command === 'serve';
  return {
    plugins: [react(), cspHeaderPlugin(isDev)],

  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },

  // Web Worker bundle compilation using Vite's built-in worker support.
  // Usage pattern: new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' })
  worker: {
    format: 'es',
  },

  build: {
    // Emit sourcemaps for production (inline for CI artifact inspection)
    sourcemap: false,

    // Enable minification (default: esbuild — fastest, good for production)
    minify: 'esbuild',

    // Tree-shaking is on by default in Rollup (Vite's bundler).
    // Explicitly declare entry so Rollup can perform dead-code elimination.
    rollupOptions: {
      output: {
        // Code splitting: split vendor chunks for better long-term caching.
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('react') || id.includes('react-dom') || id.includes('react-router-dom')) {
              return 'vendor-react';
            }
            return 'vendor';
          }
        },
        // Content-addressed filenames for cache busting
        entryFileNames: 'assets/[name]-[hash].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash][extname]',
      },
    },

    // Target modern browsers (ES2022) for smaller, faster output
    target: 'es2022',

    // CSS code splitting: inline CSS for components into their JS chunk
    cssCodeSplit: true,
  },

  // Inject commit SHA and ISO 8601 build timestamp as VITE_ environment variables.
  // These are set in the Forge pipeline from VCS metadata and passed as env vars
  // (VITE_COMMIT_SHA, VITE_BUILD_TIMESTAMP) during the build stage.
  // When running locally without these env vars, sensible development defaults apply.
  define: {
    'import.meta.env.VITE_COMMIT_SHA': JSON.stringify(
      process.env.VITE_COMMIT_SHA ?? 'dev'
    ),
    'import.meta.env.VITE_BUILD_TIMESTAMP': JSON.stringify(
      process.env.VITE_BUILD_TIMESTAMP ?? new Date().toISOString()
    ),
  },
  };
});

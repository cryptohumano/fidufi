import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(), // Tailwind CSS v4 plugin
    VitePWA({
      registerType: 'prompt',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'mask-icon.svg'],
      manifest: {
        name: 'fidufi - Fideicomiso Digital',
        short_name: 'fidufi',
        description: 'Capa de cumplimiento técnico para fideicomisos irrevocables',
        theme_color: '#ffffff',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      }
    })
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 3000,
    allowedHosts: ['fidufiapp-production.up.railway.app', '.railway.app'],
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
  // Para despliegue en Railway: escuchar en 0.0.0.0 y usar PORT del entorno
  preview: {
    port: Number(process.env.PORT) || 3000,
    host: true, // 0.0.0.0 para aceptar conexiones externas en el contenedor
    allowedHosts: true, // Railway proxy; en producción solo expuesto vía nuestro dominio
  },
});

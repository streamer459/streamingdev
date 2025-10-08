import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwind from '@tailwindcss/postcss'
import autoprefixer from 'autoprefixer'

export default defineConfig({
  plugins: [
    react(),
  ],
  server: {
    host: '0.0.0.0', // Allow external access
    port: 8080,      // Use port 8080 instead of 5173
    allowedHosts: ['frontend-01.distorted.live', 'localhost', '127.0.0.1'],
  },
  css: {
    postcss: {
      plugins: [
        // Explicitly wire in the Tailwind CSS PostCSS plugin
        tailwind(),
        autoprefixer(),
      ],
    },
  },
})

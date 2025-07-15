import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwind from '@tailwindcss/postcss'
import autoprefixer from 'autoprefixer'

export default defineConfig({
  plugins: [
    react(),
  ],
  css: {
    postcss: {
      plugins: [
        // Explicitly wire in the Tailwind CSS PostCSS plugin with your config
        tailwind({ config: './tailwind.config.cjs' }),
        autoprefixer(),
      ],
    },
  },
})

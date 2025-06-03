import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import basicSsl from '@vitejs/plugin-basic-ssl'

export default defineConfig({
  plugins: [
    react(),
    basicSsl()
  ],
  publicDir: 'public',
  server: {
    https: true,
    fs: { strict: false },
    historyApiFallback: true
  },
  build: {
    outDir: 'dist'
  }
})

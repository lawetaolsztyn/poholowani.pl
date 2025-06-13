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
    historyApiFallback: true,
    // Dodaj to dla serwera deweloperskiego:
    port: process.env.PORT || 5173, // Użyj zmiennej PORT, jeśli dostępna, w przeciwnym razie domyślny 5173
    host: true // To jest kluczowe dla kontenerów, aby nasłuchiwać na wszystkich interfejsach
  },
  build: {
    outDir: 'dist'
  },
  // Dodaj konfigurację dla podglądu/produkcji (vite preview)
  preview: {
    port: process.env.PORT || 4173, // Użyj zmiennej PORT, jeśli dostępna, w przeciwnym razie domyślny 4173
    host: true // To jest kluczowe dla kontenerów
  }
})
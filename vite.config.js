import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import basicSsl from '@vitejs/plugin-basic-ssl'
console.log('VITE_SUPABASE_URL:', process.env.VITE_SUPABASE_URL);
console.log('VITE_SUPABASE_ANON_KEY:', process.env.VITE_SUPABASE_ANON_KEY);
export default defineConfig({
  plugins: [
    react(),
    basicSsl()
  ],
  publicDir: 'public',
  // DODAJ envPrefix TUTAJ (na tym samym poziomie co plugins, publicDir itp.)
  envPrefix: 'VITE_', // PRZENIEŚ TĘ LINIĘ TUTAJ

  server: {
    https: true,
    fs: { strict: false },
    historyApiFallback: true,
    port: 8080,
    host: true
  },
  build: {
    outDir: 'dist'
  },
  preview: {
    port: 8080,
    host: true
  }
})
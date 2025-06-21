import { defineConfig, loadEnv } from 'vite'; // <<-- DODANE: loadEnv
import react from '@vitejs/plugin-react';
import basicSsl from '@vitejs/plugin-basic-ssl';

// Funkcja defineConfig jest opakowaniem dla konfiguracji Vite.
// Używamy funkcji, aby mieć dostęp do 'mode' i wczytać zmienne środowiskowe.
export default defineConfig(({ mode }) => {
  // 1. Ładowanie zmiennych środowiskowych
  // `loadEnv(mode, process.cwd(), '')` wczytuje zmienne z plików .env, .env.local itp.
  // `process.cwd()` to bieżący katalog roboczy, `''` oznacza brak prefiksu
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [
      react(),
      basicSsl()
    ],
    publicDir: 'public',
    envPrefix: 'VITE_', // To już masz, dobrze!

    server: {
      https: true,
      fs: { strict: false },
      historyApiFallback: true,
      port: 8080,
      host: true,
      // <<-- NOWA SEKCJA PROXY DODANA TUTAJ -->>
      proxy: {
        // Konfiguracja proxy dla ścieżki /api/ors-route
        '/api/ors-route': {
          target: 'https://api.openrouteservice.org', // To jest podstawowy adres URL API OpenRouteService
          changeOrigin: true, // Ważne dla obsługi CORS
          rewrite: (path) => {
    // Zwróć uwagę na znak zapytania '?' - to początek parametrów URL
    // Dodajemy parametr geometry_format=geojson
  return path.replace('/api/ors-route', '/v2/directions/driving-car?geometry_format=geojson');
},
          configure: (proxy, options) => {
    proxy.on('proxyReq', (proxyReq, req, res) => {
        if (env.VITE_ORS_API_KEY) {
            proxyReq.setHeader('Authorization', env.VITE_ORS_API_KEY);
            // <<-- DODAJ TE LINIE -->>
            console.log('Proxying request to ORS:', proxyReq.path);
            console.log('Proxy request headers:', proxyReq.getHeaders());
            // Przechwyć ciało zapytania, aby je zalogować (może być trochę skomplikowane z proxyReq)
            let bodyData = '';
            req.on('data', (chunk) => {
                bodyData += chunk.toString();
            });
            req.on('end', () => {
                console.log('Proxy request body:', bodyData);
            });
            // <<-- KONIEC DODANYCH LINII -->>
        } else {
            console.error('Błąd konfiguracji proxy: Brak klucza API OpenRouteService w zmiennych środowiskowych (VITE_ORS_API_KEY)!');
        }
            });
          },
        },
      },
      // <<-- KONIEC NOWEJ SEKCJI PROXY -->>
    },
    build: {
      outDir: 'dist'
    },
    preview: {
      port: 8080,
      host: true
    }
  };
});
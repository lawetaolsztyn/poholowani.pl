# Stage 1: Build the React app
# Użyj stabilnej wersji Node.js (np. 20-alpine)
FROM node:20-alpine AS build

WORKDIR /app

# Skopiuj pliki package.json i package-lock.json
COPY package*.json ./

# Zainstaluj zależności
RUN npm install

# Skopiuj resztę plików aplikacji
COPY . .

# ⚠️ Skopiuj plik środowiskowy do środka kontenera
COPY .env .env

# Zbuduj aplikację Vite
RUN npm run build

# Stage 2: Serve the app with a lightweight web server (Nginx)
FROM nginx:alpine

# Skopiuj zbudowaną aplikację do katalogu Nginx
COPY --from=build /app/dist /usr/share/nginx/html

# Usuń domyślny plik konfiguracyjny Nginx
RUN rm /etc/nginx/conf.d/default.conf

# Dodaj własny plik konfiguracyjny Nginx
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Wystaw port (zgodny z vite.config.js)
EXPOSE 8080

# Uruchom Nginx
CMD ["nginx", "-g", "daemon off;"]

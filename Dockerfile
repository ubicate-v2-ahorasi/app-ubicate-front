# Etapa 1: build Angular
FROM node:20 AS build-stage
WORKDIR /app

# Instala deps (si tienes package-lock.json usa npm ci)
COPY package*.json ./
COPY generate-env.js ./
RUN npm i

# Genera environment antes del build
RUN NODE_ENV=production node generate-env.js

# Copia código y compila (forzamos modo prod)
COPY angular.json ./
COPY tsconfig*.json ./
COPY src ./src
RUN npm run build -- --configuration=production

# Etapa 2: Nginx estático
FROM nginx:alpine

# Config SPA: fallback a index.html
COPY nginx.conf /etc/nginx/conf.d/default.conf

# ⚠️ Copia la carpeta /browser (donde está index.html)
COPY --from=build-stage /app/dist/ubicate-taller-2/browser /usr/share/nginx/html

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]

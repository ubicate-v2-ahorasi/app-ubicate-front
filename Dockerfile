# Etapa 1: build Angular
FROM node:20 AS build-stage
WORKDIR /app

# Copia deps y script primero
COPY package*.json ./
COPY generate-env.js ./
RUN npm i

# Copia código fuente INCLUYENDO public/
COPY angular.json ./
COPY tsconfig*.json ./
COPY src ./src
COPY public ./public

# Genera environment en producción
RUN NODE_ENV=production node generate-env.js

# Build Angular en producción
RUN NODE_ENV=production npm run build

# Etapa 2: Nginx estático
FROM nginx:alpine

# Config SPA: fallback a index.html
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copia la carpeta /browser (donde está index.html)
COPY --from=build-stage /app/dist/ubicate-taller-2/browser /usr/share/nginx/html

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]

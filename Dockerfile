# Etapa 1: build Angular
FROM node:20 AS build-stage
WORKDIR /app

COPY package*.json ./
COPY generate-env.js ./
RUN npm i

COPY angular.json ./
COPY tsconfig*.json ./
COPY src ./src
COPY public ./public

RUN NODE_ENV=production node generate-env.js
RUN NODE_ENV=production npm run build

# Etapa 2: Nginx estático
FROM nginx:alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build-stage /app/dist/ubicate-taller-2/browser /usr/share/nginx/html

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
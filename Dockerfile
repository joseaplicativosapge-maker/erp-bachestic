FROM node:20-alpine

# better-sqlite3 necesita estas herramientas para compilar
RUN apk add --no-cache python3 make g++

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

# Build del frontend (genera /dist)
RUN npm run build

ENV NODE_ENV=production
EXPOSE 3000

# Arranca el servidor con tsx (ya está en tus dependencias)
CMD ["npx", "tsx", "server.ts"]
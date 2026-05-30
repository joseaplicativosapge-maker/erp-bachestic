FROM node:20-alpine AS builder

WORKDIR /app

# Instala dependencias necesarias para compilar módulos nativos
RUN apk add --no-cache python3 make g++

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

COPY --from=builder /app/build ./build
COPY --from=builder /app/public ./public
COPY --from=builder /app/package*.json ./

RUN npm ci --omit=dev

EXPOSE 3000
CMD ["npm", "start"]
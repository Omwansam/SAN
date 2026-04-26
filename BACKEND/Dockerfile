# sanPOS API — production image
FROM node:22-alpine

WORKDIR /app

RUN apk add --no-cache openssl

COPY package.json package-lock.json ./
RUN npm ci

COPY prisma ./prisma
COPY src ./src
COPY scripts ./scripts
COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

RUN npx prisma generate

ENV NODE_ENV=production
EXPOSE 5000

ENTRYPOINT ["/docker-entrypoint.sh"]

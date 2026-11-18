FROM node:20-alpine AS build
WORKDIR /app
RUN apk add --no-cache openssl
COPY package*.json ./
RUN npm ci || npm install
COPY . .
# Compile the seed (and the product types it imports) to plain JS so the runtime image needs no dev dependencies.
RUN npm run build \
 && npx tsc prisma/seed.ts --outDir seed-dist --rootDir . --module commonjs --target ES2021 \
      --esModuleInterop --skipLibCheck

FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production
RUN apk add --no-cache openssl
COPY package*.json ./
RUN npm ci --omit=dev || npm install --omit=dev
COPY prisma ./prisma
RUN npx prisma generate
COPY --from=build /app/dist ./dist
COPY --from=build /app/seed-dist ./seed-dist
EXPOSE 4000
# Migrations and the seed run on every start: migrate deploy only applies new migrations,
# and the seed upserts by product id, so restarts never duplicate data.
CMD ["sh", "-c", "npx prisma migrate deploy && node seed-dist/prisma/seed.js && node dist/main"]

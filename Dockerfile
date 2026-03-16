FROM node:20-alpine AS builder
WORKDIR /app

COPY package.json package-lock.json* tsconfig.json* ./
RUN npm ci --silent

COPY . .
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci --only=production --silent || true

COPY --from=builder /app/dist ./dist

EXPOSE 3000

CMD ["node", "dist/index.js"]

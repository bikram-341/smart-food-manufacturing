# Multi-stage Dockerfile for Order-to-Audit Food Manufacturing System
FROM node:22-alpine AS builder

WORKDIR /app

# Copy root configuration and install server dependencies
COPY package*.json tsconfig.json ./
RUN npm ci

# Copy client and build frontend
COPY client/package*.json ./client/
RUN npm --prefix client ci
COPY client/ ./client/
RUN npm --prefix client run build

# Copy source code and build backend
COPY src/ ./src/
RUN npm run build:server

# Production runtime stage
FROM node:22-alpine AS runner

WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
ENV HOST=0.0.0.0

COPY package*.json ./
RUN npm ci --omit=dev

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/client/dist ./client/dist
COPY src/infrastructure/database/schema.sql ./src/infrastructure/database/schema.sql

EXPOSE 3000

CMD ["node", "dist/presentation/server.js"]

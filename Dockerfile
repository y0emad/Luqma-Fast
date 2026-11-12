# ---------- 1) Build: install everything and compile TypeScript ----------
FROM node:24-slim AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY tsconfig.json tsconfig.build.json ./
COPY src ./src
RUN npm run build

# ---------- 2) Runtime: production dependencies + compiled API ----------
FROM node:24-slim
WORKDIR /app
ENV NODE_ENV=production

COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY --from=build /app/dist ./dist

# Uploaded images live here; mount a volume on it so they survive new deploys.
RUN mkdir -p src/uploads/banner src/uploads/ItemsImg src/uploads/photoUser src/uploads/restaurantImg \
  && chown -R node:node src/uploads

# Don't run as root.
USER node

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://localhost:' + (process.env.PORT || 3000) + '/health').then((r) => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"

CMD ["node", "dist/index.js"]

# Build from repo root: docker build -f server/Dockerfile .
FROM mcr.microsoft.com/playwright:v1.52.0-noble

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci && npx playwright install chromium

COPY server ./server
COPY scripts/lib ./scripts/lib

ENV NODE_ENV=production
ENV PORT=3001
ENV IMPORT_PORT=3001
ENV IMPORT_PORT=3001

EXPOSE 3001

CMD ["node", "server/bulk-import.mjs"]

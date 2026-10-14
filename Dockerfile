FROM node:22-slim
WORKDIR /app
ENV NODE_ENV=production DATA_DIR=/app/data
COPY package*.json ./
# better-sqlite3 13 и sharp приходят с готовыми бинарниками, сборка не нужна. Без --ignore-scripts npm
# всё равно запускает node-gyp для better-sqlite3 (в lock-файле нет hasInstallScript) и падает без Python и g++.
RUN npm ci --omit=dev --ignore-scripts
COPY src ./src
COPY public ./public
COPY scripts ./scripts
RUN mkdir -p /app/data && chown node:node /app/data
USER node
EXPOSE 3000
CMD ["node", "src/server.js"]

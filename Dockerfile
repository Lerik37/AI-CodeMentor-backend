FROM node:20-alpine

WORKDIR /app

# Сначала зависимости (кэшируется)
COPY package*.json ./
RUN npm ci

# Потом код
COPY tsconfig.json ./
COPY src ./src

# Сборка TypeScript
RUN npm run build

EXPOSE 3000

CMD ["node", "dist/server.js"]

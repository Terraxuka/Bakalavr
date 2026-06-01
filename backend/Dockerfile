# Стейдж 1: Builder (Компіляція)
FROM node:20-alpine AS builder
WORKDIR /app

# Копіюємо маніфести та встановлюємо ВСІ залежності (включно з dev)
COPY package*.json ./
COPY prisma ./prisma/
RUN npm install

# Копіюємо вихідний код і компілюємо TypeScript
COPY . .
RUN npx prisma generate
RUN npm run build

# Стейдж 2: Runtime (Продуктове середовище)
FROM node:20-alpine
WORKDIR /app

# Копіюємо лише скомпільований код, конфіги та модулі
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/prisma.config.ts ./

# Встановлюємо змінну середовища для продакшену
ENV NODE_ENV=production

EXPOSE 3000
# Запуск безпосередньо через Node (без ts-node)
CMD ["node", "dist/index.js"]

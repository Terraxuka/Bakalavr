# Стейдж 1: Builder (Збирання бандлу)
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
# Збираємо статичні файли (Vite генерує їх у папку dist)
RUN npm run build

# Стейдж 2: Runtime (Легковагий вебсервер)
FROM nginx:alpine
# Очищаємо дефолтну сторінку Nginx
RUN rm -rf /usr/share/nginx/html/*
# Копіюємо наші статичні артефакти
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]

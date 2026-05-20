# 药店网上商城 - 微信云托管 Dockerfile
# 后端 API + 管理后台 SPA 合一部署

FROM node:24-alpine

WORKDIR /app

# ==========================================
# 1. 构建管理后台
# ==========================================
COPY admin/package.json admin/package-lock.json ./admin/
WORKDIR /app/admin
RUN npm ci
COPY admin/ ./
RUN npm run build

# ==========================================
# 2. 后端
# ==========================================
WORKDIR /app
COPY backend/package.json backend/package-lock.json ./
RUN npm ci --omit=dev
COPY backend/src/ ./src/
COPY backend/uploads/ ./uploads/

# 管理后台构建产物
RUN cp -r /app/admin/dist ./admin-dist

# 数据目录（仅 uploads 本地缓存，MySQL 在外部）
RUN mkdir -p uploads/products uploads/prescriptions uploads/banners

EXPOSE 3000
CMD ["node", "src/server.js"]

# 药店网上商城 - 微信云托管 Dockerfile
# 后端 API + 管理后台 SPA 合一部署
# 参考: https://github.com/WeixinCloud/wxcloudrun-express

FROM node:24-alpine

# 腾讯云镜像源加速（参考官方示例）
RUN npm config set registry https://mirrors.cloud.tencent.com/npm/

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

# 上传文件目录（后续迁移到 COS 后可移除）
RUN mkdir -p uploads/products uploads/prescriptions uploads/banners

EXPOSE 3000
CMD ["node", "src/server.js"]

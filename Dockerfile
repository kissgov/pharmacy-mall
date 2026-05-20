# 药店网上商城 - 微信云托管 Dockerfile
# 运行时: Node.js 24

FROM node:24-alpine

# 创建工作目录
WORKDIR /app

# 只复制后端依赖文件
COPY backend/package.json backend/package-lock.json ./

# 安装生产依赖
RUN npm ci --omit=dev

# 复制后端源码
COPY backend/src/ ./src/
COPY backend/uploads/ ./uploads/

# 创建数据目录
RUN mkdir -p data uploads/products uploads/prescriptions uploads/banners

# 暴露端口
EXPOSE 3000

# 启动命令
CMD ["node", "src/server.js"]

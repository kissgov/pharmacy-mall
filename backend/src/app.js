const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const errorHandler = require('./middleware/errorHandler');

const app = express();

// 跨域支持
app.use(cors());

// 请求体解析
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 挂载路由
app.use('/api', require('./routes'));

// 管理后台 SPA 静态资源（生产环境，Docker 构建产物）
const adminDist = path.join(__dirname, '..', 'admin-dist');
if (fs.existsSync(adminDist)) {
  app.use(express.static(adminDist));
  // SPA fallback：所有非 /api 的路由返回 index.html
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) return next();
    res.sendFile(path.join(adminDist, 'index.html'));
  });
}

// 全局错误处理中间件（必须放在所有路由之后）
app.use(errorHandler);

module.exports = app;

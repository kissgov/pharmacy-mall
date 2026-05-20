const express = require('express');
const cors = require('cors');
const path = require('path');
const errorHandler = require('./middleware/errorHandler');

const app = express();

// 跨域支持
app.use(cors());

// 请求体解析
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 静态资源服务（上传文件访问）
// 挂载到 /uploads 前缀，保持与数据库存储路径一致
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

// 挂载路由
app.use('/api', require('./routes'));

// 全局错误处理中间件（必须放在所有路由之后）
app.use(errorHandler);

module.exports = app;

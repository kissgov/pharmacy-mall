const fs = require('fs');
const path = require('path');
const config = require('./config');

// 确保必要的目录存在（必须在 require('./db') 之前，因为 better-sqlite3 需要目录已存在）
const dataDir = path.resolve(__dirname, '..', 'data');
const uploadsDir = path.resolve(__dirname, '..', 'uploads');

[dataDir, uploadsDir].forEach((dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    console.log('创建目录: ' + dir);
  }
});

// 数据库连接与建表（必须在 mkdirSync 之后）
const db = require('./db');

// Express 应用（必须在 db 初始化之后，因为路由模块会触发模型导入进而触发 db 连接）
const app = require('./app');

// 检查并自动填充种子数据
const adminCount = db.prepare('SELECT COUNT(*) AS count FROM admin_users').get().count;
const productCount = db.prepare('SELECT COUNT(*) AS count FROM products').get().count;

if (adminCount === 0 || productCount === 0) {
  console.log('检测到空数据库，自动填充种子数据...');
  require('./db/seed').run();
}

// 启动服务器
app.listen(config.port, () => {
  console.log('=================================');
  console.log('  药店网上商城后端服务已启动');
  console.log('  地址: http://localhost:' + config.port);
  console.log('  环境: ' + (process.env.NODE_ENV || 'development'));
  console.log('=================================');
});

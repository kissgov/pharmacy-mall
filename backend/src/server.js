const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
const config = require('./config');

// 确保必要的目录存在
const uploadsDir = path.resolve(__dirname, '..', 'uploads');

[uploadsDir].forEach((dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    console.log('创建目录: ' + dir);
  }
});

/**
 * 初始化数据库：创建数据库（如不存在）、执行建表 SQL、填充种子数据
 */
async function initDatabase() {
  // 1. 先连接 MySQL（不指定数据库），创建数据库（如不存在）
  const initConn = await mysql.createConnection({
    host: config.dbHost,
    port: config.dbPort,
    user: config.dbUser,
    password: config.dbPassword,
  });

  await initConn.execute(
    `CREATE DATABASE IF NOT EXISTS \`${config.dbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
  );
  await initConn.end();

  // 2. 创建连接池（指定数据库）
  const pool = require('./db');

  // 3. 读取并执行 schema.sql 建表
  const schemaPath = path.join(__dirname, 'db', 'schema.sql');
  if (fs.existsSync(schemaPath)) {
    const schema = fs.readFileSync(schemaPath, 'utf-8');
    // 按分号分割，过滤空语句和 USE/CREATE DATABASE（已在上面处理）
    const statements = schema
      .split(';')
      .map((s) => s.trim())
      .filter((s) => s.length > 0 && !s.toUpperCase().startsWith('CREATE DATABASE') && !s.toUpperCase().startsWith('USE '));

    for (const stmt of statements) {
      try {
        await pool.execute(stmt);
      } catch (err) {
        // 忽略已存在的表和重复键错误
        if (err.code !== 'ER_TABLE_EXISTS_ERROR' && err.code !== 'ER_DUP_KEYNAME') {
          console.error('SQL 执行错误:', err.message);
        }
      }
    }
    console.log('数据库表结构已初始化');
  } else {
    console.warn('警告: schema.sql 未找到，跳过建表');
  }

  // 4. 检查并自动填充种子数据
  const [adminRows] = await pool.execute('SELECT COUNT(*) AS count FROM admin_users');
  const [productRows] = await pool.execute('SELECT COUNT(*) AS count FROM products');

  if (adminRows[0].count === 0 || productRows[0].count === 0) {
    console.log('检测到空数据库，自动填充种子数据...');
    const seed = require('./db/seed');
    await seed.run();
  }

  return pool;
}

/**
 * 启动服务器
 */
async function start() {
  try {
    await initDatabase();

    // 数据库初始化完成后加载 app（路由模块会触发模型导入）
    const app = require('./app');

    app.listen(config.port, () => {
      console.log('=================================');
      console.log('  药店网上商城后端服务已启动');
      console.log('  地址: http://localhost:' + config.port);
      console.log('  环境: ' + (process.env.NODE_ENV || 'development'));
      console.log('=================================');
    });
  } catch (err) {
    console.error('服务器启动失败:', err);
    process.exit(1);
  }
}

start();

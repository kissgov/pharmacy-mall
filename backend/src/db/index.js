/**
 * 数据库初始化模块
 *
 * 使用 better-sqlite3 连接 SQLite 数据库，
 * 启动时自动读取 schema.sql 并执行建表。
 */
const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');
const config = require('../config');

const dbPath = path.resolve(__dirname, '..', '..', config.dbPath);
const db = new Database(dbPath);

// 开启 WAL 模式提升并发性能，启用外键约束
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// 读取并执行 schema.sql 建表
const schemaPath = path.join(__dirname, 'schema.sql');
if (fs.existsSync(schemaPath)) {
  const schema = fs.readFileSync(schemaPath, 'utf-8');
  db.exec(schema);
  console.log('数据库表结构已初始化');
} else {
  console.warn('警告: schema.sql 未找到，跳过建表');
}

module.exports = db;

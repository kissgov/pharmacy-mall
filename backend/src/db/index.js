/**
 * 数据库连接池模块
 *
 * 使用 mysql2/promise 创建 MySQL 连接池。
 * 启动时由 server.js 负责建库建表。
 */
const mysql = require('mysql2/promise');
const config = require('../config');

const pool = mysql.createPool({
  host: config.dbHost,
  port: config.dbPort,
  user: config.dbUser,
  password: config.dbPassword,
  database: config.dbName,
  waitForConnections: true,
  connectionLimit: 10,
  charset: 'utf8mb4',
  // MySQL DECIMAL 默认返回字符串，转为 JS Number
  typeCast: function (field, next) {
    if (field.type === 'NEWDECIMAL' || field.type === 'DECIMAL') {
      const value = field.string();
      return value === null ? null : Number(value);
    }
    return next();
  },
});

module.exports = pool;

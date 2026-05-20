require('dotenv').config();

// 微信云托管官方环境变量: MYSQL_ADDRESS="host:port", MYSQL_USERNAME, MYSQL_PASSWORD
// 兼容自定义: MYSQL_HOST, MYSQL_PORT, MYSQL_USER
const mysqlAddr = (process.env.MYSQL_ADDRESS || '10.37.112.148:3306').split(':');

module.exports = {
  port: process.env.PORT || 3000,
  jwtSecret: process.env.JWT_SECRET || 'pharmacy_mall_jwt_secret_2024',
  jwtExpiresIn: '7d',
  dbHost: mysqlAddr[0] || process.env.MYSQL_HOST || '10.37.112.148',
  dbPort: parseInt(mysqlAddr[1] || process.env.MYSQL_PORT || '3306', 10),
  dbUser: process.env.MYSQL_USERNAME || process.env.MYSQL_USER || 'root',
  dbPassword: process.env.MYSQL_PASSWORD || 'Smshl2014',
  dbName: process.env.MYSQL_DATABASE || 'pharmacy_mall',
};

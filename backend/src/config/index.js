require('dotenv').config();

module.exports = {
  port: process.env.PORT || 3000,
  jwtSecret: process.env.JWT_SECRET || 'pharmacy_mall_jwt_secret_2024',
  jwtExpiresIn: '7d',
  dbHost: process.env.MYSQL_HOST || '10.37.112.148',
  dbPort: parseInt(process.env.MYSQL_PORT || '3306', 10),
  dbUser: process.env.MYSQL_USER || 'root',
  dbPassword: process.env.MYSQL_PASSWORD || 'Smshl2014',
  dbName: process.env.MYSQL_DATABASE || 'pharmacy_mall',
};

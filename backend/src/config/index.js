require('dotenv').config();

module.exports = {
  port: process.env.PORT || 3000,
  jwtSecret: process.env.JWT_SECRET || 'pharmacy_mall_jwt_secret_2024',
  dbPath: process.env.DB_PATH || './data/pharmacy.db',
  jwtExpiresIn: '7d',
};

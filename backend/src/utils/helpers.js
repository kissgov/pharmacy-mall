const { v4: uuidv4 } = require('uuid');

/**
 * 通用工具函数集合
 */

/**
 * 生成唯一订单号
 * 格式: 年月日时分秒 + UUID 前8位（去连字符并大写）
 * @returns {string} 订单号，如 "20240115143022A1B2C3D4"
 */
function generateOrderNo() {
  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  const datePrefix = [
    now.getFullYear(),
    pad(now.getMonth() + 1),
    pad(now.getDate()),
    pad(now.getHours()),
    pad(now.getMinutes()),
    pad(now.getSeconds()),
  ].join('');

  const uuidSuffix = uuidv4().replace(/-/g, '').slice(0, 8).toUpperCase();

  return `${datePrefix}${uuidSuffix}`;
}

/**
 * 从请求头中提取 Bearer Token
 * @param {object} req - Express 请求对象
 * @returns {string|null} 提取到的 token，失败返回 null
 */
function extractToken(req) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  return authHeader.slice(7);
}

/**
 * 对手机号进行脱敏处理
 * @param {string} phone - 完整手机号
 * @returns {string} 脱敏后的手机号，如 "138****5678"
 */
function maskPhone(phone) {
  if (!phone || phone.length < 7) return phone || '';
  return phone.slice(0, 3) + '****' + phone.slice(-4);
}

module.exports = {
  generateOrderNo,
  extractToken,
  maskPhone,
};

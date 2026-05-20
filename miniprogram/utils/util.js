/**
 * 通用工具函数
 */

/**
 * 格式化价格
 * @param {number} price - 价格（分或元）
 * @returns {string} 如 '¥12.80'
 */
function formatPrice(price) {
  if (price == null) return '¥0.00';
  const num = Number(price);
  return '¥' + num.toFixed(2);
}

/**
 * 格式化日期
 * @param {string|Date} dateStr
 * @returns {string} 'yyyy-MM-dd HH:mm'
 */
function formatDate(dateStr) {
  if (!dateStr) return '';
  // iOS 兼容：将 "2026-05-20 12:59:18" 转为 "2026-05-20T12:59:18"
  const normalized = String(dateStr).replace(' ', 'T');
  const d = new Date(normalized);
  if (isNaN(d.getTime())) return String(dateStr);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/**
 * 格式化日期（仅日期）
 */
function formatDateOnly(dateStr) {
  if (!dateStr) return '';
  const normalized = String(dateStr).replace(' ', 'T');
  const d = new Date(normalized);
  if (isNaN(d.getTime())) return String(dateStr);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/**
 * 防抖
 */
function debounce(fn, delay = 300) {
  let timer = null;
  return function (...args) {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), delay);
  };
}

/**
 * 订单状态映射
 */
const ORDER_STATUS = {
  pending: '待付款',
  paid: '已付款',
  shipped: '已发货',
  completed: '已完成',
  cancelled: '已取消',
};

const ORDER_STATUS_COLOR = {
  pending: '#e53e3e',
  paid: '#3182ce',
  shipped: '#dd6b20',
  completed: '#38a169',
  cancelled: '#999',
};

function getOrderStatusText(status) {
  return ORDER_STATUS[status] || status;
}

function getOrderStatusColor(status) {
  return ORDER_STATUS_COLOR[status] || '#999';
}

/**
 * 处方状态映射
 */
const PRESCRIPTION_STATUS = {
  pending: { text: '待审核', color: '#d69e2e' },
  approved: { text: '已通过', color: '#38a169' },
  rejected: { text: '已驳回', color: '#e53e3e' },
};

function getPrescriptionStatus(status) {
  return PRESCRIPTION_STATUS[status] || { text: status, color: '#999' };
}

module.exports = {
  formatPrice,
  formatDate,
  formatDateOnly,
  debounce,
  getOrderStatusText,
  getOrderStatusColor,
  getPrescriptionStatus,
};

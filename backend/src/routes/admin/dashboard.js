/**
 * 管理后台仪表盘路由
 * GET /api/admin/dashboard — 统计数据
 */
const { Router } = require('express');
const db = require('../../db');
const { success } = require('../../utils/response');

const router = Router();

/** 仪表盘统计数据 */
router.get('/', (req, res) => {
  const today = new Date().toISOString().slice(0, 10);

  // 今日订单数
  const todayOrders = db.prepare(
    "SELECT COUNT(*) AS count FROM orders WHERE date(created_at) = ?"
  ).get(today).count;

  // 今日销售额（已支付 + 已发货 + 已完成）
  const todaySales = db.prepare(
    `SELECT COALESCE(SUM(pay_amount), 0) AS total FROM orders
     WHERE date(created_at) = ? AND status IN ('paid', 'shipped', 'completed')`
  ).get(today).total;

  // 待审核处方
  const pendingPrescriptions = db.prepare(
    "SELECT COUNT(*) AS count FROM prescriptions WHERE status = 'pending'"
  ).get().count;

  // 总用户数
  const totalUsers = db.prepare('SELECT COUNT(*) AS count FROM users').get().count;

  // 近 7 天每日销售额
  const weeklySales = db.prepare(`
    SELECT date(created_at) AS date, COALESCE(SUM(pay_amount), 0) AS amount
    FROM orders
    WHERE date(created_at) >= date('now', '-6 days')
      AND status IN ('paid', 'shipped', 'completed')
    GROUP BY date(created_at)
    ORDER BY date ASC
  `).all();

  // 今日待处理订单数
  const pendingOrders = db.prepare(
    "SELECT COUNT(*) AS count FROM orders WHERE status = 'pending'"
  ).get().count;

  res.json(success({
    todayOrders,
    todaySales: parseFloat(todaySales.toFixed(2)),
    pendingPrescriptions,
    totalUsers,
    pendingOrders,
    weeklySales,
  }));
});

module.exports = router;

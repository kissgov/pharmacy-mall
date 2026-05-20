/**
 * 管理后台仪表盘路由
 * GET /api/admin/dashboard — 统计数据
 */
const { Router } = require('express');
const pool = require('../../db');
const { success } = require('../../utils/response');

const router = Router();

/** 仪表盘统计数据 */
router.get('/', async (req, res) => {
  const today = new Date().toISOString().slice(0, 10);

  // 今日订单数
  const [todayOrdersRows] = await pool.execute(
    "SELECT COUNT(*) AS count FROM orders WHERE DATE(created_at) = ?",
    [today]
  );
  const todayOrders = todayOrdersRows[0].count;

  // 今日销售额（已支付 + 已发货 + 已完成）
  const [todaySalesRows] = await pool.execute(
    `SELECT COALESCE(SUM(pay_amount), 0) AS total FROM orders
     WHERE DATE(created_at) = ? AND status IN ('paid', 'shipped', 'completed')`,
    [today]
  );
  const todaySales = todaySalesRows[0].total;

  // 待审核处方
  const [pendingPrescriptionsRows] = await pool.execute(
    "SELECT COUNT(*) AS count FROM prescriptions WHERE status = 'pending'"
  );
  const pendingPrescriptions = pendingPrescriptionsRows[0].count;

  // 总用户数
  const [totalUsersRows] = await pool.execute('SELECT COUNT(*) AS count FROM users');
  const totalUsers = totalUsersRows[0].count;

  // 近 7 天每日销售额
  const [weeklySales] = await pool.execute(
    `SELECT DATE(created_at) AS date, COALESCE(SUM(pay_amount), 0) AS amount
     FROM orders
     WHERE DATE(created_at) >= DATE_SUB(CURDATE(), INTERVAL 6 DAY)
       AND status IN ('paid', 'shipped', 'completed')
     GROUP BY DATE(created_at)
     ORDER BY date ASC`
  );

  // 今日待处理订单数
  const [pendingOrdersRows] = await pool.execute(
    "SELECT COUNT(*) AS count FROM orders WHERE status = 'pending'"
  );
  const pendingOrders = pendingOrdersRows[0].count;

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

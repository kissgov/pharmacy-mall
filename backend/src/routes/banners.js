/**
 * Banner 路由（公开）
 * GET /api/banners — 获取启用的 Banner 列表
 */
const { Router } = require('express');
const pool = require('../db');
const { success } = require('../utils/response');

const router = Router();

/** Banner 列表（仅返回 status='active' 的） */
router.get('/', async (req, res) => {
  const [list] = await pool.execute(
    "SELECT * FROM banners WHERE status = 'active' ORDER BY sort ASC, created_at DESC"
  );
  res.json(success(list));
});

module.exports = router;

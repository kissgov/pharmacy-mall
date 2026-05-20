/**
 * 管理后台用户路由
 * GET /api/admin/users — 用户列表
 */
const { Router } = require('express');
const User = require('../../models/user');
const { paginated } = require('../../utils/response');

const router = Router();

/** 用户列表 */
router.get('/', (req, res) => {
  const { page, page_size } = req.query;
  const result = User.list(
    page ? parseInt(page, 10) : 1,
    page_size ? parseInt(page_size, 10) : 20
  );
  res.json(paginated(result.list, result.total));
});

module.exports = router;

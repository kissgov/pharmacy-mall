/**
 * 分类路由
 * GET /api/categories — 获取树形分类列表
 */
const { Router } = require('express');
const Category = require('../models/category');
const { success } = require('../utils/response');

const router = Router();

/** 获取分类树 */
router.get('/', (req, res) => {
  const tree = Category.getTree();
  res.json(success(tree));
});

module.exports = router;

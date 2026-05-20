/**
 * 购物车路由（需登录）
 * GET    /api/cart     — 购物车列表
 * POST   /api/cart     — 加入购物车
 * PUT    /api/cart/:id — 修改数量
 * DELETE /api/cart/:id — 删除项
 * DELETE /api/cart     — 清空购物车
 */
const { Router } = require('express');
const { body, validationResult } = require('express-validator');
const { authUser } = require('../middleware/auth');
const Cart = require('../models/cart');
const Product = require('../models/product');
const { success, error } = require('../utils/response');

const router = Router();

// 所有路由都需要登录
router.use(authUser);

/** 购物车列表 */
router.get('/', (req, res) => {
  const items = Cart.listByUser(req.user.userId);
  res.json(success(items));
});

/** 加入购物车 */
router.post('/', [
  body('product_id').isInt({ min: 1 }).withMessage('商品 ID 无效'),
  body('quantity').optional().isInt({ min: 1 }).withMessage('数量无效'),
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ code: 400, message: '参数错误', data: errors.array() });
  }
  const { product_id, quantity = 1 } = req.body;

  // 校验商品是否存在且已上架
  const product = Product.findById(product_id);
  if (!product) {
    return res.json(error(404, '商品不存在'));
  }
  if (product.status !== 'on') {
    return res.json(error(400, '商品已下架'));
  }

  const item = Cart.add(req.user.userId, product_id, quantity);
  res.json(success(item, '已加入购物车'));
});

/** 修改购物车项数量 */
router.put('/:id', (req, res) => {
  const id = parseInt(req.params.id, 10);
  const { quantity } = req.body;

  if (!quantity || quantity < 1) {
    return res.json(error(400, '数量必须大于 0'));
  }

  Cart.updateQty(id, quantity);
  res.json(success(null, '已更新'));
});

/** 删除指定购物车项 */
router.delete('/:id', (req, res) => {
  const id = parseInt(req.params.id, 10);
  Cart.remove(id);
  res.json(success(null, '已删除'));
});

/** 清空购物车 */
router.delete('/', (req, res) => {
  Cart.clearByUser(req.user.userId);
  res.json(success(null, '购物车已清空'));
});

module.exports = router;

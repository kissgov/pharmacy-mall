/**
 * 管理后台商品路由
 * GET    /api/admin/products        — 商品列表
 * GET    /api/admin/products/:id    — 商品详情
 * POST   /api/admin/products        — 创建商品
 * PUT    /api/admin/products/:id    — 更新商品
 * PUT    /api/admin/products/:id/status — 上下架
 * DELETE /api/admin/products/:id    — 删除商品
 */
const { Router } = require('express');
const { body, validationResult } = require('express-validator');
const Product = require('../../models/product');
const { success, error, paginated } = require('../../utils/response');

const router = Router();

/** 商品列表 */
router.get('/', (req, res) => {
  const { category_id, page, page_size } = req.query;
  const result = Product.list({
    category_id: category_id ? parseInt(category_id, 10) : undefined,
    page: page ? parseInt(page, 10) : 1,
    page_size: page_size ? parseInt(page_size, 10) : 20,
  });
  res.json(paginated(result.list, result.total));
});

/** 商品详情 */
router.get('/:id', (req, res) => {
  const product = Product.findById(parseInt(req.params.id, 10));
  if (!product) {
    return res.json(error(404, '商品不存在'));
  }
  res.json(success(product));
});

/** 创建商品 */
router.post('/', [
  body('category_id').isInt({ min: 1 }).withMessage('请选择分类'),
  body('name').notEmpty().withMessage('请输入商品名称'),
  body('price').isFloat({ min: 0 }).withMessage('请输入有效价格'),
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ code: 400, message: '参数错误', data: errors.array() });
  }
  const product = Product.create(req.body);
  res.json(success(product, '商品已创建'));
});

/** 更新商品 */
router.put('/:id', (req, res) => {
  const id = parseInt(req.params.id, 10);
  const existing = Product.findById(id);
  if (!existing) {
    return res.json(error(404, '商品不存在'));
  }

  const product = Product.update(id, req.body);
  res.json(success(product, '商品已更新'));
});

/** 上下架 */
router.put('/:id/status', [
  body('status').isIn(['on', 'off']).withMessage('状态值无效'),
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ code: 400, message: '参数错误', data: errors.array() });
  }
  const id = parseInt(req.params.id, 10);
  const product = Product.updateStatus(id, req.body.status);
  if (!product) {
    return res.json(error(404, '商品不存在'));
  }
  res.json(success(product, req.body.status === 'on' ? '已上架' : '已下架'));
});

/** 删除商品 */
router.delete('/:id', (req, res) => {
  const id = parseInt(req.params.id, 10);
  Product.delete(id);
  res.json(success(null, '商品已删除'));
});

module.exports = router;

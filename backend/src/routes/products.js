/**
 * 商品路由
 * GET /api/products          — 商品列表
 * GET /api/products/search   — 商品搜索
 * GET /api/products/:id      — 商品详情
 * GET /api/products/:id/reviews — 商品评价列表
 */
const { Router } = require('express');
const Product = require('../models/product');
const Review = require('../models/review');
const { success, error, paginated } = require('../utils/response');

const router = Router();

/** 商品列表 */
router.get('/', async (req, res) => {
  const { category_id, page, page_size, sort } = req.query;
  const result = await Product.list({
    category_id: category_id ? parseInt(category_id, 10) : undefined,
    page: page ? parseInt(page, 10) : 1,
    page_size: page_size ? parseInt(page_size, 10) : 20,
    sort,
  });
  res.json(paginated(result.list, result.total));
});

/** 商品搜索 */
router.get('/search', async (req, res) => {
  const { q, page, page_size } = req.query;
  if (!q || !q.trim()) {
    return res.json(paginated([], 0));
  }
  const result = await Product.search(q.trim(), page ? parseInt(page, 10) : 1, page_size ? parseInt(page_size, 10) : 20);
  res.json(paginated(result.list, result.total));
});

/** 商品详情 */
router.get('/:id', async (req, res) => {
  const product = await Product.findById(parseInt(req.params.id, 10));
  if (!product) {
    return res.json(error(404, '商品不存在'));
  }
  // 附加平均评分
  const ratingInfo = await Review.getAvgRating(product.id);
  res.json(success({ ...product, ...ratingInfo }));
});

/** 商品评价列表 */
router.get('/:id/reviews', async (req, res) => {
  const productId = parseInt(req.params.id, 10);
  const { page, page_size } = req.query;
  const result = await Review.listByProduct(
    productId,
    page ? parseInt(page, 10) : 1,
    page_size ? parseInt(page_size, 10) : 20
  );
  res.json(paginated(result.list, result.total));
});

module.exports = router;

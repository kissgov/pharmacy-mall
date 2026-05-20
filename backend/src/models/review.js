/**
 * 商品评价数据模型
 */
const db = require('../db');

const Review = {
  /** 获取商品评价列表 */
  listByProduct(productId, page = 1, pageSize = 20) {
    const offset = (page - 1) * pageSize;

    const list = db.prepare(`
      SELECT r.*, u.nickname, u.avatar_url
      FROM reviews r
      LEFT JOIN users u ON u.id = r.user_id
      WHERE r.product_id = ?
      ORDER BY r.created_at DESC
      LIMIT ? OFFSET ?
    `).all(productId, pageSize, offset);

    const total = db.prepare(
      'SELECT COUNT(*) AS count FROM reviews WHERE product_id = ?'
    ).get(productId).count;

    return { list, total };
  },

  /** 发表评价 */
  create(data) {
    const imagesJson = JSON.stringify(data.images || []);
    const stmt = db.prepare(`
      INSERT INTO reviews (user_id, order_id, product_id, rating, content, images)
      VALUES (@user_id, @order_id, @product_id, @rating, @content, @images)
    `);
    const result = stmt.run({
      user_id: data.user_id,
      order_id: data.order_id,
      product_id: data.product_id,
      rating: data.rating,
      content: data.content || null,
      images: imagesJson,
    });

    return db.prepare(
      `SELECT r.*, u.nickname, u.avatar_url
       FROM reviews r
       LEFT JOIN users u ON u.id = r.user_id
       WHERE r.id = ?`
    ).get(result.lastInsertRowid);
  },

  /** 获取商品平均评分 */
  getAvgRating(productId) {
    return db.prepare(
      'SELECT ROUND(AVG(rating), 1) AS avg_rating, COUNT(*) AS review_count FROM reviews WHERE product_id = ?'
    ).get(productId);
  },
};

module.exports = Review;

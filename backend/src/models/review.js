/**
 * 商品评价数据模型
 */
const pool = require('../db');

const Review = {
  /** 获取商品评价列表 */
  async listByProduct(productId, page = 1, pageSize = 20) {
    const offset = (page - 1) * pageSize;

    const [list] = await pool.execute(
      `SELECT r.*, u.nickname, u.avatar_url
       FROM reviews r
       LEFT JOIN users u ON u.id = r.user_id
       WHERE r.product_id = ?
       ORDER BY r.created_at DESC
       LIMIT ? OFFSET ?`,
      [productId, pageSize, offset]
    );

    const [totalRows] = await pool.execute(
      'SELECT COUNT(*) AS count FROM reviews WHERE product_id = ?',
      [productId]
    );

    return { list, total: totalRows[0].count };
  },

  /** 发表评价 */
  async create(data) {
    const imagesJson = JSON.stringify(data.images || []);
    const [result] = await pool.execute(
      `INSERT INTO reviews (user_id, order_id, product_id, rating, content, images)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        data.user_id,
        data.order_id,
        data.product_id,
        data.rating,
        data.content || null,
        imagesJson,
      ]
    );

    const [rows] = await pool.execute(
      `SELECT r.*, u.nickname, u.avatar_url
       FROM reviews r
       LEFT JOIN users u ON u.id = r.user_id
       WHERE r.id = ?`,
      [result.insertId]
    );
    return rows[0] || null;
  },

  /** 获取商品平均评分 */
  async getAvgRating(productId) {
    const [rows] = await pool.execute(
      'SELECT ROUND(AVG(rating), 1) AS avg_rating, COUNT(*) AS review_count FROM reviews WHERE product_id = ?',
      [productId]
    );
    return rows[0] || { avg_rating: null, review_count: 0 };
  },
};

module.exports = Review;

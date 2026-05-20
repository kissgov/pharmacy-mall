/**
 * 购物车数据模型
 */
const db = require('../db');

const Cart = {
  /** 获取用户购物车列表（JOIN 商品表获取最新信息） */
  listByUser(userId) {
    return db.prepare(`
      SELECT c.id, c.quantity, c.product_id,
             p.name AS product_name, p.images AS product_images,
             p.price, p.member_price, p.stock, p.status, p.is_prescription
      FROM carts c
      JOIN products p ON p.id = c.product_id
      WHERE c.user_id = ?
      ORDER BY c.id DESC
    `).all(userId);
  },

  /** 加入购物车（已存在则更新数量） */
  add(userId, productId, quantity = 1) {
    const existing = db.prepare('SELECT id, quantity FROM carts WHERE user_id = ? AND product_id = ?')
      .get(userId, productId);

    if (existing) {
      db.prepare('UPDATE carts SET quantity = quantity + ? WHERE id = ?')
        .run(quantity, existing.id);
    } else {
      db.prepare('INSERT INTO carts (user_id, product_id, quantity) VALUES (?, ?, ?)')
        .run(userId, productId, quantity);
    }

    return db.prepare('SELECT id, user_id, product_id, quantity FROM carts WHERE user_id = ? AND product_id = ?')
      .get(userId, productId);
  },

  /** 修改购物车项数量 */
  updateQty(id, quantity) {
    if (quantity <= 0) {
      return db.prepare('DELETE FROM carts WHERE id = ?').run(id);
    }
    return db.prepare('UPDATE carts SET quantity = ? WHERE id = ?').run(quantity, id);
  },

  /** 删除指定购物车项 */
  remove(id) {
    return db.prepare('DELETE FROM carts WHERE id = ?').run(id);
  },

  /** 清空用户购物车 */
  clearByUser(userId) {
    return db.prepare('DELETE FROM carts WHERE user_id = ?').run(userId);
  },

  /** 根据 ID 获取购物车项 */
  findById(id) {
    return db.prepare('SELECT * FROM carts WHERE id = ?').get(id);
  },

  /** 批量获取购物车项（用于下单） */
  findByIds(ids, userId) {
    const placeholders = ids.map(() => '?').join(',');
    return db.prepare(`
      SELECT c.*, p.name AS product_name, p.images AS product_images,
             p.price, p.member_price, p.stock, p.status, p.is_prescription
      FROM carts c
      JOIN products p ON p.id = c.product_id
      WHERE c.id IN (${placeholders}) AND c.user_id = ?
    `).all(...ids, userId);
  },
};

module.exports = Cart;

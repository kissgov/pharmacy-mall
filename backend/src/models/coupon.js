/**
 * 优惠券数据模型
 */
const db = require('../db');

const Coupon = {
  /** 可领取的优惠券列表（有效期内、未领完、状态为 active） */
  listAvailable() {
    return db.prepare(`
      SELECT * FROM coupons
      WHERE status = 'active'
        AND datetime(valid_from) <= datetime('now')
        AND datetime(valid_to) >= datetime('now')
        AND (total_count IS NULL OR received_count < total_count)
      ORDER BY created_at DESC
    `).all();
  },

  /** 用户优惠券列表 */
  listByUser(userId, status) {
    let where = 'WHERE uc.user_id = ?';
    const params = [userId];

    if (status) {
      where += ' AND uc.status = ?';
      params.push(status);
    }

    return db.prepare(`
      SELECT uc.*, c.name, c.type, c.value, c.min_amount, c.valid_from, c.valid_to
      FROM user_coupons uc
      JOIN coupons c ON c.id = uc.coupon_id
      ${where}
      ORDER BY uc.created_at DESC
    `).all(...params);
  },

  /** 领取优惠券 */
  receive(userId, couponId) {
    const receiveTx = db.transaction(() => {
      // 检查优惠券是否存在且可领取
      const coupon = db.prepare(
        `SELECT * FROM coupons WHERE id = ? AND status = 'active'
         AND datetime(valid_from) <= datetime('now')
         AND datetime(valid_to) >= datetime('now')`
      ).get(couponId);

      if (!coupon) throw new Error('优惠券不存在或已过期');

      if (coupon.total_count !== null && coupon.received_count >= coupon.total_count) {
        throw new Error('优惠券已被领完');
      }

      // 检查是否已领取
      const existing = db.prepare(
        'SELECT id FROM user_coupons WHERE user_id = ? AND coupon_id = ?'
      ).get(userId, couponId);

      if (existing) throw new Error('已领取过该优惠券');

      // 更新已领取数量
      db.prepare('UPDATE coupons SET received_count = received_count + 1 WHERE id = ?').run(couponId);

      // 插入用户优惠券
      const result = db.prepare(
        'INSERT INTO user_coupons (user_id, coupon_id, status) VALUES (?, ?, ?)'
      ).run(userId, couponId, 'unused');

      return db.prepare(
        `SELECT uc.*, c.name, c.type, c.value, c.min_amount, c.valid_from, c.valid_to
         FROM user_coupons uc
         JOIN coupons c ON c.id = uc.coupon_id
         WHERE uc.id = ?`
      ).get(result.lastInsertRowid);
    });

    return receiveTx();
  },

  /** 根据 ID 查找优惠券 */
  findById(id) {
    return db.prepare('SELECT * FROM coupons WHERE id = ?').get(id);
  },

  /** 管理后台：创建优惠券 */
  create(data) {
    const stmt = db.prepare(`
      INSERT INTO coupons (name, type, value, min_amount, total_count, valid_from, valid_to, status)
      VALUES (@name, @type, @value, @min_amount, @total_count, @valid_from, @valid_to, @status)
    `);
    const result = stmt.run({
      name: data.name,
      type: data.type || 'full_reduction',
      value: data.value,
      min_amount: data.min_amount || 0,
      total_count: data.total_count || null,
      valid_from: data.valid_from,
      valid_to: data.valid_to,
      status: data.status || 'active',
    });
    return this.findById(result.lastInsertRowid);
  },

  /** 管理后台：更新优惠券 */
  update(id, data) {
    const allowed = ['name', 'type', 'value', 'min_amount', 'total_count', 'valid_from', 'valid_to', 'status'];
    const fields = [];
    const values = { id };

    allowed.forEach((key) => {
      if (data[key] !== undefined) {
        fields.push(`${key} = @${key}`);
        values[key] = data[key];
      }
    });

    if (fields.length === 0) return this.findById(id);
    db.prepare(`UPDATE coupons SET ${fields.join(', ')} WHERE id = @id`).run(values);
    return this.findById(id);
  },

  /** 管理后台：删除优惠券 */
  delete(id) {
    return db.prepare('DELETE FROM coupons WHERE id = ?').run(id);
  },

  /** 管理后台：优惠券列表 */
  listAll() {
    return db.prepare('SELECT * FROM coupons ORDER BY created_at DESC').all();
  },
};

module.exports = Coupon;

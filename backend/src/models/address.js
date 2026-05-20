/**
 * 收货地址数据模型
 */
const db = require('../db');

const Address = {
  /** 获取用户地址列表 */
  listByUser(userId) {
    return db.prepare('SELECT * FROM user_addresses WHERE user_id = ? ORDER BY is_default DESC, created_at DESC').all(userId);
  },

  /** 根据 ID 获取地址 */
  findById(id) {
    return db.prepare('SELECT * FROM user_addresses WHERE id = ?').get(id);
  },

  /** 创建地址 */
  create(data) {
    // 如果是第一个地址，自动设为默认
    const count = db.prepare('SELECT COUNT(*) AS count FROM user_addresses WHERE user_id = ?').get(data.user_id).count;
    const isDefault = count === 0 ? 1 : (data.is_default || 0);

    // 如果设为默认，先取消其他默认
    if (isDefault) {
      db.prepare('UPDATE user_addresses SET is_default = 0 WHERE user_id = ?').run(data.user_id);
    }

    const stmt = db.prepare(`
      INSERT INTO user_addresses (user_id, name, phone, province, city, district, detail, is_default)
      VALUES (@user_id, @name, @phone, @province, @city, @district, @detail, @is_default)
    `);
    const result = stmt.run({
      user_id: data.user_id,
      name: data.name,
      phone: data.phone,
      province: data.province || null,
      city: data.city || null,
      district: data.district || null,
      detail: data.detail,
      is_default: isDefault,
    });
    return this.findById(result.lastInsertRowid);
  },

  /** 更新地址 */
  update(id, data) {
    const fields = [];
    const values = { id };

    ['name', 'phone', 'province', 'city', 'district', 'detail'].forEach((key) => {
      if (data[key] !== undefined) {
        fields.push(`${key} = @${key}`);
        values[key] = data[key];
      }
    });

    if (fields.length === 0) return this.findById(id);

    db.prepare(`UPDATE user_addresses SET ${fields.join(', ')} WHERE id = @id`).run(values);
    return this.findById(id);
  },

  /** 删除地址 */
  delete(id) {
    return db.prepare('DELETE FROM user_addresses WHERE id = ?').run(id);
  },

  /** 设为默认地址 */
  setDefault(userId, id) {
    const tx = db.transaction(() => {
      db.prepare('UPDATE user_addresses SET is_default = 0 WHERE user_id = ?').run(userId);
      db.prepare('UPDATE user_addresses SET is_default = 1 WHERE id = ? AND user_id = ?').run(id, userId);
    });
    tx();
    return this.findById(id);
  },
};

module.exports = Address;

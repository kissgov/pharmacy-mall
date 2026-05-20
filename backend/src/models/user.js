/**
 * 用户数据模型
 */
const db = require('../db');

const User = {
  /** 根据 openid 查找用户 */
  findByOpenid(openid) {
    return db.prepare('SELECT * FROM users WHERE openid = ?').get(openid);
  },

  /** 根据 ID 查找用户 */
  findById(id) {
    return db.prepare('SELECT id, openid, nickname, avatar_url, phone, member_level, points, created_at, updated_at FROM users WHERE id = ?').get(id);
  },

  /** 创建用户 */
  create(data) {
    const stmt = db.prepare(`
      INSERT INTO users (openid, nickname, avatar_url, phone, member_level, points)
      VALUES (@openid, @nickname, @avatar_url, @phone, @member_level, @points)
    `);
    const result = stmt.run({
      openid: data.openid,
      nickname: data.nickname || null,
      avatar_url: data.avatar_url || null,
      phone: data.phone || null,
      member_level: data.member_level || 'normal',
      points: data.points || 0,
    });
    return this.findById(result.lastInsertRowid);
  },

  /** 更新用户信息 */
  update(id, data) {
    const fields = [];
    const values = {};

    if (data.nickname !== undefined) { fields.push('nickname = @nickname'); values.nickname = data.nickname; }
    if (data.avatar_url !== undefined) { fields.push('avatar_url = @avatar_url'); values.avatar_url = data.avatar_url; }
    if (data.phone !== undefined) { fields.push('phone = @phone'); values.phone = data.phone; }

    if (fields.length === 0) return this.findById(id);

    fields.push("updated_at = datetime('now')");
    values.id = id;

    db.prepare(`UPDATE users SET ${fields.join(', ')} WHERE id = @id`).run(values);
    return this.findById(id);
  },

  /** 分页查询用户列表 */
  list(page = 1, pageSize = 20) {
    const offset = (page - 1) * pageSize;
    const list = db.prepare(
      'SELECT id, openid, nickname, avatar_url, phone, member_level, points, created_at FROM users ORDER BY created_at DESC LIMIT ? OFFSET ?'
    ).all(pageSize, offset);
    const total = db.prepare('SELECT COUNT(*) AS count FROM users').get().count;
    return { list, total };
  },

  /** 添加积分 */
  addPoints(id, points) {
    db.prepare("UPDATE users SET points = points + ?, updated_at = datetime('now') WHERE id = ?").run(points, id);
    return this.findById(id);
  },
};

module.exports = User;

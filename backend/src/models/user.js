/**
 * 用户数据模型
 */
const pool = require('../db');

const User = {
  /** 根据 openid 查找用户 */
  async findByOpenid(openid) {
    const [rows] = await pool.execute('SELECT * FROM users WHERE openid = ?', [openid]);
    return rows[0] || null;
  },

  /** 根据 ID 查找用户 */
  async findById(id) {
    const [rows] = await pool.execute(
      'SELECT id, openid, nickname, avatar_url, phone, member_level, points, created_at, updated_at FROM users WHERE id = ?',
      [id]
    );
    return rows[0] || null;
  },

  /** 创建用户 */
  async create(data) {
    const [result] = await pool.execute(
      `INSERT INTO users (openid, nickname, avatar_url, phone, member_level, points)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        data.openid,
        data.nickname || null,
        data.avatar_url || null,
        data.phone || null,
        data.member_level || 'normal',
        data.points || 0,
      ]
    );
    return this.findById(result.insertId);
  },

  /** 更新用户信息 */
  async update(id, data) {
    const fields = [];
    const values = [];

    if (data.nickname !== undefined) { fields.push('nickname = ?'); values.push(data.nickname); }
    if (data.avatar_url !== undefined) { fields.push('avatar_url = ?'); values.push(data.avatar_url); }
    if (data.phone !== undefined) { fields.push('phone = ?'); values.push(data.phone); }

    if (fields.length === 0) return this.findById(id);

    values.push(id);
    await pool.execute(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`, values);
    return this.findById(id);
  },

  /** 分页查询用户列表 */
  async list(page = 1, pageSize = 20) {
    const offset = (page - 1) * pageSize;
    const [list] = await pool.execute(
      'SELECT id, openid, nickname, avatar_url, phone, member_level, points, created_at FROM users ORDER BY created_at DESC LIMIT ? OFFSET ?',
      [pageSize, offset]
    );
    const [countRows] = await pool.execute('SELECT COUNT(*) AS count FROM users');
    return { list, total: countRows[0].count };
  },

  /** 添加积分 */
  async addPoints(id, points) {
    await pool.execute('UPDATE users SET points = points + ? WHERE id = ?', [points, id]);
    return this.findById(id);
  },
};

module.exports = User;

/**
 * 分类数据模型
 */
const pool = require('../db');

const Category = {
  /** 获取树形分类结构 */
  async getTree() {
    const [all] = await pool.execute('SELECT * FROM categories ORDER BY sort ASC, id ASC');

    // 构建 id -> 节点 的映射
    const map = {};
    all.forEach((cat) => {
      map[cat.id] = { ...cat, children: [] };
    });

    const tree = [];
    all.forEach((cat) => {
      if (cat.parent_id && map[cat.parent_id]) {
        map[cat.parent_id].children.push(map[cat.id]);
      } else {
        tree.push(map[cat.id]);
      }
    });

    return tree;
  },

  /** 根据 ID 查找分类 */
  async findById(id) {
    const [rows] = await pool.execute('SELECT * FROM categories WHERE id = ?', [id]);
    return rows[0] || null;
  },

  /** 创建分类 */
  async create(data) {
    const [result] = await pool.execute(
      `INSERT INTO categories (name, parent_id, icon, sort)
       VALUES (?, ?, ?, ?)`,
      [
        data.name,
        data.parent_id || null,
        data.icon || null,
        data.sort || 0,
      ]
    );
    return this.findById(result.insertId);
  },

  /** 更新分类 */
  async update(id, data) {
    const fields = [];
    const values = [];
    if (data.name !== undefined) { fields.push('name = ?'); values.push(data.name); }
    if (data.parent_id !== undefined) { fields.push('parent_id = ?'); values.push(data.parent_id); }
    if (data.icon !== undefined) { fields.push('icon = ?'); values.push(data.icon); }
    if (data.sort !== undefined) { fields.push('sort = ?'); values.push(data.sort); }

    if (fields.length === 0) return this.findById(id);
    values.push(id);
    await pool.execute(`UPDATE categories SET ${fields.join(', ')} WHERE id = ?`, values);
    return this.findById(id);
  },

  /** 删除分类 */
  async delete(id) {
    const [result] = await pool.execute('DELETE FROM categories WHERE id = ?', [id]);
    return result;
  },
};

module.exports = Category;

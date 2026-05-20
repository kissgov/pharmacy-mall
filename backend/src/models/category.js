/**
 * 分类数据模型
 */
const db = require('../db');

const Category = {
  /** 获取树形分类结构 */
  getTree() {
    const all = db.prepare('SELECT * FROM categories ORDER BY sort ASC, id ASC').all();

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
  findById(id) {
    return db.prepare('SELECT * FROM categories WHERE id = ?').get(id);
  },

  /** 创建分类 */
  create(data) {
    const stmt = db.prepare(`
      INSERT INTO categories (name, parent_id, icon, sort)
      VALUES (@name, @parent_id, @icon, @sort)
    `);
    const result = stmt.run({
      name: data.name,
      parent_id: data.parent_id || null,
      icon: data.icon || null,
      sort: data.sort || 0,
    });
    return this.findById(result.lastInsertRowid);
  },

  /** 更新分类 */
  update(id, data) {
    const fields = [];
    const values = { id };
    if (data.name !== undefined) { fields.push('name = @name'); values.name = data.name; }
    if (data.parent_id !== undefined) { fields.push('parent_id = @parent_id'); values.parent_id = data.parent_id; }
    if (data.icon !== undefined) { fields.push('icon = @icon'); values.icon = data.icon; }
    if (data.sort !== undefined) { fields.push('sort = @sort'); values.sort = data.sort; }

    if (fields.length === 0) return this.findById(id);
    db.prepare(`UPDATE categories SET ${fields.join(', ')} WHERE id = @id`).run(values);
    return this.findById(id);
  },

  /** 删除分类 */
  delete(id) {
    return db.prepare('DELETE FROM categories WHERE id = ?').run(id);
  },
};

module.exports = Category;

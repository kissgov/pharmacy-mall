/**
 * 商品数据模型
 */
const db = require('../db');

const Product = {
  /** 商品列表（支持分类、排序、分页） */
  list({ category_id, page = 1, page_size = 20, sort } = {}) {
    const offset = (page - 1) * page_size;
    let where = "WHERE p.status = 'on'";
    const params = [];

    if (category_id) {
      // 包含子分类：查找该分类及其所有子分类
      const subIds = [category_id];
      const children = db.prepare('SELECT id FROM categories WHERE parent_id = ?').all(category_id);
      children.forEach((c) => subIds.push(c.id));
      const placeholders = subIds.map(() => '?').join(',');
      where += ` AND p.category_id IN (${placeholders})`;
      params.push(...subIds);
    }

    let orderBy = 'ORDER BY p.sales DESC, p.created_at DESC';
    if (sort === 'price_asc') orderBy = 'ORDER BY p.price ASC';
    else if (sort === 'price_desc') orderBy = 'ORDER BY p.price DESC';
    else if (sort === 'sales') orderBy = 'ORDER BY p.sales DESC';

    const list = db.prepare(
      `SELECT p.*, c.name AS category_name FROM products p
       LEFT JOIN categories c ON c.id = p.category_id
       ${where} ${orderBy} LIMIT ? OFFSET ?`
    ).all(...params, page_size, offset);

    const countRow = db.prepare(
      `SELECT COUNT(*) AS count FROM products p ${where}`
    ).get(...params);

    return { list, total: countRow.count };
  },

  /** 商品搜索 */
  search(q, page = 1, page_size = 20) {
    const offset = (page - 1) * page_size;
    const keyword = `%${q}%`;

    const list = db.prepare(
      `SELECT p.*, c.name AS category_name FROM products p
       LEFT JOIN categories c ON c.id = p.category_id
       WHERE p.status = 'on' AND (p.name LIKE ? OR p.brand LIKE ? OR p.manufacturer LIKE ?)
       ORDER BY p.sales DESC LIMIT ? OFFSET ?`
    ).all(keyword, keyword, keyword, page_size, offset);

    const total = db.prepare(
      `SELECT COUNT(*) AS count FROM products p
       WHERE p.status = 'on' AND (p.name LIKE ? OR p.brand LIKE ? OR p.manufacturer LIKE ?)`
    ).get(keyword, keyword, keyword).count;

    return { list, total };
  },

  /** 根据 ID 查找商品 */
  findById(id) {
    return db.prepare(
      `SELECT p.*, c.name AS category_name FROM products p
       LEFT JOIN categories c ON c.id = p.category_id
       WHERE p.id = ?`
    ).get(id);
  },

  /** 创建商品 */
  create(data) {
    const stmt = db.prepare(`
      INSERT INTO products (category_id, name, images, specification, brand, manufacturer,
        price, member_price, stock, is_prescription, usage_dosage, contraindications,
        approval_number, status)
      VALUES (@category_id, @name, @images, @specification, @brand, @manufacturer,
        @price, @member_price, @stock, @is_prescription, @usage_dosage, @contraindications,
        @approval_number, @status)
    `);
    const result = stmt.run({
      category_id: data.category_id,
      name: data.name,
      images: data.images || '[]',
      specification: data.specification || null,
      brand: data.brand || null,
      manufacturer: data.manufacturer || null,
      price: data.price,
      member_price: data.member_price || null,
      stock: data.stock || 0,
      is_prescription: data.is_prescription || 0,
      usage_dosage: data.usage_dosage || null,
      contraindications: data.contraindications || null,
      approval_number: data.approval_number || null,
      status: data.status || 'on',
    });
    return this.findById(result.lastInsertRowid);
  },

  /** 更新商品 */
  update(id, data) {
    const allowed = ['category_id', 'name', 'images', 'specification', 'brand', 'manufacturer',
      'price', 'member_price', 'stock', 'is_prescription', 'usage_dosage', 'contraindications',
      'approval_number'];
    const fields = [];
    const values = { id };

    allowed.forEach((key) => {
      if (data[key] !== undefined) {
        fields.push(`${key} = @${key}`);
        values[key] = data[key];
      }
    });

    if (fields.length === 0) return this.findById(id);
    fields.push("updated_at = datetime('now')");

    db.prepare(`UPDATE products SET ${fields.join(', ')} WHERE id = @id`).run(values);
    return this.findById(id);
  },

  /** 更新商品状态（上架/下架） */
  updateStatus(id, status) {
    db.prepare("UPDATE products SET status = ?, updated_at = datetime('now') WHERE id = ?").run(status, id);
    return this.findById(id);
  },

  /** 删除商品 */
  delete(id) {
    return db.prepare('DELETE FROM products WHERE id = ?').run(id);
  },

  /** 减少库存 */
  decreaseStock(id, quantity) {
    return db.prepare('UPDATE products SET stock = stock - ?, sales = sales + ? WHERE id = ? AND stock >= ?')
      .run(quantity, quantity, id, quantity);
  },

  /** 恢复库存 */
  increaseStock(id, quantity) {
    return db.prepare('UPDATE products SET stock = stock + ? WHERE id = ?').run(quantity, id);
  },
};

module.exports = Product;

/**
 * 商品数据模型
 */
const pool = require('../db');

const Product = {
  /** 商品列表（支持分类、排序、分页） */
  async list({ category_id, page = 1, page_size = 20, sort } = {}) {
    const offset = (page - 1) * page_size;
    let where = "WHERE p.status = 'on'";
    const params = [];

    if (category_id) {
      // 包含子分类：查找该分类及其所有子分类
      const subIds = [category_id];
      const [children] = await pool.execute('SELECT id FROM categories WHERE parent_id = ?', [category_id]);
      children.forEach((c) => subIds.push(c.id));
      const placeholders = subIds.map(() => '?').join(',');
      where += ` AND p.category_id IN (${placeholders})`;
      params.push(...subIds);
    }

    let orderBy = 'ORDER BY p.sales DESC, p.created_at DESC';
    if (sort === 'price_asc') orderBy = 'ORDER BY p.price ASC';
    else if (sort === 'price_desc') orderBy = 'ORDER BY p.price DESC';
    else if (sort === 'sales') orderBy = 'ORDER BY p.sales DESC';

    params.push(page_size, offset);
    const [list] = await pool.execute(
      `SELECT p.*, c.name AS category_name FROM products p
       LEFT JOIN categories c ON c.id = p.category_id
       ${where} ${orderBy} LIMIT ? OFFSET ?`,
      params
    );

    const countParams = params.slice(0, -2); // remove limit/offset
    const [countRows] = await pool.execute(
      `SELECT COUNT(*) AS count FROM products p ${where}`,
      countParams
    );

    return { list, total: countRows[0].count };
  },

  /** 商品搜索 */
  async search(q, page = 1, page_size = 20) {
    const offset = (page - 1) * page_size;
    const keyword = `%${q}%`;

    const [list] = await pool.execute(
      `SELECT p.*, c.name AS category_name FROM products p
       LEFT JOIN categories c ON c.id = p.category_id
       WHERE p.status = 'on' AND (p.name LIKE ? OR p.brand LIKE ? OR p.manufacturer LIKE ?)
       ORDER BY p.sales DESC LIMIT ? OFFSET ?`,
      [keyword, keyword, keyword, page_size, offset]
    );

    const [totalRows] = await pool.execute(
      `SELECT COUNT(*) AS count FROM products p
       WHERE p.status = 'on' AND (p.name LIKE ? OR p.brand LIKE ? OR p.manufacturer LIKE ?)`,
      [keyword, keyword, keyword]
    );

    return { list, total: totalRows[0].count };
  },

  /** 根据 ID 查找商品 */
  async findById(id) {
    const [rows] = await pool.execute(
      `SELECT p.*, c.name AS category_name FROM products p
       LEFT JOIN categories c ON c.id = p.category_id
       WHERE p.id = ?`,
      [id]
    );
    return rows[0] || null;
  },

  /** 创建商品 */
  async create(data) {
    const [result] = await pool.execute(
      `INSERT INTO products (category_id, name, images, specification, brand, manufacturer,
        price, member_price, stock, is_prescription, usage_dosage, contraindications,
        approval_number, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        data.category_id,
        data.name,
        data.images || '[]',
        data.specification || null,
        data.brand || null,
        data.manufacturer || null,
        data.price,
        data.member_price || null,
        data.stock || 0,
        data.is_prescription || 0,
        data.usage_dosage || null,
        data.contraindications || null,
        data.approval_number || null,
        data.status || 'on',
      ]
    );
    return this.findById(result.insertId);
  },

  /** 更新商品 */
  async update(id, data) {
    const allowed = ['category_id', 'name', 'images', 'specification', 'brand', 'manufacturer',
      'price', 'member_price', 'stock', 'is_prescription', 'usage_dosage', 'contraindications',
      'approval_number'];
    const fields = [];
    const values = [];

    allowed.forEach((key) => {
      if (data[key] !== undefined) {
        fields.push(`${key} = ?`);
        values.push(data[key]);
      }
    });

    if (fields.length === 0) return this.findById(id);
    values.push(id);

    await pool.execute(`UPDATE products SET ${fields.join(', ')} WHERE id = ?`, values);
    return this.findById(id);
  },

  /** 更新商品状态（上架/下架） */
  async updateStatus(id, status) {
    await pool.execute('UPDATE products SET status = ? WHERE id = ?', [status, id]);
    return this.findById(id);
  },

  /** 删除商品 */
  async delete(id) {
    const [result] = await pool.execute('DELETE FROM products WHERE id = ?', [id]);
    return result;
  },

  /** 减少库存 */
  async decreaseStock(id, quantity) {
    const [result] = await pool.execute(
      'UPDATE products SET stock = stock - ?, sales = sales + ? WHERE id = ? AND stock >= ?',
      [quantity, quantity, id, quantity]
    );
    return result;
  },

  /** 恢复库存 */
  async increaseStock(id, quantity) {
    const [result] = await pool.execute(
      'UPDATE products SET stock = stock + ? WHERE id = ?',
      [quantity, id]
    );
    return result;
  },
};

module.exports = Product;

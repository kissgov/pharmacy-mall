/**
 * 种子数据模块
 *
 * 插入管理员、分类、商品、优惠券、Banner 初始数据。
 * 可独立运行（node src/db/seed.js），也会被 server.js 自动调用。
 * 所有插入操作先检查是否存在，防止重复。
 */

const bcrypt = require('bcryptjs');
const db = require('./index');

function run() {
  console.log('开始填充种子数据...');

  seedAdmin();
  seedCategories();
  seedProducts();
  seedCoupons();
  seedBanners();

  console.log('种子数据填充完成！');
}

// ========== 管理员 ==========
function seedAdmin() {
  const count = db.prepare('SELECT COUNT(*) AS count FROM admin_users').get().count;
  if (count > 0) {
    console.log('  ⏭ 管理员已存在，跳过');
    return;
  }

  const hash = bcrypt.hashSync('admin123', 10);
  db.prepare('INSERT INTO admin_users (username, password_hash, role) VALUES (?, ?, ?)').run('admin', hash, 'admin');
  console.log('  ✔ 管理员账号: admin / admin123');
}

// ========== 分类 ==========
function seedCategories() {
  const count = db.prepare('SELECT COUNT(*) AS count FROM categories').get().count;
  if (count > 0) {
    console.log('  ⏭ 分类已存在，跳过');
    return;
  }

  const cats = [
    { name: 'OTC药品', icon: '💊', sort: 1, children: [
      { name: '感冒用药', icon: '🤧', sort: 1 },
      { name: '肠胃用药', icon: '🤢', sort: 2 },
      { name: '皮肤用药', icon: '🩹', sort: 3 },
      { name: '五官用药', icon: '👃', sort: 4 },
      { name: '解热镇痛', icon: '🌡️', sort: 5 },
    ]},
    { name: '处方药', icon: '🏥', sort: 2, children: [
      { name: '心脑血管', icon: '❤️', sort: 1 },
      { name: '糖尿病', icon: '💉', sort: 2 },
      { name: '高血压', icon: '🫀', sort: 3 },
      { name: '抗生素', icon: '🦠', sort: 4 },
    ]},
    { name: '医疗器械', icon: '🔬', sort: 3, children: [
      { name: '血压计', icon: '🩺', sort: 1 },
      { name: '血糖仪', icon: '📊', sort: 2 },
      { name: '体温计', icon: '🌡️', sort: 3 },
      { name: '口罩', icon: '😷', sort: 4 },
    ]},
    { name: '保健品', icon: '💪', sort: 4, children: [
      { name: '维生素', icon: '🍊', sort: 1 },
      { name: '钙片', icon: '🦴', sort: 2 },
      { name: '蛋白粉', icon: '🥛', sort: 3 },
      { name: '鱼油', icon: '🐟', sort: 4 },
    ]},
    { name: '母婴用品', icon: '👶', sort: 5, children: [
      { name: '儿童用药', icon: '🧒', sort: 1 },
      { name: '孕妇营养', icon: '🤰', sort: 2 },
      { name: '婴儿护理', icon: '🍼', sort: 3 },
    ]},
  ];

  const insertCat = db.prepare('INSERT INTO categories (name, parent_id, icon, sort) VALUES (?, NULL, ?, ?)');
  const insertSub = db.prepare('INSERT INTO categories (name, parent_id, icon, sort) VALUES (?, ?, ?, ?)');

  const tx = db.transaction(() => {
    for (const cat of cats) {
      const r = insertCat.run(cat.name, cat.icon, cat.sort);
      const parentId = r.lastInsertRowid;
      for (const sub of cat.children) {
        insertSub.run(sub.name, parentId, sub.icon, sub.sort);
      }
    }
  });
  tx();
  console.log(`  ✔ 分类: ${cats.length} 个一级 + ${cats.reduce((s, c) => s + c.children.length, 0)} 个二级`);
}

// ========== 商品 ==========
function seedProducts() {
  const count = db.prepare('SELECT COUNT(*) AS count FROM products').get().count;
  if (count > 0) {
    console.log('  ⏭ 商品已存在，跳过');
    return;
  }

  // 获取分类 ID 映射
  const catMap = {};
  const cats = db.prepare('SELECT id, name FROM categories').all();
  cats.forEach((c) => { catMap[c.name] = c.id; });

  const products = [
    { name: '布洛芬缓释胶囊', cat: '解热镇痛', price: 18.50, member_price: 16.80, stock: 200, is_prescription: 0, brand: '中美史克', manufacturer: '中美天津史克制药有限公司', specification: '0.3g×20粒', approval_number: '国药准字H10900089', usage_dosage: '口服，一次1粒，一日2次（早晚各一次）', contraindications: '孕妇及哺乳期妇女禁用；对本品过敏者禁用；服用阿司匹林或其他非甾体抗炎药后诱发哮喘、荨麻疹或过敏反应的患者禁用', sales: 1580 },
    { name: '阿莫西林胶囊', cat: '抗生素', price: 22.00, member_price: 19.80, stock: 150, is_prescription: 1, brand: '联邦制药', manufacturer: '联邦制药有限公司', specification: '0.5g×24粒', approval_number: '国药准字H20063958', usage_dosage: '口服，一次0.5g，每6-8小时1次', contraindications: '对青霉素类过敏者禁用；传染性单核细胞增多症患者禁用', sales: 920 },
    { name: '连花清瘟胶囊', cat: '感冒用药', price: 15.80, member_price: 14.50, stock: 300, is_prescription: 0, brand: '以岭药业', manufacturer: '石家庄以岭药业股份有限公司', specification: '0.35g×36粒', approval_number: '国药准字Z20040063', usage_dosage: '口服，一次4粒，一日3次', contraindications: '风寒感冒者不适用；高血压、心脏病患者慎用', sales: 3200 },
    { name: '蒙脱石散', cat: '肠胃用药', price: 25.00, member_price: 22.50, stock: 180, is_prescription: 0, brand: '思密达', manufacturer: '博福-益普生制药有限公司', specification: '3g×10袋', approval_number: '国药准字H20000690', usage_dosage: '口服，成人一次1袋，一日3次', contraindications: '对本品过敏者禁用', sales: 1050 },
    { name: '氯雷他定片', cat: '五官用药', price: 12.00, member_price: 10.80, stock: 250, is_prescription: 0, brand: '开瑞坦', manufacturer: '拜耳医药保健有限公司', specification: '10mg×6片', approval_number: '国药准字H10970410', usage_dosage: '口服，成人及12岁以上儿童一日1次，一次1片', contraindications: '对本品过敏者禁用；严重肝功能不全者慎用', sales: 2100 },
    { name: '硝苯地平控释片', cat: '心脑血管', price: 35.00, member_price: 32.00, stock: 100, is_prescription: 1, brand: '拜新同', manufacturer: '拜耳医药保健有限公司', specification: '30mg×7片', approval_number: '国药准字J20130118', usage_dosage: '口服，一次30mg，一日1次', contraindications: '心源性休克；不稳定性心绞痛', sales: 780 },
    { name: '盐酸二甲双胍片', cat: '糖尿病', price: 28.00, member_price: 25.50, stock: 120, is_prescription: 1, brand: '格华止', manufacturer: '中美上海施贵宝制药有限公司', specification: '0.5g×20片', approval_number: '国药准字H20023370', usage_dosage: '口服，起始剂量500mg，一日2次', contraindications: '肾功能不全者禁用；严重感染及外伤者禁用', sales: 650 },
    { name: '维生素C片', cat: '维生素', price: 45.00, member_price: 39.00, stock: 500, is_prescription: 0, brand: '养生堂', manufacturer: '养生堂药业有限公司', specification: '100mg×100片', approval_number: '国药准字H33022049', usage_dosage: '口服，一次1-2片，一日3次', contraindications: '高尿酸血症患者慎用', sales: 4200 },
    { name: '碳酸钙D3片', cat: '钙片', price: 68.00, member_price: 59.00, stock: 300, is_prescription: 0, brand: '钙尔奇', manufacturer: '惠氏制药有限公司', specification: '600mg×60片', approval_number: '国药准字H10950029', usage_dosage: '口服，一次1片，一日1-2次', contraindications: '高钙血症患者禁用', sales: 1800 },
    { name: '鱼油软胶囊', cat: '鱼油', price: 98.00, member_price: 88.00, stock: 200, is_prescription: 0, brand: '汤臣倍健', manufacturer: '汤臣倍健股份有限公司', specification: '1000mg×100粒', approval_number: '国食健字G20140568', usage_dosage: '口服，一次1粒，一日2次', contraindications: '', sales: 960 },
    { name: '欧姆龙电子血压计', cat: '血压计', price: 299.00, member_price: 269.00, stock: 50, is_prescription: 0, brand: '欧姆龙', manufacturer: '欧姆龙健康医疗株式会社', specification: 'HEM-7124', approval_number: '辽械注准20172200182', usage_dosage: '请按照使用说明书操作', contraindications: '', sales: 320 },
    { name: '鱼跃血糖仪', cat: '血糖仪', price: 159.00, member_price: 139.00, stock: 80, is_prescription: 0, brand: '鱼跃', manufacturer: '江苏鱼跃医疗设备股份有限公司', specification: '590型（含50片试纸）', approval_number: '苏械注准20172400982', usage_dosage: '请按照使用说明书操作', contraindications: '', sales: 450 },
    { name: '对乙酰氨基酚片', cat: '解热镇痛', price: 8.50, member_price: 7.50, stock: 400, is_prescription: 0, brand: '泰诺', manufacturer: '上海强生制药有限公司', specification: '500mg×20片', approval_number: '国药准字H31022457', usage_dosage: '口服，成人一次1-2片，每4-6小时一次', contraindications: '严重肝肾功能不全者禁用；对本品过敏者禁用', sales: 2800 },
    { name: '藿香正气水', cat: '感冒用药', price: 9.90, member_price: 8.90, stock: 350, is_prescription: 0, brand: '太极集团', manufacturer: '太极集团重庆涪陵制药厂有限公司', specification: '10ml×10支', approval_number: '国药准字Z50020409', usage_dosage: '口服，一次5-10ml，一日2次', contraindications: '对本品及酒精过敏者禁用', sales: 1600 },
    { name: '红霉素软膏', cat: '皮肤用药', price: 6.50, member_price: 5.80, stock: 500, is_prescription: 0, brand: '恒健', manufacturer: '广东恒健制药有限公司', specification: '10g:0.1g', approval_number: '国药准字H44023920', usage_dosage: '局部外用，取适量涂于患处，一日2次', contraindications: '对红霉素过敏者禁用', sales: 3500 },
    { name: '阿托伐他汀钙片', cat: '心脑血管', price: 42.00, member_price: 38.00, stock: 90, is_prescription: 1, brand: '立普妥', manufacturer: '辉瑞制药有限公司', specification: '20mg×7片', approval_number: '国药准字J20120026', usage_dosage: '口服，一次20mg，一日1次', contraindications: '活动性肝病患者禁用；孕妇及哺乳期妇女禁用', sales: 540 },
    { name: '复方氨酚烷胺片', cat: '感冒用药', price: 13.50, member_price: 12.00, stock: 280, is_prescription: 0, brand: '感康', manufacturer: '吉林省吴太感康药业有限公司', specification: '12片/盒', approval_number: '国药准字H22026193', usage_dosage: '口服，成人一次1片，一日2次', contraindications: '严重肝肾功能不全者禁用；活动性消化道溃疡禁用', sales: 1900 },
    { name: '健胃消食片', cat: '肠胃用药', price: 16.00, member_price: 14.50, stock: 220, is_prescription: 0, brand: '江中', manufacturer: '江中药业股份有限公司', specification: '0.8g×32片', approval_number: '国药准字Z36021577', usage_dosage: '口服，一次3-4片，一日3次', contraindications: '', sales: 2400 },
    { name: 'N95口罩(50只)', cat: '口罩', price: 39.90, member_price: 35.90, stock: 1000, is_prescription: 0, brand: '3M', manufacturer: '3M中国有限公司', specification: '50只/盒 独立包装', approval_number: '苏械注准20202140937', usage_dosage: '佩戴前请洗手，确保口罩与面部贴合', contraindications: '呼吸困难者慎用', sales: 5800 },
    { name: '蛋白粉(400g)', cat: '蛋白粉', price: 168.00, member_price: 149.00, stock: 150, is_prescription: 0, brand: '汤臣倍健', manufacturer: '汤臣倍健股份有限公司', specification: '400g/罐', approval_number: '国食健字G20140123', usage_dosage: '每日1-2勺（约10-20g），加入温水或牛奶冲调饮用', contraindications: '肾功能不全者请遵医嘱', sales: 720 },
  ];

  const insertProduct = db.prepare(`
    INSERT INTO products (category_id, name, images, specification, brand, manufacturer,
      price, member_price, stock, is_prescription, usage_dosage, contraindications,
      approval_number, status, sales)
    VALUES (?, ?, '[]', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'on', ?)
  `);

  const tx = db.transaction(() => {
    for (const p of products) {
      const catId = catMap[p.cat];
      if (!catId) {
        console.warn(`    警告: 分类"${p.cat}"未找到，跳过商品"${p.name}"`);
        continue;
      }
      insertProduct.run(
        catId, p.name, p.specification, p.brand, p.manufacturer,
        p.price, p.member_price, p.stock, p.is_prescription,
        p.usage_dosage, p.contraindications, p.approval_number, p.sales,
      );
    }
  });
  tx();
  console.log(`  ✔ 商品: ${products.length} 种`);
}

// ========== 优惠券 ==========
function seedCoupons() {
  const count = db.prepare('SELECT COUNT(*) AS count FROM coupons').get().count;
  if (count > 0) {
    console.log('  ⏭ 优惠券已存在，跳过');
    return;
  }

  const now = new Date();
  const thirtyDaysLater = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  const coupons = [
    { name: '新用户专享券', type: 'full_reduction', value: 10, min_amount: 50, total_count: 1000 },
    { name: '满100减20', type: 'full_reduction', value: 20, min_amount: 100, total_count: 500 },
    { name: '会员9折券', type: 'discount', value: 0.9, min_amount: 0, total_count: 500 },
  ];

  const insert = db.prepare(`
    INSERT INTO coupons (name, type, value, min_amount, total_count, valid_from, valid_to, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, 'active')
  `);

  const tx = db.transaction(() => {
    for (const c of coupons) {
      insert.run(c.name, c.type, c.value, c.min_amount, c.total_count, now.toISOString(), thirtyDaysLater.toISOString());
    }
  });
  tx();
  console.log(`  ✔ 优惠券: ${coupons.length} 个`);
}

// ========== Banner ==========
function seedBanners() {
  const count = db.prepare('SELECT COUNT(*) AS count FROM banners').get().count;
  if (count > 0) {
    console.log('  ⏭ Banner 已存在，跳过');
    return;
  }

  const banners = [
    { title: '新用户首单立减10元', image_url: '', sort: 1 },
    { title: '会员专享 全场9折', image_url: '', sort: 2 },
  ];

  const insert = db.prepare("INSERT INTO banners (title, image_url, sort, status) VALUES (?, ?, ?, 'active')");
  const tx = db.transaction(() => {
    for (const b of banners) {
      insert.run(b.title, b.image_url, b.sort);
    }
  });
  tx();
  console.log(`  ✔ Banner: ${banners.length} 个`);
}

// 直接运行时执行
if (require.main === module) {
  run();
  // seed 运行后关闭数据库连接
  db.close();
}

module.exports = { run };

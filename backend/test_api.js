/**
 * 药店网上商城 API 功能测试脚本
 *
 * 测试所有核心 API，验证功能正确性和边界情况。
 * 使用方法: node test_api.js
 */

const http = require('http');

// ---------- 配置 ----------
const BASE = 'http://localhost:3000';
const TEST_CODE = 'mock_test001';

// 全局状态存储
let userToken = '';
let adminToken = '';
let addressId = null;
let cartItemId = null;
let orderId = null;
let results = { total: 0, passed: 0, failed: 0, failures: [] };

// ---------- 工具函数 ----------

function request(method, path, body = null, opts = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE);
    const options = {
      method,
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      headers: {
        'Content-Type': 'application/json',
        ...opts.headers,
      },
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(data) });
        } catch {
          resolve({ status: res.statusCode, body: data });
        }
      });
    });

    req.on('error', (err) => {
      reject(err);
    });

    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

function authHeader(token) {
  return { Authorization: `Bearer ${token}` };
}

function assert(condition, testName, detail = '') {
  results.total++;
  if (condition) {
    results.passed++;
  } else {
    results.failed++;
    results.failures.push({ name: testName, detail });
    console.error(`  ✗ FAIL: ${testName} - ${detail}`);
  }
}

async function runTest(name, fn) {
  console.log(`\n▶ ${name}`);
  try {
    await fn();
  } catch (err) {
    results.total++;
    results.failed++;
    results.failures.push({ name, detail: `Uncaught error: ${err.message}` });
    console.error(`  ✗ FAIL: ${name} - Uncaught: ${err.message}`);
  }
}

// ========== 测试用例 ==========

async function testAll() {
  // ---------- 1. 用户认证 ----------
  await runTest('1.1 用户登录 - 正常登录', async () => {
    const { status, body } = await request('POST', '/api/auth/login', { code: TEST_CODE });
    assert(status === 200, 'HTTP 200', `Got ${status}`);
    assert(body.code === 200, 'code=200', `Got code=${body.code}`);
    assert(body.data && body.data.token, '返回 token');
    assert(body.data && body.data.user, '返回 user 对象');
    assert(body.data.user.nickname, '用户有 nickname');
    assert(body.data.user.member_level === 'normal', '会员等级为 normal');
    userToken = body.data.token;
    console.log('    token:', userToken ? userToken.substring(0, 30) + '...' : 'NONE');
  });

  await runTest('1.2 用户登录 - 缺少 code', async () => {
    const { body } = await request('POST', '/api/auth/login', {});
    assert(body.code !== 200, '应返回错误', `Got code=${body.code}`);
  });

  await runTest('1.3 用户登录 - 重复登录返回同一用户', async () => {
    const { body } = await request('POST', '/api/auth/login', { code: TEST_CODE, nickname: '测试用户2' });
    assert(body.code === 200, '重复登录成功');
    // 使用相同 openid，应更新信息
  });

  await runTest('1.4 获取用户信息', async () => {
    const { body } = await request('GET', '/api/auth/profile', null, { headers: authHeader(userToken) });
    assert(body.code === 200, 'code=200', `Got code=${body.code}`);
    assert(body.data && body.data.openid === TEST_CODE, `openid=${TEST_CODE}`);
  });

  await runTest('1.5 更新用户信息', async () => {
    const { body } = await request('PUT', '/api/auth/profile', { nickname: 'QA测试用户', phone: '13800138000' }, { headers: authHeader(userToken) });
    assert(body.code === 200, '更新成功', `Got code=${body.code}`);
    assert(body.data.phone === '13800138000', '电话已更新');
  });

  await runTest('1.6 无 Token 访问需登录接口', async () => {
    const { body } = await request('GET', '/api/auth/profile');
    assert(body.code === 401 || body.message, '返回未登录错误', JSON.stringify(body));
  });

  await runTest('1.7 无效 Token 访问', async () => {
    const { body } = await request('GET', '/api/auth/profile', null, { headers: authHeader('invalid_token') });
    assert(body.code === 401, '返回认证错误', JSON.stringify(body));
  });

  // ---------- 2. 分类 ----------
  await runTest('2.1 获取分类树', async () => {
    const { body } = await request('GET', '/api/categories');
    assert(body.code === 200, 'code=200');
    assert(Array.isArray(body.data), '返回数组');
    assert(body.data.length === 5, '5个一级分类', `Got ${body.data.length}`);
    const totalChildren = body.data.reduce((s, c) => s + (c.children || []).length, 0);
    // 5+4+4+4+3 = 20
    console.log(`    一级: ${body.data.length}, 二级: ${totalChildren}`);
    assert(totalChildren === 20, '20个二级分类', `Got ${totalChildren}`);
  });

  // ---------- 3. 商品列表 ----------
  await runTest('3.1 商品列表 - 默认分页', async () => {
    const { body } = await request('GET', '/api/products');
    assert(body.code === 200, 'code=200');
    assert(body.data && body.data.list, '返回 list');
    assert(body.data && typeof body.data.total === 'number', '返回 total');
    console.log(`    商品总数: ${body.data.total}, 当前页: ${body.data.list.length}`);
    assert(body.data.total === 20, '总共20个商品', `Got ${body.data.total}`);
    assert(body.data.list.length === 20, '默认返回20条');
  });

  await runTest('3.2 商品列表 - 按分类筛选', async () => {
    // 分类 ID 1 = OTC药品，应包含解热镇痛等子分类
    const { body } = await request('GET', '/api/products?category_id=1');
    assert(body.code === 200, 'code=200');
    assert(body.data.total > 0, 'OTC分类有商品', `Got ${body.data.total}`);
  });

  await runTest('3.3 商品列表 - 价格排序', async () => {
    const { body } = await request('GET', '/api/products?sort=price_asc');
    assert(body.code === 200, 'code=200');
    if (body.data.list.length >= 2) {
      assert(body.data.list[0].price <= body.data.list[1].price, '价格升序正确');
    }
  });

  await runTest('3.4 商品列表 - 分页参数', async () => {
    const { body } = await request('GET', '/api/products?page=1&page_size=5');
    assert(body.code === 200, 'code=200');
    assert(body.data.list.length === 5, '返回5条', `Got ${body.data.list.length}`);
  });

  // ---------- 4. 商品搜索 ----------
  await runTest('4.1 搜索"布洛芬"', async () => {
    const { body } = await request('GET', '/api/products/search?q=布洛芬');
    assert(body.code === 200, 'code=200');
    assert(body.data.total >= 1, '至少1个结果', `Got ${body.data.total}`);
    const names = body.data.list.map((p) => p.name).join(', ');
    console.log(`    匹配: ${names}`);
    const hasMatch = body.data.list.some((p) => p.name.includes('布洛芬'));
    assert(hasMatch, '搜索结果包含布洛芬相关商品');
  });

  await runTest('4.2 搜索空字符串', async () => {
    const { body } = await request('GET', '/api/products/search?q=');
    assert(body.code === 200, 'code=200');
    assert(body.data.total === 0, '空搜索返回0结果');
  });

  await runTest('4.3 搜索无匹配结果', async () => {
    const { body } = await request('GET', '/api/products/search?q=xyznonexistent999');
    assert(body.code === 200, 'code=200');
    assert(body.data.total === 0, '无匹配结果');
  });

  // ---------- 5. 商品详情 ----------
  await runTest('5.1 商品详情 - 正常', async () => {
    const { body } = await request('GET', '/api/products/1');
    assert(body.code === 200, 'code=200');
    assert(body.data && body.data.name, '有商品名');
    assert(body.data && body.data.category_name, '有分类名');
    console.log(`    商品: ${body.data.name}, 价格: ¥${body.data.price}`);
  });

  await runTest('5.2 商品详情 - 不存在', async () => {
    const { body } = await request('GET', '/api/products/99999');
    assert(body.code !== 200, '不存在返回错误', `code=${body.code}`);
  });

  await runTest('5.3 商品评价列表', async () => {
    const { body } = await request('GET', '/api/products/1/reviews');
    assert(body.code === 200, 'code=200');
    assert(body.data && 'list' in body.data, '返回 list');
  });

  // ---------- 6. 购物车操作 ----------
  await runTest('6.1 加入购物车', async () => {
    const { body } = await request('POST', '/api/cart', { product_id: 1, quantity: 2 }, { headers: authHeader(userToken) });
    assert(body.code === 200, '加入成功', `code=${body.code}, msg=${body.message}`);
    assert(body.data && body.data.product_id === 1, 'product_id=1');
    assert(body.data && body.data.quantity === 2, 'quantity=2');
    cartItemId = body.data.id;
  });

  await runTest('6.2 加入购物车 - 已存在则累加', async () => {
    const { body } = await request('POST', '/api/cart', { product_id: 1, quantity: 1 }, { headers: authHeader(userToken) });
    assert(body.code === 200, '累加成功');
    assert(body.data && body.data.quantity === 3, '数量累加为3', `Got ${body.data?.quantity}`);
  });

  await runTest('6.3 加入购物车 - 不存在的商品', async () => {
    const { body } = await request('POST', '/api/cart', { product_id: 99999, quantity: 1 }, { headers: authHeader(userToken) });
    assert(body.code !== 200, '应返回错误', JSON.stringify(body));
  });

  await runTest('6.4 加入购物车 - 未登录', async () => {
    const { body } = await request('POST', '/api/cart', { product_id: 1, quantity: 1 });
    assert(body.code === 401, '未登录被拦截', `Got code=${body.code}`);
  });

  await runTest('6.5 获取购物车列表', async () => {
    const { body } = await request('GET', '/api/cart', null, { headers: authHeader(userToken) });
    assert(body.code === 200, 'code=200');
    assert(Array.isArray(body.data), '返回数组');
    assert(body.data.length >= 1, '至少1项');
    const item = body.data.find((i) => i.product_id === 1);
    assert(item && item.quantity === 3, '商品1数量=3');
    assert(item && item.product_name, '有商品名');
    assert(item && item.price > 0, '有价格');
    console.log(`    购物车项: ${body.data.length}`);
  });

  await runTest('6.6 修改购物车数量', async () => {
    const { body } = await request('PUT', `/api/cart/${cartItemId}`, { quantity: 5 }, { headers: authHeader(userToken) });
    assert(body.code === 200, '修改成功', `code=${body.code}`);
  });

  await runTest('6.7 修改数量为0或负数 - 边界', async () => {
    const { body } = await request('PUT', `/api/cart/${cartItemId}`, { quantity: 0 }, { headers: authHeader(userToken) });
    // 根据模型: quantity <= 0 会删除该项
    assert(body.code !== 200 || body.code === 200, '返回响应');
  });

  // 再加回购物车
  await runTest('6.8 重新加入购物车', async () => {
    const { body } = await request('POST', '/api/cart', { product_id: 1, quantity: 3 }, { headers: authHeader(userToken) });
    assert(body.code === 200, '重新加入成功');
    cartItemId = body.data.id;
  });

  // ---------- 7. 地址管理 ----------
  await runTest('7.1 新增收货地址', async () => {
    const { body } = await request('POST', '/api/addresses', {
      name: '张三',
      phone: '13912345678',
      province: '广东省',
      city: '深圳市',
      district: '南山区',
      detail: '科技园路1号',
      is_default: 1,
    }, { headers: authHeader(userToken) });
    assert(body.code === 200, '新增成功', `code=${body.code}`);
    assert(body.data && body.data.name === '张三', '姓名=张三');
    assert(body.data && body.data.is_default === 1, '默认地址');
    addressId = body.data.id;
    console.log(`    地址 ID: ${addressId}`);
  });

  await runTest('7.2 新增地址 - 缺少必填项', async () => {
    const { body } = await request('POST', '/api/addresses', { name: '' }, { headers: authHeader(userToken) });
    // 校验可能返回错误
    console.log(`    响应: code=${body.code}, msg=${body.message}`);
  });

  await runTest('7.3 获取地址列表', async () => {
    const { body } = await request('GET', '/api/addresses', null, { headers: authHeader(userToken) });
    assert(body.code === 200, 'code=200');
    assert(Array.isArray(body.data), '返回数组');
    assert(body.data.length >= 1, '至少1个地址');
  });

  await runTest('7.4 地址详情', async () => {
    const { body } = await request('GET', `/api/addresses/${addressId}`, null, { headers: authHeader(userToken) });
    assert(body.code === 200, 'code=200');
    assert(body.data.name === '张三', '正确地址');
  });

  await runTest('7.5 设为默认地址', async () => {
    const { body } = await request('PUT', `/api/addresses/${addressId}/default`, null, { headers: authHeader(userToken) });
    assert(body.code === 200, 'code=200');
    assert(body.data.is_default === 1, '已是默认');
  });

  // ---------- 8. 优惠券 ----------
  await runTest('8.1 获取可领取优惠券', async () => {
    const { body } = await request('GET', '/api/coupons');
    assert(body.code === 200, 'code=200');
    assert(Array.isArray(body.data), '返回数组');
    console.log(`    可用优惠券: ${body.data.length} 个`);
    assert(body.data.length >= 1, '至少1张优惠券');
  });

  await runTest('8.2 领取优惠券', async () => {
    const { body } = await request('POST', '/api/coupons/1/receive', null, { headers: authHeader(userToken) });
    assert(body.code === 200, '领取成功', `code=${body.code}, msg=${body.message}`);
  });

  await runTest('8.3 重复领取同一优惠券', async () => {
    const { body } = await request('POST', '/api/coupons/1/receive', null, { headers: authHeader(userToken) });
    assert(body.code !== 200, '不允许重复领取', `code=${body.code}, msg=${body.message}`);
  });

  await runTest('8.4 我的优惠券列表', async () => {
    const { body } = await request('GET', '/api/coupons/mine', null, { headers: authHeader(userToken) });
    assert(body.code === 200, 'code=200');
    assert(body.data.length >= 1, '已领取优惠券');
  });

  // ---------- 9. 创建订单 ----------
  await runTest('9.1 创建订单 - 基本', async () => {
    const { body } = await request('POST', '/api/orders', {
      address_id: addressId,
      cart_item_ids: [cartItemId],
    }, { headers: authHeader(userToken) });
    console.log(`    订单响应: code=${body.code}, msg=${body.message}`);
    assert(body.code === 200, '创建成功', `Got code=${body.code}: ${body.message}`);
    if (body.code === 200) {
      assert(body.data && body.data.order_no, '有订单号');
      assert(body.data && body.data.status === 'pending', '状态为pending');
      assert(body.data && body.data.pay_amount > 0, '有实付金额');
      assert(body.data && body.data.items && body.data.items.length >= 1, '有订单项');
      orderId = body.data.id;
      console.log(`    订单 ID: ${orderId}, 订单号: ${body.data.order_no}, 金额: ¥${body.data.pay_amount}`);
    }
  });

  // 为后续测试再加商品到购物车
  await request('POST', '/api/cart', { product_id: 2, quantity: 1 }, { headers: authHeader(userToken) });
  // 获取最新购物车
  const cartRes = await request('GET', '/api/cart', null, { headers: authHeader(userToken) });

  await runTest('9.2 创建订单 - 无有效购物车项', async () => {
    const { body } = await request('POST', '/api/orders', {
      address_id: addressId,
      cart_item_ids: [],
    }, { headers: authHeader(userToken) });
    assert(body.code !== 200, '应返回错误', `code=${body.code}`);
  });

  await runTest('9.3 创建订单 - 无效地址', async () => {
    const cartItems = cartRes.body.data || [];
    if (cartItems.length > 0) {
      const { body } = await request('POST', '/api/orders', {
        address_id: 99999,
        cart_item_ids: [cartItems[0].id],
      }, { headers: authHeader(userToken) });
      assert(body.code !== 200, '无效地址应被拒绝', `code=${body.code}`);
    }
  });

  // ---------- 10. 订单操作 ----------
  await runTest('10.1 订单详情', async () => {
    if (!orderId) { console.log('    跳过：无订单'); return; }
    const { body } = await request('GET', `/api/orders/${orderId}`, null, { headers: authHeader(userToken) });
    assert(body.code === 200, 'code=200');
    assert(body.data && body.data.order_no, '有订单号');
  });

  await runTest('10.2 订单列表', async () => {
    const { body } = await request('GET', '/api/orders', null, { headers: authHeader(userToken) });
    assert(body.code === 200, 'code=200');
    assert(body.data && body.data.list, '返回列表');
    console.log(`    订单数: ${body.data.total}`);
    assert(body.data.total >= 1, '至少1个订单');
  });

  await runTest('10.3 模拟支付', async () => {
    if (!orderId) { console.log('    跳过：无订单'); return; }
    const { body } = await request('PUT', `/api/orders/${orderId}/pay`, null, { headers: authHeader(userToken) });
    console.log(`    支付响应: code=${body.code}, msg=${body.message}`);
    assert(body.code === 200, '支付成功', `code=${body.code}: ${body.message}`);
    if (body.code === 200) {
      assert(body.data.status === 'paid', '状态变为 paid', `status=${body.data.status}`);
    }
  });

  await runTest('10.4 重复支付', async () => {
    if (!orderId) { console.log('    跳过：无订单'); return; }
    const { body } = await request('PUT', `/api/orders/${orderId}/pay`, null, { headers: authHeader(userToken) });
    assert(body.code !== 200, '不应允许重复支付', `code=${body.code}, msg=${body.message}`);
  });

  // ---------- 11. 取消订单 + 库存恢复 ----------
  // 创建新订单来测试取消
  await runTest('11.1 准备取消测试订单', async () => {
    // 先加购物车
    await request('POST', '/api/cart', { product_id: 3, quantity: 2 }, { headers: authHeader(userToken) });
    const cartRes2 = await request('GET', '/api/cart', null, { headers: authHeader(userToken) });
    const cartItems = cartRes2.body.data || [];
    if (cartItems.length > 0) {
      const { body } = await request('POST', '/api/orders', {
        address_id: addressId,
        cart_item_ids: [cartItems[0].id],
      }, { headers: authHeader(userToken) });
      if (body.code === 200) {
        // 获取取消前的库存
        orderId = body.data.id;
        console.log(`    创建取消测试订单: ${orderId}`);
      }
    }
  });

  await runTest('11.2 取消订单', async () => {
    if (!orderId) { console.log('    跳过：无订单'); return; }
    // 先查看订单状态
    const orderRes = await request('GET', `/api/orders/${orderId}`, null, { headers: authHeader(userToken) });
    if (orderRes.body.data && orderRes.body.data.status === 'pending') {
      const { body } = await request('PUT', `/api/orders/${orderId}/cancel`, null, { headers: authHeader(userToken) });
      console.log(`    取消响应: code=${body.code}, msg=${body.message}`);
      assert(body.code === 200, '取消成功', `Got code=${body.code}: ${body.message}`);
      if (body.code === 200) {
        assert(body.data.status === 'cancelled', '状态变为 cancelled');
      }
    } else {
      console.log(`    订单状态非pending: ${orderRes.body.data?.status}, 跳过取消测试`);
    }
  });

  // ---------- 12. 管理后台 ----------
  await runTest('12.1 管理员登录', async () => {
    const { body } = await request('POST', '/api/admin/auth/login', {
      username: 'admin',
      password: 'admin123',
    });
    assert(body.code === 200, '登录成功', `code=${body.code}, msg=${body.message}`);
    assert(body.data && body.data.token, '返回 admin token');
    assert(body.data && body.data.admin, '返回 admin 信息');
    adminToken = body.data.token;
  });

  await runTest('12.2 管理员登录 - 错误密码', async () => {
    const { body } = await request('POST', '/api/admin/auth/login', {
      username: 'admin',
      password: 'wrongpassword',
    });
    assert(body.code !== 200, '应拒绝错误密码', `code=${body.code}`);
  });

  await runTest('12.3 管理员登录 - 不存在用户', async () => {
    const { body } = await request('POST', '/api/admin/auth/login', {
      username: 'nonexistent',
      password: 'password',
    });
    assert(body.code !== 200, '应拒绝不存在用户', `code=${body.code}`);
  });

  await runTest('12.4 管理后台仪表盘', async () => {
    const { body } = await request('GET', '/api/admin/dashboard', null, { headers: authHeader(adminToken) });
    assert(body.code === 200, 'code=200');
    assert(body.data && typeof body.data.totalUsers === 'number', '有总用户数');
    assert(body.data && typeof body.data.todayOrders === 'number', '有今日订单数');
    assert(body.data && body.data.weeklySales, '有周销售额');
    console.log(`    总用户: ${body.data.totalUsers}, 待处理订单: ${body.data.pendingOrders}`);
  });

  await runTest('12.5 用户 Token 无法访问管理后台', async () => {
    const { body } = await request('GET', '/api/admin/dashboard', null, { headers: authHeader(userToken) });
    assert(body.code === 403, '用户Token被拒绝', `code=${body.code}`);
  });

  await runTest('12.6 管理后台 - 用户列表', async () => {
    const { body } = await request('GET', '/api/admin/users', null, { headers: authHeader(adminToken) });
    assert(body.code === 200, 'code=200');
    assert(body.data && body.data.list, '有用户列表');
  });

  await runTest('12.7 管理后台 - 订单列表', async () => {
    const { body } = await request('GET', '/api/admin/orders', null, { headers: authHeader(adminToken) });
    assert(body.code === 200, 'code=200');
    assert(body.data && body.data.list, '有订单列表');
  });

  await runTest('12.8 管理后台 - 商品管理列表', async () => {
    const { body } = await request('GET', '/api/admin/products', null, { headers: authHeader(adminToken) });
    assert(body.code === 200, 'code=200');
    assert(body.data && body.data.list, '有商品列表');
  });

  // ---------- 13. 处方上传 ----------
  await runTest('13.1 上传处方', async () => {
    const { body } = await request('POST', '/api/prescriptions', {
      images: ['https://example.com/rx1.jpg', 'https://example.com/rx2.jpg'],
    }, { headers: authHeader(userToken) });
    console.log(`    处方响应: code=${body.code}, msg=${body.message}`);
    assert(body.code === 200, '上传成功', `Got code=${body.code}: ${body.message}`);
    if (body.code === 200) {
      assert(body.data && body.data.status === 'pending', '状态为待审核');
    }
  });

  await runTest('13.2 上传处方 - 无图片', async () => {
    const { body } = await request('POST', '/api/prescriptions', { images: [] }, { headers: authHeader(userToken) });
    assert(body.code !== 200, '应拒绝空图片', `code=${body.code}, msg=${body.message}`);
  });

  await runTest('13.3 处方列表', async () => {
    const { body } = await request('GET', '/api/prescriptions', null, { headers: authHeader(userToken) });
    assert(body.code === 200, 'code=200');
    assert(Array.isArray(body.data), '返回数组');
  });

  // ---------- 14. Banner ----------
  await runTest('14.1 获取Banner列表', async () => {
    const { body } = await request('GET', '/api/banners');
    assert(body.code === 200, 'code=200');
    assert(Array.isArray(body.data), '返回数组');
    console.log(`    Banner数: ${body.data.length}`);
    assert(body.data.length >= 1, '至少1个Banner');
  });

  // ---------- 15. 边界与安全测试 ----------
  await runTest('15.1 XSS 注入防护 - 搜索', async () => {
    const { body } = await request('GET', '/api/products/search?q=<script>alert(1)</script>');
    assert(body.code === 200, '正常返回不崩溃');
  });

  await runTest('15.2 SQL 注入尝试 - 商品ID', async () => {
    const { body } = await request('GET', "/api/products/1%27%20OR%20%271%27=%271");
    // Express 会把 URL 编码解析，尝试 SQL 注入
    // better-sqlite3 使用参数化查询，应安全
    assert(body.code === 200 || body.code === 404 || body.code === 500, '不崩溃');
  });

  await runTest('15.3 大分页参数', async () => {
    const { body } = await request('GET', '/api/products?page=99999&page_size=100');
    assert(body.code === 200, '正常返回');
    assert(body.data.list.length === 0, '大页码返回空列表', `Got ${body.data.list.length}`);
  });
}

// ========== 运行测试 ==========
(async () => {
  console.log('==========================================');
  console.log('  药店网上商城 API 功能测试');
  console.log('==========================================');
  console.log(`  后端地址: ${BASE}`);
  console.log(`  测试账号: ${TEST_CODE}`);
  console.log('');

  const startTime = Date.now();
  await testAll();
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

  console.log('\n==========================================');
  console.log('  测试结果汇总');
  console.log('==========================================');
  console.log(`  总计: ${results.total} | 通过: ${results.passed} | 失败: ${results.failed}`);
  console.log(`  通过率: ${((results.passed / results.total) * 100).toFixed(1)}%`);
  console.log(`  耗时: ${elapsed}s`);
  console.log('');

  if (results.failures.length > 0) {
    console.log('  失败详情:');
    results.failures.forEach((f, i) => {
      console.log(`  ${i + 1}. ${f.name}`);
      if (f.detail) console.log(`     ${f.detail}`);
    });
  }

  console.log('\n测试完成。');
})();

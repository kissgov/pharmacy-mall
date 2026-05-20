# 药店网上商城 — 测试报告

**测试工程师**: 严过关 (Edward)  
**测试日期**: 2026-05-20  
**测试环境**: Node.js v24.13.0, better-sqlite3 v12.10.0, Windows 10  
**测试范围**: 后端 API 功能测试 + 代码质量审查 + 前端代码抽样审查

---

## 一、测试通过率

| 项目 | 总计 | 通过 | 失败 | 通过率 |
|------|------|------|------|--------|
| API 功能测试 | 119 | 104 | 15 | **87.4%** |
| 代码质量审查 | 12 | 7 | 5 | **58.3%** |
| 前端代码审查 | 5 | 4 | 1 | **80.0%** |

> 注：15 个 API 失败中，11 个由底层 `Product.list()` 的 `p.sort` 列缺失连锁导致（属同一 Bug），1 个由测试脚本路径错误导致（已修复），实际独立 Bug 为 5 个。

---

## 二、发现的 Bug

### 🔴 P0（阻塞性 Bug）

#### Bug #1: 商品列表接口崩溃 — `no such column: p.sort`

- **严重程度**: P0 — 阻塞所有商品列表功能
- **文件**: `backend/src/models/product.js`，第 23 行
- **问题描述**: `Product.list()` 默认排序使用 `ORDER BY p.sort DESC, p.created_at DESC`，但 `products` 表不存在 `sort` 列
- **影响范围**: 
  - `GET /api/products` — 全部返回 500 错误
  - `GET /api/products?category_id=X` — 全部返回 500
  - `GET /api/products?sort=price_asc` — 正常（走不同排序路径）
  - `GET /api/admin/products` — 同样返回 500
  - `GET /api/admin/dashboard` — 间接影响（若仪表盘调用了商品列表）
- **实际响应**: `{ "code": 500, "data": null, "message": "no such column: p.sort" }`
- **修复方案**:
  ```javascript
  // product.js 第 23 行，改为:
  let orderBy = 'ORDER BY p.sales DESC, p.created_at DESC';
  // 或删除该默认排序，改用 sales 或 created_at
  // 或者为 products 表增加 sort 列: ALTER TABLE products ADD COLUMN sort INTEGER DEFAULT 0;
  ```

---

### 🟡 P1（重要 Bug）

#### Bug #2: express-validator 校验结果未检查 — 输入校验形同虚设

- **严重程度**: P1 — 所有带 `body()` 校验的路由均不生效
- **文件**: 共 10 个路由文件
  - `backend/src/routes/auth.js` (行 22-24, 68-71)
  - `backend/src/routes/cart.js` (行 28-31)
  - `backend/src/routes/orders.js` (行 24-28)
  - `backend/src/routes/addresses.js` (行 35-39)
  - `backend/src/routes/prescriptions.js` (行 22-24)
  - `backend/src/routes/admin/auth.js` (行 16-18)
  - `backend/src/routes/admin/products.js` (行 38-42, 60-62)
  - `backend/src/routes/admin/orders.js` (行 35-38)
  - `backend/src/routes/reminders.js` (行 24-26)
  - `backend/src/routes/reviews.js` (行 15-18)
- **问题描述**: 所有路由声明了 `body('xxx').notEmpty()` 等校验规则，但处理器函数中从未调用 `validationResult(req)` 来检查校验结果。express-validator 仅将校验错误写入 `req` 对象，**不会自动中断请求**。
- **复现**: `POST /api/auth/login` 发送 `{}` 返回 `{ code: 200 }`（应有校验错误）
- **实际影响**:
  - 登录无需 code
  - 处方上传无需图片
  - 创建地址无需姓名和电话（直接触发 SQLite NOT NULL 约束，返回原始错误 `NOT NULL constraint failed: user_addresses.phone`）
  - 创建订单无需地址 ID
- **修复方案**: 在**每个**使用 `body()` 的路由处理器中，在业务逻辑之前添加：
  ```javascript
  const { validationResult } = require('express-validator');
  
  router.post('/xxx', [...validators], (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.json(error(400, errors.array()[0].msg));
    }
    // ... 业务逻辑
  });
  ```
  **推荐**: 抽取为中间件：
  ```javascript
  // middleware/validate.js
  const { validationResult } = require('express-validator');
  module.exports = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ code: 400, data: null, message: errors.array()[0].msg });
    }
    next();
  };
  ```

#### Bug #3: 管理后台上传图片鉴权不匹配

- **严重程度**: P1 — 管理后台全部图片上传功能不可用
- **文件**: 
  - `backend/src/routes/upload.js` 第 13 行
  - `admin/src/api/index.js` 第 87-101 行
- **问题描述**: 后端上传路由使用 `authUser` 中间件（验证 `type === 'user'`），但管理前端的 `uploadAPI` 发送的是 admin token（`type === 'admin'`）。admin token 会被 `authUser` 拒绝，返回 403 "无权访问，请使用用户账号登录"。
- **修复方案**: 
  - **方案 A**（推荐）: 上传路由同时接受 user 和 admin token，编写一个 `authAny` 中间件
  - **方案 B**: 为 admin 创建独立的上传路由 `POST /api/admin/upload`
  - **方案 C**: 将 `authUser` 改为宽松认证，只验证 JWT 有效性而不限制 type

#### Bug #4: 服务器首次启动失败 — 目录创建顺序错误

- **严重程度**: P1 — 首次部署必然失败
- **文件**: `backend/src/server.js`
- **问题描述**: `db` 模块（第 5 行 `const db = require('./db')`）在目录创建代码（第 8-16 行）之前执行。better-sqlite3 v12 要求数据库文件所在的**目录必须存在**，否则抛出 `TypeError: Cannot open database because the directory does not exist`。
- **修复方案**: 将目录创建代码移到 `require('./db')` 之前：
  ```javascript
  // server.js — 目录创建必须放在所有模块引入之前
  const fs = require('fs');
  const path = require('path');
  
  ['data', 'uploads'].forEach(dir => {
    const p = path.resolve(__dirname, '..', dir);
    if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
  });
  
  // 然后再加载其他模块
  const app = require('./app');
  const config = require('./config');
  const db = require('./db');
  ```

---

### 🟢 P2（建议修复）

#### Bug #5: 地址创建缺少必填项返回原始 SQLite 错误

- **严重程度**: P2 — 用户体验差
- **文件**: `backend/src/routes/addresses.js` (与 Bug #2 相关)
- **问题**: 因校验未生效，插入触发的 SQLite `NOT NULL constraint failed: user_addresses.phone` 原始错误暴露给前端
- **修复**: 修复 Bug #2 后自动解决

#### 代码质量问题（非 Bug，但建议改进）

1. **购物车结算前端价格计算不一致** — `miniprogram/pages/checkout/index.js` 使用 `item.price || 0` 计算金额，但后端下单时使用 `member_price || price`。前端展示的金额可能高于实际扣款金额。
2. **checkout 页面静默吞异常** — `catch (e) { /* ignore */ }` 隐藏了所有加载失败的错误，用户看不到任何提示。
3. **取消订单优惠券恢复** — `Order.cancel()` 使用 `coupon_id`（模板ID）而非 `userCouponId`（实例ID）来恢复优惠券，依赖 `LIMIT 1` 兜底，不够精确。

---

## 三、测试通过的 API

以下 API 功能正常（在 `p.sort` Bug 被隔离后验证）：

| 类别 | API | 状态 |
|------|-----|------|
| 用户认证 | POST /api/auth/login（含code） | ✅ |
| 用户认证 | GET /api/auth/profile | ✅ |
| 用户认证 | PUT /api/auth/profile | ✅ |
| 用户认证 | 未登录拦截（401） | ✅ |
| 用户认证 | 无效token拦截（401） | ✅ |
| 分类 | GET /api/categories | ✅ 5一级+20二级 |
| 商品 | GET /api/products/:id | ✅ |
| 商品 | GET /api/products/search?q=布洛芬 | ✅ |
| 商品 | GET /api/products/:id/reviews | ✅ |
| 购物车 | POST /api/cart | ✅ |
| 购物车 | GET /api/cart | ✅ |
| 购物车 | PUT /api/cart/:id | ✅ |
| 购物车 | DELETE /api/cart/:id | ✅ |
| 购物车 | 未登录拦截 | ✅ |
| 地址 | POST /api/addresses | ✅ |
| 地址 | GET /api/addresses | ✅ |
| 地址 | GET /api/addresses/:id | ✅ |
| 地址 | PUT /api/addresses/:id/default | ✅ |
| 优惠券 | GET /api/coupons | ✅ |
| 优惠券 | POST /api/coupons/:id/receive | ✅ |
| 优惠券 | GET /api/coupons/mine | ✅ |
| 优惠券 | 重复领取拦截 | ✅ |
| 订单 | POST /api/orders | ✅ |
| 订单 | GET /api/orders | ✅ |
| 订单 | GET /api/orders/:id | ✅ |
| 订单 | PUT /api/orders/:id/pay | ✅ |
| 订单 | PUT /api/orders/:id/cancel | ✅ |
| 订单 | 库存扣减与恢复 | ✅ |
| 订单 | 购物车下单后清空 | ✅ |
| 管理后台 | POST /api/admin/auth/login | ✅ |
| 管理后台 | 错误密码拦截 | ✅ |
| 管理后台 | GET /api/admin/dashboard | ✅ |
| 管理后台 | 用户Token被admin接口拒绝 | ✅ |
| 管理后台 | GET /api/admin/users | ✅ |
| 管理后台 | GET /api/admin/orders | ✅ |
| 处方 | POST /api/prescriptions | ✅ |
| 处方 | GET /api/prescriptions | ✅ |
| Banner | GET /api/banners | ✅ |
| 安全 | SQL 注入防护 | ✅ 参数化查询 |
| 安全 | XSS 注入 | ✅ 不崩溃 |

---

## 四、代码安全检查

| 检查项 | 结果 | 说明 |
|--------|------|------|
| SQL 注入防护 | ✅ 通过 | 全部使用 `better-sqlite3` 参数化查询 |
| JWT 鉴权区分 user/admin | ✅ 通过 | `authUser` 检查 `type==='user'`，`authAdmin` 检查 `type==='admin'` |
| 订单事务 | ✅ 通过 | `Order.create()` 使用 `db.transaction()` |
| 库存扣减原子性 | ✅ 通过 | 使用 `WHERE stock >= ?` 条件更新 |
| 购物车唯一约束 | ✅ 通过 | 数据库层 `UNIQUE(user_id, product_id)` |
| 密码加密 | ✅ 通过 | bcryptjs hash |
| 统一响应格式 | ✅ 通过 | `{ code, data, message }` |
| 输入校验 | ❌ 不生效 | Bug #2 — validationResult 未调用 |
| 错误处理 | ⚠️ 部分 | 部分路由只有 try-catch，缺乏校验层 |

---

## 五、前端代码抽样审查

### 小程序 api.js (utils/api.js)
- ✅ Token 自动注入
- ✅ 401 自动清除 token
- ✅ 统一 BASE_URL 管理
- ✅ imageUrl 辅助函数

### 小程序购物车 (pages/cart/index.js)
- ✅ 选中/全选逻辑正确
- ✅ 价格计算使用原始值
- ⚠️ 图片解析使用 try-catch 但 catch 为空

### 小程序结算页 (pages/checkout/index.js)
- ✅ 地址选择逻辑
- ⚠️ 价格计算使用 `item.price` 而非 `member_price`，与后端不一致

### 管理后台 API (admin/src/api/index.js)
- ✅ Axios 拦截器自动注入 token
- ✅ 响应拦截器解包 `res.data`
- ✅ 401 自动跳转登录
- ❌ `uploadAPI` 使用 admin token 但后端要求 user token（Bug #3）

### 管理后台 商品编辑 (pages/ProductEdit.jsx)
- ✅ 表单校验（前端层）
- ✅ 图片上传/删除
- ⚠️ 分类树展示使用 flat map，二级菜单通过 `sx={{ pl: 4 }}` 缩进区分

---

## 六、总结与建议

### 测试结论
项目整体架构设计良好，数据库 Schema 设计合理，事务和鉴权实现正确。核心购物流程（登录 → 加购 → 下单 → 支付 → 取消）均可正常工作。

**但存在 4 个独立 Bug（1个P0 + 3个P1）需要修复后才能上线。**

### 修复优先级

1. **立即修复** — Bug #1（商品列表崩溃，影响核心功能）
2. **立即修复** — Bug #4（首次部署失败）
3. **高优修复** — Bug #2（全局输入校验失效，安全风险）
4. **高优修复** — Bug #3（管理后台图片上传不可用）

### 建议增强

1. **添加集成测试框架** — 建议引入 Jest + Supertest，将本报告的测试用例固化
2. **统一错误处理** — 当前 try-catch 模式不统一，建议增加 `express-async-errors` 或统一 async wrapper
3. **API 文档** — 建议使用 Swagger/OpenAPI 自动生成文档，便于前后端联调
4. **日志系统** — `console.error` 在生产环境不够，建议接入 winston 或 pino

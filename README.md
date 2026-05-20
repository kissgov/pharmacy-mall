# 药店网上商城 (Pharmacy Online Mall)

微信小程序 + Web管理后台 + Node.js后端 全栈药店电商系统。

## 技术栈

| 模块 | 技术 | 文件数 |
|------|------|--------|
| 后端 API | Node.js + Express + SQLite | 36 |
| 微信小程序 | 原生框架 | 68 |
| 管理后台 | Vite + React 18 + MUI 5 + Tailwind | 22 |

## 功能概览

### 小程序端 (14 页)
- 首页：Banner轮播 + 分类入口 + 热门推荐
- 分类：一级二级分类 + 商品网格
- 搜索：关键词搜索 + 历史记录
- 商品详情：图片轮播 + 用法禁忌 + 用户评价
- 购物车：全选/数量/结算
- 下单结算：地址选择 + 优惠券 + 模拟支付
- 订单管理：5状态流转
- 地址/处方/优惠券/用药提醒

### 管理后台 (13 页)
- 仪表盘：销售统计 + 趋势图
- 商品CRUD + 上下架
- 订单管理 + 发货
- 处方审核
- 用户/优惠券/Banner 管理

## 快速启动

```bash
# 1. 后端
cd backend && npm install && npm run dev
# → http://localhost:3001

# 2. 管理后台
cd admin && npm install && npm run dev
# → http://localhost:5173  管理员: admin / admin123

# 3. 小程序
# 微信开发者工具打开 miniprogram/ 目录
```

## 部署

- GitHub: https://github.com/kissgov/pharmacy-mall

### 微信云托管（API + 管理后台合一）
- API: https://pharmary-mall-api-239896-5-1309632689.sh.run.tcloudbase.com/api
- 管理后台: https://pharmary-mall-api-239896-5-1309632689.sh.run.tcloudbase.com
- 管理员: admin / admin123
- 分支 `master`，构建目录 `/`，端口 `3000`

### Docker 本地运行
```bash
docker build -t pharmacy-mall .
docker run -p 3000:3000 pharmacy-mall
# API:    http://localhost:3000/api
# 管理后台: http://localhost:3000
```

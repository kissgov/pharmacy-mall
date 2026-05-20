/**
 * API 路由汇总
 * 挂载所有子路由到 Express Router
 */
const { Router } = require('express');
const router = Router();

// 小程序端路由
router.use('/auth', require('./auth'));
router.use('/categories', require('./categories'));
router.use('/products', require('./products'));
router.use('/cart', require('./cart'));
router.use('/orders', require('./orders'));
router.use('/addresses', require('./addresses'));
router.use('/prescriptions', require('./prescriptions'));
router.use('/coupons', require('./coupons'));
router.use('/reviews', require('./reviews'));
router.use('/reminders', require('./reminders'));
router.use('/upload', require('./upload'));
router.use('/banners', require('./banners'));
router.use('/pay', require('./pay'));

// 管理后台路由
router.use('/admin', require('./admin'));

module.exports = router;

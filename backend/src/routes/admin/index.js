/**
 * 管理后台路由汇总
 * 所有路由均需 authAdmin 鉴权（除 /login）
 */
const { Router } = require('express');
const { authAdmin } = require('../../middleware/auth');

const router = Router();

// 登录路由（无需鉴权）
router.use('/auth', require('./auth'));

// 以下路由均需管理员鉴权
router.use(authAdmin);

router.use('/dashboard', require('./dashboard'));
router.use('/products', require('./products'));
router.use('/orders', require('./orders'));
router.use('/prescriptions', require('./prescriptions'));
router.use('/users', require('./users'));
router.use('/coupons', require('./coupons'));
router.use('/banners', require('./banners'));

module.exports = router;

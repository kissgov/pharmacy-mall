/**
 * 微信支付路由
 * POST /api/pay/unified   — 统一下单（小程序调用）
 * POST /api/pay/callback  — 支付结果回调（微信支付通知）
 */
const { Router } = require('express');
const { authUser } = require('../middleware/auth');
const pay = require('../utils/pay');
const pool = require('../db');
const { success, error } = require('../utils/response');

const router = Router();

/**
 * 统一下单
 * 小程序在创建订单后调用，获取支付参数并调起微信支付
 */
router.post('/unified', authUser, async (req, res) => {
  try {
    const { order_id } = req.body;
    if (!order_id) {
      return res.json(error(400, '缺少订单ID'));
    }

    // 查询订单
    const [rows] = await pool.execute(
      'SELECT * FROM orders WHERE id = ? AND user_id = ? AND status = ?',
      [order_id, req.user.userId, 'pending']
    );
    const order = rows[0];
    if (!order) {
      return res.json(error(404, '订单不存在或状态不可支付'));
    }

    // 调用微信支付统一下单
    const openid = req.headers['x-wx-openid'] || req.user.openid || '';
    const clientIp = req.headers['x-forwarded-for'] || req.ip || '127.0.0.1';
    const envId = req.headers['x-wx-env'] || '';
    const serviceName = req.headers['x-wx-service'] || 'pharmary-mall-api';

    const result = await pay.unifiedOrder({
      openid,
      clientIp,
      envId,
      serviceName,
      outTradeNo: order.order_no,
      body: '药店商城订单',
      totalFee: Math.round(order.pay_amount * 100), // 元转分
    });

    console.log('[支付] 统一下单结果:', JSON.stringify(result));

    // API 返回结构：{ errcode, errmsg, respdata: { return_code, result_code, payment } }
    const resp = result.respdata || result;
    if (resp.return_code === 'SUCCESS' && resp.result_code === 'SUCCESS') {
      // 直接透传 payment 对象给小程序 wx.requestPayment
      const payment = resp.payment || {};
      res.json(success({
        timeStamp: payment.timeStamp || '',
        nonceStr: payment.nonceStr || '',
        package: payment.package || '',
        signType: payment.signType || 'MD5',
        paySign: payment.paySign || '',
        order_no: order.order_no,
      }, '预下单成功'));
    } else {
      const errMsg = resp.return_msg || result.return_msg || result.errmsg || '支付预下单失败';
      res.json(error(500, errMsg));
    }
  } catch (err) {
    console.error('[支付] 异常:', err.message);
    res.json(error(500, '支付服务异常'));
  }
});

/**
 * 支付结果回调
 * 微信支付异步通知，更新订单状态
 */
router.post('/callback', async (req, res) => {
  try {
    console.log('[支付回调] headers:', JSON.stringify(req.headers));
    console.log('[支付回调] body:', JSON.stringify(req.body));

    const { out_trade_no, transaction_id, result_code } = req.body || {};

    if (!out_trade_no) {
      return res.send('success');
    }

    if (result_code === 'SUCCESS') {
      // 更新订单状态为已付款
      await pool.execute(
        `UPDATE orders SET status = 'paid', payment_method = 'wechat', paid_at = NOW(), updated_at = NOW()
         WHERE order_no = ? AND status = 'pending'`,
        [out_trade_no]
      );
      console.log(`[支付回调] 订单 ${out_trade_no} 支付成功, 微信交易号: ${transaction_id}`);
    } else {
      console.log(`[支付回调] 订单 ${out_trade_no} 支付失败: ${result_code}`);
    }

    res.send('success');
  } catch (err) {
    console.error('[支付回调] 异常:', err.message);
    res.send('success'); // 微信要求始终返回 success
  }
});

module.exports = router;

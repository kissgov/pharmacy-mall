/**
 * 微信支付路由（云托管免签名模式）
 *
 * 官方流程：https://developers.weixin.qq.com/miniprogram/dev/wxcloudservice/wxcloudrun/src/development/pay/
 *
 * ① JSAPI 下单（POST /api/pay/unified）
 * ② 获取 prepay_id
 * ③ 调起 wx.requestPayment
 * ④ 取消支付后可再次调起 wx.requestPayment（相同参数复用同一 prepay_id）
 * ⑤ 支付回调（POST /api/pay/callback）→ 更新订单状态
 */
const { Router } = require('express');
const { authUser } = require('../middleware/auth');
const pay = require('../utils/pay');
const pool = require('../db');
const { success, error } = require('../utils/response');

const router = Router();

/** ① JSAPI 下单：获取 prepay_id 和 wx.requestPayment 所需参数 */
router.post('/unified', authUser, async (req, res) => {
  try {
    const { order_id } = req.body;
    if (!order_id) return res.json(error(400, '缺少订单ID'));

    const [rows] = await pool.execute(
      'SELECT * FROM orders WHERE id = ? AND user_id = ? AND status = ?',
      [order_id, req.user.userId, 'pending']
    );
    const order = rows[0];
    if (!order) return res.json(error(404, '订单不存在或状态不可支付'));

    const openid = req.headers['x-wx-openid'] || req.user.openid || '';
    const clientIp = (req.headers['x-forwarded-for'] || req.ip || '127.0.0.1').split(',')[0].trim();
    const envId = req.headers['x-wx-env'] || '';
    const serviceName = req.headers['x-wx-service'] || 'pharmary-mall-api';

    const totalFee = Math.round(Number(order.pay_amount || 0) * 100);
    if (!totalFee || totalFee <= 0) {
      return res.json(error(400, '订单金额无效'));
    }

    console.log('[支付] 下单:', { outTradeNo: order.order_no, totalFee });

    const result = await pay.unifiedOrder({
      openid,
      clientIp,
      envId,
      serviceName,
      outTradeNo: order.order_no,
      body: '药店商城订单',
      totalFee,
    });

    console.log('[支付] 结果:', JSON.stringify(result));

    // 提取 payment 参数（云托管返回格式）
    const respdata = result.respdata || {};
    const payment = result.payment || respdata.payment;
    const returnCode = respdata.return_code || result.return_code || '';
    const resultCode = respdata.result_code || result.result_code || '';

    // ② 成功 → 返回 wx.requestPayment 所需参数
    if (returnCode === 'SUCCESS' && resultCode === 'SUCCESS' && payment && payment.package && payment.package !== 'prepay_id=') {
      console.log('[支付] 下单成功, prepay_id:', payment.package);

      const payParams = {
        timeStamp: payment.timeStamp || '',
        nonceStr: payment.nonceStr || '',
        package: payment.package,
        signType: payment.signType || 'MD5',
        paySign: payment.paySign || '',
        savedAt: Date.now(),  // 用于前端判断 2 小时过期
      };

      // 保存新 prepay_id，覆盖旧值（prepay_id 有效期 2 小时）
      const prepayId = payment.package.replace('prepay_id=', '');
      await pool.execute(
        'UPDATE orders SET prepay_id = ?, pay_params = ? WHERE id = ?',
        [prepayId, JSON.stringify(payParams), order_id]
      );

      return res.json(success({ ...payParams, order_no: order.order_no }, '预下单成功'));
    }

    // 失败
    const errMsg = respdata.err_code_des || respdata.return_msg || result.errmsg || '支付预下单失败';
    console.error('[支付] 失败:', errMsg);
    res.json(error(500, errMsg));
  } catch (err) {
    console.error('[支付] 异常:', err.message);
    res.json(error(500, '支付服务异常'));
  }
});

/** ⑤ 支付结果回调：微信支付异步通知 */
router.post('/callback', async (req, res) => {
  try {
    console.log('[支付回调] body:', JSON.stringify(req.body));

    const { out_trade_no, transaction_id, result_code } = req.body || {};
    if (!out_trade_no) return res.send('success');

    if (result_code === 'SUCCESS') {
      await pool.execute(
        `UPDATE orders SET status = 'paid', payment_method = 'wechat', paid_at = NOW(), updated_at = NOW()
         WHERE order_no = ? AND status = 'pending'`,
        [out_trade_no]
      );
      console.log(`[支付回调] ${out_trade_no} 支付成功, 交易号: ${transaction_id}`);
    }
    res.send('success');
  } catch (err) {
    console.error('[支付回调] 异常:', err.message);
    res.send('success');
  }
});

module.exports = router;

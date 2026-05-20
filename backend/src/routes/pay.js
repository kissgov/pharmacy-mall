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

    // 金额校验（元 → 分）
    const totalFee = Math.round(Number(order.pay_amount || 0) * 100);
    if (!totalFee || totalFee <= 0) {
      console.error('[支付] 金额无效:', { order_id, pay_amount: order.pay_amount, totalFee });
      return res.json(error(400, '订单金额无效'));
    }

    console.log('[支付] 统一下单请求:', { outTradeNo: order.order_no, totalFee, openid: openid.slice(0, 10) + '...' });

    // 订单号重复时：先关闭微信侧旧订单，再用原 order_no 重试
    let result;
    let orderNo = order.order_no;
    let retry = 0;

    while (retry < 3) {
      result = await pay.unifiedOrder({
        openid,
        clientIp,
        envId,
        serviceName,
        outTradeNo: orderNo,
        body: '药店商城订单',
        totalFee,
      });

      console.log('[支付] 统一下单结果:', JSON.stringify(result));

      const respdata = result.respdata || {};
      if (respdata.result_code === 'SUCCESS') break;

      // 订单号重复 → 先关闭微信侧旧订单，再用原号重试
      if (respdata.err_code === 'INVALID_REQUEST' && (respdata.err_code_des || '').includes('订单号重复')) {
        console.log('[支付] 订单号重复，先关闭微信侧旧订单:', orderNo);
        await pay.closeOrder(orderNo);
        retry++;
        continue;
      }

      break; // 其他错误直接退出
    }

    // 兼容两种返回格式
    const payment = result.payment || (result.respdata && result.respdata.payment);
    const respdata = result.respdata || {};
    const returnCode = respdata.return_code || result.return_code || '';
    const resultCode = respdata.result_code || result.result_code || '';

    // 只有两阶段都 SUCCESS 且 prepay_id 非空才算成功
    if (returnCode === 'SUCCESS' && resultCode === 'SUCCESS' && payment && payment.package && payment.package !== 'prepay_id=') {
      res.json(success({
        timeStamp: payment.timeStamp || '',
        nonceStr: payment.nonceStr || '',
        package: payment.package,
        signType: payment.signType || 'MD5',
        paySign: payment.paySign || '',
        order_no: order.order_no,
      }, '预下单成功'));
    } else {
      const errMsg = respdata.err_code_des || respdata.return_msg || result.errmsg || '支付预下单失败';
      console.error('[支付] 预下单失败:', errMsg);

      // 订单号重复：可能上一次支付已成功，检查订单状态
      if (respdata.err_code === 'INVALID_REQUEST' && errMsg.includes('订单号重复')) {
        const [latestRows] = await pool.execute('SELECT * FROM orders WHERE id = ?', [order_id]);
        if (latestRows[0] && latestRows[0].status === 'paid') {
          return res.json(error(400, '该订单已支付'));
        }
      }
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
    res.send('success');
  }
});

/** 关闭微信侧支付订单（释放 order_no 供重试） */
router.post('/close', authUser, async (req, res) => {
  try {
    const { order_id } = req.body;
    if (!order_id) return res.json(error(400, '缺少订单ID'));

    const [rows] = await pool.execute('SELECT order_no, status FROM orders WHERE id = ? AND user_id = ?', [order_id, req.user.userId]);
    const order = rows[0];
    if (!order) return res.json(error(404, '订单不存在'));
    if (order.status !== 'pending') return res.json(error(400, '当前状态不可关闭支付'));

    console.log('[支付] 关闭微信侧订单:', order.order_no);
    const result = await pay.closeOrder(order.order_no);
    console.log('[支付] 关闭结果:', JSON.stringify(result));

    res.json(success(null, '支付已关闭，可重新发起'));
  } catch (err) {
    console.error('[支付] 关闭异常:', err.message);
    res.json(error(500, '关闭失败'));
  }
});

module.exports = router;

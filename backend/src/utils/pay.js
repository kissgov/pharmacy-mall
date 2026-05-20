/**
 * 微信支付模块（云托管免签名模式）
 * 通过云托管开放接口服务调用微信支付 API，无需手动处理签名
 * 参考：https://developers.weixin.qq.com/miniprogram/dev/wxcloudservice/wxcloudrun/src/development/pay/
 */

const http = require('http');

const MCH_ID = process.env.MCH_ID || '1512811311';

/**
 * 调用微信支付内部 API（云托管免签名）
 * @param {string} action - unifiedorder / queryorder / closeorder / refund / queryrefund
 * @param {object} paybody - 支付参数
 */
function callPay(action, paybody) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify(paybody);
    const req = http.request({
      hostname: 'api.weixin.qq.com',
      path: `/_/pay/${action}`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
      },
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch (_) { resolve({ raw: data }); }
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

/**
 * 统一下单
 * @param {object} opts
 * @param {string} opts.openid - 用户 openid（来自 x-wx-openid 头）
 * @param {string} opts.clientIp - 客户端 IP（来自 x-forwarded-for）
 * @param {string} opts.envId - 云托管环境 ID（来自 x-wx-env）
 * @param {string} opts.serviceName - 服务名（来自 x-wx-service）
 * @param {string} opts.outTradeNo - 商户订单号
 * @param {string} opts.body - 商品描述
 * @param {number} opts.totalFee - 金额（分）
 */
async function unifiedOrder(opts) {
  const payreq = {
    body: opts.body || '药店商城订单',
    out_trade_no: opts.outTradeNo,
    sub_mch_id: MCH_ID,
    total_fee: opts.totalFee,
    openid: opts.openid,
    spbill_create_ip: opts.clientIp || '127.0.0.1',
    env_id: opts.envId,
    callback_type: 2, // 云托管服务接收回调
    container: {
      service: opts.serviceName,
      path: '/api/pay/callback', // 支付回调路径
    },
  };
  return callPay('unifiedorder', payreq);
}

/**
 * 查询订单
 */
async function queryOrder(outTradeNo) {
  return callPay('queryorder', {
    out_trade_no: outTradeNo,
    sub_mch_id: MCH_ID,
  });
}

/**
 * 关闭订单
 */
async function closeOrder(outTradeNo) {
  return callPay('closeorder', {
    out_trade_no: outTradeNo,
    sub_mch_id: MCH_ID,
  });
}

/**
 * 申请退款
 */
async function refund(opts) {
  return callPay('refund', {
    body: opts.body || '退款',
    out_trade_no: opts.outTradeNo,
    out_refund_no: opts.outRefundNo,
    sub_mch_id: MCH_ID,
    total_fee: opts.totalFee,
    refund_fee: opts.refundFee,
    refund_desc: opts.refundDesc || '订单退款',
    env_id: opts.envId,
    callback_type: 2,
    container: {
      service: opts.serviceName,
      path: '/api/pay/callback',
    },
  });
}

module.exports = { unifiedOrder, queryOrder, closeOrder, refund, MCH_ID };

const api = require('../../utils/api');
const { formatPrice, formatDate, getOrderStatusText, getOrderStatusColor } = require('../../utils/util');

Page({
  data: {
    order: null,
    statusSteps: ['pending', 'paid', 'shipped', 'completed'],
    currentStep: 0,
  },

  onLoad(options) {
    const id = parseInt(options.id, 10);
    if (id) this.loadOrder(id);
  },

  loadOrder(id) {
    api.get(`/orders/${id}`).then((order) => {
      const currentStep = this.data.statusSteps.indexOf(order.status);
      this.setData({
        order: {
          ...order,
          total_amount: formatPrice(order.total_amount),
          pay_amount: formatPrice(order.pay_amount),
          discount_amount: formatPrice(order.discount_amount),
          created_at: formatDate(order.created_at),
          statusText: getOrderStatusText(order.status),
          statusColor: getOrderStatusColor(order.status),
        },
        currentStep: Math.max(0, currentStep),
      });
    });
  },

  onPay() {
    const { order } = this.data;
    const that = this;

    // 解析已存的支付参数
    let savedParams = null;
    try {
      if (order.pay_params) {
        savedParams = typeof order.pay_params === 'string'
          ? JSON.parse(order.pay_params) : order.pay_params;
      }
    } catch (_) {}

    const doPay = (params) => {
      wx.requestPayment({
        timeStamp: params.timeStamp,
        nonceStr: params.nonceStr,
        package: params.package,
        signType: params.signType || 'MD5',
        paySign: params.paySign,
        success() {
          wx.showToast({ title: '支付成功', icon: 'success' });
          that.loadOrder(order.id);
        },
        fail: () => {},
      });
    };

    // 已存 prepay_id 且未过期（2小时）→ 直接复用
    if (savedParams && savedParams.package && savedParams.package !== 'prepay_id=' && savedParams.savedAt) {
      const ageMs = Date.now() - savedParams.savedAt;
      if (ageMs < 2 * 60 * 60 * 1000) {
        return doPay(savedParams);
      }
    }

    // 无已存参数或已过期 → 重新下单
    api.post('/pay/unified', { order_id: order.id }).then(doPay).catch((err) => {
      wx.showToast({ title: err.message || '支付失败', icon: 'none' });
    });
  },

  onCancel() {
    const { id } = this.data.order;
    wx.showModal({
      title: '取消订单',
      content: '确定取消？',
      success: (res) => {
        if (res.confirm) {
          api.put(`/orders/${id}/cancel`).then(() => {
            wx.showToast({ title: '已取消', icon: 'success' });
            this.loadOrder(id);
          });
        }
      },
    });
  },

  onConfirm() {
    const { id } = this.data.order;
    api.put(`/orders/${id}/confirm`).then(() => {
      wx.showToast({ title: '已确认收货', icon: 'success' });
      this.loadOrder(id);
    });
  },

  onCopyOrderNo() {
    wx.setClipboardData({ data: this.data.order.order_no });
    wx.showToast({ title: '已复制', icon: 'success' });
  },
});

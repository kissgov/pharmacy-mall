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
    const { id } = this.data.order;
    api.put(`/orders/${id}/pay`).then(() => {
      wx.showToast({ title: '支付成功', icon: 'success' });
      this.loadOrder(id);
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

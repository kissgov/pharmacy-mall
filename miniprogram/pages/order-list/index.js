const api = require('../../utils/api');
const { formatPrice, formatDate, getOrderStatusText, getOrderStatusColor } = require('../../utils/util');

Page({
  data: {
    tabs: [
      { key: '', label: '全部' },
      { key: 'pending', label: '待付款' },
      { key: 'paid', label: '已付款' },
      { key: 'shipped', label: '已发货' },
      { key: 'completed', label: '已完成' },
    ],
    activeTab: 0,
    orders: [],
    page: 1,
    hasMore: true,
    loading: true,
  },

  onLoad() {
    this.loadOrders();
  },

  onPullDownRefresh() {
    this.setData({ page: 1, orders: [] });
    this.loadOrders().finally(() => wx.stopPullDownRefresh());
  },

  onReachBottom() {
    if (this.data.hasMore) this.loadOrders();
  },

  loadOrders() {
    const { activeTab, tabs, page, orders: oldOrders } = this.data;
    const status = tabs[activeTab].key;
    this.setData({ loading: true });

    return api.get('/orders', { status: status || undefined, page, page_size: 20 }).then((data) => {
      const list = (data.list || []).map((o) => ({
        ...o,
        total_amount: formatPrice(o.total_amount),
        pay_amount: formatPrice(o.pay_amount),
        created_at: formatDate(o.created_at),
        statusText: getOrderStatusText(o.status),
        statusColor: getOrderStatusColor(o.status),
      }));
      const orders = page === 1 ? list : [...oldOrders, ...list];
      this.setData({
        orders,
        hasMore: list.length >= 20,
        page: page + 1,
        loading: false,
      });
    }).catch(() => {
      this.setData({ loading: false });
    });
  },

  onTabTap(e) {
    const { index } = e.currentTarget.dataset;
    if (index === this.data.activeTab) return;
    this.setData({ activeTab: index, page: 1, orders: [], hasMore: true }, () => {
      this.loadOrders();
    });
  },

  onOrderDetail(e) {
    const { id } = e.currentTarget.dataset;
    wx.navigateTo({ url: `/pages/order-detail/index?id=${id}` });
  },

  onPay(e) {
    const { id } = e.currentTarget.dataset;
    const that = this;

    const doPay = (params) => {
      wx.requestPayment({
        timeStamp: params.timeStamp,
        nonceStr: params.nonceStr,
        package: params.package,
        signType: params.signType || 'MD5',
        paySign: params.paySign,
        success() {
          wx.showToast({ title: '支付成功', icon: 'success' });
          that.loadOrders();
        },
        fail: () => {},
      });
    };

    // 查找订单的已存支付参数
    const order = this.data.orders.find(o => o.id === id);
    let savedParams = null;
    try {
      if (order && order.pay_params) {
        savedParams = typeof order.pay_params === 'string'
          ? JSON.parse(order.pay_params) : order.pay_params;
      }
    } catch (_) {}

    // 已存 prepay_id 且未过期（2小时）→ 直接复用
    if (savedParams && savedParams.package && savedParams.package !== 'prepay_id=' && savedParams.savedAt) {
      const ageMs = Date.now() - savedParams.savedAt;
      if (ageMs < 2 * 60 * 60 * 1000) {
        return doPay(savedParams);
      }
    }

    // 无已存参数或已过期 → 重新下单
    api.post('/pay/unified', { order_id: id }).then(doPay).catch((err) => {
      wx.showToast({ title: err.message || '支付失败', icon: 'none' });
    });
  },

  onCancel(e) {
    const { id } = e.currentTarget.dataset;
    wx.showModal({
      title: '取消订单',
      content: '确定要取消该订单吗？',
      success: (res) => {
        if (res.confirm) {
          api.put(`/orders/${id}/cancel`).then(() => {
            wx.showToast({ title: '已取消', icon: 'success' });
            this.loadOrders();
          });
        }
      },
    });
  },

  onConfirm(e) {
    const { id } = e.currentTarget.dataset;
    api.put(`/orders/${id}/confirm`).then(() => {
      wx.showToast({ title: '已确认收货', icon: 'success' });
      this.loadOrders();
    });
  },
});

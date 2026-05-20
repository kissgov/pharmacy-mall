const api = require('../../utils/api');
const { formatPrice } = require('../../utils/util');

Page({
  data: {
    items: [],
    address: null,
    couponText: '暂无可用优惠券',
    selectedCoupon: null,
    totalAmount: 0,
    discountAmount: 0,
    freight: 0,
    payAmount: 0,
    remark: '',
    cartIds: [],
    submitting: false,
  },

  onLoad(options) {
    const cartIds = options.cartIds || '';
    this.setData({ cartIds });
    this.loadData(cartIds);
  },

  async loadData(cartIds) {
    // 加载购物车数据
    try {
      const cartItems = await api.get('/cart');
      const ids = cartIds.split(',').map(Number);
      const selected = cartItems.filter((i) => ids.includes(i.id));
      const items = selected.map((item) => ({
        ...item,
        price: formatPrice(item.price || 0),
        subtotal: formatPrice((item.price || 0) * item.quantity),
        images: item.product_images ? (typeof item.product_images === 'string' ? JSON.parse(item.product_images) : item.product_images) : [],
      }));
      // 预处理图片
      items.forEach((it) => {
        it.image = (it.images && it.images[0]) || '';
      });

      const totalAmount = selected.reduce((s, i) => s + (i.price || 0) * i.quantity, 0);
      this.setData({ items, totalAmount: formatPrice(totalAmount) });
      this.calcPayAmount();
    } catch (e) { /* ignore */ }

    // 加载默认地址
    try {
      const addresses = await api.get('/addresses');
      const addr = addresses.find((a) => a.is_default) || addresses[0] || null;
      this.setData({ address: addr });
    } catch (e) { /* ignore */ }

    // 加载可用优惠券
    try {
      const coupons = await api.get('/coupons/mine', { status: 'unused' });
      if (coupons && coupons.length > 0) {
        const c = coupons[0];
        this.setData({ couponText: `${c.name}(满${c.min_amount}减${c.value})`, selectedCoupon: c });
      }
    } catch (e) { /* ignore */ }
  },

  calcPayAmount() {
    const total = parseFloat(this.data.totalAmount.replace('¥', '')) || 0;
    const discount = this.data.discountAmount;
    const freight = this.data.freight;
    const payAmount = total - discount + freight;
    this.setData({ payAmount: formatPrice(Math.max(0, payAmount)) });
  },

  onSelectAddress() {
    wx.navigateTo({ url: '/pages/address-list/index?select=true' });
  },

  onSelectCoupon() {
    wx.navigateTo({ url: '/pages/coupons/index?select=true' });
  },

  onSubmit() {
    if (!this.data.address) {
      wx.showToast({ title: '请选择收货地址', icon: 'none' });
      return;
    }
    if (this.data.items.length === 0) {
      wx.showToast({ title: '请选择商品', icon: 'none' });
      return;
    }

    this.setData({ submitting: true });

    const cartItemIds = this.data.cartIds.split(',').map(Number);
    const data = {
      address_id: this.data.address.id,
      cart_item_ids: cartItemIds,
    };
    if (this.data.selectedCoupon) {
      data.coupon_id = this.data.selectedCoupon.coupon_id;
    }

    api.post('/orders', data).then((order) => {
      // 调起微信支付
      api.post('/pay/unified', { order_id: order.id }).then((payParams) => {
        wx.requestPayment({
          timeStamp: payParams.timeStamp,
          nonceStr: payParams.nonceStr,
          package: payParams.package,
          signType: payParams.signType || 'MD5',
          paySign: payParams.paySign,
          success() {
            wx.showToast({ title: '支付成功', icon: 'success' });
            setTimeout(() => {
              wx.redirectTo({ url: `/pages/order-detail/index?id=${order.id}` });
            }, 1000);
          },
          fail: () => {
            // 用户取消支付 → 关闭微信侧订单，释放 order_no，可重新发起
            api.post('/pay/close', { order_id: order.id }).finally(() => {
              this.setData({ submitting: false });
            });
          },
        });
      }).catch((err) => {
        wx.showToast({ title: err.message || '支付失败', icon: 'none' });
      }).finally(() => {
        this.setData({ submitting: false });
      });
    }).catch((err) => {
      this.setData({ submitting: false });
      wx.showToast({ title: err.message || '下单失败', icon: 'none' });
    });
  },
});

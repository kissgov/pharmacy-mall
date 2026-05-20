const api = require('../../utils/api');
const { ensureLogin } = require('../../utils/auth');

Component({
  properties: {
    product: {
      type: Object,
      value: {},
    },
  },

  methods: {
    onTap() {
      const { id } = this.data.product;
      if (id) {
        wx.navigateTo({ url: `/pages/product-detail/index?id=${id}` });
      }
    },

    onAddCart(e) {
      e.stopPropagation();
      const { id } = this.data.product;
      if (!id) return;

      ensureLogin().then(() => {
        api.post('/cart', { product_id: id, quantity: 1 })
          .then(() => {
            wx.showToast({ title: '已加入购物车', icon: 'success', duration: 1200 });
          })
          .catch((err) => {
            wx.showToast({ title: err.message || '操作失败', icon: 'none' });
          });
      });
    },
  },
});

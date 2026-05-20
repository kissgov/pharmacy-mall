const api = require('../../utils/api');
const { formatPrice, formatDate } = require('../../utils/util');
const { ensureLogin } = require('../../utils/auth');

Page({
  data: {
    product: null,
    images: [],
    currentImageIndex: 0,
    reviews: [],
    avgRating: 0,
    reviewCount: 0,
    quantity: 1,
    showQtyPopup: false,
    actionType: '', // 'cart' | 'buy'
  },

  onLoad(options) {
    const id = parseInt(options.id, 10);
    if (id) {
      this.loadProduct(id);
      this.loadReviews(id);
    }
  },

  loadProduct(id) {
    api.get(`/products/${id}`).then((product) => {
      const images = product.images ? JSON.parse(product.images) : [];
      this.setData({
        product: {
          ...product,
          price: formatPrice(product.price),
          member_price: product.member_price ? formatPrice(product.member_price) : null,
        },
        images,
        avgRating: product.avg_rating || 0,
        reviewCount: product.review_count || 0,
      });
    }).catch(() => {
      wx.showToast({ title: '商品不存在', icon: 'none' });
    });
  },

  loadReviews(id) {
    api.get(`/products/${id}/reviews`, { page_size: 5 }).then((data) => {
      this.setData({
        reviews: (data.list || []).map((r) => ({
          ...r,
          created_at: formatDate(r.created_at),
        })),
      });
    }).catch(() => {});
  },

  onSwiperChange(e) {
    this.setData({ currentImageIndex: e.detail.current });
  },

  onPreviewImage(e) {
    const { index } = e.currentTarget.dataset;
    wx.previewImage({ current: this.data.images[index], urls: this.data.images });
  },

  /** 显示数量选择 */
  onAction(e) {
    const { type } = e.currentTarget.dataset;
    this.setData({ showQtyPopup: true, actionType: type, quantity: 1 });
  },

  onQtyMinus() {
    if (this.data.quantity <= 1) return;
    this.setData({ quantity: this.data.quantity - 1 });
  },

  onQtyPlus() {
    const max = this.data.product ? this.data.product.stock : 99;
    if (this.data.quantity >= max) return;
    this.setData({ quantity: this.data.quantity + 1 });
  },

  onClosePopup() {
    this.setData({ showQtyPopup: false });
  },

  /** 确认加入购物车 */
  onConfirmAction() {
    this.setData({ showQtyPopup: false });
    const { product, quantity, actionType } = this.data;
    if (!product) return;

    ensureLogin().then(() => {
      api.post('/cart', { product_id: product.id, quantity }).then(() => {
        if (actionType === 'buy') {
          wx.navigateTo({ url: `/pages/checkout/index?cartIds=${product.id}_${quantity}_direct` });
        } else {
          wx.showToast({ title: '已加入购物车', icon: 'success' });
        }
      }).catch((err) => {
        wx.showToast({ title: err.message || '操作失败', icon: 'none' });
      });
    });
  },

  /** Tab 切换 */
  onTabTap(e) {
    // 评价Tab已经在load时加载，这里只是UI切换
  },
});

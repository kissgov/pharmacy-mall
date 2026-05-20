const api = require('../../utils/api');
const { formatPrice } = require('../../utils/util');

Page({
  data: {
    banners: [],
    categories: [],
    hotProducts: [],
    loading: true,
  },

  onLoad() {
    this.loadData();
  },

  onShow() {
    if (this.data.loading) return;
    this.loadHotProducts();
  },

  onPullDownRefresh() {
    this.loadData().finally(() => wx.stopPullDownRefresh());
  },

  loadData() {
    this.setData({ loading: true });
    return Promise.all([
      this.loadBanners(),
      this.loadCategories(),
      this.loadHotProducts(),
    ]).finally(() => this.setData({ loading: false }));
  },

  loadBanners() {
    return api.get('/banners?status=active').then((banners) => {
      this.setData({ banners });
    }).catch(() => {});
  },

  loadCategories() {
    return api.get('/categories').then((categories) => {
      // 取前8个一级分类
      this.setData({ categories: categories.slice(0, 8) });
    }).catch(() => {});
  },

  loadHotProducts() {
    return api.get('/products', { sort: 'sales', page_size: 10 }).then((data) => {
      const hotProducts = (data.list || []).map((p) => ({
        ...p,
        price: formatPrice(p.price),
        images: p.images ? JSON.parse(p.images) : [],
      }));
      this.setData({ hotProducts });
    }).catch(() => {});
  },

  onSearch() {
    wx.navigateTo({ url: '/pages/search/index' });
  },

  onCategoryTap(e) {
    wx.switchTab({ url: '/pages/category/index' });
  },

  onBannerTap(e) {
    const { link } = e.currentTarget.dataset;
    if (link) {
      // 可以是跳转商品详情或活动页
      if (link.startsWith('/pages/')) {
        wx.navigateTo({ url: link });
      }
    }
  },
});

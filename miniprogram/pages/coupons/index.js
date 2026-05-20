const api = require('../../utils/api');
const { formatDateOnly } = require('../../utils/util');

Page({
  data: {
    activeTab: 0, // 0-可领取 1-已领取
    availableCoupons: [],
    myCoupons: [],
  },

  onLoad(options) {
    if (options.select) {
      // 从checkout来选择优惠券的场景
      this.setData({ selectMode: true });
    }
  },

  onShow() {
    this.loadAvailable();
    this.loadMy();
  },

  loadAvailable() {
    api.get('/coupons').then((list) => {
      this.setData({
        availableCoupons: list.map((c) => ({
          ...c,
          valid_from: formatDateOnly(c.valid_from),
          valid_to: formatDateOnly(c.valid_to),
        })),
      });
    }).catch(() => {});
  },

  loadMy() {
    api.get('/coupons/mine').then((list) => {
      this.setData({
        myCoupons: list.map((c) => ({
          ...c,
          valid_from: formatDateOnly(c.valid_from),
          valid_to: formatDateOnly(c.valid_to),
        })),
      });
    }).catch(() => {});
  },

  onTabTap(e) {
    const { index } = e.currentTarget.dataset;
    this.setData({ activeTab: index });
  },

  onReceive(e) {
    const { id } = e.currentTarget.dataset;
    api.post(`/coupons/${id}/receive`).then(() => {
      wx.showToast({ title: '领取成功', icon: 'success' });
      this.loadAvailable();
      this.loadMy();
    }).catch((err) => {
      wx.showToast({ title: err.message || '领取失败', icon: 'none' });
    });
  },

  onSelect(e) {
    if (!this.data.selectMode) return;
    const { index } = e.currentTarget.dataset;
    const coupon = this.data.myCoupons[index];
    const pages = getCurrentPages();
    const prev = pages[pages.length - 2];
    if (prev) {
      prev.setData({ selectedCoupon: coupon, couponText: `${coupon.name}(满${coupon.min_amount}减${coupon.value})` });
    }
    wx.navigateBack();
  },
});

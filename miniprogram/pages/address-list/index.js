const api = require('../../utils/api');

Page({
  data: {
    addresses: [],
    selectMode: false,
  },

  onLoad(options) {
    this.setData({ selectMode: options.select === 'true' });
  },

  onShow() {
    api.get('/addresses').then((addresses) => {
      this.setData({ addresses });
    });
  },

  onAdd() {
    wx.navigateTo({ url: '/pages/address-edit/index' });
  },

  onEdit(e) {
    const { id } = e.currentTarget.dataset;
    wx.navigateTo({ url: `/pages/address-edit/index?id=${id}` });
  },

  onDelete(e) {
    const { id } = e.currentTarget.dataset;
    wx.showModal({
      title: '确认删除',
      content: '确定要删除这个地址吗？',
      success: (res) => {
        if (res.confirm) {
          api.del(`/addresses/${id}`).then(() => {
            wx.showToast({ title: '已删除', icon: 'success' });
            this.onShow();
          });
        }
      },
    });
  },

  onSetDefault(e) {
    const { id } = e.currentTarget.dataset;
    api.put(`/addresses/${id}/default`).then(() => {
      this.onShow();
    });
  },

  onSelect(e) {
    if (!this.data.selectMode) return;
    const { index } = e.currentTarget.dataset;
    const addr = this.data.addresses[index];
    // 通过事件通道传回
    const pages = getCurrentPages();
    const prev = pages[pages.length - 2];
    if (prev) {
      prev.setData({ address: addr });
    }
    wx.navigateBack();
  },
});

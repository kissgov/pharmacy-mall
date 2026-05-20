const api = require('../../utils/api');
const { checkLogin, updateProfile } = require('../../utils/auth');

Page({
  data: {
    userInfo: {},
    orderCounts: { pending: 0, paid: 0, shipped: 0, completed: 0 },
  },

  onShow() {
    checkLogin().then((user) => {
      this.setData({ userInfo: user || {} });
      this.loadOrderCounts();
    }).catch(() => {
      this.setData({ userInfo: {} });
    });
  },

  /** 选择头像（base64 方式，走 callContainer，不走 uploadFile） */
  onChooseAvatar(e) {
    const { avatarUrl } = e.detail;
    wx.showLoading({ title: '上传中' });

    const fs = wx.getFileSystemManager();
    fs.readFile({
      filePath: avatarUrl,
      encoding: 'base64',
      success: (res) => {
        api.post('/upload/avatar-base64', {
          file: res.data,
          filename: 'avatar_' + Date.now() + '.png',
        }).then((data) => {
          wx.hideLoading();
          if (data && data.url) {
            updateProfile({ avatar_url: data.url }).then((user) => {
              this.setData({ userInfo: user });
              wx.showToast({ title: '头像已更新', icon: 'success' });
            }).catch(() => {
              wx.showToast({ title: '更新失败', icon: 'none' });
            });
          } else {
            wx.showToast({ title: '上传失败', icon: 'none' });
          }
        }).catch(() => {
          wx.hideLoading();
          wx.showToast({ title: '上传失败', icon: 'none' });
        });
      },
      fail: () => {
        wx.hideLoading();
        wx.showToast({ title: '读取文件失败', icon: 'none' });
      },
    });
  },

  /** 昵称修改 */
  onNicknameBlur(e) {
    const nickname = e.detail.value;
    if (!nickname || nickname === this.data.userInfo.nickname) return;
    updateProfile({ nickname }).then((user) => {
      this.setData({ userInfo: user });
    }).catch(() => {
      wx.showToast({ title: '更新失败', icon: 'none' });
    });
  },

  loadOrderCounts() {
    ['pending', 'paid', 'shipped', 'completed'].forEach((status) => {
      api.get('/orders', { status, page_size: 1 }).then((data) => {
        this.setData({ [`orderCounts.${status}`]: data.total || 0 });
      }).catch(() => {});
    });
  },

  onOrderTap(e) {
    const { status } = e.currentTarget.dataset;
    wx.navigateTo({ url: `/pages/order-list/index?status=${status}` });
  },

  onNavTo(e) {
    const { url } = e.currentTarget.dataset;
    wx.navigateTo({ url });
  },

  onContact() {
    // button open-type="contact" 自动处理
  },

  onClearCache() {
    wx.showModal({
      title: '清除缓存',
      content: '确定清除本地缓存吗？',
      success: (res) => {
        if (res.confirm) {
          wx.clearStorageSync();
          wx.showToast({ title: '已清除', icon: 'success' });
        }
      },
    });
  },

  onAbout() {
    wx.showModal({
      title: '关于我们',
      content: '药房商城 v1.0.0\n在线购药，方便快捷',
      showCancel: false,
    });
  },
});

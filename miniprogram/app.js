// 药店网上商城小程序入口
const { checkLogin } = require('./utils/auth');

App({
  onLaunch() {
    // 自动检查登录态并同步到 globalData
    checkLogin().then((user) => {
      if (user) {
        console.log('登录态有效，用户:', user.nickname);
      } else {
        console.log('未登录或登录态已过期');
      }
    }).catch(() => {
      console.log('检查登录态失败');
    });
  },

  globalData: {
    token: null,
    userInfo: null,
    baseUrl: 'http://localhost:3001',
  },
});

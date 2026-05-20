/**
 * 登录逻辑
 * 管理微信登录流程与 token 持久化
 */

const api = require('./api');

/**
 * 微信登录
 * 使用 wx.login 获取 code 后调后端换取 token
 */
function login() {
  return new Promise((resolve, reject) => {
    wx.login({
      success(res) {
        if (res.code) {
          api.post('/auth/login', { code: 'mock_' + res.code })
            .then((data) => {
              wx.setStorageSync('token', data.token);
              const app = getApp();
              app.globalData.token = data.token;
              app.globalData.userInfo = data.user;
              resolve(data.user);
            })
            .catch(reject);
        } else {
          reject(new Error('登录失败'));
        }
      },
      fail: reject,
    });
  });
}

/**
 * 检查登录态
 * 有 token 时直接验证有效性
 */
function checkLogin() {
  const token = wx.getStorageSync('token');
  if (token) {
    return api.get('/auth/profile')
      .then((user) => {
        const app = getApp();
        app.globalData.userInfo = user;
        app.globalData.token = token;
        return user;
      })
      .catch(() => {
        wx.removeStorageSync('token');
        return null;
      });
  }
  return Promise.resolve(null);
}

/**
 * 确保登录态
 * 未登录则调起登录流程
 */
function ensureLogin() {
  return checkLogin().then((user) => {
    if (user) return user;
    return login();
  });
}

module.exports = { login, checkLogin, ensureLogin };

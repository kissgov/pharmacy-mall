/**
 * 用户认证模块（云托管模式）
 * 通过 wx.cloud.callContainer 内网通信，自动携带用户 openid
 * 无需手动 wx.login 换取 token
 */

const api = require('./api');

/**
 * 获取用户信息（从后端 /auth/profile 读取）
 */
function getProfile() {
  return api.get('/auth/profile').then((user) => {
    const app = getApp();
    app.globalData.userInfo = user;
    return user;
  }).catch(() => null);
}

/**
 * 检查/初始化登录态
 * 云托管模式下，首次调用自动创建用户
 */
function checkLogin() {
  const app = getApp();
  if (app.globalData.userInfo) return Promise.resolve(app.globalData.userInfo);
  return getProfile();
}

module.exports = { getProfile, checkLogin };

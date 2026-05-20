/**
 * 用户认证模块（云托管模式）
 * openid 由 wx.cloud.callContainer 自动传入，无需手动登录
 */

const api = require('./api');

/**
 * 静默登录：通过后端初始化/获取用户信息
 * 后端根据 x-wx-openid 自动创建或返回已有用户
 */
async function silentLogin() {
  try {
    const data = await api.post('/auth/login', {});
    // 登录接口返回 { token, user }，需要解构
    const user = data.user || data;
    if (data.token) {
      wx.setStorageSync('token', data.token);
    }
    const app = getApp();
    app.globalData.userInfo = user;
    wx.setStorageSync('userInfo', user);
    return user;
  } catch (e) {
    console.log('登录失败:', e);
    return null;
  }
}

/**
 * 检查当前登录态（缓存优先）
 */
function checkLogin() {
  const app = getApp();
  if (app.globalData.userInfo && app.globalData.userInfo.id) {
    return Promise.resolve(app.globalData.userInfo);
  }
  const cached = wx.getStorageSync('userInfo');
  if (cached && cached.id) {
    app.globalData.userInfo = cached;
    return Promise.resolve(cached);
  }
  return silentLogin();
}

/**
 * 更新用户资料（昵称、头像、手机号）
 */
async function updateProfile(data) {
  const user = await api.put('/auth/profile', data);
  const app = getApp();
  app.globalData.userInfo = user;
  wx.setStorageSync('userInfo', user);
  return user;
}

/**
 * 获取微信用户信息（昵称+头像）
 * 使用 button open-type="chooseAvatar" + input type="nickname" 新方案
 */
function getWxUserInfo() {
  const cached = wx.getStorageSync('userInfo');
  return cached || {};
}

module.exports = { checkLogin, silentLogin, updateProfile, getWxUserInfo };

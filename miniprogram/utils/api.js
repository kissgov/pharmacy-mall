/**
 * 网络请求封装
 * 统一处理 token、错误格式、图片 URL 前缀
 */

const BASE_URL = 'http://localhost:3000';
const API_URL = BASE_URL + '/api';

/**
 * 通用请求方法
 */
function request(options) {
  const token = wx.getStorageSync('token');

  return new Promise((resolve, reject) => {
    wx.request({
      url: API_URL + options.url,
      method: options.method || 'GET',
      data: options.data,
      header: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: 'Bearer ' + token } : {}),
      },
      success(res) {
        const body = res.data;
        if (res.statusCode === 200 && body.code === 200) {
          resolve(body.data);
        } else {
          if (res.statusCode === 401 || body.code === 401) {
            wx.removeStorageSync('token');
          }
          reject(body || { code: res.statusCode, message: '请求失败' });
        }
      },
      fail(err) {
        wx.showToast({ title: '网络异常', icon: 'none' });
        reject(err);
      },
    });
  });
}

const api = {
  get(url, data) { return request({ url, data }); },
  post(url, data) { return request({ url, method: 'POST', data }); },
  put(url, data) { return request({ url, method: 'PUT', data }); },
  del(url, data) { return request({ url, method: 'DELETE', data }); },
};

/**
 * 将相对图片路径转为完整 URL
 * 如果路径已经是完整 URL 则直接返回
 */
function imageUrl(path) {
  if (!path) return '/assets/placeholder.png';
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  if (path.startsWith('/')) return BASE_URL + path;
  return BASE_URL + '/' + path;
}

module.exports = api;
module.exports.imageUrl = imageUrl;
module.exports.BASE_URL = BASE_URL;

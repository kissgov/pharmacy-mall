/**
 * API 请求封装
 * 通过微信云托管内网通信（wx.cloud.callContainer），自动携带用户身份
 */
const BASE_URL = 'https://pharmary-mall-api-239896-5-1309632689.sh.run.tcloudbase.com';
const API_PREFIX = '/api';

function request(options) {
  const app = getApp();
  return app.call({
    path: API_PREFIX + options.url,
    method: options.method || 'GET',
    data: options.data,
  }).then((data) => {
    if (data && data.code === 200) return data.data;
    throw data || { code: 500, message: '请求失败' };
  });
}

const api = {
  get(url, data) { return request({ url, data }); },
  post(url, data) { return request({ url, method: 'POST', data }); },
  put(url, data) { return request({ url, method: 'PUT', data }); },
  del(url, data) { return request({ url, method: 'DELETE', data }); },
};

/**
 * 将相对图片路径转为完整云托管 URL
 */
function imageUrl(path) {
  if (!path) return '';
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  if (path.startsWith('/')) return BASE_URL + path;
  return BASE_URL + '/' + path;
}

module.exports = api;
module.exports.imageUrl = imageUrl;
module.exports.BASE_URL = BASE_URL;

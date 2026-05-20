/**
 * COS 对象存储模块（云托管内网鉴权）
 * 通过微信云托管内部 API 自动获取临时凭证
 */

const COS = require('cos-nodejs-sdk-v5');
const http = require('http');

const cosConfig = {
  Bucket: process.env.COS_BUCKET || '7072-prod-3g07zskv0b1bc5b1-1309632689',
  Region: process.env.COS_REGION || 'ap-shanghai',
};

let cos = null;

/**
 * 云托管内部 HTTP 请求
 */
function internalCall(options) {
  return new Promise((resolve, reject) => {
    const url = new URL(options.url);
    const req = http.request({
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + (url.search || ''),
      method: options.method || 'GET',
      headers: { 'content-type': 'application/json' },
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    });
    req.on('error', reject);
    if (options.data) req.write(JSON.stringify(options.data));
    req.end();
  });
}

/**
 * 初始化 COS SDK（调用云托管内部接口获取临时密钥）
 */
async function initCOS() {
  try {
    const authRes = await internalCall({
      url: 'http://api.weixin.qq.com/_/cos/getauth',
      method: 'GET',
    });
    const info = JSON.parse(authRes);
    const auth = {
      TmpSecretId: info.TmpSecretId,
      TmpSecretKey: info.TmpSecretKey,
      SecurityToken: info.Token,
      ExpiredTime: info.ExpiredTime,
    };
    cos = new COS({
      getAuthorization: function (_options, callback) {
        callback(auth);
      },
    });
    console.log('COS 初始化成功');
    return true;
  } catch (e) {
    console.log('COS 初始化失败（将回退到本地存储）:', e.message);
    return false;
  }
}

/**
 * 上传文件到 COS
 * @param {string} cloudPath - COS 对象路径，如 'products/xxx.jpg'
 * @param {string} localPath - 本地文件路径
 * @returns {string|null} COS 访问 URL
 */
async function uploadFile(cloudPath, localPath) {
  if (!cos) return null;
  try {
    const fs = require('fs');
    // 获取 metaid
    const metaRes = await internalCall({
      url: 'http://api.weixin.qq.com/_/cos/metaid/encode',
      method: 'POST',
      data: {
        openid: '',
        bucket: cosConfig.Bucket,
        paths: [cloudPath],
      },
    });
    const meta = JSON.parse(metaRes);

    const result = await cos.putObject({
      Bucket: cosConfig.Bucket,
      Region: cosConfig.Region,
      Key: cloudPath,
      StorageClass: 'STANDARD',
      Body: fs.createReadStream(localPath),
      ContentLength: fs.statSync(localPath).size,
      Headers: {
        'x-cos-meta-fileid': meta.respdata.x_cos_meta_field_strs[0],
      },
    });

    if (result.statusCode === 200) {
      // 返回 COS 访问 URL（云托管内网）
      return `https://${cosConfig.Bucket}.cos.${cosConfig.Region}.myqcloud.com/${cloudPath}`;
    }
    return null;
  } catch (e) {
    console.log('COS 上传失败:', e.message);
    return null;
  }
}

/**
 * 获取 COS 公开访问 URL
 */
function getCOSUrl(cloudPath) {
  if (!cloudPath) return '';
  if (cloudPath.startsWith('http')) return cloudPath;
  return `https://${cosConfig.Bucket}.cos.${cosConfig.Region}.myqcloud.com/${cloudPath}`;
}

module.exports = { initCOS, uploadFile, getCOSUrl, cosConfig };

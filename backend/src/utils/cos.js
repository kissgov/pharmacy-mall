/**
 * COS 对象存储模块（云托管内网鉴权）
 * 通过微信云托管内部 API 自动获取临时凭证
 * 上传时自动初始化，无需手动等待
 */

const COS = require('cos-nodejs-sdk-v5');
const http = require('http');

const cosConfig = {
  Bucket: process.env.COS_BUCKET || '7072-prod-3g07zskv0b1bc5b1-1309632689',
  Region: process.env.COS_REGION || 'ap-shanghai',
};

let cos = null;
let initPromise = null;

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
 * 初始化 COS SDK（幂等，重复调用不重复初始化）
 */
async function initCOS() {
  if (cos) return true;
  if (initPromise) return initPromise;
  
  initPromise = (async () => {
    try {
      const authRes = await internalCall({
        url: 'http://api.weixin.qq.com/_/cos/getauth',
        method: 'GET',
      });
      const info = JSON.parse(authRes);
      cos = new COS({
        getAuthorization: function (_options, callback) {
          callback({
            TmpSecretId: info.TmpSecretId,
            TmpSecretKey: info.TmpSecretKey,
            SecurityToken: info.Token,
            ExpiredTime: info.ExpiredTime,
          });
        },
      });
      console.log('COS 初始化成功');
      return true;
    } catch (e) {
      console.log('COS 初始化失败:', e.message);
      initPromise = null;
      return false;
    }
  })();
  return initPromise;
}

/**
 * 上传文件到 COS（自动等待初始化）
 */
async function uploadFile(cloudPath, localPath) {
  const ok = await initCOS();
  if (!ok || !cos) return null;
  try {
    const fs = require('fs');
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
      return `https://${cosConfig.Bucket}.cos.${cosConfig.Region}.myqcloud.com/${cloudPath}`;
    }
    return null;
  } catch (e) {
    console.log('COS 上传失败:', e.message);
    return null;
  }
}

function getCOSUrl(cloudPath) {
  if (!cloudPath) return '';
  if (cloudPath.startsWith('http')) return cloudPath;
  return `https://${cosConfig.Bucket}.cos.${cosConfig.Region}.myqcloud.com/${cloudPath}`;
}

module.exports = { initCOS, uploadFile, getCOSUrl, cosConfig };

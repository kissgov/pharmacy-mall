// 药店网上商城小程序入口
// 使用微信云托管内网通信（wx.cloud.callContainer）

App({
  onLaunch() {
    // 初始化微信云托管
    const cloud = new wx.cloud.Cloud({
      resourceEnv: 'prod-3g07zskv0b1bc5b1',
    });
    this.cloud = cloud;
    cloud.init();
    console.log('云托管初始化完成');
  },

  /**
   * 封装的云托管调用方法（取代 wx.request）
   * 走内网通信，自动携带用户身份信息，无需手动登录
   */
  async call(obj) {
    try {
      const result = await this.cloud.callContainer({
        config: {
          env: 'prod-3g07zskv0b1bc5b1',
        },
        path: obj.path,
        method: obj.method || 'GET',
        data: obj.data,
        header: {
          'X-WX-SERVICE': 'pharmary-mall-api',
          ...(obj.header || {}),
        },
        timeout: obj.timeout || 15000,
      });
      if (result.errMsg && result.errMsg.indexOf('ok') === -1) {
        throw new Error(result.errMsg);
      }
      return result.data;
    } catch (e) {
      const msg = e.toString();
      if (msg.indexOf("Cloud API isn't enabled") !== -1) {
        await new Promise(r => setTimeout(r, 300));
        return this.call(obj);
      }
      wx.showToast({ title: '网络异常', icon: 'none' });
      throw e;
    }
  },

  globalData: {
    userInfo: null,
    baseUrl: 'https://pharmary-mall-api-239896-5-1309632689.sh.run.tcloudbase.com',
  },
});

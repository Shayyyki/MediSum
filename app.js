// app.js
App({
  globalData: {
    words: [], // 初始化为空数组
    simply_words: [],//存储简化后内容数组
    recognizedimageUrls:[],
    imageUrl:''
  },
  onLaunch() {
    // 展示本地存储能力
    const logs = wx.getStorageSync('logs') || []
    logs.unshift(Date.now())
    wx.setStorageSync('logs', logs)

    // 登录
    wx.login({
      success: res => {
        // 发送 res.code 到后台换取 openId, sessionKey, unionId
      }
    })
  },
  globalData: {
    userInfo: null
  }
})

// pages/ocr/ocr.js
const app = getApp();
var inputVal = '';
var msgList = [];
var windowWidth = wx.getSystemInfoSync().windowWidth;
var windowHeight = wx.getSystemInfoSync().windowHeight;
var keyHeight = 0;

let socketOpen = false;
let socketMsgQueue = [];
let lineCount = Math.floor(windowWidth / 16) - 6;
let curAnsCount = 0;
let infoText = [];

/**
 * 初始化数据
 */

function sendSocketMessage(msg) {
  if (socketOpen) {
    doSendSocketMessage(msg);
  } else {
    socketMsgQueue.push(msg);
  }
}

function doSendSocketMessage(msg) {
  wx.sendSocketMessage({
    data: msg,
  });
}

Page({
  data: {
    fontSize: wx.getStorageSync('fontSize') || 30, // 默认值为 30，如果没有存储的值
    imagePath: "", // 识别的图片
    imageUrl:"",
    content: [],
    baiduToken:''
  },

  onLoad: function (options) {
    this.setData({
      fontSize: wx.getStorageSync('fontSize') || 30
    })
    var that = this;
    that.setData({
      imagePath: decodeURIComponent(options.imagePath) // 从 options 中获取图片地址参数
    });

    wx.getFileSystemManager().readFile({
      filePath: that.data.imagePath,
      encoding: 'base64',
      // 返回数据
      success: function (res) {
        that.setData({
          imageUrl: res.data
        })
      }
    })
    // WebSocket 相关操作
    wx.connectSocket({
      url: 'ws://8.138.104.13:53461/ocrWebSocket/' + wx.getStorageSync('username'),
    });
    wx.onSocketOpen((res) => {
      socketOpen = true;
      console.log("打开socket");
      wx.showToast({
        icon: 'none',
        title: '会话建立成功',
        duration: 500,
      });
    })
  },

  // 获取百度 Access Token
  getBaiduToken: function () {
    var apiKey = 'ubmqTbSswLDOhpFtlN5yi4UO'; // 百度云上的 apiKey
    var secKey = 'cLNQAbce5eGkeiSFFxWy8I8wgDK1wMyf'; // 百度云上的 secKey
    var tokenUrl = `https://aip.baidubce.com/oauth/2.0/token?grant_type=client_credentials&client_id=${apiKey}&client_secret=${secKey}`; // 调用百度云 api 接口

    return new Promise((resolve, reject) => {
      // 发送请求
      wx.request({
        url: tokenUrl,
        method: 'POST',
        dataType: 'json',
        header: {
          'content-type': 'application/json; charset=UTF-8',
        },
        // 返回数据
        success: (res) => {
          this.setData({
            baiduToken: res.data.access_token,
          });
          resolve(); // 解决 Promise
        },
        // 错误信息
        fail: (res) => {
          console.log("[BaiduToken获取失败]", res);
          reject(); // 拒绝 Promise
        },
      });
    });
  },

  // 百度 ORC 接口调用
  scanImageInfo: function (imageData) {
    var that = this; // 防止 this 指向问题
    const detectUrl = `https://aip.baidubce.com/rest/2.0/ocr/v1/accurate_basic?access_token=${that.data.baiduToken}`; // 调用百度云api接口并传递baiduToken
    // 返回一个 Promise，确保在请求完成后再进行下一步
    return new Promise((resolve, reject) => {
      // 发送请求
      wx.request({
        url: detectUrl,
        data: {
          image: imageData,
        },
        method: 'POST',
        dataType: 'json',
        header: {
          'content-type': 'application/x-www-form-urlencoded',
        },
        success: function (res) {
          var dataList = res.data.words_result;
          var words = dataList.map(function (obj) {
            return obj.words;
          });
          var concatenatedWords = words.join(' ');

          wx.setStorageSync('ocr_recognizedText', concatenatedWords);
          resolve(); // 解决 Promise
        },
        // 错误信息
        fail: function (res) {
          console.log('get dataList fail：', res.data);
          reject(); // 拒绝 Promise
        },
      });
    });
  },

  onShow: function () {
    this.setData({
      fontSize: wx.getStorageSync('fontSize') || 30
    })
    var that = this;
    wx.cloud.init({
      env: 'cloud1-6gcva1k9bc9b81e3', // 这里替换为你的云开发环境 ID
      traceUser: true, 
    });
    wx.cloud.database().collection('medi_instruction').where({
      imagePath: this.data.imagePath
    }).get().then(dbRes=> {
      if (dbRes.data.length > 0 && 'content' in dbRes.data[0] && dbRes.data[0].content.length > 0) {
        console.log("找到匹配的记录并且有 'content' 字段,content包含数据，直接调用");
        // 如果找到匹配的记录并且有 'content' 字段，设置页面的数据
        that.setData({
          content: dbRes.data[0].content
        });

      } else {
        console.log("OCR+ChatGPT处理");
        // 先获取百度 Access Token，再调用百度 API 解析图片获取文字
        this.getBaiduToken().then(() => {
          return this.scanImageInfo(this.data.imageUrl);
        }).then(() => {
          let recognizedText = wx.getStorageSync("ocr_recognizedText");
          sendSocketMessage(recognizedText);
          socketMsgQueue = [];
          wx.onSocketMessage((result) => {
            var newMsg = {
              content: result.data,
            };
            msgList.push(newMsg);
            // Update words with all OCR text in msgList
            let medi_words = msgList.map(msg => msg.content).join('');
            this.setData({
              content: medi_words
            }, () => {
              if (dbRes.data.length > 0 && 'content' in dbRes.data[0]) {
                console.log("找到匹配的记录并且有 'content' 字段,content不包含数据，先更新content数据");
                // 更新数据库
                wx.cloud.database().collection('medi_instruction').doc(dbRes.data[0]._id).update({
                  data: {
                    content: this.data.content
                  },
                });
              } else {
                console.log("没有找到匹配的记录");
                // 如果没有找到匹配的记录，可能需要添加一个新的记录
                wx.showToast({
                  title: '请先填写说明书信息',
                });
                wx.navigateTo({
                  url: '/pages/inputNote/inputNote?imagePath=' + encodeURIComponent(this.data.imagePath),
                });
              }
            });
          });            
        });
      }
    });
    },
  
  onHide: function () {
    wx.closeSocket()
    wx.onSocketClose((result) => {
      console.log("socket关闭成功");
      wx.showToast({
        icon: 'none',
        title: '会话关闭成功！',
        duration: 500
      })
    })
  },
  /**
   * 退回上一页
   */
  toBackClick: function () {
    wx.navigateBack({})
    wx.showToast({
      title: '说明书内容保存成功',
    })
  }
});

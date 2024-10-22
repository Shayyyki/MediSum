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
Page({
  data: {
    fontSize: wx.getStorageSync('fontSize') || 30, // 默认值为 30，如果没有存储的值
    imagePath: "", // 识别的图片
    imageUrl:"",
    inputVal: "", // 用于存储输入的内容
    result:[]
  },

  onLoad: function (options) {
    this.setData({
      fontSize: wx.getStorageSync('fontSize') || 30
    })
    var that = this;
    that.setData({
      imagePath: decodeURIComponent(options.imagePath) // 从 options 中获取图片地址参数
    });
  },

  inputChange: function(e) {
    this.setData({
      inputVal: e.detail.value // 获取输入的内容并存储在data中
    });
  },

  search: function () {
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
        // 在这里添加检索逻辑
        var searchContent = that.data.inputVal; // 这是你要检索的内容
        var content = dbRes.data[0].content;
        // 创建一个正则表达式，用于找到所有的检索内容
        var regex = new RegExp(searchContent, "g");
        // 检查是否找到了检索内容
        if (regex.test(content)) {  
        // 使用replace方法替换所有的检索内容
        var result = content.replace(regex, "❗" + searchContent + "❗");
        // 设置结果
        that.setData({
          result: result
        });
        }else{
          that.setData({
            result: '请重新检查该说明书中并未检索到该词条哦😊'
          });
        }
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
  }        
});

const app = getApp();
var inputVal = '';
var msgList = [];
var windowWidth = wx.getSystemInfoSync().windowWidth;
var windowHeight = wx.getSystemInfoSync().windowHeight;
var keyHeight = 0;
let click_num = 0;
let socketOpen = false;
let socketMsgQueue = [];
let lineCount = Math.floor(windowWidth / 16) - 6;
let curAnsCount = 0;
/**
 * 初始化数据
 */
function initData(that) {
  inputVal = '';
  msgList = [{
    speaker: 'server',
    contentType: 'text',
    content: '您好，我是人工智能助手，可以简单快速地回复您关于该药的一些问题哦😊。'
  }, ]
  that.setData({
    msgList,
    inputVal
  })
}

function sendSocketMessage(msg) {
  if (socketOpen) {
    wx.sendSocketMessage({
      data: msg
    })
  } else {
    socketMsgQueue.push(msg)
  }
}



Page({
  /**
   * 页面的初始数据
   */
  data: {
    fontSize: wx.getStorageSync('fontSize') || 30, // 默认值为 30，如果没有存储的值
    scrollHeight: '100vh',
    inputBottom: 0,
    imagePath:'',
    priorText:''//先验文本
  },


  /**
   * 生命周期函数--监听页面加载
   */
  onLoad: function (options) {
    this.setData({
      fontSize: wx.getStorageSync('fontSize') || 30
    })
    this.setData({
      imagePath: decodeURIComponent(options.imagePath) // 从 options 中获取图片地址参数
    });
    initData(this);
    this.setData({
      cusHeadIcon: "/images/user.png",
    });
  },

  /**
   * 生命周期函数--监听页面显示
   */
  onShow: function () {
    this.setData({
      fontSize: wx.getStorageSync('fontSize') || 30
    })
    wx.cloud.init({
      env: 'cloud1-6gcva1k9bc9b81e3', // 这里替换为你的云开发环境 ID
      traceUser: true, 
    })
    wx.cloud.database().collection('medi_instruction').where({
      imagePath: this.data.imagePath
    }).get().then(dbRes => {
      if (dbRes.data.length > 0 && 'content' in dbRes.data[0]) {
        console.log("找到匹配的记录并且有 'content' 字段，content包含数据，直接调用")
        this.setData({
          priorText:dbRes.data[0].content
        })
      }else if(dbRes.data.length > 0 && !('content' in dbRes.data[0])){
        console.log("有匹配的记录但content不包含数据，需要先识别内容")
        wx.showToast({
          title: '请先识别说明书内容',
        })
        wx.navigateTo({
          url: '/pages/ocr/ocr?imagePath=' + encodeURIComponent(this.data.imagePath),
        })
      }else{
        console.log("没有匹配的记录")
        wx.showToast({
          title: '请先填写说明书信息',
        })
        wx.navigateTo({
          url: '/pages/inputNote/inputNote?imagePath=' + encodeURIComponent(this.data.imagePath),
        })
      }
    })

    console.log("开始连接websocket！！！！！")
    wx.connectSocket({
      url: 'ws://8.138.104.13:53461/chatWebSocket/' + wx.getStorageSync('username')
    })

    wx.onSocketOpen((res) => {
      socketOpen = true
      console.log("打开socket");
      wx.showToast({
        icon: 'none',
        title: '会话建立成功',
        duration: 500
      })
      let answerTimer = null;
      socketMsgQueue = []
      wx.onSocketMessage((result) => {
        result.data = result.data.replace(" ", "&nbsp;");
        // console.log(result.data+"--->"+result.data.length+"--->"+  result.data.charAt(result.data.length-1).charCodeAt())
        curAnsCount++;
        // console.log(lineCount+"----"+curAnsCount);
        if (curAnsCount % lineCount == 0) {
          wx.createSelectorQuery().select('#chatPage').boundingClientRect(function (rect) {
            // 使页面滚动到底部
            wx.pageScrollTo({
              scrollTop: rect.bottom
            })
          }).exec()
        }
        msgList[msgList.length - 1].content = msgList[msgList.length - 1].content + result.data
        this.setData({
          msgList
        })
        if (answerTimer) {
          clearTimeout(answerTimer);
        }
        // 启动新的定时器
        answerTimer = setTimeout(() => {
          // 定时器结束，更新数据库
          wx.cloud.database().collection('medi_instruction').where({
            imagePath: this.data.imagePath
          }).get().then(res => {
            if (res.data.length > 0) {
              // 如果名称存在，添加对话记录
              wx.cloud.database().collection('medi_instruction').doc(res.data[0]._id).update({
                data: {
                  dialogues: wx.cloud.database().command.push({
                    // question: userMessage,
                    answer: msgList[msgList.length - 1].content
                  })
                },
                success: function(res) {
                  // console.log(res)
                },
                fail: function(err) {
                  console.log(err)
                  wx.showToast({
                    title: '保存失败',
                    icon: 'none'
                  })
                }
              })
            }else {
              wx.showToast({
                title: '不存在该说明书，请重新添加',
              })
            }
          })
        }, 2000); 
      })
    })
  },
  onHide: function () {
    wx.closeSocket()
    wx.onSocketClose((result) => {
      console.log("socket关闭成功");
      wx.showToast({
        icon: 'none',
        title: '会话关闭成功',
        duration: 500
      })
    })
  },
  /**
   * 页面相关事件处理函数--监听用户下拉动作
   */
  onPullDownRefresh: function () {

  },

  /**
   * 页面上拉触底事件的处理函数
   */
  onReachBottom: function () {

  },

  /**
   * 获取聚焦
   */
  focus: function (e) {
    let res = wx.getSystemInfoSync()
    let navBarHeight = res.statusBarHeight + 44 //顶部状态栏+顶部导航，大部分机型默认44px
    keyHeight = e.detail.height - navBarHeight;
    if (keyHeight < 0) {
      keyHeight = 0
    }
    this.setData({
      scrollHeight: (windowHeight - keyHeight) + 'px'
    });
    this.setData({
      toView: 'msg-' + (msgList.length - 1),
      inputBottom: (keyHeight) + 'px'
    })
  },

  //失去聚焦(软键盘消失)
  blur: function (e) {
    this.setData({
      scrollHeight: '100vh',
      inputBottom: 0
    })
    this.setData({
      toView: 'msg-' + (msgList.length - 1)
    })

  },

  /**
   * 发送点击监听
   */
  sendClick: function (e) {
    let userMessage = e.detail.value;
    let fullMessage;
    let priorText = this.data.priorText; // 获取先验文本
    if(click_num % 7==0){
      fullMessage = priorText + userMessage;
    }else{
      fullMessage = userMessage;
    }
    console.log("click_num===",click_num)
    console.log("fullMessage===",fullMessage)
    sendSocketMessage(fullMessage)
    msgList.push({
      speaker: 'customer',
      contentType: 'text',
      content: e.detail.value
    })
    msgList.push({
      speaker: 'server',
      contentType: 'text',
      content: ''
    })
    inputVal = '';
    this.setData({
      msgList,
      inputVal
    });
    click_num = click_num + 1;
  },

  /**
   * 退回上一页
   */
  toBackClick: function () {
    wx.navigateBack({})
  }

})
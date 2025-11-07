Page({
  data: {
    bubbles: [],
    bubbleId: 0,
    windowWidth: 375,
    windowHeight: 667,
    showConfig: true,
    customName: '',
    customTexts: '',
    currentName: '', // 当前使用的名字
    currentTextList: [], // 当前使用的文案列表
    defaultTextList: [
      "记得多喝水哦~", "累了就休息一下吧", "辛苦了,要好好照顾自己",
      "天冷了,注意保暖", "今天吃什么好吃的?", "注意安全哦",
      "早点睡,别熬夜", "记得按时吃饭", "出门带伞哦",
      "路上小心", "别着凉了", "记得吃早餐",
      "你的笑容最美", "你真的很棒!", "你值得所有美好",
      "你是最特别的", "你的眼睛会发光", "你已经很努力了",
      "你很优秀", "你很可爱", "你真温柔", "你真善良",
      "想你了...", "遇见你真好", "想抱抱你",
      "我会一直陪着你", "有我在呢", "想听你的声音",
      "想见你", "想和你在一起", "想牵你的手",
      "想给你一个拥抱", "永远支持你", "永远陪着你",
      "晚安,做个好梦", "早安,美好的一天", "今天也要开心呀",
      "今天过得好吗?", "最近还好吗?", "周末快乐!",
      "新的一天,加油!", "今天也爱你",
      "不开心的话就跟我说", "加油!我相信你", "慢慢来,不着急",
      "别担心,会好的", "一切都会好起来的", "我理解你",
      "你不是一个人", "有什么需要随时找我", "别给自己太大压力",
      "做你自己就好",
      "今天天气真好", "出去走走吧", "适当运动一下",
      "放松一下心情", "听听音乐吧", "看场电影吧",
      "好好休息", "该睡觉啦",
      "你今天真好看", "超级想你", "想陪你看日落",
      "想陪你散步", "想给你做饭", "想和你分享今天",
      "每天都想见到你", "你是我的小太阳", "你让我很开心",
      "因为你,每天都很美好"
    ],
    availableTexts: [],
    bubbleColors: [
      "#95EC69", "#A8E6F5", "#FFE0B2", 
      "#F8BBD0", "#E1BEE7", "#FFECB3", "#C5E1A5"
    ],
    clearInterval: 30000, // 30秒清屏间隔
    lastClearTime: 0      // 上次清屏时间
  },

  pendingBubbles: [],
  isUpdating: false,

  onLoad() {
    const systemInfo = wx.getSystemInfoSync();
    
    // 从缓存读取配置
    const savedName = wx.getStorageSync('customName') || '';
    const savedTexts = wx.getStorageSync('customTexts') || '';
    
    this.setData({
      windowWidth: systemInfo.windowWidth,
      windowHeight: systemInfo.windowHeight,
      customName: savedName,
      customTexts: savedTexts,
      currentName: savedName,
      showConfig: true // 首次进入显示配置
    });

    // 初始化文案列表
    this.initTextList();
    

  },

  onUnload() {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  },

  // 初始化文案列表
  initTextList() {
    let textList = [];
    const { customTexts, currentName } = this.data;

    if (customTexts && customTexts.trim()) {
      // 使用自定义文案
      textList = customTexts.split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0);
    } else {
      // 使用默认文案
      textList = [...this.data.defaultTextList];
    }

    // 添加名字前缀
    if (currentName && currentName.trim()) {
      textList = textList.map(text => `${currentName},${text}`);
    }

    this.setData({
      currentTextList: textList,
      availableTexts: this.shuffleArray([...textList])
    });
  },

  // 打开配置面板
  openConfig() {
    this.setData({
      showConfig: true
    });
  },

  // 关闭配置面板
  closeConfig() {
    this.setData({
      showConfig: false
    });
  },

  // 输入名字
  onNameInput(e) {
    this.setData({
      customName: e.detail.value
    });
  },

  // 输入文案
  onTextsInput(e) {
    this.setData({
      customTexts: e.detail.value
    });
  },

  // 确认配置
  confirmConfig() {
    const { customName, customTexts } = this.data;

    // 保存到缓存
    wx.setStorageSync('customName', customName);
    wx.setStorageSync('customTexts', customTexts);

    // 更新当前配置
    this.setData({
      currentName: customName,
      showConfig: false,
      bubbles: [] // 清空现有气泡
    });

    // 重新初始化文案
    this.initTextList();

    // 重启动画
    if (this.timer) {
      clearTimeout(this.timer);
    }
    this.autoCreateBubbles();

    wx.showToast({
      title: '设置成功',
      icon: 'success'
    });
  },

  shuffleArray(array) {
    const newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
  },

  getRandomText() {
    let { availableTexts, currentTextList } = this.data;
    
    if (availableTexts.length === 0) {
      availableTexts = this.shuffleArray([...currentTextList]);
    }

    const index = Math.floor(Math.random() * availableTexts.length);
    const text = availableTexts[index];
    availableTexts.splice(index, 1);
    
    this.data.availableTexts = availableTexts;
    return text;
  },

  estimateTextWidth(text, fontSize) {
    let width = 0;
    for (let char of text) {
      width += /[\u4e00-\u9fa5]/.test(char) ? fontSize : fontSize * 0.6;
    }
    return width + 24;
  },

  checkOverlap(x, y, width, height, bubbles) {
    const padding = 5;
    for (let bubble of bubbles) {
      const isOverlap = !(
        x + width + padding < bubble.x ||
        x > bubble.x + bubble.width + padding ||
        y + height + padding < bubble.y ||
        y > bubble.y + bubble.height + padding
      );
      if (isOverlap) {
        return true;
      }
    }
    return false;
  },

  findAvailablePosition(bubbleWidth, bubbleHeight, existingBubbles) {
    const maxAttempts = 50;
    const margin = 5;
    
    for (let i = 0; i < maxAttempts; i++) {
      const maxX = Math.max(margin, this.data.windowWidth - bubbleWidth - margin);
      const maxY = Math.max(margin, this.data.windowHeight - bubbleHeight - margin);
      
      const x = Math.floor(Math.random() * (maxX - margin)) + margin;
      const y = Math.floor(Math.random() * (maxY - margin)) + margin;
      
      if (!this.checkOverlap(x, y, bubbleWidth, bubbleHeight, existingBubbles)) {
        return { x, y };
      }
    }
    
    const x = Math.floor(Math.random() * (this.data.windowWidth - bubbleWidth - 10)) + 5;
    const y = Math.floor(Math.random() * (this.data.windowHeight - bubbleHeight - 10)) + 5;
    return { x, y };
  },

  batchUpdateBubbles() {
    if (this.isUpdating || this.pendingBubbles.length === 0) {
      return;
    }

    this.isUpdating = true;
    
    const newBubbles = [...this.data.bubbles, ...this.pendingBubbles];
    this.pendingBubbles = [];

    this.setData({
      bubbles: newBubbles
    }, () => {
      this.isUpdating = false;
    });
  },

  createBubble() {
    const text = this.getRandomText();
    const color = this.data.bubbleColors[
      Math.floor(Math.random() * this.data.bubbleColors.length)
    ];
    const fontSize = Math.floor(Math.random() * 4) + 13;

    const textWidth = this.estimateTextWidth(text, fontSize);
    const bubbleWidth = Math.max(textWidth, 70);
    const bubbleHeight = Math.max(fontSize + 20, 32);

    const allBubbles = [...this.data.bubbles, ...this.pendingBubbles];
    const position = this.findAvailablePosition(bubbleWidth, bubbleHeight, allBubbles);

    const bubble = {
      id: this.data.bubbleId++,
      text,
      color,
      fontSize,
      width: bubbleWidth,
      height: bubbleHeight,
      x: position.x,
      y: position.y,
      isAnimating: true
    };

    this.pendingBubbles.push(bubble);
  },

  createMultipleBubbles() {
    const numBubbles = Math.floor(Math.random() * 3) + 2;
    
    for (let i = 0; i < numBubbles; i++) {
      this.createBubble();
    }

    this.batchUpdateBubbles();
  },

  autoCreateBubbles() {
    const currentTime = Date.now();
    
    // 检查是否需要清屏 - 修正属性名引用
    if (currentTime - this.data.lastClearTime >= this.data.clearInterval) {
      // 清除所有气泡
      this.setData({
        bubbles: [],
        bubbleId: 0,
        lastClearTime: currentTime
      });
      
      // 重新初始化可用文本
      this.initTextList();
    }
    
    if (Math.random() < 0.85) {
      this.createMultipleBubbles();
    }
  
    this.timer = setTimeout(() => {
      this.autoCreateBubbles();
    }, 400);
  }
});


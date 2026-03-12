# 09-记忆 (Memory)：对话历史

> 💡 **注意：** 本教程适用于 LangChain.js v1.x，需要 Node.js 20+

## 🎯 本章目标

- ✅ 理解为什么需要记忆
- ✅ 掌握手动管理消息数组的方法
- ✅ 实现多轮对话

---

## 🤔 为什么需要记忆？

### 没有记忆时

```javascript
// 第一轮
const response1 = await model.invoke([
  new HumanMessage("我叫小明")
]);
// AI: 你好小明！

// 第二轮
const response2 = await model.invoke([
  new HumanMessage("我喜欢什么？")  // ❌ AI 不记得第一轮说的话
]);
// AI: 我不知道你喜欢什么...
```

### 有记忆后

```javascript
const messageHistory = [];

// 第一轮
messageHistory.push(new HumanMessage("我叫小明"));
const response1 = await model.invoke(messageHistory);
// AI: 你好小明！

// 第二轮
messageHistory.push(new HumanMessage("我喜欢什么？"));  // ✅ AI 记得历史
const response2 = await model.invoke(messageHistory);
// AI: 你还没有告诉我你喜欢什么，但我们可以聊聊...
```

---

## 📦 LangChain v1.x 中的记忆管理

**重要说明：** LangChain v1.x 中 `ChatMessageHistory` 已被移除，推荐使用**手动管理消息数组**的方式。

### 基本用法

```javascript
import { HumanMessage, AIMessage, SystemMessage } from "@langchain/core/messages";

// 创建消息数组
const messageHistory = [];

// 添加系统消息
messageHistory.push(new SystemMessage("你是一个友好的 AI 助手。"));

// 添加用户消息
messageHistory.push(new HumanMessage("你好"));

// 添加 AI 消息
messageHistory.push(new AIMessage("你好！有什么可以帮助你的？"));

// 获取所有消息
const messages = messageHistory;
```

---

## 💡 完整示例

```javascript
import { ChatOpenAI } from "@langchain/openai";
import { SystemMessage, HumanMessage, AIMessage } from "@langchain/core/messages";

const model = new ChatOpenAI({
  modelName: "MiniMax/MiniMax-M2.5",
  apiKey: process.env.MODELSCOPE_API_KEY,
  temperature: 0.7,
  configuration: {
    baseURL: "https://api-inference.modelscope.cn/v1",
  },
});

// 手动管理消息数组
const messageHistory = [];

// 添加系统消息（设定角色）
messageHistory.push(
  new SystemMessage("你是一个友好的 AI 助手，记住用户告诉你的信息。")
);

async function chat(userMessage) {
  // 添加用户消息
  messageHistory.push(new HumanMessage(userMessage));
  
  // 获取回复
  const response = await model.invoke(messageHistory);
  
  // 保存 AI 回复
  messageHistory.push(new AIMessage(response.content));
  
  return response.content;
}

// 第一轮
console.log("用户：我叫小明，今年 25 岁");
let response = await chat("我叫小明，今年 25 岁");
console.log("AI:", response);

// 第二轮
console.log("\n用户：你喜欢我吗？");
response = await chat("你喜欢我吗？");
console.log("AI:", response);

// 第三轮 - 测试记忆
console.log("\n用户：我今年多大？");
response = await chat("我今年多大？");
console.log("AI:", response);  // AI 会记得：你今年 25 岁
```

---

## 🎯 封装为对话类

```javascript
class ChatBot {
  constructor(model) {
    this.model = model;
    this.messageHistory = [];
    
    // 添加系统消息
    this.messageHistory.push(
      new SystemMessage("你是一个友好的 AI 助手。")
    );
  }

  async chat(userMessage) {
    // 添加用户消息
    this.messageHistory.push(new HumanMessage(userMessage));
    
    // 获取回复
    const response = await this.model.invoke(this.messageHistory);
    
    // 保存 AI 回复
    this.messageHistory.push(new AIMessage(response.content));
    
    return response.content;
  }

  // 清空历史
  clear() {
    this.messageHistory = [this.messageHistory[0]];  // 保留系统消息
  }

  // 获取历史
  getHistory() {
    return this.messageHistory;
  }

  // 获取历史条数
  getMessageCount() {
    return this.messageHistory.length;
  }
}

// 使用示例
const bot = new ChatBot(model);

console.log(await bot.chat("你好"));
console.log(await bot.chat("我叫小明"));
console.log(await bot.chat("记住我的名字"));
console.log(await bot.chat("我叫什么？"));  // AI 会记得
```

---

## 📋 限制历史长度

对话历史太长会消耗更多 token，可以限制长度：

```javascript
class LimitedChatBot {
  constructor(model, maxMessages = 10) {
    this.model = model;
    this.messageHistory = [];
    this.maxMessages = maxMessages;
  }

  async chat(userMessage) {
    // 添加用户消息
    this.messageHistory.push(new HumanMessage(userMessage));
    
    // 限制历史长度（保留系统消息 + 最近的 N 条）
    if (this.messageHistory.length > this.maxMessages + 1) {
      // 保留第一条（系统消息）和最近的 maxMessages 条
      const systemMsg = this.messageHistory[0];
      const recentMsgs = this.messageHistory.slice(-this.maxMessages);
      this.messageHistory = [systemMsg, ...recentMsgs];
    }
    
    // 获取回复
    const response = await this.model.invoke(this.messageHistory);
    
    // 保存 AI 回复
    this.messageHistory.push(new AIMessage(response.content));
    
    return response.content;
  }
}
```

---

## ⚙️ 消息类型详解

| 消息类型 | 说明 | 示例 |
|----------|------|------|
| `SystemMessage` | 系统指令 | `new SystemMessage("你是助手")` |
| `HumanMessage` | 用户消息 | `new HumanMessage("你好")` |
| `AIMessage` | AI 消息 | `new AIMessage("你好！")` |

### AIMessage 带元数据

```javascript
// AIMessage 可以包含额外信息
const aiMsg = new AIMessage("你好！", {
  name: "助手",  // 可选：AI 的名字
  // 其他元数据...
});
```

---

## 🔄 查看对话历史

```javascript
// 打印完整对话历史
console.log("=== 完整对话历史 ===");
messageHistory.forEach((msg, index) => {
  const type = msg.constructor.name;
  console.log(`${index + 1}. [${type}]: ${msg.content}`);
});
```

输出：
```
=== 完整对话历史 ===
1. [SystemMessage]: 你是一个友好的 AI 助手。
2. [HumanMessage]: 我叫小明
3. [AIMessage]: 你好小明！很高兴认识你！
4. [HumanMessage]: 我今年多大？
5. [AIMessage]: 你今年 25 岁呀！
```

---

## ⚠️ 注意事项

### 1. Token 限制

对话历史太长会超出模型的 token 限制：

```javascript
// 定期清理历史
if (messageHistory.length > 50) {
  // 只保留系统消息和最近的 10 条
  const systemMsg = messageHistory[0];
  const recentMsgs = messageHistory.slice(-10);
  messageHistory = [systemMsg, ...recentMsgs];
}
```

### 2. 系统消息位置

系统消息应该始终在开头：

```javascript
// ✅ 正确
const messages = [
  new SystemMessage("你是助手"),
  ...history,
  new HumanMessage("新消息")
];

// ❌ 错误
const messages = [
  ...history,
  new SystemMessage("你是助手"),  // 可能被忽略
  new HumanMessage("新消息")
];
```

### 3. 持久化存储

默认情况下，消息数组只存在于内存中。程序重启后历史会丢失。

保存到文件：
```javascript
import fs from 'fs';

// 保存
function saveHistory(filename = 'history.json') {
  const history = messageHistory.map(msg => ({
    type: msg.constructor.name,
    content: msg.content
  }));
  fs.writeFileSync(filename, JSON.stringify(history, null, 2));
}

// 加载
function loadHistory(filename = 'history.json') {
  try {
    const history = JSON.parse(fs.readFileSync(filename, 'utf-8'));
    messageHistory = history.map(msg => {
      if (msg.type === 'HumanMessage') {
        return new HumanMessage(msg.content);
      } else if (msg.type === 'AIMessage') {
        return new AIMessage(msg.content);
      } else if (msg.type === 'SystemMessage') {
        return new SystemMessage(msg.content);
      }
    });
  } catch (e) {
    console.log("没有历史对话，从头开始");
  }
}
```

---

## 📝 本章小结

- LangChain v1.x 推荐**手动管理消息数组**
- 使用 `push()` 添加消息，`invoke()` 发送对话
- 可以限制历史长度节省 token
- 可以封装为 ChatBot 类
- 可以持久化保存到文件

---

## 🏃 下一章

[10-工具 (Tools) →](./10-工具 (Tools).md)

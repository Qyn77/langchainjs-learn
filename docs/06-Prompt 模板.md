# 06-Prompt 模板：动态生成提示词

> 💡 **注意：** 本教程适用于 LangChain.js v1.x，需要 Node.js 20+

## 🎯 本章目标

- ✅ 理解 Prompt 模板的作用
- ✅ 掌握 `PromptTemplate` 类
- ✅ 学会动态生成提示词

---

## 🤔 什么是 Prompt 模板？

### 没有模板时

```javascript
// ❌ 硬编码提示词
const message = new HumanMessage(
  "请将以下英文翻译成中文：Hello, how are you?"
);
```

问题：每次都要手动拼接字符串。

### 使用模板后

```javascript
// ✅ 使用模板
const prompt = PromptTemplate.fromTemplate(
  "请将以下{source_lang}翻译成{target_lang}：{text}"
);

const result = await prompt.format({
  source_lang: "英文",
  target_lang: "中文",
  text: "Hello, how are you?"
});
// 输出：请将以下英文翻译成中文：Hello, how are you?
```

---

## 📦 PromptTemplate 基本用法

### 1. 导入类

```javascript
import { PromptTemplate } from "@langchain/core/prompts";
```

### 2. 创建模板

```javascript
const prompt = PromptTemplate.fromTemplate(
  "你好，{name}！今天是{date}。"
);
```

### 3. 填充变量

```javascript
const result = await prompt.format({
  name: "小明",
  date: "2026 年 3 月 11 日"
});

console.log(result);
// 输出：你好，小明！今天是 2026 年 3 月 11 日。
```

---

## 💡 完整示例

```javascript
import { ChatOpenAI } from "@langchain/openai";
import { HumanMessage } from "@langchain/core/messages";
import { PromptTemplate } from "@langchain/core/prompts";

const model = new ChatOpenAI({
  model: "MiniMax/MiniMax-M2.5",
  apiKey: process.env.MODELSCOPE_API_KEY,
  configuration: {
    baseURL: "https://api-inference.modelscope.cn/v1",
  },
});

// 示例 1：简单翻译模板
const translatePrompt = PromptTemplate.fromTemplate(
  "请将以下{source_lang}翻译成{target_lang}：{text}"
);

const translated = await translatePrompt.format({
  source_lang: "英文",
  target_lang: "中文",
  text: "The quick brown fox jumps over the lazy dog."
});

const response1 = await model.invoke([new HumanMessage(translated)]);
console.log("翻译结果:", response1.content);

// 示例 2：文章摘要模板
const summaryPrompt = PromptTemplate.fromTemplate(
  `请为以下文章写一个 50 字以内的摘要：

文章：{article}

摘要：`
);

const summaryInput = await summaryPrompt.format({
  article: "人工智能是计算机科学的一个分支..."
});

const response2 = await model.invoke([new HumanMessage(summaryInput)]);
console.log("摘要:", response2.content);

// 示例 3：角色扮演模板
const rolePrompt = PromptTemplate.fromTemplate(
  `你是一个{role}。请回答以下问题：

问题：{question}`
);

const roleInput = await rolePrompt.format({
  role: "幼儿园老师",
  question: "为什么天是蓝的？"
});

const response3 = await model.invoke([new HumanMessage(roleInput)]);
console.log("回答:", response3.content);
```

---

## 📋 模板变量语法

### 1. 简单变量

```javascript
const prompt = PromptTemplate.fromTemplate(
  "你好，{name}！"
);

await prompt.format({ name: "小明" });
```

### 2. 多变量

```javascript
const prompt = PromptTemplate.fromTemplate(
  "从{start}到{end}，{subject}的发展历程是{description}。"
);

await prompt.format({
  start: "1950 年",
  end: "2026 年",
  subject: "人工智能",
  description: "波澜壮阔的"
});
```

### 3. 带默认值（高级）

```javascript
const prompt = new PromptTemplate({
  template: "你好，{name}！{greeting}",
  inputVariables: ["name"],
  partialVariables: {
    greeting: "祝你今天愉快！"  // 默认值
  }
});

await prompt.format({ name: "小明" });
// 输出：你好，小明！祝你今天愉快！
```

---

## ⚙️ PromptTemplate 参数详解

```javascript
const prompt = new PromptTemplate(options);

// options 参数：
// - template: string - 模板字符串
// - inputVariables: string[] - 输入变量列表
// - partialVariables?: object - 部分变量（默认值）
// - outputParser?: OutputParser - 输出解析器
```

### 示例：带默认值的模板

```javascript
const prompt = new PromptTemplate({
  template: "你好，{name}！我是{assistant_name}。",
  inputVariables: ["name"],
  partialVariables: {
    assistant_name: "AI 助手"
  }
});

await prompt.format({ name: "小明" });
// 输出：你好，小明！我是 AI 助手。
```

---

## 🎯 实际应用场景

### 1. 批量处理

```javascript
const texts = ["文本 1", "文本 2", "文本 3"];

const sentimentPrompt = PromptTemplate.fromTemplate(
  "分析以下文本的情感倾向（正面/负面/中性）：{text}"
);

for (const text of texts) {
  const input = await sentimentPrompt.format({ text });
  const response = await model.invoke([new HumanMessage(input)]);
  console.log(`${text}: ${response.content}`);
}
```

### 2. 多语言支持

```javascript
const greetPrompt = PromptTemplate.fromTemplate(
  "用{language}说'你好，世界'"
);

await greetPrompt.format({ language: "英语" });  // Hello, World
await greetPrompt.format({ language: "日语" });  // こんにちは、世界
await greetPrompt.format({ language: "法语" });  // Bonjour le monde
```

### 3. 代码生成

```javascript
const codePrompt = PromptTemplate.fromTemplate(
  `用{language}写一个函数，实现{functionality}

函数名：{function_name}

代码：`
);

const codeInput = await codePrompt.format({
  language: "Python",
  functionality: "计算两个数的和",
  function_name: "add"
});

const response = await model.invoke([new HumanMessage(codeInput)]);
```

---

## ⚠️ 注意事项

### 1. 变量名要匹配

```javascript
// ❌ 错误：变量名不匹配
const prompt = PromptTemplate.fromTemplate("你好，{name}！");
await prompt.format({ userName: "小明" });  // 报错

// ✅ 正确
await prompt.format({ name: "小明" });
```

### 2. 转义花括号

如果模板中需要字面的 `{` 或 `}`，使用双花括号：

```javascript
const prompt = PromptTemplate.fromTemplate(
  "JSON 格式：{{key: value}}，其中 value 是{user_input}"
);

await prompt.format({ user_input: "测试" });
// 输出：JSON 格式：{{key: value}}，其中 value 是 测试
```

### 3. 检查变量是否完整

```javascript
const prompt = PromptTemplate.fromTemplate("你好，{name}！");

// 检查需要的变量
console.log(prompt.inputVariables);  // ['name']

// 如果缺少变量会报错
await prompt.format({});  // Error: Missing value for input variable: name
```

---

## 📝 本章小结

- Prompt 模板 = 可复用的提示词模板
- 使用 `{变量名}` 占位
- 用 `format()` 填充变量
- 适合批量处理和动态生成

---

## 🏃 下一章

[07-输出解析器 →](./07-输出解析器.md)

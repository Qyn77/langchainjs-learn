# 08-链 (Chain)：组合多个操作

> 💡 **注意：** 本教程适用于 LangChain.js v1.x，需要 Node.js 20+

## 🎯 本章目标

- ✅ 理解链 (Chain) 的概念
- ✅ 掌握 `.pipe()` 方法
- ✅ 创建多步骤工作流

---

## 🤔 什么是链 (Chain)？

**链 = 把多个组件像管道一样连接起来**

```
输入 → Prompt → Model → 输出
```

---

## 📦 .pipe() 方法

`.pipe()` 是 LangChain v1.x 的核心 API，用于连接组件：

```javascript
const chain = A.pipe(B).pipe(C);
```

数据流：
```
输入 → A → B → C → 输出
```

---

## 💡 完整示例

### 示例 1：简单链（Prompt + Model）

```javascript
import { ChatOpenAI } from "@langchain/openai";
import { PromptTemplate } from "@langchain/core/prompts";

const model = new ChatOpenAI({
  model: "MiniMax/MiniMax-M2.5",
  apiKey: process.env.MODELSCOPE_API_KEY,
  configuration: {
    baseURL: "https://api-inference.modelscope.cn/v1",
  },
});

// 创建 Prompt
const simplePrompt = PromptTemplate.fromTemplate(
  "用一句话解释什么是{topic}"
);

// 创建链：Prompt → Model
const simpleChain = simplePrompt.pipe(model);

// 调用
const result = await simpleChain.invoke({ topic: "人工智能" });
console.log("解释:", result.content);
```

### 示例 2：带 JSON 解析的链

```javascript
import { z } from "zod";

// 定义 Schema
const schema = z.object({
  term: z.string(),
  definition: z.string(),
  example: z.string()
});

// 创建 Prompt
const structuredPrompt = PromptTemplate.fromTemplate(
  "请用 JSON 格式解释什么是{topic}，包含 term、definition、example 三个字段。只返回 JSON。"
);

// 创建链：Prompt → Model
const structuredChain = structuredPrompt.pipe(model);

// 调用
const response = await structuredChain.invoke({ topic: "机器学习" });

// 手动解析 JSON
const jsonStr = response.content.match(/\{[\s\S]*\}/)[0];
const result = schema.parse(JSON.parse(jsonStr));

console.log("术语:", result.term);
console.log("定义:", result.definition);
console.log("例子:", result.example);
```

### 示例 3：多步骤链

```javascript
// 第一步：生成大纲
const outlinePrompt = PromptTemplate.fromTemplate(
  "为'{topic}'文章生成一个 3 级大纲"
);
const outlineChain = outlinePrompt.pipe(model);

// 第二步：根据大纲写引言
const introPrompt = PromptTemplate.fromTemplate(
  `根据以下大纲写一段 100 字的引言：
大纲：{outline}
引言：`
);
const introChain = introPrompt.pipe(model);

// 手动串联两个链
const topic = "人工智能的发展";
const outline = await outlineChain.invoke({ topic });
const intro = await introChain.invoke({ outline: outline.content });

console.log("大纲:", outline.content);
console.log("引言:", intro.content);
```

---

## 📋 Runnable 接口

所有 LangChain 组件都实现 `Runnable` 接口，支持以下方法：

| 方法 | 说明 | 返回值 | 示例 |
|------|------|--------|------|
| `.invoke(input)` | 单次调用 | `Promise<T>` | `await chain.invoke({topic})` |
| `.stream(input)` | 流式调用 | `AsyncIterable<T>` | `for await (const c of await chain.stream(input))` |
| `.batch(inputs)` | 批量调用 | `Promise<T[]>` | `await chain.batch([{topic1}, {topic2}])` |
| `.pipe(other)` | 连接到下一个组件 | `RunnableSequence` | `A.pipe(B)` |

---

## 🔧 链的组合方式

### 1. 串行链

```javascript
const chain = prompt.pipe(model).pipe(parser);
```

### 2. 并行链（RunnableParallel）

```javascript
import { RunnableParallel } from "@langchain/core/runnables";

const chain = RunnableParallel({
  summary: summaryChain,
  keywords: keywordChain,
  sentiment: sentimentChain
});

const result = await chain.invoke({ text: "..." });
// result = { summary: "...", keywords: [...], sentiment: "..." }
```

### 3. 条件链

```javascript
const chain = condition ? chainA : chainB;
const result = await chain.invoke(input);
```

### 4. 自定义链

```javascript
import { RunnableSequence } from "@langchain/core/runnables";

const customChain = RunnableSequence.from([
  prompt,
  model,
  async (output) => {
    // 自定义处理逻辑
    return output.content.toUpperCase();
  }
]);
```

---

## 🎯 实际应用场景

### 1. 内容生成工作流

```javascript
// 大纲 → 草稿 → 润色
const outlineChain = outlinePrompt.pipe(model);
const draftChain = draftPrompt.pipe(model);
const polishChain = polishPrompt.pipe(model);

const outline = await outlineChain.invoke({ topic });
const draft = await draftChain.invoke({ outline: outline.content });
const final = await polishChain.invoke({ draft: draft.content });
```

### 2. 数据分析工作流

```javascript
// 提取 → 分析 → 总结
const extractChain = extractPrompt.pipe(model);
const analyzeChain = analyzePrompt.pipe(model);
const summarizeChain = summarizePrompt.pipe(model);

const data = await extractChain.invoke({ text });
const analysis = await analyzeChain.invoke({ data: data.content });
const summary = await summarizeChain.invoke({ analysis: analysis.content });
```

### 3. 多语言翻译

```javascript
const detectChain = detectPrompt.pipe(model);
const translateChain = translatePrompt.pipe(model);

// 先检测语言，再翻译
const detected = await detectChain.invoke({ text });
const isChinese = detected.content.includes("中文");

const targetPrompt = isChinese ? "翻译成英文" : "翻译成中文";
const translation = await translateChain.invoke({ 
  text, 
  target: targetPrompt 
});
```

---

## ⚠️ 注意事项

### 1. 错误处理

```javascript
try {
  const result = await chain.invoke(input);
} catch (error) {
  console.error("链执行失败:", error.message);
}
```

### 2. 输入输出匹配

确保前一个组件的输出与后一个组件的输入匹配：

```javascript
// ✅ 正确：prompt 输出 string，model 接收 messages
const prompt = PromptTemplate.fromTemplate("...");
const chain = prompt.pipe(model);

// ❌ 错误：类型不匹配会导致失败
```

### 3. 调试链

```javascript
// 添加日志
const loggingChain = prompt.pipe(model).pipe((output) => {
  console.log("Model output:", output);
  return output;
});
```

---

## 📊 链的性能优化

### 1. 批量处理

```javascript
// 比循环调用 invoke() 更快
const results = await chain.batch([
  { topic: "人工智能" },
  { topic: "机器学习" },
  { topic: "深度学习" }
]);
```

### 2. 并发执行

```javascript
const [result1, result2] = await Promise.all([
  chain1.invoke(input1),
  chain2.invoke(input2)
]);
```

---

## 📝 本章小结

- 链 (Chain) = 组合多个组件
- `.pipe()` 用于连接组件
- 所有组件都实现 `Runnable` 接口
- 支持 `invoke()`、`stream()`、`batch()` 方法

---

## 🏃 下一章

[09-记忆 (Memory) →](./09-记忆 (Memory).md)

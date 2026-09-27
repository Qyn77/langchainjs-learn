# 13-RAG（检索增强生成）

> 📅 适用于 LangChain.js v1.x | 👶 零基础友好
> 💡 **注意：** 需要 Node.js 20+

---

## 📖 什么是 RAG？

**RAG = Retrieval-Augmented Generation（检索增强生成）**

简单说：RAG 是一种让 AI **先查资料再回答**的技术。

---

## 🤔 为什么需要 RAG？

### 大模型的局限性

```
❌ 知识截止：模型训练数据有截止日期
❌ 无法访问私有数据：公司文档、个人笔记等
❌ 幻觉问题：可能编造不实信息
❌ 无法更新：训练后知识固定
```

### RAG 的解决方案

```
用户提问
   │
   ▼
┌─────────────────┐
│   检索相关文档   │ ←── 从知识库/数据库中查找
└─────────────────┘
   │
   ▼
┌─────────────────┐
│   组装上下文    │ ←── 问题 + 相关文档
└─────────────────┘
   │
   ▼
┌─────────────────┐
│   AI 生成回答    │ ←── 基于检索到的信息
└─────────────────┘
   │
   ▼
返回准确答案
```

---

## 🧱 RAG 的核心组件

```
┌─────────────────────────────────────────────────────────┐
│                      RAG 系统                            │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │  文档加载    │  │  文本分割    │  │  向量化      │  │
│  │  (Loader)    │  │  (Splitter)  │  │  (Embedding) │  │
│  │              │  │              │  │              │  │
│  │ 读取文件/URL │  │ 切分成小块   │  │ 转为向量    │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
│         │                │                │             │
│         ▼                ▼                ▼             │
│  ┌─────────────────────────────────────────────────┐   │
│  │              向量存储 (VectorStore)              │   │
│  │                                                 │   │
│  │  存储文档向量，支持相似度搜索                    │   │
│  └─────────────────────────────────────────────────┘   │
│                          │                              │
│                          ▼                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │  检索器      │  │  提示词      │  │  大模型      │  │
│  │  (Retriever) │  │  (Prompt)    │  │  (LLM)       │  │
│  │              │  │              │  │              │  │
│  │ 搜索相关文档 │  │ 组装上下文   │  │ 生成回答    │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
└─────────────────────────────────────────────────────────┘
```

---

## 📦 安装依赖

```bash
npm install @langchain/core @langchain/openai @langchain/classic zod
# @langchain/classic 提供 MemoryVectorStore（真实向量存储，见下文方式 B）
```

---

## 💡 RAG 完整流程示例

### 步骤 1：准备知识库

```javascript
import { ChatOpenAI } from "@langchain/openai";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";

// 示例文档（实际应用中可能从文件/数据库加载）
const documents = [
  `公司名称：未来科技有限公司
成立时间：2020 年
总部地点：北京市海淀区
主营业务：人工智能软件开发、技术咨询
员工人数：500 人`,
  
  `产品 A：智能客服系统
功能：自动回答客户问题、工单管理
价格：9999 元/年
适用场景：电商、金融、教育行业`,
  
  `产品 B：数据分析平台
功能：数据可视化、报表生成、预测分析
价格：19999 元/年
适用场景：企业决策、市场分析`,
  
  `联系方式
地址：北京市海淀区中关村大街 1 号
电话：400-123-4567
邮箱：contact@futuretech.com
工作时间：周一至周五 9:00-18:00`
];

// 文本分割
const splitter = new RecursiveCharacterTextSplitter({
  chunkSize: 200,      // 每块最大 200 字符
  chunkOverlap: 20,    // 块之间重叠 20 字符
});

const splitDocs = await splitter.splitText(documents.join("\n\n"));
console.log("分割后的文档块数:", splitDocs.length);
splitDocs.forEach((doc, i) => {
  console.log(`\n块${i + 1}:`, doc);
});
```

### 步骤 2：创建简单 RAG（不使用向量存储）

```javascript
import { ChatOpenAI } from "@langchain/openai";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";

const model = new ChatOpenAI({
  model: "MiniMax/MiniMax-M2.5",
  apiKey: "你的 API Key",
  temperature: 0,
  configuration: {
    baseURL: "https://api-inference.modelscope.cn/v1",
  },
});

// 知识库文档
const knowledgeBase = [
  "公司成立于 2020 年，总部位于北京。",
  "主要产品有智能客服系统（9999 元/年）和数据分析平台（19999 元/年）。",
  "联系电话：400-123-4567，邮箱：contact@futuretech.com。",
  "工作时间：周一至周五 9:00-18:00。"
];

// 简单相似度搜索（基于关键词匹配）
function simpleSearch(query, docs, topK = 2) {
  // 中文分词：按字符分割（简单方式，适合中文）
  const queryWords = query.split('').filter(c => c.trim());

  const scored = docs.map((doc, index) => {
    const docLower = doc.toLowerCase();
    let score = 0;
    queryWords.forEach(word => {
      if (docLower.includes(word)) score += 1;
    });
    return { index, doc, score };
  });

  // 按分数排序，返回前 K 个
  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, topK)
    .map(item => item.doc);
}

// RAG 主函数
async function ragQuery(question) {
  console.log("\n📝 用户问题:", question);
  
  // 1. 检索相关文档
  const relevantDocs = simpleSearch(question, knowledgeBase, 2);
  console.log("\n📚 检索到的文档:");
  relevantDocs.forEach((doc, i) => {
    console.log(`  ${i + 1}. ${doc}`);
  });
  
  // 2. 组装提示词
  const context = relevantDocs.join("\n");
  
  const prompt = new SystemMessage(`
你是一个客服助手。请根据以下参考资料回答问题。
如果资料中没有答案，请说"抱歉，我没有找到相关信息"。

参考资料：
${context}
`);
  
  // 3. 生成回答
  const response = await model.invoke([
    prompt,
    new HumanMessage(question)
  ]);
  
  console.log("\n🤖 AI 回答:", response.content);
  return response.content;
}

// 测试
await ragQuery("公司什么时候成立的？");
await ragQuery("智能客服系统多少钱？");
await ragQuery("怎么联系你们？");
```

---

## 🎯 方式 B：真实向量检索（MemoryVectorStore + Embeddings）

> 💡 **包位置：** `MemoryVectorStore` 在 LangChain 1.x 中位于 `@langchain/classic/vectorstores/memory`（从旧包迁移而来，仍然可用）。
>
> ⚠️ **Embedding 服务：** 真实向量检索需要 Embedding 接口。ModelScope 的 api-inference 主要面向对话/生成模型，本教程写作时未确认其提供 OpenAI 兼容的 `/embeddings` 端点，因此示例使用 OpenAI 的 Embedding 服务；任何 OpenAI 兼容的 Embedding 平台（阿里云百炼兼容模式、智谱等）只需替换 `apiKey` 和 `baseURL`。

```javascript
import { ChatOpenAI, OpenAIEmbeddings } from "@langchain/openai";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { MemoryVectorStore } from "@langchain/classic/vectorstores/memory";

const model = new ChatOpenAI({
  model: "MiniMax/MiniMax-M2.5",
  apiKey: process.env.MODELSCOPE_API_KEY,
  temperature: 0,
  configuration: {
    baseURL: "https://api-inference.modelscope.cn/v1",
  },
});

// 1. Embedding 模型：把文本转成向量
const embeddings = new OpenAIEmbeddings({
  model: "text-embedding-3-small",
  apiKey: process.env.OPENAI_API_KEY,
});

// 2. 构建向量存储：每段文本都会被自动向量化后存入内存
const vectorStore = await MemoryVectorStore.fromTexts(
  [
    "Python 是一种高级编程语言，由 Guido van Rossum 于 1989 年发明。",
    "JavaScript 主要用于网页开发，也可以用 Node.js 做后端。",
    "C++ 是一种高性能语言，常用于游戏开发和系统编程。",
    "Go 语言由 Google 开发，适合构建高性能的后端服务。",
  ],
  [{ source: "python" }, { source: "javascript" }, { source: "cpp" }, { source: "go" }],
  embeddings
);

// 3. 语义检索：就算说法不同，意思相近也能找到！
const results = await vectorStore.similaritySearch("这门语言的创始人是谁？", 2);
results.forEach((doc, i) => {
  console.log(`${i + 1}. [${doc.metadata.source}] ${doc.pageContent}`);
});
// 1. [python] Python 是一种高级编程语言，由 Guido van Rossum 于 1989 年发明。
//    ↑ 注意："创始人"和"发明"用词不同，字符匹配找不到，向量检索可以！

// 4. 完整 RAG：检索 → 组装上下文 → 生成
async function ragQuery(question) {
  console.log("\n📝 用户问题:", question);

  const relevantDocs = await vectorStore.similaritySearch(question, 2);
  const context = relevantDocs.map((d) => d.pageContent).join("\n");

  const response = await model.invoke([
    new SystemMessage(
      `你是一个编程助手。请根据以下参考资料回答问题，资料中没有的信息不要编造。\n\n参考资料：\n${context}`
    ),
    new HumanMessage(question),
  ]);

  console.log("🤖 AI 回答:", response.content);
  return response.content;
}

await ragQuery("Python 是谁发明的？");
await ragQuery("哪种语言适合写游戏？");
```

### 字符匹配 vs 向量检索

| | 字符匹配（方式 A） | 向量检索（方式 B） |
|---|---|---|
| 原理 | 统计查询字符在文档中出现的次数 | 文本转向量，计算余弦相似度 |
| 同义换说法 | ❌ 检索不到 | ✅ 语义相近即可命中 |
| 额外依赖 | 无 | 需要 Embedding 服务 |
| 定位 | 快速原型、理解流程 | 生产 RAG 的标准做法 |

---

## 📎 附：字符匹配版 RAG（无 Embedding 服务时的替代）

> 下面用字符匹配模拟"检索→组装→生成"的流程，便于在不引入 Embedding 服务的情况下理解 RAG 的骨架；真实项目请使用上面的向量检索。

```javascript

import { ChatOpenAI } from "@langchain/openai";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";

// 向量存储的工作流程：
// 1. 文档 → Embedding → 向量
// 2. 查询 → Embedding → 向量
// 3. 相似度搜索 → 找到最相似的文档
// 4. 组装上下文 → 生成回答

// 简单实现（不使用向量存储）
const documents = [
  "Python 是一种高级编程语言，由 Guido van Rossum 于 1989 年发明。",
  "JavaScript 主要用于网页开发，可以在浏览器中运行。",
  "Java 是一种面向对象的编程语言，广泛用于企业级应用。",
  "C++ 是一种高性能语言，常用于游戏开发和系统编程。",
  "Go 语言由 Google 开发，适合构建高性能的后端服务。"
];

// 简单相似度搜索（基于字符匹配）
function simpleSearch(query, docs, topK = 2) {
  // 中文分词：按字符分割
  const queryWords = query.split('').filter(c => c.trim());

  const scored = docs.map((doc, index) => {
    const docLower = doc.toLowerCase();
    let score = 0;
    queryWords.forEach(word => {
      if (docLower.includes(word)) score += 1;
    });
    return { index, doc, score };
  });

  // 按分数排序，返回前 K 个
  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, topK)
    .map(item => item.doc);
}

const model = new ChatOpenAI({
  model: "MiniMax/MiniMax-M2.5",
  apiKey: "你的 API Key",
  temperature: 0,
  configuration: {
    baseURL: "https://api-inference.modelscope.cn/v1",
  },
});

// RAG 查询
async function queryRAG(question) {
  console.log("📝 用户问题:", question);

  // 1. 检索相关文档
  const relevantDocs = simpleSearch(question, documents, 2);

  console.log("\n📚 检索到的文档:");
  relevantDocs.forEach((doc, i) => {
    console.log(`  ${i + 1}. ${doc}`);
  });

  // 2. 组装上下文
  const context = relevantDocs.join("\n");

  // 3. 生成回答
  const prompt = new SystemMessage(`
你是一个编程助手。请根据以下参考资料回答问题。
如果资料中没有答案，请如实告知。

参考资料：
${context}
`);

  const response = await model.invoke([
    prompt,
    new HumanMessage(question)
  ]);

  console.log("\n🤖 AI 回答:", response.content);
  return response.content;
}

// 运行
await queryRAG("Python 是谁发明的？");
await queryRAG("哪种语言适合游戏开发？");
```

### 输出示例

```
📝 用户问题：Python 是谁发明的？

📚 检索到的文档:
  1. Python 是一种高级编程语言，由 Guido van Rossum 于 1989 年发明。
  2. Go 语言由 Google 开发，适合构建高性能的后端服务。

🤖 AI 回答：根据参考资料，Python 是由 **Guido van Rossum** 于 1989 年发明的。
```

---

## 🔄 RAG 工作流程详解

```
┌─────────────────────────────────────────────────────────────┐
│                    RAG 完整流程                              │
└─────────────────────────────────────────────────────────────┘

【索引阶段】（离线）
1. 加载文档 → 2. 文本分割 → 3. 向量化 → 4. 存储到向量数据库

【查询阶段】（在线）
1. 用户提问
        │
        ▼
2. 问题向量化
        │
        ▼
3. 相似度搜索 → 找到最相关的文档片段
        │
        ▼
4. 组装提示词 → 问题 + 相关文档
        │
        ▼
5. AI 生成回答
        │
        ▼
6. 返回答案
```

---

## 📊 文本分割策略

### 1. 按字符数分割

```javascript
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";

const splitter = new RecursiveCharacterTextSplitter({
  chunkSize: 500,      // 每块最大 500 字符
  chunkOverlap: 50,    // 重叠 50 字符，保持上下文连贯
});

const chunks = await splitter.splitText(longText);
```

### 2. 按段落分割

```javascript
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";

const splitter = new RecursiveCharacterTextSplitter({
  chunkSize: 1000,
  chunkOverlap: 0,
  separators: ["\n\n", "\n", "。", "！", "？", "。", " ", ""],  // 优先按段落分割
});
```

### 3. 按代码分割

```javascript
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";

const splitter = RecursiveCharacterTextSplitter.fromLanguage("python", {
  chunkSize: 500,
  chunkOverlap: 0,
});

const codeChunks = await splitter.splitText(pythonCode);
```

---

## 🎯 实际应用场景

### 场景 1：公司知识库问答

```javascript
const companyDocs = [
  "员工手册：工作时间 9:00-18:00，周末双休。",
  "报销流程：每月 15 日前提交上月发票，财务审核后打款。",
  "请假制度：年假 5 天，病假需提供医院证明。",
  "福利：五险一金、年度体检、节日礼品。"
];

// 员工提问："年假有几天？"
// RAG 检索到"请假制度"相关文档
// AI 回答："根据公司制度，年假有 5 天。"
```

### 场景 2：产品文档问答

```javascript
const productDocs = [
  "安装步骤：1.下载安装包 2.运行安装程序 3.选择安装路径 4.完成安装",
  "系统要求：Windows 10+, 8GB 内存，50GB 硬盘空间",
  "常见问题：无法启动请检查防火墙设置"
];

// 用户提问："安装需要什么配置？"
// RAG 检索到"系统要求"相关文档
// AI 回答："需要 Windows 10 以上系统，8GB 内存，50GB 硬盘空间。"
```

### 场景 3：论文/文献检索

```javascript
const papers = [
  "论文 A：深度学习在图像识别中的应用，准确率 95%",
  "论文 B：自然语言处理的最新进展，BERT 模型介绍",
  "论文 C：强化学习在游戏 AI 中的应用案例"
];

// 研究者提问："图像识别的准确率是多少？"
// RAG 检索到"论文 A"
// AI 回答："根据论文 A，深度学习在图像识别中准确率达到 95%。"
```

---

## ⚠️ 注意事项

### 1. 文档质量

```javascript
// ✅ 好的文档：结构清晰、信息准确
const goodDocs = [
  "公司名称：XX 科技，成立于 2020 年。",
  "产品 A 价格：999 元/年，功能包括..."
];

// ❌ 差的文档：混乱、错误信息
const badDocs = [
  "大概可能也许是 2020 年吧",
  "价格不太确定，好像 999 块"
];
```

### 2. 检索数量

```javascript
// 太少：可能遗漏关键信息
const retriever = vectorStore.asRetriever(1);  // 只返回 1 个

// 太多：增加 token 消耗，可能混淆
const retriever = vectorStore.asRetriever(20);  // 返回 20 个

// ✅ 推荐：3-5 个
const retriever = vectorStore.asRetriever(3);  // 返回 3 个
```

### 3. 提示词设计

```javascript
// ✅ 好的提示词
const prompt = new SystemMessage(`
你是一个客服助手。请根据以下参考资料回答问题。
如果资料中没有答案，请说"抱歉，我没有找到相关信息"。
不要编造资料中没有的内容。

参考资料：
{context}
`);

// ❌ 差的提示词
const prompt = new SystemMessage("回答问题：");  // 没有说明使用参考资料
```

---

## 📝 本章小结

- RAG = 检索 + 生成，让 AI 先查资料再回答
- 核心组件：文档加载、文本分割、向量化、检索、生成
- 可以解决知识截止、私有数据、幻觉问题
- 真实向量检索：`MemoryVectorStore`（`@langchain/classic`）+ `OpenAIEmbeddings`，按语义而非关键词
- 字符匹配只是无 Embedding 服务时的简化模拟
- 提示词设计很重要

---

## 🏃 下一章

[14-VectorStore（向量存储） →](./14-VectorStore（向量存储）.md)

---

## 🔗 更多资源

- [LangChain RAG 文档](https://js.langchain.com/docs/tutorials/rag/)
- [向量数据库对比](https://python.langchain.com/docs/integrations/vectorstores/)

# 14-VectorStore（向量存储）

> 📅 适用于 LangChain.js v1.x | 👶 零基础友好
> 💡 **注意：** 需要 Node.js 20+

> ⚠️ **重要说明：** LangChain v1.x 中 `MemoryVectorStore` 已被移除或移动到其他包。
> 本章将介绍向量存储的概念，并提供一个**可运行的简单实现**作为替代方案。

---

## 📖 什么是向量存储？

**向量存储 = 存储向量的数据库 + 相似度搜索功能**

简单说：向量存储是一种可以**按语义搜索**的数据库。

---

## 🤔 为什么需要向量存储？

### 传统搜索 vs 向量搜索

```
【传统关键词搜索】
搜索："苹果"
结果：包含"苹果"这个词的文档
❌ 找不到"水果"、"iPhone"等相关内容

【向量搜索】
搜索："苹果"
结果：包含"苹果"的文档 + "水果"、"iPhone"、"iPad"等语义相关的文档
✅ 找到语义相关的内容
```

---

## 🧱 核心概念

### 1. 向量（Vector）

向量是一组数字，表示数据的特征：

```javascript
// 文本的向量表示（Embedding）
"猫" → [0.1, 0.5, -0.3, 0.8, ...]  // 1536 维向量
"狗" → [0.2, 0.4, -0.2, 0.7, ...]  // 1536 维向量
"汽车" → [-0.5, 0.1, 0.6, -0.4, ...]  // 1536 维向量
```

### 2. 相似度计算

```
余弦相似度：
- 值越接近 1，越相似
- 值越接近 -1，越不相似

"猫"和"狗"的相似度：0.85  // 都是动物，较相似
"猫"和"汽车"的相似度：0.12  // 不相关，不相似
```

### 3. 向量存储的作用

```
┌─────────────────────────────────────────┐
│          向量存储 (VectorStore)          │
├─────────────────────────────────────────┤
│                                         │
│  存储：文本 → 向量                       │
│  搜索：查询向量 → 最相似的文本           │
│                                         │
│  ┌───────────┐     ┌───────────┐       │
│  │ 文本 1     │     │ 向量 1     │       │
│  │ 文本 2     │  →  │ 向量 2     │       │
│  │ 文本 3     │     │ 向量 3     │       │
│  └───────────┘     └───────────┘       │
│                          │              │
│                          ▼              │
│                   ┌───────────┐        │
│                   │ 查询向量   │        │
│                   └───────────┘        │
│                          │              │
│                          ▼              │
│                   ┌───────────┐        │
│                   │ 相似度搜索 │        │
│                   └───────────┘        │
│                          │              │
│                          ▼              │
│                   ┌───────────┐        │
│                   │ 最相似的   │        │
│                   │ 文本 TopK  │        │
│                   └───────────┘        │
└─────────────────────────────────────────┘
```

---

## 📦 安装依赖

```bash
npm install @langchain/core @langchain/openai zod
```

---

## 💡 向量存储类型对比

| 向量存储 | 类型 | 特点 | 使用场景 |
|---------|------|------|----------|
| `MemoryVectorStore` | 内存 | 简单、快速、重启丢失 | ⚠️ LangChain v1.x 已移除 |
| `Chroma` | 数据库 | 开源、易用 | 中小型项目 |
| `Pinecone` | 云服务 | 高性能、托管 | 生产环境 |
| `Weaviate` | 数据库 | 功能丰富 | 企业级应用 |
| `Milvus` | 数据库 | 高性能、分布式 | 大规模应用 |

---

## 🔧 简单向量存储实现（可运行）

> ⚠️ 由于 `MemoryVectorStore` 在 LangChain v1.x 中不可用，这里提供一个简单的实现作为替代。

### 示例 1：基础用法

```javascript
import { ChatOpenAI } from "@langchain/openai";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { Document } from "@langchain/core/documents";

// 创建模型
const model = new ChatOpenAI({
  modelName: "MiniMax/MiniMax-M2.5",
  apiKey: "你的 API Key",
  temperature: 0,
  configuration: {
    baseURL: "https://api-inference.modelscope.cn/v1",
  },
});

// 创建文档
const documents = [
  new Document({
    pageContent: "Python 是一种高级编程语言，由 Guido van Rossum 于 1989 年发明。",
    metadata: { source: "编程语言", category: "技术" }
  }),
  new Document({
    pageContent: "JavaScript 主要用于网页开发，可以在浏览器中运行。",
    metadata: { source: "编程语言", category: "技术" }
  }),
  new Document({
    pageContent: "Java 是一种面向对象的编程语言，广泛用于企业级应用。",
    metadata: { source: "编程语言", category: "技术" }
  }),
  new Document({
    pageContent: "C++ 是一种高性能语言，常用于游戏开发和系统编程。",
    metadata: { source: "编程语言", category: "技术" }
  })
];

// 简单相似度搜索（基于字符匹配，模拟向量搜索）
function similaritySearch(query, docs, topK = 2) {
  // 中文分词：按字符分割
  const queryWords = query.split('').filter(c => c.trim());

  const scored = docs.map((doc, index) => {
    const content = doc.pageContent.toLowerCase();
    let score = 0;
    queryWords.forEach(word => {
      if (content.includes(word)) score += 1;
    });
    return { index, doc, score };
  });

  // 按分数排序，返回前 K 个
  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, topK)
    .map(item => item.doc);
}

console.log("📚 正在构建知识库...\n");
console.log("✅ 知识库构建完成！共", documents.length, "个文档\n");

// 相似度搜索
const results = similaritySearch("哪种语言适合做游戏？", documents, 2);

console.log("\n📚 搜索结果:");
results.forEach((doc, i) => {
  console.log(`  ${i + 1}. ${doc.pageContent}`);
  console.log(`     元数据：${JSON.stringify(doc.metadata)}`);
});
```

### 输出示例

```
📚 正在构建知识库...

✅ 知识库构建完成！共 4 个文档

📚 搜索结果:
  1. C++ 是一种高性能语言，常用于游戏开发和系统编程。
     元数据：{"source":"编程语言","category":"技术"}
  2. Java 是一种面向对象的编程语言，广泛用于企业级应用。
     元数据：{"source":"编程语言","category":"技术"}
```

### 示例 2：RAG 查询

```javascript
import { ChatOpenAI } from "@langchain/openai";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { Document } from "@langchain/core/documents";

const model = new ChatOpenAI({
  modelName: "MiniMax/MiniMax-M2.5",
  apiKey: "你的 API Key",
  temperature: 0,
  configuration: {
    baseURL: "https://api-inference.modelscope.cn/v1",
  },
});

const documents = [
  new Document({
    pageContent: "Python 是一种高级编程语言，由 Guido van Rossum 于 1989 年发明。",
    metadata: { source: "编程语言" }
  }),
  new Document({
    pageContent: "JavaScript 主要用于网页开发，可以在浏览器中运行。",
    metadata: { source: "编程语言" }
  }),
  new Document({
    pageContent: "C++ 是一种高性能语言，常用于游戏开发和系统编程。",
    metadata: { source: "编程语言" }
  })
];

// 简单相似度搜索
function similaritySearch(query, docs, topK = 2) {
  const queryWords = query.split('').filter(c => c.trim());
  const scored = docs.map((doc) => {
    const content = doc.pageContent.toLowerCase();
    let score = 0;
    queryWords.forEach(word => {
      if (content.includes(word)) score += 1;
    });
    return { doc, score };
  });
  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, topK)
    .map(item => item.doc);
}

// RAG 查询
async function queryRAG(question) {
  console.log("📝 用户问题:", question);

  // 1. 检索相关文档
  const relevantDocs = similaritySearch(question, documents, 2);

  console.log("\n📚 检索到的文档:");
  relevantDocs.forEach((doc, i) => {
    console.log(`  ${i + 1}. ${doc.pageContent}`);
  });

  // 2. 组装上下文
  const context = relevantDocs.map(doc => doc.pageContent).join("\n");

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
  2. C++ 是一种高性能语言，常用于游戏开发和系统编程。

🤖 AI 回答：根据参考资料，Python 是由 **Guido van Rossum** 于 1989 年发明的。
```

---

## 🎯 其他向量存储方案

### 1. 使用 Chroma（需要额外安装）

```bash
npm install @langchain/community chromadb
```

```javascript
// Chroma 需要运行 Chroma 服务器
// 这里仅展示概念，具体使用请参考官方文档
import { Chroma } from "@langchain/community/vectorstores/chroma";

const vectorStore = await Chroma.fromTexts(
  ["文本 1", "文本 2"],
  embeddings,
  {
    collectionName: "my_collection",
    url: "http://localhost:8000",
  }
);
```

### 2. 使用 Pinecone（云服务）

```bash
npm install @langchain/pinecone
```

```javascript
// Pinecone 是托管服务，需要 API Key
import { PineconeStore } from "@langchain/pinecone";
import { Pinecone } from "@pinecone-database/pinecone";

const pc = new Pinecone({ apiKey: "你的 API Key" });
const index = pc.index("my-index");

const vectorStore = await PineconeStore.fromTexts(
  ["文本 1", "文本 2"],
  embeddings,
  { pineconeIndex: index }
);
```

---

## 📊 向量存储操作详解

### 1. 创建方式

```javascript
// 从文本创建
const vectorStore = await MemoryVectorStore.fromTexts(
  ["文本 1", "文本 2", "文本 3"],
  { source: "文档" },
  embeddings
);

// 从文档创建
const vectorStore = await MemoryVectorStore.fromDocuments(
  documents,
  embeddings
);

// 简单实现（不使用向量存储）
const documents = [...];
function similaritySearch(query, docs, topK) { ... }
```

### 2. 搜索方法

```javascript
// 相似度搜索（返回文档）
const results = await vectorStore.similaritySearch(query, k);

// 简单实现
const results = similaritySearch(query, documents, k);

// 相似度搜索（带分数）
const results = await vectorStore.similaritySearchWithScore(query, k);

// 相似度搜索（带过滤）
const results = await vectorStore.similaritySearch(query, k, {
  filter: { source: "文档" }
});
```

### 3. 添加文档

```javascript
// 添加文本
await vectorStore.addText("新文本", { source: "文档" });

// 添加多个文本
await vectorStore.addTexts(["文本 1", "文本 2"]);

// 添加文档
await vectorStore.addDocuments([new Document({...})]);
```

---

## 🎓 实战项目：个人知识库

```javascript
import { ChatOpenAI } from "@langchain/openai";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { Document } from "@langchain/core/documents";

const model = new ChatOpenAI({
  modelName: "MiniMax/MiniMax-M2.5",
  apiKey: "你的 API Key",
  temperature: 0,
  configuration: {
    baseURL: "https://api-inference.modelscope.cn/v1",
  },
});

// 个人知识库内容
const personalKnowledge = [
  `【工作笔记】项目 A：智能客服系统 - 技术栈：Node.js + React + MongoDB`,
  `【工作笔记】项目 B：数据分析平台 - 技术栈：Python + Django + PostgreSQL`,
  `【学习笔记】React Hooks 使用心得：useState、useEffect、useContext`,
  `【会议记录】2026 年 3 月 10 日 周会 - 项目 A 进度正常，预计下周完成`,
  `【待办事项】完成项目 A 的 API 开发、编写项目 B 的需求文档`
];

// 创建文档
const documents = personalKnowledge.map((content, i) =>
  new Document({
    pageContent: content,
    metadata: { chunkIndex: i, source: "个人知识库" }
  })
);

// 简单相似度搜索
function similaritySearch(query, docs, topK = 3) {
  const queryWords = query.split('').filter(c => c.trim());
  const scored = docs.map((doc) => {
    const content = doc.pageContent.toLowerCase();
    let score = 0;
    queryWords.forEach(word => {
      if (content.includes(word)) score += 1;
    });
    return { doc, score };
  });
  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, topK)
    .map(item => item.doc);
}

// RAG 查询
async function queryKnowledgeBase(question) {
  console.log("📝 问题:", question);

  // 检索相关文档
  const relevantDocs = similaritySearch(question, documents, 3);

  console.log("\n📚 相关文档:");
  relevantDocs.forEach((doc, i) => {
    console.log(`  ${i + 1}. ${doc.pageContent}`);
  });

  // 组装上下文
  const context = relevantDocs.map(doc => doc.pageContent).join("\n\n");

  // 生成回答
  const prompt = new SystemMessage(`
你是一个个人助手。请根据用户的知识库内容回答问题。
如果知识库中没有相关信息，请如实告知。

知识库内容：
${context}
`);

  const response = await model.invoke([
    prompt,
    new HumanMessage(question)
  ]);

  console.log("\n🤖 回答:", response.content);
  console.log("\n" + "=".repeat(50) + "\n");

  return response.content;
}

// 运行
await queryKnowledgeBase("项目 A 的进度怎么样？");
await queryKnowledgeBase("React Hooks 有哪些？");
await queryKnowledgeBase("项目 B 的负责人是谁？");
```

---

## ⚠️ 注意事项

### 1. Embedding 模型选择

```javascript
// 英文文本
const embeddings = new OpenAIEmbeddings({
  modelName: "text-embedding-3-small",  // 性价比高
});

// 中文文本（需要支持中文的模型）
// 可以考虑：
// - OpenAI 的 embedding 模型（支持多语言）
// - 本地部署的中文 embedding 模型
// - 云服务商提供的中文 embedding API
```

### 2. 向量维度

```javascript
// 不同模型的向量维度不同
// text-embedding-3-small: 1536 维
// text-embedding-3-large: 3072 维

// 同一个向量存储必须使用相同维度的 embedding
```

### 3. 性能优化

```javascript
// 批量添加文档（比逐个添加快）
await vectorStore.addDocuments(documents);

// 使用索引加速搜索（大规模数据）
// Pinecone、Milvus 等支持索引

// 缓存搜索结果
const cache = new Map();
async function cachedSearch(query) {
  if (cache.has(query)) return cache.get(query);
  const result = similaritySearch(query, documents, 3);
  cache.set(query, result);
  return result;
}
```

---

## 📝 本章小结

- 向量存储 = 存储向量 + 相似度搜索
- LangChain v1.x 中 `MemoryVectorStore` 已移除
- 可以使用简单相似度搜索作为替代方案
- Chroma、Pinecone 适合生产环境
- Embedding 将文本转为向量
- 相似度搜索按语义而非关键词

---

## 🎓 教程完结！

你已经完成了 LangChain.js v1.x 入门教程的全部内容！

### 完整课程列表

| 章节 | 主题 |
|------|------|
| 01 | 基础概念 |
| 02 | 环境搭建 |
| 03 | 模型调用 |
| 04 | 消息类型 |
| 05 | 流式输出 |
| 06 | Prompt 模板 |
| 07 | 输出解析器 |
| 08 | 链 (Chain) |
| 09 | 记忆 (Memory) |
| 10 | 工具 (Tools) |
| 11 | Zod 使用说明 |
| 12 | Agent（智能体） |
| 13 | RAG（检索增强生成） |
| 14 | VectorStore（向量存储） |

---

## 🔗 更多资源

- [LangChain.js 官方文档](https://js.langchain.com/)
- [向量数据库对比](https://python.langchain.com/docs/integrations/vectorstores/)
- [Embedding 模型](https://platform.openai.com/docs/guides/embeddings)

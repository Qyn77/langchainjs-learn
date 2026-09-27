# 26-长期记忆与跨线程 Store

> 📅 适用于 LangGraph.js v1.x | 👶 零基础友好
> 💡 **注意：** 建议先学完第 21 章（Checkpointer），本章是其进阶

---

## 🎯 本章目标

- ✅ 分清短期记忆（Checkpointer）和长期记忆（Store）的分工
- ✅ 掌握 `InMemoryStore` 的存取：`put` / `get` / `search`
- ✅ 实现跨对话线程的用户画像记忆

---

## 🤔 Checkpointer 不够用吗？

第 21 章的 Checkpointer 有个天然边界：**记忆只属于一个 thread（会话）**。

```
thread-1: 用户说"我喜欢美式咖啡" → 记住了 ✅
thread-2: 三天后新会话，用户问"我喜欢喝什么？" → ❌ 不记得
```

真实产品里，用户画像、偏好、历史结论要**跨越所有会话**长期保存。这就是 **Store（存储器）** 的职责：

| 对比 | Checkpointer（第 21 章） | Store（本章） |
|------|------------------------|--------------|
| 存什么 | 图状态的完整快照 | 应用自定义的键值数据 |
| 范围 | 单个 thread 内 | **跨所有 thread** |
| 记忆类型 | 短期记忆（对话连续性） | 长期记忆（用户偏好、事实） |
| 典型用途 | 多轮对话、人机协同、容错 | "记住用户喜欢美式咖啡" |

> 💡 **一句话分工：** Checkpointer 记"这次对话聊到哪了"，Store 记"这个用户是谁"。

---

## 📦 InMemoryStore 基本用法

学习阶段用内存版 `InMemoryStore`（生产环境换 Postgres 等持久化实现，接口相同）：

```javascript
import { InMemoryStore } from "@langchain/langgraph";

const store = new InMemoryStore();
```

### 三个核心操作

```javascript
// 1. put：写入（namespace 是字符串数组，相当于"文件夹路径"）
const namespace = ["user_1", "memories"];
await store.put(namespace, "memory-id-001", {
  text: "用户喜欢美式咖啡",
});

// 2. get：按 key 精确读取
const item = await store.get(namespace, "memory-id-001");
console.log(item.value);  // { text: "用户喜欢美式咖啡" }

// 3. search：列出/搜索该 namespace 下的记忆
const memories = await store.search(namespace, { limit: 10 });
memories.forEach((m) => {
  console.log(m.key, m.value, m.updatedAt);
});
```

要点：

- **namespace（命名空间）** 是一个字符串数组，通常用 `[用户ID, "memories"]` 这样分层，不同用户互不干扰
- `search` 返回的是**条目对象**：`{ key, value, namespace, createdAt, updatedAt }`，记忆内容在 `.value` 里
- 读写都是异步的（可能来自数据库）

---

## 💡 完整示例：跨会话记住用户偏好

创建 `long-term-memory.js`：

```javascript
import { ChatOpenAI } from "@langchain/openai";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import {
  Annotation, MessagesAnnotation, StateGraph, START, END,
  MemorySaver, InMemoryStore,
} from "@langchain/langgraph";

const model = new ChatOpenAI({
  model: "MiniMax/MiniMax-M2.5",
  apiKey: process.env.MODELSCOPE_API_KEY,
  configuration: {
    baseURL: "https://api-inference.modelscope.cn/v1",
  },
});

// 长期记忆存储 + 短期记忆检查点（两个都要）
const store = new InMemoryStore();
const checkpointer = new MemorySaver();

// 节点 1：调用模型，先把用户的长期记忆注入系统提示
async function callModel(state, config) {
  const userId = config.configurable.userId;

  // ★ 从 Store 读取该用户的长期记忆（跨线程！）
  const memories = await config.store.search([userId, "memories"], { limit: 5 });
  const facts = memories.map((m) => `- ${m.value.text}`).join("\n");

  // 把记忆作为系统提示 + 完整对话历史一起发给模型
  const input = [
    new SystemMessage(`以下是关于这位用户的长期记忆：\n${facts || "（暂无）"}`),
    ...state.messages,
  ];
  const response = await model.invoke(input);
  return { messages: [response] };
}

// 节点 2：把值得记住的内容写入 Store
async function saveMemory(state, config) {
  const userId = config.configurable.userId;

  // 演示用关键词触发；真实项目通常让 LLM 判断"是否值得记住"
  const history = state.messages;
  const lastUserMsg = String(history[history.length - 2].content); // 倒数第二条 = 用户消息

  if (lastUserMsg.includes("记住")) {
    await config.store.put(
      [userId, "memories"],
      crypto.randomUUID(),            // 用随机 ID 作为 key
      { text: lastUserMsg.replace("记住", "").trim() }
    );
    console.log("  💾 已写入长期记忆");
  }
  return {};
}

const graph = new StateGraph(MessagesAnnotation)
  .addNode("callModel", callModel)
  .addNode("saveMemory", saveMemory)
  .addEdge(START, "callModel")
  .addEdge("callModel", "saveMemory")
  .addEdge("saveMemory", END)
  // ★ 同时挂 checkpointer（短期）和 store（长期）
  .compile({ checkpointer, store });

// ===== 第一次对话：教 Agent 记住偏好 =====
const config1 = {
  configurable: { thread_id: "thread-1", userId: "user_1" },
};
const r1 = await graph.invoke(
  { messages: [new HumanMessage("记住我喜欢喝美式咖啡")] },
  config1
);
console.log("AI:", r1.messages[r1.messages.length - 1].content);

// ===== 三天后：全新 thread，但同一个用户 =====
const config2 = {
  configurable: { thread_id: "thread-2", userId: "user_1" },  // thread 换了！
};
const r2 = await graph.invoke(
  { messages: [new HumanMessage("我喜欢喝什么咖啡来着？")] },
  config2
);
console.log("AI:", r2.messages[r2.messages.length - 1].content);
// AI: 你喜欢喝美式咖啡。 ← 新会话也记得！记忆来自 Store，不依赖 thread
```

运行效果：

```
  💾 已写入长期记忆
AI: 好的，已经记住你喜欢美式咖啡了！
AI: 你喜欢喝美式咖啡。
        ↑ 关键时刻：thread-2 是全新会话，但 Agent 从 Store 里
          读到了 thread-1 写入的记忆
```

### 这段代码的知识点

```
compile({ checkpointer, store })   ← 两个记忆系统一起挂
config.store.search([...])         ← 任意节点都能读 Store
config.store.put([...])            ← 任意节点都能写 Store
config.configurable.userId         ← 用户标识（自己约定的），用来分命名空间
```

> 💡 **注意：** `userId` 是我们放在 `configurable` 里的自定义字段，LangGraph 不关心它叫什么——它只是随 config 传进每个节点，用来构造命名空间。

---

## 🔍 进阶：语义搜索记忆

记忆多了以后，靠 `search` 全量列出不够智能。给 Store 配上 Embedding 模型，就能**按语义**找记忆：

```javascript
import { InMemoryStore } from "@langchain/langgraph";
import { OpenAIEmbeddings } from "@langchain/openai";

const store = new InMemoryStore({
  index: {
    embeddings: new OpenAIEmbeddings({ model: "text-embedding-3-small" }),
    dims: 1536,
    fields: ["text"],   // 对记忆的哪个字段做向量化
  },
});

// 写入方式不变；读取时用自然语言提问：
const memories = await config.store.search([userId, "memories"], {
  query: "用户喜欢喝什么？",   // 按语义匹配，而不是关键词
  limit: 3,
});
```

这样即使当年存的是"用户喜欢美式"，问"他喝咖啡的口味偏好"也能检索到。

> ⚠️ **注意：** 语义搜索需要 Embedding 服务（示例用的是 OpenAI 兼容接口），会带来额外延迟和费用；记忆量少时全量读取反而更简单。

---

## 💾 生产环境

`InMemoryStore` 重启即丢。生产环境换成持久化实现，**接口完全一样**：

| 实现 | 说明 |
|------|------|
| `PostgresStore` | 官方推荐，支持语义搜索 |
| `RedisStore` / `MongoDBStore` / `UpstashStore` | 社区/官方提供的其他后端 |

都继承自 `BaseStore`，切换只需换构造那一行。完整列表见官方 [store 集成](https://docs.langchain.com/oss/javascript/integrations/long-term-memory/index)。

> 💡 **版本提示：** 官方最新文档里也出现了 `MemoryStore` 的写法，与 `InMemoryStore` 是同一能力的新命名。使用时以你安装版本的 API 参考为准（本教程写作时包内导出的名称是 `InMemoryStore`）。

---

## ⚠️ 注意事项

### 1. Store 和 Checkpointer 职责别混

对话过程状态放 Checkpointer（自动的），用户画像放 Store（你手动读写）。把对话历史也塞进 Store 是常见反模式。

### 2. 记忆内容要可序列化、要小

`put` 的 value 会落库，存"提炼后的事实"而不是原始大段对话。

### 3. 命名空间设计要想清楚

推荐 `[用户ID, "memories"]` 这样的两层结构；还可以按业务再分层，如 `[用户ID, "travel", "preferences"]`。

### 4. 谁来决定"记住什么"？

入门用关键词，进阶用一个专门的 LLM 调用做"记忆提取"（判断哪些值得存、提炼成一句话）。这是构建记忆系统的核心设计点，官方文档有完整讨论（见下方链接）。

---

## 📝 本章小结

- **Checkpointer = 短期记忆**（单 thread 内的状态快照），**Store = 长期记忆**（跨 thread 的键值数据）
- `InMemoryStore`：`put(namespace, key, value)` 写入，`get` / `search` 读取
- `compile({ checkpointer, store })` 一起挂载，节点里通过 `config.store` 读写
- 命名空间 `[用户ID, "memories"]` 隔离不同用户，同一用户跨会话共享
- 配合 Embedding 可做语义记忆检索；生产换 PostgresStore 等

---

## 🏃 下一章

[27-Functional API →](./27-Functional API.md)

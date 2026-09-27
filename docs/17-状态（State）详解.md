# 17-状态（State）详解

> 📅 适用于 LangGraph.js v1.x | 👶 零基础友好
> 💡 **注意：** 本章是 LangGraph 最重要的一章，理解了状态，后面全部豁然开朗

---

## 🎯 本章目标

- ✅ 用 `Annotation.Root` 定义自己的图状态
- ✅ 理解 **reducer（归约函数）**：多个节点更新同一个字段时怎么办
- ✅ 掌握官方预置的 `MessagesAnnotation` 及其扩展方法
- ✅ 理解并行节点为什么必须有 reducer

---

## 🤔 什么是状态？

**状态 = 所有节点共享的一份数据。**

```
        ┌──────────────────────────────┐
        │   State（共享状态）           │
        │   {                          │
        │     messages: [...],         │
        │     topic: "人工智能",        │
        │     jokes: []                │
        │   }                          │
        └──────────────────────────────┘
           ▲ 读/写        ▲ 读/写       ▲ 读/写
           │              │             │
        ┌──┴───┐      ┌───┴───┐     ┌──┴────┐
        │节点 A │      │节点 B  │     │节点 C  │
        └──────┘      └───────┘     └───────┘
```

节点之间**不直接通信**，而是通过状态"传纸条"：
- 每个节点读取当前状态 → 干活 → 返回一个**更新**
- LangGraph 负责把更新合并回状态

---

## 📦 用 Annotation 定义状态

使用 `Annotation.Root` 定义图状态，每个字段就是状态里的一个 key：

```javascript
import { Annotation } from "@langchain/langgraph";

const StateAnnotation = Annotation.Root({
  // 字段 1：普通字段（默认行为：新值直接覆盖旧值）
  topic: Annotation,

  // 字段 2：带 reducer 的字段（新值和旧值按规则合并）
  jokes: Annotation({
    reducer: (existing, update) => existing.concat(update),
    default: () => [],
  }),
});
```

两种字段写法：

| 写法 | 行为 | 适用场景 |
|------|------|---------|
| `Annotation` | **覆盖**：节点返回的新值直接替换旧值 | 当前步骤结果、配置项 |
| `Annotation({ reducer, default })` | **合并**：按 reducer 规则合并旧值和新值 | 消息历史、日志、收集结果 |

### reducer 的两个参数

```javascript
reducer: (existing, update) => {
  // existing：状态里的当前值（旧值）
  // update：节点刚返回的值（新值）
  // 返回值会成为该字段的新状态
}
```

> 💡 **关键点：** 每个字段有自己独立的 reducer；没写 reducer 的字段默认就是"覆盖"。

---

## 💡 完整示例：覆盖 vs 合并

创建 `state-demo.js`：

```javascript
import { Annotation, StateGraph, START, END } from "@langchain/langgraph";

// 定义状态
const StateAnnotation = Annotation.Root({
  // 普通字段：覆盖
  foo: Annotation,

  // 数组字段：合并（追加）
  bar: Annotation({
    reducer: (existing, update) => existing.concat(update),
    default: () => [],
  }),
});

const graph = new StateGraph(StateAnnotation)
  .addNode("nodeA", (state) => {
    // 节点只返回"更新"，不是完整状态！
    return { foo: 2 };
  })
  .addNode("nodeB", (state) => {
    return { bar: ["bye"] };
  })
  .addEdge(START, "nodeA")
  .addEdge("nodeA", "nodeB")
  .addEdge("nodeB", END)
  .compile();

const result = await graph.invoke({ foo: 1, bar: ["hi"] });

console.log(result);
// { foo: 2, bar: ["hi", "bye"] }
//      ↑ 覆盖        ↑ 追加合并
```

运行流程拆解：

```
初始输入:      { foo: 1, bar: ["hi"] }
nodeA 返回:    { foo: 2 }
  → foo 覆盖:  1 → 2
  → bar 未动:  ["hi"]
nodeB 返回:    { bar: ["bye"] }
  → foo 未动:  2
  → bar 合并:  ["hi"] + ["bye"] = ["hi", "bye"]
最终状态:      { foo: 2, bar: ["hi", "bye"] }
```

---

## 💬 MessagesAnnotation：预置的消息状态

"在状态里存对话消息"是最常见的模式，官方提供了现成的 `MessagesAnnotation`：

```javascript
import { MessagesAnnotation, StateGraph, START, END } from "@langchain/langgraph";

const graph = new StateGraph(MessagesAnnotation)
  .addNode("callModel", async (state) => {
    // state.messages 就是完整的对话历史
    const response = await model.invoke(state.messages);
    return { messages: [response] };
  })
  .addEdge(START, "callModel")
  .addEdge("callModel", END)
  .compile();
```

它等价于：

```javascript
import { Annotation, messagesStateReducer } from "@langchain/langgraph";

const StateAnnotation = Annotation.Root({
  messages: Annotation({
    reducer: messagesStateReducer,
    default: () => [],
  }),
});
```

### messagesStateReducer 做了什么？

它比简单的 concat 聪明：

- ✅ 新消息 → **追加**到列表末尾
- ✅ 带相同 id 的消息 → **原地更新**（而不是重复追加）
- ✅ 支持直接传 `{ role, content }` 普通对象，自动转成 LangChain 消息类

这就是为什么第 16 章里 `invoke({ messages: [{ role: "user", ... }] })` 能直接跑通。

---

## 🔧 扩展 MessagesAnnotation

状态里通常不止有消息，还需要业务字段。用展开语法继承并扩展：

```javascript
import { Annotation, MessagesAnnotation } from "@langchain/langgraph";

// 继承 messages 字段，再加自己的字段
const StateWithDocs = Annotation.Root({
  ...MessagesAnnotation.spec,        // ← 展开，保留 messages
  documents: Annotation({            // ← 新增字段
    reducer: (existing, update) => existing.concat(update),
    default: () => [],
  }),
  searchQuery: Annotation,           // ← 普通覆盖字段
});

const graph = new StateGraph(StateWithDocs)
  .addNode("search", async (state) => {
    return {
      documents: [`关于「${state.searchQuery}」的搜索结果 1`],
    };
  })
  // ... 其他节点
  .compile();
```

> ⚠️ **注意：** `...MessagesAnnotation.spec` 展开的是字段定义，`messages` 的 reducer 会被完整保留，这样对话历史依然正常工作。

---

## 🔀 为什么并行节点必须有 reducer？

回顾第 15 章说的"超级步"：**同一个超级步里被激活的多个节点会并行执行**。

```
        ┌─→ [节点 B] 返回 { jokes: ["笑话 B"] } ─┐
START ──┤                                        ├→ 状态怎么合并？
        └─→ [节点 C] 返回 { jokes: ["笑话 C"] } ─┘
```

两个节点**同时**写 `jokes` 字段：

- ❌ 如果 `jokes` 没有 reducer（覆盖语义）：LangGraph 不知道听谁的，直接报错
- ✅ 如果有 reducer（合并语义）：两个结果都保留

### 完整示例

创建 `parallel-demo.js`：

```javascript
import { Annotation, StateGraph, START, END } from "@langchain/langgraph";

const StateAnnotation = Annotation.Root({
  jokes: Annotation({
    reducer: (existing, update) => existing.concat(update),
    default: () => [],
  }),
});

const graph = new StateGraph(StateAnnotation)
  // 两个节点都写 jokes 字段
  .addNode("jokeA", () => ({ jokes: ["笑话 A：为什么程序员分不清万圣节和圣诞节？"] }))
  .addNode("jokeB", () => ({ jokes: ["笑话 B：因为 Oct 31 == Dec 25。"] }))
  // 两条边都从 START 出发 → 两个节点并行执行！
  .addEdge(START, "jokeA")
  .addEdge(START, "jokeB")
  .addEdge("jokeA", END)
  .addEdge("jokeB", END)
  .compile();

const result = await graph.invoke({});

console.log(result.jokes);
// [ "笑话 A：为什么程序员分不清万圣节和圣诞节？", "笑话 B：因为 Oct 31 == Dec 25。" ]
//  ↑ 两条结果都被保留了（reducer 合并的功劳）
```

如果去掉 reducer 试试，会得到类似这样的错误：

```
Error: Can receive only one value per step. Use an Annotated key to update more than one value per step.
```

> 💡 **经验法则：** 只要会有多个节点写同一个字段（尤其并行场景），就必须给这个字段配 reducer。

---

## 🆚 新式写法：StateSchema（了解即可）

官方最新文档还提供了一套基于 Zod 的状态定义方式，效果相同：

```javascript
import { StateSchema, ReducedValue, MessagesValue } from "@langchain/langgraph";
import { z } from "zod/v4";

const State = new StateSchema({
  messages: MessagesValue,               // 预置消息字段
  topic: z.string(),                     // 覆盖字段
  jokes: new ReducedValue(               // 带 reducer 的字段
    z.array(z.string()).default(() => []),
    { reducer: (x, y) => x.concat(y) }
  ),
});

const graph = new StateGraph(State)
  .addNode("myNode", (state) => ({ topic: "新值" }))
  .addEdge(START, "myNode")
  .compile();
```

> 💡 **说明：** 两种方式都是官方支持的。`Annotation` 出现最早、示例最多，本教程统一使用 `Annotation`；如果你喜欢 Zod 风格（本项目第 11 章学过），可以尝试 `StateSchema`。二者不要混用。

---

## ⚠️ 注意事项

### 1. 节点返回的是"更新"，不是完整状态

```javascript
// ❌ 错误：试图返回完整状态
.addNode("bad", (state) => {
  return state;  // 等于什么都没更新，还可能覆盖别人的字段
})

// ✅ 正确：只返回要改的字段
.addNode("good", (state) => {
  return { foo: state.foo + 1 };
})
```

### 2. 带 reducer 的字段必须提供 default

```javascript
// ❌ 错误：reducer 字段没有 default，第一次更新时 existing 是 undefined
jokes: Annotation({
  reducer: (existing, update) => existing.concat(update),
})

// ✅ 正确：补上 default
jokes: Annotation({
  reducer: (existing, update) => existing.concat(update),
  default: () => [],
})
```

### 3. 状态要能 JSON 序列化

后面要用检查点（第 21 章）保存状态，所以字段值应该是可序列化的（数字、字符串、数组、普通对象、LangChain 消息类都可以）。数据库连接这类对象不要放进状态。

### 4. 不要直接修改 state 原对象

```javascript
// ❌ 错误：原地修改（不会触发状态更新机制）
.addNode("bad", (state) => {
  state.foo = 100;
  return {};
})

// ✅ 正确：返回新值
.addNode("good", (state) => {
  return { foo: 100 };
})
```

---

## 📝 本章小结

- 状态是所有节点共享的数据，节点通过"返回更新"来修改它
- 字段两种语义：`Annotation`（覆盖）/ `Annotation({ reducer, default })`（合并）
- `MessagesAnnotation` 是预置消息状态，`...MessagesAnnotation.spec` 可以扩展
- **并行节点写同一字段必须有 reducer**，否则报错
- 新式 `StateSchema` + Zod 写法效果相同，二选一即可

---

## 🏃 下一章

[18-节点与边 →](./18-节点与边.md)

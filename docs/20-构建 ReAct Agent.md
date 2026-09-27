# 20-构建 ReAct Agent：模型 + 工具循环

> 📅 适用于 LangGraph.js v1.x | 👶 零基础友好
> 💡 **注意：** 需要先学完第 17-19 章（状态、边、条件边）

---

## 🎯 本章目标

- ✅ 理解 ReAct 循环：思考 → 调用工具 → 观察结果 → 再思考
- ✅ 用 LangGraph 原语**手动**搭建一个 ReAct Agent
- ✅ 用官方预置的 `createReactAgent` 一行创建 Agent
- ✅ 掌握 `ToolNode` 和 `toolsCondition`

---

## 🤔 什么是 ReAct 循环？

ReAct = **Rea**son + **Act**。Agent 的工作循环：

```
用户问题
   │
   ▼
┌──────────────┐   有 tool_calls？   ┌──────────────┐
│  callModel   │ ───是──→           │    tools     │
│ (模型思考并  │                     │ (执行工具，   │
│  决定调用工具)│ ←───结果回状态──────│  返回结果)    │
└──────────────┘                     └──────────────┘
   │     ▲                                │
   否    └────────── 循环 ─────────────────┘
   │
   ▼
返回最终回答
```

这正是 LangChain 教程第 12 章 `createAgent` 内部做的事情——现在我们用 LangGraph 自己搭一遍，你就彻底懂它了。

---

## 🧱 需要的四样东西

| 组件 | 作用 |
|------|------|
| `model.bindTools(tools)` | 让模型知道有哪些工具可调 |
| `callModel` 节点 | 调用模型，把回复写进状态 |
| `toolsCondition` 路由 | 判断模型是否发起了工具调用 |
| `ToolNode` | 真正执行工具，把结果写回状态 |

---

## 💡 完整示例：手动搭建 ReAct Agent

创建 `react-agent.js`：

```javascript
import { ChatOpenAI } from "@langchain/openai";
import { HumanMessage } from "@langchain/core/messages";
import { tool } from "@langchain/core/tools";
import { ToolNode, toolsCondition } from "@langchain/langgraph/prebuilt";
import { MessagesAnnotation, StateGraph, START, END } from "@langchain/langgraph";
import { z } from "zod";

// ===== 1. 准备模型 =====
const model = new ChatOpenAI({
  modelName: "MiniMax/MiniMax-M2.5",
  apiKey: process.env.MODELSCOPE_API_KEY,
  temperature: 0,
  configuration: {
    baseURL: "https://api-inference.modelscope.cn/v1",
  },
});

// ===== 2. 定义工具 =====
const calculatorTool = tool(
  async ({ expression }) => {
    console.log(`  🔧 [工具] 计算: ${expression}`);
    try {
      // 演示用 eval；生产环境请使用 expr-eval 等安全库（见 LangChain 教程第 10 章）
      return String(eval(expression));
    } catch (e) {
      return `计算错误: ${e.message}`;
    }
  },
  {
    name: "calculator",
    description: "计算数学表达式，例如 2 + 2",
    schema: z.object({
      expression: z.string().describe("要计算的数学表达式"),
    }),
  }
);

const timeTool = tool(
  async () => {
    console.log(`  🔧 [工具] 获取当前时间`);
    return new Date().toLocaleString("zh-CN");
  },
  {
    name: "get_time",
    description: "获取当前日期和时间，不需要参数",
    schema: z.object({}),
  }
);

const tools = [calculatorTool, timeTool];

// ===== 3. 定义节点 =====

// 节点：调用模型（模型已绑定工具）
async function callModel(state) {
  const boundModel = model.bindTools(tools);
  const response = await boundModel.invoke(state.messages);
  return { messages: [response] };  // AI 消息（可能含 tool_calls）追加到历史
}

// 执行工具的节点：ToolNode 是官方预置的节点
const toolNode = new ToolNode(tools);

// ===== 4. 构建图 =====
const graph = new StateGraph(MessagesAnnotation)
  .addNode("callModel", callModel)
  .addNode("tools", toolNode)
  .addEdge(START, "callModel")
  // 条件边：callModel 之后，toolsCondition 判断去 "tools" 还是 END
  .addConditionalEdges("callModel", toolsCondition)
  // 工具执行完，回到模型继续思考（这就是循环！）
  .addEdge("tools", "callModel")
  .compile();

// ===== 5. 运行 =====
const result = await graph.invoke({
  messages: [new HumanMessage("请帮我算一下 (15 + 25) * 3 - 100，然后告诉我现在几点了")],
});

console.log("\n最终回答:");
console.log(result.messages[result.messages.length - 1].content);
```

运行效果：

```
  🔧 [工具] 计算: (15 + 25) * 3 - 100
  🔧 [工具] 获取当前时间

最终回答:
计算结果如下：
1. (15 + 25) * 3 - 100 = -20
2. 当前时间是 2026年9月27日 下午3:30
```

---

## 🔍 逐行解剖关键部分

### 1. `toolsCondition`：官方预置的路由函数

```javascript
.addConditionalEdges("callModel", toolsCondition)
```

它内部做的事情等价于：

```javascript
function shouldContinue(state) {
  const lastMessage = state.messages[state.messages.length - 1];
  // 模型最后一条消息里有 tool_calls → 去 "tools" 节点
  if (lastMessage.tool_calls?.length) return "tools";
  // 没有 → 工作完成，结束
  return END;
}
```

> 💡 **说明：** 它固定路由到名为 `"tools"` 的节点（或 `END`），所以工具节点要注册成 `"tools"` 这个名字。也可以配合 path 数组写：`.addConditionalEdges("agent", toolsCondition, ["tools", END])`（官方文档示例写法，效果相同）。

### 2. `ToolNode`：官方预置的工具执行节点

```javascript
const toolNode = new ToolNode(tools);
graph.addNode("tools", toolNode);
```

它会读取状态里最后一条 AI 消息的 `tool_calls`，逐个执行对应工具，并把结果作为 `ToolMessage` 写回状态——所以工具执行完，模型能看到结果继续思考。

### 3. 循环是怎么形成的？

```
.addEdge("tools", "callModel")                     // 工具完 → 回模型
.addConditionalEdges("callModel", toolsCondition)  // 模型完 → 工具 或 结束
```

这两行构成了 `callModel ⇄ tools` 的循环。模型什么时候"退出循环"？——当它不再发起工具调用时，`toolsCondition` 返回 `END`。

---

## 🧰 手写路由函数版（不依赖 toolsCondition）

想彻底搞懂，可以自己写路由（效果完全一样）：

```javascript
import { AIMessage } from "@langchain/core/messages";

function shouldContinue(state) {
  const lastMessage = state.messages[state.messages.length - 1];
  return lastMessage.tool_calls?.length ? "tools" : END;
}

const graph = new StateGraph(MessagesAnnotation)
  .addNode("agent", callModel)
  .addNode("tools", toolNode)
  .addEdge(START, "agent")
  .addConditionalEdges("agent", shouldContinue)
  .addEdge("tools", "agent")
  .compile();
```

---

## ⚡ createReactAgent：预置版一行搞定

上面的循环模式太常用了，官方直接打包成 `createReactAgent`：

```javascript
import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { MemorySaver } from "@langchain/langgraph";
import { HumanMessage } from "@langchain/core/messages";

const agent = createReactAgent({
  llm: model,          // 注意参数名是 llm
  tools,               // 工具列表
  prompt: "你是一个乐于助人的助手。",  // 可选：系统提示（字符串或 SystemMessage）
});

// 直接运行，内部自动完成上面整套图
const result = await agent.invoke({
  messages: [new HumanMessage("帮我算一下 123 * 456")],
});

console.log(result.messages[result.messages.length - 1].content);
```

### createReactAgent 常用参数

| 参数 | 类型 | 说明 |
|------|------|------|
| `llm` | ChatModel | 模型实例（会自动 bindTools） |
| `tools` | Tool \| ToolNode[] | 工具列表 |
| `prompt` | string \| SystemMessage \| fn | 系统提示，加在消息列表最前面 |
| `name` | string | Agent 名字（多 Agent 场景用，见第 24 章） |
| `checkpointSaver` | Checkpointer | 检查点存储器（记忆功能，见第 21 章） |

> 💡 **说明：** `createReactAgent` 返回的就是一个编译好的 LangGraph 图，所以第 21 章的 `getState`、第 22 章的 `interrupt`、第 25 章的 `stream` 全部适用。

### 手动版 vs 预置版怎么选？

| | 手动版 | createReactAgent |
|---|--------|------------------|
| 灵活性 | ✅ 每个环节都能改 | ❌ 结构固定 |
| 代码量 | 多 | 一行 |
| 学习价值 | ✅ 理解 Agent 本质 | 直接干活 |

**建议：** 先学手动版（本章），日常干活用预置版；需要特殊流程时随时能回到手动版改造。

---

## ⚠️ 注意事项

### 1. 工具函数参数要解构

```javascript
// ✅ 正确：解构参数（schema 定义的字段）
tool(async ({ expression }) => { ... }, { schema: z.object({ expression: z.string() }) })

// ❌ 错误：直接接收（拿到的是整个对象）
tool(async (expression) => { ... })
```

### 2. 工具描述要清晰

工具的 `description` 和 schema 里每个字段的 `.describe()` 都会发给模型，写得越清楚，模型调用越准（详见 LangChain 教程第 10、12 章）。

### 3. 模型必须支持工具调用

`bindTools` 依赖模型的 function calling 能力。本教程使用的 ModelScope 平台 MiniMax-M2.5 支持工具调用；如果换模型后 Agent 一直不调工具或报错，先确认模型支持 tool calling。

### 4. 循环次数上限

Agent 循环很快消耗步数，默认 25 步上限不够时：

```javascript
await graph.invoke(input, { recursionLimit: 50 });
```

---

## 📝 本章小结

- ReAct = 思考 → 调工具 → 观察 → 再思考 的**循环**，条件边是循环的关键
- 手动版四件套：`bindTools` + `callModel` 节点 + `toolsCondition` + `ToolNode`
- `toolsCondition` 看最后一条 AI 消息有没有 `tool_calls` 决定去 `tools` 还是 `END`
- `createReactAgent({ llm, tools, prompt })` 一行得到同一个循环，返回的就是编译好的图
- 模型不再发起工具调用 = Agent 完成任务的退出条件

---

## 🏃 下一章

[21-记忆与持久化 →](./21-记忆与持久化.md)

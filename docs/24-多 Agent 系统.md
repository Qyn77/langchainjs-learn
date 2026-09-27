# 24-多 Agent 系统：让 Agent 组队干活

> 📅 适用于 LangGraph.js v1.x | 👶 零基础友好
> 💡 **注意：** 建议先学完第 20 章（ReAct Agent）和第 23 章（子图）

---

## 🎯 本章目标

- ✅ 理解什么时候需要多 Agent，什么时候一个 Agent 就够
- ✅ 掌握 Supervisor（主管）模式：手动搭建 + 官方包
- ✅ 理解 Agent 之间"共享消息黑板"的通信方式

---

## 🤔 一个 Agent 不够吗？

单个 ReAct Agent 挂十几个工具，会遇到：

- 📉 **工具太多**，模型选错工具的概率变大
- 📜 **消息历史越来越长**，token 消耗大、注意力被稀释
- 🧩 **职责混杂**，prompt 越写越乱

**多 Agent 的思路：分而治之**——每个 Agent 只带自己的少量工具、自己的专属提示词，由一个"协调者"决定谁来干活：

```
                ┌────────────────┐
                │  Supervisor    │
                │  （主管 Agent） │
                └────────────────┘
                 ↓ 派活      ↑ 回报
      ┌─────────────┐   ┌─────────────┐
      │ research    │   │ math        │
      │ (研究专家，  │   │ (数学专家，  │
      │  带搜索工具) │   │  带计算工具) │
      └─────────────┘   └─────────────┘
```

> ⚠️ **先别急着上多 Agent！** 官方建议：如果一个 Agent + 好提示词能解决，就别拆。多 Agent 增加的是**架构复杂度**，只有在任务确实可以按职责切分时才值得。

---

## 🧱 核心机制：共享消息黑板

多 Agent 之间最常用的通信方式：**所有 Agent 共享同一个 `messages` 状态**（都是 `MessagesAnnotation`），每个 Agent 读写同一个消息列表，就像团队共用一块白板：

```
messages（共享黑板）:
  [用户问题]
  [Supervisor: 交给 research_expert 处理]   ← 主管的决定
  [research_expert: 我搜到了这些资料…]      ← 专家的产出
  [Supervisor: 资料齐了，我来汇总…]         ← 最终回答
```

每个 Agent 就是一个子图（第 23 章），加起来刚好组成多 Agent 系统——这就是"图套图"的实战意义。

---

## 💡 方式一：手动搭建 Supervisor

不依赖任何额外包，用已学的原语（ReAct Agent + 共享状态）搭一个主管架构。

创建 `manual-supervisor.js`：

```javascript
import { ChatOpenAI } from "@langchain/openai";
import { HumanMessage, ToolMessage } from "@langchain/core/messages";
import { tool } from "@langchain/core/tools";
import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { MessagesAnnotation, StateGraph, START, END } from "@langchain/langgraph";
import { z } from "zod";

const model = new ChatOpenAI({
  modelName: "MiniMax/MiniMax-M2.5",
  apiKey: process.env.MODELSCOPE_API_KEY,
  configuration: {
    baseURL: "https://api-inference.modelscope.cn/v1",
  },
});

// ===== 1. 定义两个专家的工具 =====
const webSearchTool = tool(
  async ({ query }) => `「${query}」的搜索结果：2026 年 AI Agent 市场规模预计达到 500 亿美元。`,
  {
    name: "web_search",
    description: "搜索网络信息",
    schema: z.object({ query: z.string() }),
  }
);

const calculatorTool = tool(
  async ({ expression }) => String(eval(expression)),
  {
    name: "calculator",
    description: "计算数学表达式",
    schema: z.object({ expression: z.string() }),
  }
);

// ===== 2. 创建两个专家 Agent（注意 name 参数！）=====
const researchAgent = createReactAgent({
  llm: model,
  tools: [webSearchTool],
  name: "research_expert",   // ← 名字是主管派活的依据
  prompt: "你是研究专家，只负责搜索资料，不要做数学计算。回复保持简短。",
});

const mathAgent = createReactAgent({
  llm: model,
  tools: [calculatorTool],
  name: "math_expert",
  prompt: "你是数学专家，只负责计算，不要搜索资料。回复保持简短。",
});

// ===== 3. 主管：一个绑定"派活工具"的模型节点 =====
// 派活技巧：把每个专家包装成一个"工具"，模型调用工具 = 派活给专家
const askResearch = tool(
  async ({ question }) => {
    const res = await researchAgent.invoke({ messages: [new HumanMessage(question)] });
    return res.messages[res.messages.length - 1].content;
  },
  {
    name: "ask_research_expert",
    description: "向研究专家提问。所有需要搜索资料的问题都问他。",
    schema: z.object({ question: z.string() }),
  }
);

const askMath = tool(
  async ({ question }) => {
    const res = await mathAgent.invoke({ messages: [new HumanMessage(question)] });
    return res.messages[res.messages.length - 1].content;
  },
  {
    name: "ask_math_expert",
    description: "向数学专家提问。所有需要计算的问题都问他。",
    schema: z.object({ question: z.string() }),
  }
);

async function supervisor(state) {
  const res = await model
    .bindTools([askResearch, askMath])
    .invoke(state.messages);

  // 模型如果调用了"派活工具"，手动执行（内部就是调专家 Agent）
  if (res.tool_calls?.length) {
    const results = [];
    for (const call of res.tool_calls) {
      const fn = call.name === "ask_research_expert" ? askResearch : askMath;
      const output = await fn.invoke(call.args);
      // 用 ToolMessage 把专家的产出回填给模型
      results.push(new ToolMessage({ content: output, tool_call_id: call.id }));
    }
    return { messages: [res, ...results] };
  }

  return { messages: [res] };  // 没调工具 = 主管给出最终回答
}

// ===== 4. 组装：supervisor 单节点循环 =====
const graph = new StateGraph(MessagesAnnotation)
  .addNode("supervisor", supervisor)
  .addEdge(START, "supervisor")
  .addEdge("supervisor", END)
  .compile();

const result = await graph.invoke({
  messages: [new HumanMessage(
    "查一下 2026 年 AI Agent 市场规模，然后把里面的 500 亿美元换算成人民币（按 1:7.2）"
  )],
});

console.log(result.messages[result.messages.length - 1].content);
```

这个例子的精髓：

```
supervisor 节点内部：
  模型看到问题 → 需要资料 → tool_calls: [ask_research_expert]
  → 执行 ask_research_expert → 内部跑 researchAgent 子图 → 返回资料
  → 模型看到资料 → 需要计算 → tool_calls: [ask_math_expert]
  → 执行 ask_math_expert → 内部跑 mathAgent 子图 → 返回计算结果
  → 模型整合 → 输出最终回答（不再调工具）
```

主管模式本质上是**"专家即工具"**——把每个专家 Agent 包装成主管的一个工具，复用第 20 章的整套循环知识。

---

## ⚡ 方式二：官方包 createSupervisor

上面的模式官方也打包好了：`@langchain/langgraph-supervisor`。

```bash
npm install @langchain/langgraph-supervisor
```

```javascript
import { createSupervisor } from "@langchain/langgraph-supervisor";
import { createReactAgent } from "@langchain/langgraph/prebuilt";

// 专家 Agent（和方式一相同，注意要传 name）
const researchAgent = createReactAgent({
  llm: model,
  tools: [webSearchTool],
  name: "research_expert",
  prompt: "你是研究专家。只负责搜索。",
});

const mathAgent = createReactAgent({
  llm: model,
  tools: [calculatorTool],
  name: "math_expert",
  prompt: "你是数学专家。只负责计算。",
});

// 创建主管工作流
const workflow = createSupervisor({
  agents: [researchAgent, mathAgent],
  llm: model,
  prompt: "你是团队主管，管理研究专家和数学专家。" +
          "查资料交给 research_expert，算数交给 math_expert。",
});

// createSupervisor 返回 StateGraph，需要 compile 后使用
const app = workflow.compile();

const result = await app.invoke({
  messages: [new HumanMessage("搜索 2026 年 AI Agent 市场规模，并计算它的一半是多少")],
});
```

### 常用参数

| 参数 | 说明 |
|------|------|
| `agents` | 专家 Agent 数组（每个必须是**带 name** 的编译图） |
| `llm` | 主管用的模型 |
| `prompt` | 主管的系统提示 |
| `outputMode` | 专家消息如何进入主对话：`"full_history"`（默认，完整历史）或 `"last_message"`（只保留最终回复，省 token） |

### 挂记忆和子主管

```javascript
import { MemorySaver } from "@langchain/langgraph";

// 主管 + 检查点 = 多轮对话记忆
const app = workflow.compile({
  checkpointer: new MemorySaver(),
});

// 层级式：主管管主管
const researchTeam = createSupervisor({
  agents: [researchAgent, mathAgent],
  llm: model,
}).compile({ name: "research_team" });

const topSupervisor = createSupervisor({
  agents: [researchTeam, writingTeam],  // 团队也能当"专家"
  llm: model,
}).compile({ name: "top_supervisor" });
```

---

## 🔀 另一种流派：网络模式（Handoff）

Supervisor 是"中心化"的：所有消息过主管。还有一种**去中心化**的"网络模式"：Agent 之间直接握手交接（handoff）——Agent A 干完自己的活，直接 `Command({ goto: "agentB" })` 把控制权交给 B。

```
Supervisor 模式:        网络模式:
   ┌────────┐            A ──→ B ──→ C
   │Supervisor│            ↑         │
   └──────────┘            └─────────┘
   中心调度，可控性强         自由接力，灵活但难调试
```

> 💡 **怎么选？** 任务分工清晰、想要流程可控 → Supervisor；流程像接力赛、每个 Agent 知道下一个该谁 → Handoff。入门推荐 Supervisor，更好调试。

---

## ⚠️ 注意事项

### 1. 专家 Agent 必须有 name

`createSupervisor` 靠 name 派活，`name` 参数不能省：

```javascript
// ❌ 忘了 name，主管不知道这是谁
createReactAgent({ llm: model, tools, prompt: "..." })

// ✅ name 必须唯一且清晰
createReactAgent({ llm: model, tools, prompt: "...", name: "math_expert" })
```

### 2. 专家的 prompt 要"守本分"

明确告诉每个专家"你只做什么、不做什么"，否则专家会抢别人的活（比如数学专家开始搜索）。

### 3. 控制 Agent 数量和层级

2-4 个专家最理想；层级超过两层就要认真考虑是不是拆错了。

### 4. 用 outputMode 省 token

专家的中间过程（工具调用等）默认全量进入主对话，专家多、步骤多时改用 `outputMode: "last_message"`。

---

## 📝 本章小结

- 多 Agent = 按职责拆分：每个 Agent 少工具、专提示词，协调者派活
- 通信靠**共享 messages**，每个 Agent 是一个子图
- 手动 Supervisor = 把专家包装成主管的"派活工具"，复用 ReAct 循环
- `createSupervisor({ agents, llm, prompt }).compile()` 是官方封装，支持 outputMode、checkpointer、多层级
- 能用一个 Agent 解决就别拆；拆了记得给专家起唯一的 name

---

## 🏃 下一章

[25-流式输出 →](./25-流式输出.md)

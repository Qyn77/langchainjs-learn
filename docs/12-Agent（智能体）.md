# 12-Agent（智能体）入门

> 📅 适用于 LangChain.js v1.x (LangGraph v1.x) | 👶 零基础友好
> 💡 **注意：** 需要 Node.js 20+

---

## 📖 什么是 Agent（智能体）？

**Agent = 大模型 + 工具 + 规划能力**

简单说：Agent 是一个能够**自主决策**、**使用工具**、**完成复杂任务**的 AI 系统。

---

## 🤔 为什么需要 Agent？

### 没有 Agent 时

```javascript
// 用户：帮我查一下北京的天气，然后写一首关于天气的诗

// 你需要手动：
// 1. 调用天气 API
// 2. 把结果传给 AI
// 3. 让 AI 写诗
```

### 使用 Agent 后

```javascript
// 用户：帮我查一下北京的天气，然后写一首关于天气的诗

// Agent 自动：
// 1. 决定调用天气工具
// 2. 获取天气信息
// 3. 写一首诗
// 4. 返回最终结果
```

---

## 🧱 Agent 的核心组件

```
┌─────────────────────────────────────────────────────────┐
│                      Agent                               │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │   大模型     │  ┌──────────────┐  │   规划器     │  │
│  │   (LLM)      │  │   工具集     │  │ (Planner)    │  │
│  │              │  │   (Tools)    │  │              │  │
│  │  思考决策   │  │  执行操作    │  │  分解任务    │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
│                                                          │
│  ┌──────────────┐  ┌──────────────┐                     │
│  │   记忆       │  │   执行器     │                     │
│  │  (Memory)    │  │  (Executor)  │                     │
│  └──────────────┘  └──────────────┘                     │
└─────────────────────────────────────────────────────────┘
```

---

## 📦 LangChain 中的 Agent 类型

> ⚠️ **重要提示：** LangChain 1.0+ 中 Agent API 已统一

### API 演变

| 版本 | 导入方式 | 状态 |
|------|---------|------|
| LangChain 0.x | `createReactAgent`（`@langchain/langgraph/prebuilt`） | ⚠️ 函数仍可用，参数类型已标记 `@deprecated` |
| LangChain 1.x | `createAgent`（`langchain` 主包） | ✅ **当前推荐** |

### ⚠️ API 迁移说明

**旧方式（已过时，新项目不要再用的）：**
```javascript
import { createReactAgent } from "@langchain/langgraph/prebuilt";  // ⚠️ 参数类型已标 deprecated
const agent = createReactAgent({ llm: model, tools });  // 注意参数名是 llm
```

**新方式（LangChain 1.x 推荐）：**
```javascript
import { createAgent } from "langchain";  // ✅ 最新 API
const agent = createAgent({ model, tools });  // 注意参数名是 model
```

> 💡 **说明：** LangChain 1.x 将 Agent API 统一为 `createAgent`（基于 LangGraph 实现，支持工具调用、结构化输出、检查点记忆等）。旧函数 `createReactAgent` 短期内仍能运行，但新项目请一律使用 `createAgent`。两者的关键差异：参数名 `llm` → `model`，`messageModifier` → `prompt`。

---

## 🔧 安装依赖

```bash
# LangChain 1.0+ 安装（推荐）
npm install langchain @langchain/core @langchain/openai zod
```

> 💡 **注意：** 
> - `createAgent` 是 LangChain 1.x 的推荐 API
> - 旧版 `createReactAgent`（`@langchain/langgraph/prebuilt`）仍可运行，但参数类型已标记 `@deprecated`，新项目请用 `createAgent`

---

## 💡 完整示例：ReAct Agent

### 示例 1：基础 Agent（计算器 + 时间）

```javascript
import { ChatOpenAI } from "@langchain/openai";
import { HumanMessage } from "@langchain/core/messages";
import { tool } from "@langchain/core/tools";
import { createAgent } from "langchain";  // ✅ LangChain 1.0+ 推荐 API
import { z } from "zod";

// 1. 创建模型
const model = new ChatOpenAI({
  model: "MiniMax/MiniMax-M2.5",
  apiKey: "你的 API Key",
  temperature: 0,
  configuration: {
    baseURL: "https://api-inference.modelscope.cn/v1",
  },
});

// 2. 创建工具
const calculatorTool = tool(async ({ expression }) => {
  console.log(`[工具] 计算：${expression}`);
  try {
    return String(eval(expression));
  } catch (e) {
    return "计算错误：" + e.message;
  }
}, {
  name: "calculator",
  description: "计算数学表达式",
  schema: z.object({
    expression: z.string().describe("要计算的表达式，例如 2 + 2")
  })
});

const timeTool = tool(async () => {
  console.log("[工具] 获取时间");
  return new Date().toLocaleString("zh-CN");
}, {
  name: "get_time",
  description: "获取当前时间，不需要参数",
  schema: z.object({}).optional()
});

const tools = [calculatorTool, timeTool];

// 3. 创建 Agent（使用 createAgent）
const agent = createAgent({
  model: model,  // 注意：使用 model 参数
  tools: tools,
});

// 4. 运行 Agent
const input = new HumanMessage("请计算 2 + 2，并获取当前时间");

const result = await agent.invoke({
  messages: [input]
});

console.log("最终结果:");
console.log(result.messages[result.messages.length - 1].content);
```

### 运行结果

```
👤 用户：请计算 2 + 2，并获取当前时间

🔧 [工具] 计算器：计算 2 + 2
🔧 [工具] 获取当前时间

最终结果:
计算结果如下：

1. **2 + 2 = 4**

2. **当前时间**：2026 年 3 月 12 日 10:43:00
```

---

## 🎯 示例 2：查看 Agent 执行过程

```javascript
import { ChatOpenAI } from "@langchain/openai";
import { HumanMessage } from "@langchain/core/messages";
import { tool } from "@langchain/core/tools";
import { createAgent } from "langchain";  // ✅ LangChain 1.0+ 推荐 API
import { z } from "zod";

const model = new ChatOpenAI({
  model: "MiniMax/MiniMax-M2.5",
  apiKey: "你的 API Key",
  temperature: 0,
  configuration: {
    baseURL: "https://api-inference.modelscope.cn/v1",
  },
});

const calculatorTool = tool(async ({ expression }) => {
  console.log(`  🔧 [工具调用] calculator: ${expression}`);
  return String(eval(expression));
}, {
  name: "calculator",
  description: "计算数学表达式",
  schema: z.object({
    expression: z.string()
  })
});

const tools = [calculatorTool];

// 创建 Agent
const agent = createAgent({
  model: model,
  tools: tools,
});

// 运行并查看过程
console.log("🤖 Agent 开始执行...\n");

const result = await agent.invoke({
  messages: [new HumanMessage("帮我算一下 (15 + 25) * 3 - 100")]
});

console.log("\n📝 完整对话历史:");
result.messages.forEach((msg, i) => {
  const type = msg.constructor.name;
  const content = msg.content?.substring(0, 50) || "...";
  console.log(`  ${i + 1}. [${type}]: ${content}...`);
});

console.log("\n✅ 最终结果:");
console.log(result.messages[result.messages.length - 1].content);
```

### 输出示例

```
🤖 Agent 开始执行...

  🔧 [工具调用] calculator: (15 + 25) * 3 - 100

📝 完整对话历史:
  1. [HumanMessage]: 帮我算一下 (15 + 25) * 3 - 100...
  2. [AIMessage]: ......
  3. [ToolMessage]: 20...
  4. [AIMessage]: 计算结果是 20...

✅ 最终结果:
计算结果是 20
```

---

## 🎯 示例 3：带天气查询的 Agent

```javascript
import { ChatOpenAI } from "@langchain/openai";
import { HumanMessage } from "@langchain/core/messages";
import { tool } from "@langchain/core/tools";
import { createAgent } from "langchain";  // ✅ LangChain 1.0+ 推荐 API
import { z } from "zod";

const model = new ChatOpenAI({
  model: "MiniMax/MiniMax-M2.5",
  apiKey: "你的 API Key",
  temperature: 0,
  configuration: {
    baseURL: "https://api-inference.modelscope.cn/v1",
  },
});

// 天气查询工具
const weatherTool = tool(async ({ city }) => {
  console.log(`[工具] 查询天气：${city}`);
  const weatherData = {
    "北京": "晴，25°C，湿度 30%",
    "上海": "多云，28°C，湿度 60%",
    "广州": "小雨，30°C，湿度 80%",
    "深圳": "晴，32°C，湿度 70%"
  };
  return weatherData[city] || "未知城市";
}, {
  name: "get_weather",
  description: "查询城市天气",
  schema: z.object({
    city: z.string().describe("城市名称，如北京、上海、广州、深圳")
  })
});

// 建议穿衣工具
const clothingAdviceTool = tool(async ({ weather }) => {
  console.log(`[工具] 穿衣建议：${weather}`);
  if (weather.includes("晴") && parseInt(weather) > 30) {
    return "天气炎热，建议穿短袖、短裤，注意防晒。";
  } else if (weather.includes("雨")) {
    return "下雨天，建议带伞，穿透气衣物。";
  } else if (parseInt(weather) < 15) {
    return "天气较冷，建议穿外套或毛衣。";
  } else {
    return "天气舒适，建议穿长袖衬衫或薄外套。";
  }
}, {
  name: "get_clothing_advice",
  description: "根据天气给出穿衣建议",
  schema: z.object({
    weather: z.string().describe("天气描述，如'晴，25°C'")
  })
});

const tools = [weatherTool, clothingAdviceTool];

// 创建 Agent
const agent = createAgent({
  model: model,
  tools: tools,
});

// 运行
const input = new HumanMessage("北京今天天气怎么样？我应该穿什么？");
console.log("用户:", input.content);

const result = await agent.invoke({
  messages: [input]
});

console.log("Agent:", result.messages[result.messages.length - 1].content);
```

---

## 🔄 Agent 工作流程

```
用户输入
   │
   ▼
┌─────────────────┐
│   LLM 思考决策   │ ──→ 决定使用哪个工具
└─────────────────┘
   │
   ▼
┌─────────────────┐
│   执行工具      │ ──→ 调用工具获取结果
└─────────────────┘
   │
   ▼
┌─────────────────┐
│   LLM 整合结果   │ ──→ 生成最终回复
└─────────────────┘
   │
   ▼
返回给用户
```

---

## ⚙️ Agent 配置参数

```javascript
import { createAgent } from "langchain";

const agent = createAgent({
  model: model,     // 模型实例（必需）
  tools: tools,     // 工具列表（必需）

  // 常用可选配置
  prompt: "你是一个乐于助人的助手",   // 系统提示（字符串 / SystemMessage / 函数）
  // responseFormat: z.object({...}), // 结构化输出（结果在 result.structuredResponse）
  // checkpointer: new MemorySaver(), // 对话记忆（见 LangGraph 篇第 21 章）
});
```

| 参数 | 说明 |
|------|------|
| `model` | 模型实例（必需，框架自动绑定工具） |
| `tools` | 工具数组（必需） |
| `prompt` | 系统提示：字符串 / `SystemMessage` / `(state, config) => messages` 函数 |
| `responseFormat` | 结构化输出 Schema（Zod / JSON Schema），结果在 `result.structuredResponse`（见第 07 章） |
| `checkpointer` | 检查点器，开启多轮对话记忆（LangGraph 篇第 21 章） |

> 💡 旧 API 的 `messageModifier` 已更名为 `prompt`；运行步数上限不在构造时配置，而是调用时传 `{ recursionLimit: N }`（默认 25）。

---

## ⚠️ 注意事项

### 1. 工具函数参数解构

```javascript
// ✅ 正确：使用解构
const tool = tool(async ({ expression }) => {
  return String(eval(expression));
}, {
  schema: z.object({
    expression: z.string()
  })
});

// ❌ 错误：直接接收参数
const tool = tool(async (expression) => {  // 会收到 [object Object]
  return String(eval(expression));
});
```

### 2. 工具描述要清晰

```javascript
// ✅ 好的描述
const tool = tool(async ({ city }) => {...}, {
  name: "get_weather",
  description: "查询城市天气，参数：城市名（北京/上海/广州/深圳）",
  schema: z.object({
    city: z.string().describe("城市名称")
  })
});

// ❌ 不好的描述
const tool = tool(async ({ city }) => {...}, {
  name: "weather",
  description: "天气"  // 太模糊
});
```

### 3. 限制工具数量

工具太多会影响性能和准确性：

```javascript
// ✅ 推荐：5-10 个工具
const tools = [tool1, tool2, tool3, tool4, tool5];

// ❌ 不推荐：太多工具
const tools = [tool1, tool2, ..., tool50];  // Agent 可能混乱
```

### 4. 错误处理

```javascript
const robustTool = tool(async ({ input }) => {
  try {
    // 工具逻辑
    return result;
  } catch (error) {
    return `工具执行失败：${error.message}`;
  }
}, {
  name: "robust_tool",
  description: "一个健壮的工具"
});
```

### 5. 运行步数上限

Agent 可能会陷入循环，LangGraph 通过"递归上限"控制（默认 25 步）：

```javascript
const result = await agent.invoke(
  { messages: [input] },
  { recursionLimit: 50 }  // 复杂任务可调大上限
);
// 超过上限会抛出 GraphRecursionError
```

---

## 🎓 实战项目：智能旅行助手

```javascript
import { ChatOpenAI } from "@langchain/openai";
import { HumanMessage } from "@langchain/core/messages";
import { tool } from "@langchain/core/tools";
import { createAgent } from "langchain";  // ✅ LangChain 1.0+ 推荐 API
import { z } from "zod";

const model = new ChatOpenAI({
  model: "MiniMax/MiniMax-M2.5",
  apiKey: "你的 API Key",
  temperature: 0.7,
  configuration: {
    baseURL: "https://api-inference.modelscope.cn/v1",
  },
});

// 目的地推荐工具
const recommendDestinationTool = tool(async ({ budget, days, preference }) => {
  const destinations = {
    "海边": ["三亚", "厦门", "青岛"],
    "山区": ["张家界", "黄山", "九寨沟"],
    "城市": ["北京", "上海", "成都"]
  };
  const list = destinations[preference] || destinations["城市"];
  return `根据您的偏好（${preference}），推荐：${list.join("、")}`;
}, {
  name: "recommend_destination",
  description: "根据预算、天数和偏好推荐旅游目的地",
  schema: z.object({
    budget: z.number().describe("预算（元）"),
    days: z.number().describe("旅行天数"),
    preference: z.string().describe("偏好类型：海边/山区/城市")
  })
});

// 查询机票工具（模拟）
const flightSearchTool = tool(async ({ from, to, date }) => {
  return `从${from}到${to}的机票，${date}出发，价格约 800-1500 元`;
}, {
  name: "search_flight",
  description: "查询机票信息",
  schema: z.object({
    from: z.string().describe("出发城市"),
    to: z.string().describe("目的地城市"),
    date: z.string().describe("出发日期")
  })
});

// 查询酒店工具（模拟）
const hotelSearchTool = tool(async ({ city, nights, budget }) => {
  return `${city}的酒店，${nights}晚，预算${budget}元，推荐：XX 酒店、YY 酒店`;
}, {
  name: "search_hotel",
  description: "查询酒店信息",
  schema: z.object({
    city: z.string().describe("城市"),
    nights: z.number().describe("住宿晚数"),
    budget: z.number().describe("预算（元）")
  })
});

// 行程规划工具
const planItineraryTool = tool(async ({ destination, days }) => {
  return `${destination}${days}日游行程：
Day 1: 抵达 + 市区游览
Day 2: 主要景点参观
Day 3: 周边游 + 返程`;
}, {
  name: "plan_itinerary",
  description: "规划旅行行程",
  schema: z.object({
    destination: z.string().describe("目的地"),
    days: z.number().describe("旅行天数")
  })
});

const tools = [
  recommendDestinationTool,
  flightSearchTool,
  hotelSearchTool,
  planItineraryTool
];

// 创建 Agent
const agent = createAgent({
  model: model,
  tools: tools,
});

// 运行
const input = new HumanMessage("我想去旅行，预算 5000 元，有 5 天时间，喜欢海边，请帮我规划一下");
console.log("🧳 旅行助手\n");
console.log("用户:", input.content);
console.log("\n--- 规划过程 ---\n");

const result = await agent.invoke({
  messages: [input]
});

console.log("\n--- 旅行方案 ---\n");
console.log(result.messages[result.messages.length - 1].content);
```

---

## 📝 本章小结

- Agent = 大模型 + 工具 + 规划能力
- `createAgent`（`langchain` 主包）是 LangChain 1.x 的标准 Agent API，参数名为 `model` + `tools`
- 旧版 `createReactAgent` 已过时（参数类型标记 deprecated），迁移时注意 `llm` → `model`、`messageModifier` → `prompt`
- 工具函数参数需要解构 `async ({ expression })`
- 工具描述要清晰准确
- 可以处理多步骤复杂任务
- 运行步数上限用 `{ recursionLimit: N }` 控制；需要记忆时传 `checkpointer`（LangGraph 篇第 21 章）

---

## 🔗 更多资源

- [LangChain Agent 文档](https://js.langchain.com/docs/concepts/agentic_architectures)
- [LangGraph 文档](https://langchain-ai.github.io/langgraphjs/)
- [LangChain 1.0 迁移指南](https://js.langchain.com/docs/how_to/migration/)
- [createAgent API 参考](https://reference.langchain.com/javascript/langchain/index/createAgent)

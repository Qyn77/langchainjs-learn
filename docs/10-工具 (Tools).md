# 10-工具 (Tools)：调用外部 API

> 💡 **注意：** 本教程适用于 LangChain.js v1.x

## 🎯 本章目标

- ✅ 理解工具 (Tools) 的作用
- ✅ 创建自定义工具
- ✅ 让 AI 能够调用函数/API

---

## 🤔 什么是工具 (Tools)？

**工具 = AI 可以调用的函数**

大模型本身不能：
- ❌ 访问实时数据（天气、股票、新闻）
- ❌ 执行代码
- ❌ 访问数据库
- ❌ 调用外部 API

通过工具，AI 可以：
- ✅ 查询天气
- ✅ 计算数学题
- ✅ 搜索网络
- ✅ 调用任何 API

---

## 📦 创建工具

### 方式 1：使用 tool 函数

```javascript
import { tool } from "@langchain/core/tools";

const searchTool = tool(async (query) => {
  // 执行搜索
  const results = await search(query);
  return results;
}, {
  name: "search",
  description: "搜索网络信息"
});
```

### 方式 2：使用 Tool 类

```javascript
import { Tool } from "@langchain/core/tools";

class CalculatorTool extends Tool {
  name = "calculator";
  description = "计算数学表达式";

  async call(input) {
    // 计算逻辑
    return eval(input);
  }
}
```

---

## 💡 完整示例

```javascript
import { ChatOpenAI } from "@langchain/openai";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { tool } from "@langchain/core/tools";

const model = new ChatOpenAI({
  modelName: "MiniMax/MiniMax-M2.5",
  apiKey: process.env.MODELSCOPE_API_KEY,
  configuration: {
    baseURL: "https://api-inference.modelscope.cn/v1",
  },
});

// === 工具 1：计算器 ===
const calculatorTool = tool(async (expression) => {
  console.log(`[工具] 计算器：计算 ${expression}`);
  try {
    return String(eval(expression));
  } catch (e) {
    return "计算错误：" + e.message;
  }
}, {
  name: "calculator",
  description: "计算数学表达式，例如：2 + 3 * 4"
});

// === 工具 2：获取当前时间 ===
const timeTool = tool(async () => {
  console.log("[工具] 获取当前时间");
  const now = new Date();
  return now.toLocaleString("zh-CN");
}, {
  name: "get_current_time",
  description: "获取当前日期和时间"
});

// === 工具 3：天气查询（模拟）===
const weatherTool = tool(async (city) => {
  console.log(`[工具] 查询天气：${city}`);
  const weatherData = {
    "北京": "晴，25°C",
    "上海": "多云，28°C",
    "广州": "小雨，30°C",
    "深圳": "晴，32°C"
  };
  return weatherData[city] || "未知城市";
}, {
  name: "get_weather",
  description: "查询城市天气，参数：城市名（北京/上海/广州/深圳）"
});

// 注册工具列表
const tools = [calculatorTool, timeTool, weatherTool];

// 创建系统提示
const toolDescriptions = tools.map(t => 
  `- ${t.name}: ${t.description}`
).join("\n");

const systemPrompt = new SystemMessage(`
你是一个智能助手，可以使用以下工具帮助用户：

${toolDescriptions}

如果用户的问题需要工具，请回复：
[TOOL: 工具名] 参数
`);

// 使用工具
const messages = [
  systemPrompt,
  new HumanMessage("现在几点了？")
];

const response = await model.invoke(messages);
console.log("AI:", response.content);

// 检查是否需要调用工具
const toolMatch = response.content.match(/\[TOOL: (\w+)\] (.+)/);
if (toolMatch) {
  const [, toolName, toolInput] = toolMatch;
  const selectedTool = tools.find(t => t.name === toolName);
  if (selectedTool) {
    const result = await selectedTool.invoke(toolInput.trim());
    console.log(`[工具结果]: ${result}`);
  }
}
```

---

## ⚙️ tool 函数参数详解

```javascript
const myTool = tool(async (input) => {
  // 工具逻辑
  return result;
}, options);

// options 参数：
// - name: string - 工具名称（必需）
// - description: string - 工具描述（必需）
// - schema?: ZodSchema - 输入参数模式（可选）
// - responseSchema?: ZodSchema - 输出模式（可选）
```

### 示例：带参数验证的工具

```javascript
import { z } from "zod";

const divideTool = tool(async (input) => {
  const { a, b } = JSON.parse(input);
  return String(a / b);
}, {
  name: "divide",
  description: "计算两个数的除法",
  schema: z.object({
    a: z.number(),
    b: z.number()
  })
});
```

---

## 🎯 简化版：直接调用工具

如果不想要复杂的 Agent 逻辑，可以直接判断并调用：

```javascript
const tools = {
  calculator: async (expr) => String(eval(expr)),
  time: async () => new Date().toLocaleString("zh-CN"),
  weather: async (city) => {
    const data = { "北京": "晴，25°C", "上海": "多云，28°C" };
    return data[city] || "未知城市";
  }
};

async function chatWithTools(userMessage) {
  // 先让 AI 判断是否需要工具
  const judgePrompt = `
判断以下问题是否需要使用工具：
"${userMessage}"

如果需要，回复：NEED_TOOL: 工具名：参数
如果不需要，直接回答问题。

可用工具：
- calculator: 计算数学表达式
- time: 获取当前时间
- weather: 查询天气（城市名）
`;

  const response = await model.invoke([new HumanMessage(judgePrompt)]);
  
  if (response.content.startsWith("NEED_TOOL:")) {
    const [, toolName, param] = response.content.split(":");
    const tool = tools[toolName.trim()];
    if (tool) {
      const result = await tool(param.trim());
      return `工具结果：${result}`;
    }
  }
  
  return response.content;
}
```

---

## 🔧 调用真实 API

### 示例：调用天气 API

```javascript
const httpTool = tool(async (url) => {
  console.log(`[工具] HTTP 请求：${url}`);
  try {
    const response = await fetch(url);
    const data = await response.json();
    return JSON.stringify(data);
  } catch (e) {
    return "请求失败：" + e.message;
  }
}, {
  name: "http_get",
  description: "发送 HTTP GET 请求，参数：URL"
});
```

### 示例：数据库查询

```javascript
import { Pool } from 'pg';
const pool = new Pool({ connectionString: 'postgresql://...' });

const queryTool = tool(async (sql) => {
  console.log(`[工具] SQL 查询：${sql}`);
  try {
    const result = await pool.query(sql);
    return JSON.stringify(result.rows);
  } catch (e) {
    return "查询错误：" + e.message;
  }
}, {
  name: "database_query",
  description: "执行 SQL 查询"
});
```

---

## ⚠️ 安全注意事项

### 1. 不要直接 eval 用户输入

```javascript
// ❌ 危险：用户可以执行任意代码
const badTool = tool(async (input) => {
  return eval(input);
});

// ✅ 安全：使用专门的数学库
import { Parser } from 'expr-eval';
const parser = new Parser();

const goodTool = tool(async (expr) => {
  return String(parser.evaluate(expr));
});
```

### 2. 限制工具权限

```javascript
const adminTool = tool(async (command) => {
  // 检查用户权限
  if (!user.isAdmin) {
    return "权限不足";
  }
  // 执行命令
}, {
  name: "admin_command",
  description: "管理员命令"
});
```

### 3. 限制输入长度

```javascript
const searchTool = tool(async (query) => {
  if (query.length > 100) {
    return "查询太长";
  }
  // 执行搜索
}, {
  name: "search",
  description: "搜索"
});
```

---

## 📋 Tool 类方法详解

| 方法 | 说明 | 示例 |
|------|------|------|
| `call(input)` | 调用工具 | `await tool.call("input")` |
| `invoke(input)` | 调用工具（Runnable 接口） | `await tool.invoke("input")` |
| `stream(input)` | 流式调用 | `for await (const c of await tool.stream(input))` |

---

## 📝 本章小结

- 工具 (Tools) 让 AI 能够调用函数/API
- 使用 `tool()` 函数创建工具
- 工具需要 name 和 description
- 注意安全问题（eval、权限、输入验证）

---

## 🎓 教程完结！

你已经完成了 LangChain.js v1.x 入门教程的全部内容！

### 复习清单

- [ ] 01-基础概念
- [ ] 02-环境搭建
- [ ] 03-模型调用
- [ ] 04-消息类型
- [ ] 05-流式输出
- [ ] 06-Prompt 模板
- [ ] 07-输出解析器
- [ ] 08-链 (Chain)
- [ ] 09-记忆 (Memory)
- [ ] 10-工具 (Tools)

### 下一步学习

- 学习 Agent（智能体）
- 学习 RAG（检索增强生成）
- 学习 VectorStore（向量存储）
- 实战项目：构建一个完整的 AI 应用

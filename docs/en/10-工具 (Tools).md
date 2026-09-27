# 10-Tools: Calling External APIs

> 💡 **Note:** This tutorial is for LangChain.js v1.x.

## 🎯 Chapter Goals

- ✅ Understand what Tools do
- ✅ Create a custom tool
- ✅ Let the AI call functions and APIs

---

## 🤔 What Are Tools?

**A tool is a function the AI can call.**

On its own, a large language model cannot:

- ❌ Access live data (weather, stocks, news)
- ❌ Run code
- ❌ Access a database
- ❌ Call an external API

With tools, the AI can:

- ✅ Look up the weather
- ✅ Solve math problems
- ✅ Search the web
- ✅ Call any API

---

## 📦 Creating a Tool

### Approach 1: the tool function (recommended)

```javascript
import { tool } from "@langchain/core/tools";
import { z } from "zod";

const searchTool = tool(async ({ query }) => {
  // Run the search
  const results = await search(query);
  return results;
}, {
  name: "search",
  description: "Search the web for information",
  schema: z.object({
    query: z.string().describe("the search keywords")
  })
});
```

> 💡 **Key point:** Always set `schema` and receive the arguments with **destructuring** (`async ({ query })`). Without a schema, the framework packs the whole argument object and passes it in. If you write `(query)` instead, you get `[object Object]`. Chapter 12 explains this pitfall in detail.

### Approach 2: the Tool class

```javascript
import { Tool } from "@langchain/core/tools";

class CalculatorTool extends Tool {
  name = "calculator";
  description = "Evaluate a math expression";

  async call(input) {
    // Calculation logic
    return eval(input);
  }
}
```

---

## 💡 Complete Example

```javascript
import { ChatOpenAI } from "@langchain/openai";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { tool } from "@langchain/core/tools";
import { z } from "zod";

const model = new ChatOpenAI({
  model: "MiniMax/MiniMax-M2.5",
  apiKey: process.env.MODELSCOPE_API_KEY,
  configuration: {
    baseURL: "https://api-inference.modelscope.cn/v1",
  },
});

// === Tool 1: calculator ===
const calculatorTool = tool(async ({ expression }) => {
  console.log(`[Tool] Calculator: evaluating ${expression}`);
  try {
    return String(eval(expression));
  } catch (e) {
    return "Calculation error: " + e.message;
  }
}, {
  name: "calculator",
  description: "Evaluate a math expression, for example: 2 + 3 * 4",
  schema: z.object({
    expression: z.string().describe("the math expression to evaluate")
  })
});

// === Tool 2: get the current time ===
const timeTool = tool(async () => {
  console.log("[Tool] Getting the current time");
  const now = new Date();
  return now.toLocaleString("zh-CN");
}, {
  name: "get_current_time",
  description: "Get the current date and time",
  schema: z.object({})
});

// === Tool 3: weather lookup (simulated) ===
const weatherTool = tool(async ({ city }) => {
  console.log(`[Tool] Weather lookup: ${city}`);
  const weatherData = {
    "Beijing": "Sunny, 25°C",
    "Shanghai": "Cloudy, 28°C",
    "Guangzhou": "Light rain, 30°C",
    "Shenzhen": "Sunny, 32°C"
  };
  return weatherData[city] || "Unknown city";
}, {
  name: "get_weather",
  description: "Look up the weather for a city. Parameter: city name (Beijing/Shanghai/Guangzhou/Shenzhen)",
  schema: z.object({
    city: z.string().describe("the city name")
  })
});

// Register the tool list
const tools = [calculatorTool, timeTool, weatherTool];

// Create the system prompt
const toolDescriptions = tools.map(t => 
  `- ${t.name}: ${t.description}`
).join("\n");

const systemPrompt = new SystemMessage(`
You are a smart assistant. You can use the following tools to help the user:

${toolDescriptions}

If the user's question requires a tool, reply in this form:
[TOOL: tool_name] arguments
`);

// Use the tools
const messages = [
  systemPrompt,
  new HumanMessage("What time is it now?")
];

const response = await model.invoke(messages);
console.log("AI:", response.content);

// Check whether a tool needs to be called
const toolMatch = response.content.match(/\[TOOL: (\w+)\] (.+)/);
if (toolMatch) {
  const [, toolName, toolInput] = toolMatch;
  const selectedTool = tools.find(t => t.name === toolName);
  if (selectedTool) {
    const result = await selectedTool.invoke(toolInput.trim());
    console.log(`[Tool result]: ${result}`);
  }
}
```

---

## ⚙️ tool Function Parameters in Detail

```javascript
const myTool = tool(async (input) => {
  // Tool logic
  return result;
}, options);

// options parameters:
// - name: string - the tool name (required)
// - description: string - the tool description (required)
// - schema?: ZodSchema - the input schema (optional)
// - responseSchema?: ZodSchema - the output schema (optional)
```

### Example: a tool with parameter validation

```javascript
import { z } from "zod";

const divideTool = tool(async ({ a, b }) => {
  return String(a / b);
}, {
  name: "divide",
  description: "Divide one number by another",
  schema: z.object({
    a: z.number(),
    b: z.number()
  })
});
```

---

## 🎯 A Simpler Version: Call the Tool Directly

> 💡 The "prompt convention plus regex parsing" approach below is **only for understanding how it works**. In a real project, use `createAgent` from Chapter 12. It handles the whole loop: decide whether a tool is needed, call it, and feed the result back.

If you do not want the full agent loop, you can decide and call the tool yourself:

```javascript
const tools = {
  calculator: async (expr) => String(eval(expr)),
  time: async () => new Date().toLocaleString("zh-CN"),
  weather: async (city) => {
    const data = { "Beijing": "Sunny, 25°C", "Shanghai": "Cloudy, 28°C" };
    return data[city] || "Unknown city";
  }
};

async function chatWithTools(userMessage) {
  // First, let the AI decide whether a tool is needed
  const judgePrompt = `
Decide whether the following question requires a tool:
"${userMessage}"

If it does, reply: NEED_TOOL: tool_name: arguments
If it does not, answer the question directly.

Available tools:
- calculator: evaluate a math expression
- time: get the current time
- weather: look up the weather (city name)
`;

  const response = await model.invoke([new HumanMessage(judgePrompt)]);
  
  if (response.content.startsWith("NEED_TOOL:")) {
    const [, toolName, param] = response.content.split(":");
    const tool = tools[toolName.trim()];
    if (tool) {
      const result = await tool(param.trim());
      return `Tool result: ${result}`;
    }
  }
  
  return response.content;
}
```

---

## 🔧 Calling a Real API

### Example: call a weather API

```javascript
const httpTool = tool(async (url) => {
  console.log(`[Tool] HTTP request: ${url}`);
  try {
    const response = await fetch(url);
    const data = await response.json();
    return JSON.stringify(data);
  } catch (e) {
    return "Request failed: " + e.message;
  }
}, {
  name: "http_get",
  description: "Send an HTTP GET request. Parameter: URL"
});
```

### Example: a database query

```javascript
import { Pool } from 'pg';
const pool = new Pool({ connectionString: 'postgresql://...' });

const queryTool = tool(async (sql) => {
  console.log(`[Tool] SQL query: ${sql}`);
  try {
    const result = await pool.query(sql);
    return JSON.stringify(result.rows);
  } catch (e) {
    return "Query error: " + e.message;
  }
}, {
  name: "database_query",
  description: "Run an SQL query"
});
```

---

## ⚠️ Security Notes

### 1. Do not eval user input directly

```javascript
// ❌ Dangerous: the user can run arbitrary code
const badTool = tool(async (input) => {
  return eval(input);
});

// ✅ Safe: use a dedicated math library
import { Parser } from 'expr-eval';
const parser = new Parser();

const goodTool = tool(async (expr) => {
  return String(parser.evaluate(expr));
});
```

### 2. Limit what a tool is allowed to do

```javascript
const adminTool = tool(async (command) => {
  // Check the user's permissions
  if (!user.isAdmin) {
    return "Insufficient permissions";
  }
  // Run the command
}, {
  name: "admin_command",
  description: "An administrator command"
});
```

### 3. Limit the input length

```javascript
const searchTool = tool(async (query) => {
  if (query.length > 100) {
    return "Query is too long";
  }
  // Run the search
}, {
  name: "search",
  description: "Search"
});
```

---

## 📋 Tool Class Methods in Detail

| Method | Description | Example |
|------|------|------|
| `call(input)` | Call the tool | `await tool.call("input")` |
| `invoke(input)` | Call the tool (the Runnable interface) | `await tool.invoke("input")` |
| `stream(input)` | Call the tool as a stream | `for await (const c of await tool.stream(input))` |

---

## 📝 Chapter Summary

- Tools let the AI call functions and APIs
- Create a tool with the `tool()` function
- A tool needs a name and a description. **Give parameters a Zod schema and receive them with destructuring** (otherwise you get `[object Object]`; see Chapter 12)
- Watch the security issues (eval, permissions, and input validation)

---

## 🎓 Tutorial Complete!

You have finished the entire LangChain.js v1.x beginner tutorial!

### Review checklist

- [ ] 01-Concepts
- [ ] 02-Environment Setup
- [ ] 03-Calling Models
- [ ] 04-Message Types
- [ ] 05-Streaming
- [ ] 06-Prompt Templates
- [ ] 07-Output Parsers
- [ ] 08-Chains
- [ ] 09-Memory
- [ ] 10-Tools

### What to learn next

- Agents
- RAG (retrieval-augmented generation)
- Vector stores
- A hands-on project: build a complete AI application

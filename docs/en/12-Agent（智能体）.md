# Getting Started with Agents

> 📅 For LangChain.js v1.x (LangGraph v1.x) | 👶 Beginner-friendly
> 💡 **Note:** Requires Node.js 20+

---

## 📖 What Is an Agent?

**Agent = LLM + tools + planning**

In short: an Agent is an AI system that can **decide on its own**, **use tools**, and **complete complex tasks**.

---

## 🤔 Why Do You Need Agents?

### Without an Agent

```javascript
// User: Check the weather in Beijing, then write a poem about the weather

// You have to do this by hand:
// 1. Call the weather API
// 2. Pass the result to the AI
// 3. Ask the AI to write a poem
```

### With an Agent

```javascript
// User: Check the weather in Beijing, then write a poem about the weather

// The Agent does this automatically:
// 1. Decides to call the weather tool
// 2. Gets the weather information
// 3. Writes a poem
// 4. Returns the final result
```

---

## 🧱 Core Components of an Agent

```
┌─────────────────────────────────────────────────────────┐
│                         Agent                           │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │     LLM      │  │    Tools     │  │   Planner    │  │
│  │              │  │              │  │              │  │
│  │ Think and    │  │ Run actions  │  │ Break the    │  │
│  │ decide       │  │              │  │ task apart   │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
│                                                         │
│  ┌──────────────┐  ┌──────────────┐                    │
│  │   Memory     │  │  Executor    │                    │
│  └──────────────┘  └──────────────┘                    │
└─────────────────────────────────────────────────────────┘
```

---

## 📦 Agent Types in LangChain

> ⚠️ **Important:** In LangChain 1.0+, the Agent API has been unified.

### How the API Evolved

| Version | Import | Status |
|------|---------|------|
| LangChain 0.x | `createReactAgent` (`@langchain/langgraph/prebuilt`) | ⚠️ The function still works, but its parameter types are marked `@deprecated` |
| LangChain 1.x | `createAgent` (`langchain` main package) | ✅ **Recommended** |

### ⚠️ API Migration

**Old way (outdated — do not use it in new projects):**
```javascript
import { createReactAgent } from "@langchain/langgraph/prebuilt";  // ⚠️ Parameter types are marked deprecated
const agent = createReactAgent({ llm: model, tools });  // Note: the parameter name is llm
```

**New way (recommended for LangChain 1.x):**
```javascript
import { createAgent } from "langchain";  // ✅ Current API
const agent = createAgent({ model, tools });  // Note: the parameter name is model
```

> 💡 **Note:** LangChain 1.x unifies the Agent API as `createAgent` (built on LangGraph, with support for tool calling, structured output, checkpointer memory, and more). The old `createReactAgent` function still runs for now, but new projects should use `createAgent` only. The key differences: the parameter name changes from `llm` to `model`, and `messageModifier` becomes `prompt`.

---

## 🔧 Install Dependencies

```bash
# LangChain 1.0+ install (recommended)
npm install langchain @langchain/core @langchain/openai zod
```

> 💡 **Note:**
> - `createAgent` is the recommended API in LangChain 1.x
> - The older `createReactAgent` (`@langchain/langgraph/prebuilt`) still runs, but its parameter types are marked `@deprecated`. Use `createAgent` in new projects

---

## 💡 Full Example: a ReAct Agent

### Example 1: A Basic Agent (Calculator + Time)

```javascript
import { ChatOpenAI } from "@langchain/openai";
import { HumanMessage } from "@langchain/core/messages";
import { tool } from "@langchain/core/tools";
import { createAgent } from "langchain";  // ✅ Recommended API in LangChain 1.0+
import { z } from "zod";

// 1. Create the model
const model = new ChatOpenAI({
  model: "MiniMax/MiniMax-M2.5",
  apiKey: "your API key",
  temperature: 0,
  configuration: {
    baseURL: "https://api-inference.modelscope.cn/v1",
  },
});

// 2. Create tools
const calculatorTool = tool(async ({ expression }) => {
  console.log(`[Tool] Calculate: ${expression}`);
  try {
    return String(eval(expression));
  } catch (e) {
    return "Calculation error: " + e.message;
  }
}, {
  name: "calculator",
  description: "Evaluate a math expression",
  schema: z.object({
    expression: z.string().describe("The expression to evaluate, for example 2 + 2")
  })
});

const timeTool = tool(async () => {
  console.log("[Tool] Get the time");
  return new Date().toLocaleString("en-US");
}, {
  name: "get_time",
  description: "Get the current time. Takes no arguments",
  schema: z.object({}).optional()
});

const tools = [calculatorTool, timeTool];

// 3. Create the Agent (using createAgent)
const agent = createAgent({
  model: model,  // Note: use the model parameter
  tools: tools,
});

// 4. Run the Agent
const input = new HumanMessage("Please calculate 2 + 2, and get the current time");

const result = await agent.invoke({
  messages: [input]
});

console.log("Final result:");
console.log(result.messages[result.messages.length - 1].content);
```

### Sample Output

```
👤 User: Please calculate 2 + 2, and get the current time

🔧 [Tool] Calculator: calculate 2 + 2
🔧 [Tool] Get the current time

Final result:
Here are the results:

1. **2 + 2 = 4**

2. **Current time**: March 12, 2026, 10:43:00 AM
```

---

## 🎯 Example 2: Inspect the Agent's Execution

```javascript
import { ChatOpenAI } from "@langchain/openai";
import { HumanMessage } from "@langchain/core/messages";
import { tool } from "@langchain/core/tools";
import { createAgent } from "langchain";  // ✅ Recommended API in LangChain 1.0+
import { z } from "zod";

const model = new ChatOpenAI({
  model: "MiniMax/MiniMax-M2.5",
  apiKey: "your API key",
  temperature: 0,
  configuration: {
    baseURL: "https://api-inference.modelscope.cn/v1",
  },
});

const calculatorTool = tool(async ({ expression }) => {
  console.log(`  🔧 [Tool call] calculator: ${expression}`);
  return String(eval(expression));
}, {
  name: "calculator",
  description: "Evaluate a math expression",
  schema: z.object({
    expression: z.string()
  })
});

const tools = [calculatorTool];

// Create the Agent
const agent = createAgent({
  model: model,
  tools: tools,
});

// Run it and watch the steps
console.log("🤖 Agent is starting...\n");

const result = await agent.invoke({
  messages: [new HumanMessage("Please calculate (15 + 25) * 3 - 100")]
});

console.log("\n📝 Full conversation history:");
result.messages.forEach((msg, i) => {
  const type = msg.constructor.name;
  const content = msg.content?.substring(0, 50) || "...";
  console.log(`  ${i + 1}. [${type}]: ${content}...`);
});

console.log("\n✅ Final result:");
console.log(result.messages[result.messages.length - 1].content);
```

### Sample Output

```
🤖 Agent is starting...

  🔧 [Tool call] calculator: (15 + 25) * 3 - 100

📝 Full conversation history:
  1. [HumanMessage]: Please calculate (15 + 25) * 3 - 100...
  2. [AIMessage]: ......
  3. [ToolMessage]: 20...
  4. [AIMessage]: The result is 20...

✅ Final result:
The result is 20
```

---

## 🎯 Example 3: An Agent That Looks Up the Weather

```javascript
import { ChatOpenAI } from "@langchain/openai";
import { HumanMessage } from "@langchain/core/messages";
import { tool } from "@langchain/core/tools";
import { createAgent } from "langchain";  // ✅ Recommended API in LangChain 1.0+
import { z } from "zod";

const model = new ChatOpenAI({
  model: "MiniMax/MiniMax-M2.5",
  apiKey: "your API key",
  temperature: 0,
  configuration: {
    baseURL: "https://api-inference.modelscope.cn/v1",
  },
});

// Weather lookup tool
const weatherTool = tool(async ({ city }) => {
  console.log(`[Tool] Look up weather: ${city}`);
  const weatherData = {
    "Beijing": "Sunny, 25°C, humidity 30%",
    "Shanghai": "Cloudy, 28°C, humidity 60%",
    "Guangzhou": "Light rain, 30°C, humidity 80%",
    "Shenzhen": "Sunny, 32°C, humidity 70%"
  };
  return weatherData[city] || "Unknown city";
}, {
  name: "get_weather",
  description: "Look up the weather for a city",
  schema: z.object({
    city: z.string().describe("City name, such as Beijing, Shanghai, Guangzhou, or Shenzhen")
  })
});

// Clothing advice tool
const clothingAdviceTool = tool(async ({ weather }) => {
  console.log(`[Tool] Clothing advice: ${weather}`);
  if (weather.includes("Sunny") && parseInt(weather) > 30) {
    return "It is hot. Wear a T-shirt and shorts, and use sunscreen.";
  } else if (weather.includes("rain")) {
    return "It is raining. Bring an umbrella and wear breathable clothes.";
  } else if (parseInt(weather) < 15) {
    return "It is cold. Wear a coat or a sweater.";
  } else {
    return "The weather is comfortable. A long-sleeve shirt or a light jacket is fine.";
  }
}, {
  name: "get_clothing_advice",
  description: "Suggest what to wear based on the weather",
  schema: z.object({
    weather: z.string().describe("Weather description, such as 'Sunny, 25°C'")
  })
});

const tools = [weatherTool, clothingAdviceTool];

// Create the Agent
const agent = createAgent({
  model: model,
  tools: tools,
});

// Run it
const input = new HumanMessage("What's the weather in Beijing today? What should I wear?");
console.log("User:", input.content);

const result = await agent.invoke({
  messages: [input]
});

console.log("Agent:", result.messages[result.messages.length - 1].content);
```

---

## 🔄 How an Agent Works

```
User input
   │
   ▼
┌─────────────────┐
│   LLM decides   │ ──→ Choose which tool to use
└─────────────────┘
   │
   ▼
┌─────────────────┐
│   Run the tool  │ ──→ Call the tool and get a result
└─────────────────┘
   │
   ▼
┌─────────────────┐
│ Combine results │ ──→ Write the final reply
└─────────────────┘
   │
   ▼
Return it to the user
```

---

## ⚙️ Agent Configuration

```javascript
import { createAgent } from "langchain";

const agent = createAgent({
  model: model,     // Model instance (required)
  tools: tools,     // Tool list (required)

  // Common optional settings
  prompt: "You are a helpful assistant",   // System prompt (string / SystemMessage / function)
  // responseFormat: z.object({...}), // Structured output (result is in result.structuredResponse)
  // checkpointer: new MemorySaver(), // Conversation memory (see LangGraph chapter 21)
});
```

| Parameter | Description |
|------|------|
| `model` | Model instance (required; the framework binds tools automatically) |
| `tools` | Array of tools (required) |
| `prompt` | System prompt: a string, a `SystemMessage`, or a `(state, config) => messages` function |
| `responseFormat` | Structured-output schema (Zod / JSON Schema). The result is in `result.structuredResponse` (see chapter 07) |
| `checkpointer` | A checkpointer that turns on multi-turn conversation memory (LangGraph chapter 21) |

> 💡 The old API's `messageModifier` has been renamed to `prompt`. The step limit is not set at construction time. Pass `{ recursionLimit: N }` when you call the Agent (the default is 25).

---

## ⚠️ Things to Watch Out For

### 1. Destructure Tool Arguments

```javascript
// ✅ Correct: destructure the arguments
const tool = tool(async ({ expression }) => {
  return String(eval(expression));
}, {
  schema: z.object({
    expression: z.string()
  })
});

// ❌ Incorrect: take the argument directly
const tool = tool(async (expression) => {  // You receive [object Object]
  return String(eval(expression));
});
```

### 2. Write Clear Tool Descriptions

```javascript
// ✅ A good description
const tool = tool(async ({ city }) => {...}, {
  name: "get_weather",
  description: "Look up city weather. Argument: city name (Beijing/Shanghai/Guangzhou/Shenzhen)",
  schema: z.object({
    city: z.string().describe("City name")
  })
});

// ❌ A poor description
const tool = tool(async ({ city }) => {...}, {
  name: "weather",
  description: "weather"  // Too vague
});
```

### 3. Limit How Many Tools You Add

Too many tools hurt both performance and accuracy:

```javascript
// ✅ Recommended: 5–10 tools
const tools = [tool1, tool2, tool3, tool4, tool5];

// ❌ Not recommended: too many tools
const tools = [tool1, tool2, ..., tool50];  // The Agent may get confused
```

### 4. Handle Errors

```javascript
const robustTool = tool(async ({ input }) => {
  try {
    // Tool logic
    return result;
  } catch (error) {
    return `Tool execution failed: ${error.message}`;
  }
}, {
  name: "robust_tool",
  description: "A robust tool"
});
```

### 5. Cap the Number of Steps

An Agent can get stuck in a loop. LangGraph controls this with a recursion limit (25 steps by default):

```javascript
const result = await agent.invoke(
  { messages: [input] },
  { recursionLimit: 50 }  // Raise the limit for complex tasks
);
// Going past the limit throws GraphRecursionError
```

---

## 🎓 Hands-on Project: a Travel Assistant

```javascript
import { ChatOpenAI } from "@langchain/openai";
import { HumanMessage } from "@langchain/core/messages";
import { tool } from "@langchain/core/tools";
import { createAgent } from "langchain";  // ✅ Recommended API in LangChain 1.0+
import { z } from "zod";

const model = new ChatOpenAI({
  model: "MiniMax/MiniMax-M2.5",
  apiKey: "your API key",
  temperature: 0.7,
  configuration: {
    baseURL: "https://api-inference.modelscope.cn/v1",
  },
});

// Destination recommendation tool
const recommendDestinationTool = tool(async ({ budget, days, preference }) => {
  const destinations = {
    "beach": ["Sanya", "Xiamen", "Qingdao"],
    "mountains": ["Zhangjiajie", "Huangshan", "Jiuzhaigou"],
    "city": ["Beijing", "Shanghai", "Chengdu"]
  };
  const list = destinations[preference] || destinations["city"];
  return `Based on your preference (${preference}), we recommend: ${list.join(", ")}`;
}, {
  name: "recommend_destination",
  description: "Recommend travel destinations from a budget, number of days, and preference",
  schema: z.object({
    budget: z.number().describe("Budget (yuan)"),
    days: z.number().describe("Number of travel days"),
    preference: z.string().describe("Preference: beach, mountains, or city")
  })
});

// Flight search tool (simulated)
const flightSearchTool = tool(async ({ from, to, date }) => {
  return `Flights from ${from} to ${to}, departing ${date}, about 800–1500 yuan`;
}, {
  name: "search_flight",
  description: "Look up flight information",
  schema: z.object({
    from: z.string().describe("Departure city"),
    to: z.string().describe("Destination city"),
    date: z.string().describe("Departure date")
  })
});

// Hotel search tool (simulated)
const hotelSearchTool = tool(async ({ city, nights, budget }) => {
  return `Hotels in ${city} for ${nights} nights, budget ${budget} yuan. Recommended: Hotel XX and Hotel YY`;
}, {
  name: "search_hotel",
  description: "Look up hotel information",
  schema: z.object({
    city: z.string().describe("City"),
    nights: z.number().describe("Number of nights"),
    budget: z.number().describe("Budget (yuan)")
  })
});

// Itinerary planning tool
const planItineraryTool = tool(async ({ destination, days }) => {
  return `${days}-day itinerary for ${destination}:
Day 1: Arrival + city sightseeing
Day 2: Visit the main attractions
Day 3: A nearby trip + return`;
}, {
  name: "plan_itinerary",
  description: "Plan a travel itinerary",
  schema: z.object({
    destination: z.string().describe("Destination"),
    days: z.number().describe("Number of travel days")
  })
});

const tools = [
  recommendDestinationTool,
  flightSearchTool,
  hotelSearchTool,
  planItineraryTool
];

// Create the Agent
const agent = createAgent({
  model: model,
  tools: tools,
});

// Run it
const input = new HumanMessage("I want to travel. My budget is 5000 yuan, I have 5 days, and I like the beach. Please plan a trip for me");
console.log("🧳 Travel assistant\n");
console.log("User:", input.content);
console.log("\n--- Planning ---\n");

const result = await agent.invoke({
  messages: [input]
});

console.log("\n--- Travel plan ---\n");
console.log(result.messages[result.messages.length - 1].content);
```

---

## 📝 Chapter Summary

- An Agent = an LLM + tools + planning
- `createAgent` (from the `langchain` package) is the standard Agent API in LangChain 1.x. The parameter names are `model` and `tools`
- The older `createReactAgent` is outdated (its parameter types are marked deprecated). When you migrate, change `llm` to `model` and `messageModifier` to `prompt`
- Tool functions must destructure their arguments: `async ({ expression })`
- Tool descriptions should be clear and specific
- Agents can handle complex, multi-step tasks
- Control the step limit with `{ recursionLimit: N }`. When you need memory, pass a `checkpointer` (LangGraph chapter 21)

---

## 🔗 Further Reading

- [LangChain Agent docs](https://js.langchain.com/docs/concepts/agentic_architectures)
- [LangGraph docs](https://langchain-ai.github.io/langgraphjs/)
- [LangChain 1.0 migration guide](https://js.langchain.com/docs/how_to/migration/)
- [createAgent API reference](https://reference.langchain.com/javascript/langchain/index/createAgent)

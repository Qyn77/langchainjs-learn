# 20-Building a ReAct Agent: The Model + Tools Loop

> 📅 For LangGraph.js v1.x | 👶 Beginner-friendly
> 💡 **Note:** Finish Chapters 17–19 first (State, edges, and conditional edges)

---

## 🎯 Goals for This Chapter

- ✅ Understand the ReAct loop: think → call a tool → observe the result → think again
- ✅ Build a ReAct Agent **by hand** with LangGraph primitives
- ✅ Create an Agent in one line with the built-in `createReactAgent`
- ✅ Master `ToolNode` and `toolsCondition`

---

## 🤔 What Is the ReAct Loop?

ReAct = **Rea**son + **Act**. This is the Agent's working loop:

```
User question
   │
   ▼
┌──────────────┐   Has tool_calls?   ┌──────────────┐
│  callModel   │ ───yes──→           │    tools     │
│ (the model   │                     │ (runs the    │
│  thinks and  │ ←───result written──│  tools and   │
│  may call    │      back to State  │  returns     │
│  tools)      │                     │  the result) │
└──────────────┘                     └──────────────┘
   │     ▲                                │
   no    └────────── loop ────────────────┘
   │
   ▼
Return the final answer
```

This is exactly what `createAgent` does inside Chapter 12 of the LangChain tutorial. Now we will build it ourselves with LangGraph, and you will see how it works.

---

## 🧱 The Four Pieces You Need

| Piece | What it does |
|------|------|
| `model.bindTools(tools)` | Tells the model which tools it can call |
| `callModel` node | Calls the model and writes the reply into State |
| `toolsCondition` router | Checks whether the model asked to call a tool |
| `ToolNode` | Actually runs the tools and writes the results back into State |

---

## 💡 Full Example: Build a ReAct Agent by Hand

Create `react-agent.js`:

```javascript
import { ChatOpenAI } from "@langchain/openai";
import { HumanMessage } from "@langchain/core/messages";
import { tool } from "@langchain/core/tools";
import { ToolNode, toolsCondition } from "@langchain/langgraph/prebuilt";
import { MessagesAnnotation, StateGraph, START, END } from "@langchain/langgraph";
import { z } from "zod";

// ===== 1. Set up the model =====
const model = new ChatOpenAI({
  model: "MiniMax/MiniMax-M2.5",
  apiKey: process.env.MODELSCOPE_API_KEY,
  temperature: 0,
  configuration: {
    baseURL: "https://api-inference.modelscope.cn/v1",
  },
});

// ===== 2. Define tools =====
const calculatorTool = tool(
  async ({ expression }) => {
    console.log(`  🔧 [tool] Calculating: ${expression}`);
    try {
      // eval is for this demo only; in production use a safe library such as expr-eval (see Chapter 10 of the LangChain tutorial)
      return String(eval(expression));
    } catch (e) {
      return `Calculation error: ${e.message}`;
    }
  },
  {
    name: "calculator",
    description: "Evaluate a math expression, for example 2 + 2",
    schema: z.object({
      expression: z.string().describe("The math expression to evaluate"),
    }),
  }
);

const timeTool = tool(
  async () => {
    console.log(`  🔧 [tool] Getting the current time`);
    return new Date().toLocaleString("en-US");
  },
  {
    name: "get_time",
    description: "Get the current date and time. No arguments needed",
    schema: z.object({}),
  }
);

const tools = [calculatorTool, timeTool];

// ===== 3. Define nodes =====

// Node: call the model (the model already has tools bound)
async function callModel(state) {
  const boundModel = model.bindTools(tools);
  const response = await boundModel.invoke(state.messages);
  return { messages: [response] };  // the AI message (which may contain tool_calls) is appended to the history
}

// The node that runs tools: ToolNode is a built-in node
const toolNode = new ToolNode(tools);

// ===== 4. Build the graph =====
const graph = new StateGraph(MessagesAnnotation)
  .addNode("callModel", callModel)
  .addNode("tools", toolNode)
  .addEdge(START, "callModel")
  // Conditional edge: after callModel, toolsCondition chooses "tools" or END
  .addConditionalEdges("callModel", toolsCondition)
  // After the tools finish, go back to the model to think again (this is the loop!)
  .addEdge("tools", "callModel")
  .compile();

// ===== 5. Run =====
const result = await graph.invoke({
  messages: [new HumanMessage("Please calculate (15 + 25) * 3 - 100, then tell me what time it is")],
});

console.log("\nFinal answer:");
console.log(result.messages[result.messages.length - 1].content);
```

What a run looks like:

```
  🔧 [tool] Calculating: (15 + 25) * 3 - 100
  🔧 [tool] Getting the current time

Final answer:
Here are the results:
1. (15 + 25) * 3 - 100 = -20
2. The current time is September 27, 2026, 3:30 PM
```

---

## 🔍 A Line-by-Line Look at the Important Parts

### 1. `toolsCondition`: the built-in router

```javascript
.addConditionalEdges("callModel", toolsCondition)
```

What it does inside is equivalent to:

```javascript
function shouldContinue(state) {
  const lastMessage = state.messages[state.messages.length - 1];
  // The model's last message has tool_calls → go to the "tools" node
  if (lastMessage.tool_calls?.length) return "tools";
  // None → the work is done, so stop
  return END;
}
```

> 💡 **Note:** It always routes to a node named `"tools"` (or `END`), so the tool node must be registered under the name `"tools"`. You can also pass a path array: `.addConditionalEdges("agent", toolsCondition, ["tools", END])` (the style used in the official docs; the effect is the same).

### 2. `ToolNode`: the built-in tool-execution node

```javascript
const toolNode = new ToolNode(tools);
graph.addNode("tools", toolNode);
```

It reads `tool_calls` on the last AI message in State, runs each matching tool, and writes the results back as `ToolMessage`s. After the tools finish, the model can see those results and keep thinking.

### 3. How does the loop form?

```
.addEdge("tools", "callModel")                     // tools done → back to the model
.addConditionalEdges("callModel", toolsCondition)  // model done → tools, or stop
```

These two lines form the `callModel ⇄ tools` loop. When does the model leave the loop? When it stops requesting tool calls, `toolsCondition` returns `END`.

---

## 🧰 A Hand-Written Router (without toolsCondition)

To see it all the way through, you can write the router yourself. The effect is the same:

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

## ⚡ createReactAgent: The Prebuilt One-Liner

The loop above is so common that the library packages it as `createReactAgent`:

```javascript
import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { MemorySaver } from "@langchain/langgraph";
import { HumanMessage } from "@langchain/core/messages";

const agent = createReactAgent({
  llm: model,          // the argument name is llm
  tools,               // the tool list
  prompt: "You are a helpful assistant.",  // optional: a system prompt (a string or a SystemMessage)
});

// Run it directly. The graph from above is built for you
const result = await agent.invoke({
  messages: [new HumanMessage("Please calculate 123 * 456")],
});

console.log(result.messages[result.messages.length - 1].content);
```

### Common createReactAgent arguments

| Argument | Type | Description |
|------|------|------|
| `llm` | ChatModel | The model instance (`bindTools` is called for you) |
| `tools` | Tool \| ToolNode[] | The tool list |
| `prompt` | string \| SystemMessage \| fn | System prompt, placed at the front of the message list |
| `name` | string | Agent name (used in multi-agent setups; see Chapter 24) |
| `checkpointSaver` | Checkpointer | The Checkpointer (memory; see Chapter 21) |

> 💡 **Note:** `createReactAgent` returns a compiled LangGraph graph, so `getState` from Chapter 21, `interrupt` from Chapter 22, and `stream` from Chapter 25 all apply.

### Hand-built or prebuilt?

| | Hand-built | createReactAgent |
|---|--------|------------------|
| Flexibility | ✅ You can change every step | ❌ The structure is fixed |
| Amount of code | More | One line |
| Learning value | ✅ You see how an Agent actually works | You get straight to work |

**Suggestion:** Learn the hand-built version first (this chapter), and use the prebuilt version for everyday work. When you need a special flow, you can always come back and adapt the hand-built version.

---

## ⚠️ Things to Watch Out For

### 1. Destructure the tool function's arguments

```javascript
// ✅ Right: destructure the arguments (the fields defined by the schema)
tool(async ({ expression }) => { ... }, { schema: z.object({ expression: z.string() }) })

// ❌ Wrong: take the argument directly (you receive the whole object)
tool(async (expression) => { ... })
```

### 2. Write clear tool descriptions

The tool's `description`, and each field's `.describe()` in the schema, are sent to the model. The clearer they are, the more accurately the model calls the tool (see Chapters 10 and 12 of the LangChain tutorial).

### 3. The model must support tool calling

`bindTools` depends on the model's function-calling ability. MiniMax-M2.5 on ModelScope, the model used in this tutorial, supports tool calling. If you switch models and the Agent never calls tools, or it throws, first confirm that the model supports tool calling.

### 4. The loop has a step limit

An Agent loop uses up steps quickly. When the default limit of 25 is not enough:

```javascript
await graph.invoke(input, { recursionLimit: 50 });
```

---

## 📝 Chapter Summary

- ReAct is the **loop** think → call a tool → observe → think again. The conditional edge is what makes the loop work
- The hand-built set of four: `bindTools` + a `callModel` node + `toolsCondition` + `ToolNode`
- `toolsCondition` looks at whether the last AI message has `tool_calls`, then goes to `tools` or `END`
- `createReactAgent({ llm, tools, prompt })` gives you the same loop in one line. What you get back is a compiled graph
- The Agent's exit condition is: the model stops requesting tool calls

---

## 🏃 Next Chapter

[21-记忆与持久化 →](./21-记忆与持久化.md)

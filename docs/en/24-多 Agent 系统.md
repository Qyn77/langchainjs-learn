# 24-Multi-agent Systems: Have Agents Work as a Team

> 📅 For LangGraph.js v1.x | 👶 Beginner-friendly
> 💡 **Note:** Finish Chapter 20 (ReAct Agent) and Chapter 23 (Subgraphs) first

---

## 🎯 Goals for This Chapter

- ✅ Understand when you need multiple agents, and when one agent is enough
- ✅ Master the Supervisor pattern: build it by hand, and use the official package
- ✅ Understand how agents communicate through a shared message blackboard

---

## 🤔 Isn't One Agent Enough?

A single ReAct Agent loaded with a dozen tools runs into:

- 📉 **Too many tools**, so the model is more likely to pick the wrong one
- 📜 **A message history that keeps growing**, which burns tokens and dilutes attention
- 🧩 **Mixed responsibilities**, so the prompt gets messier the more you write

**The multi-agent idea is divide and conquer.** Each agent carries only a few tools of its own and its own dedicated prompt. A coordinator decides who does the work:

```
                ┌────────────────┐
                │  Supervisor    │
                │ (supervisor    │
                │  agent)        │
                └────────────────┘
                 ↓ assign    ↑ report
      ┌─────────────┐   ┌─────────────┐
      │ research    │   │ math        │
      │ (research   │   │ (math       │
      │  expert,    │   │  expert,    │
      │  with search│   │  with a     │
      │  tools)     │   │  calculator)│
      └─────────────┘   └─────────────┘
```

> ⚠️ **Do not jump to multi-agent too soon.** The official advice is: if one agent plus a good prompt can solve it, do not split it. Multi-agent systems add **architectural complexity**. They are worth it only when the task really can be split by responsibility.

---

## 🧱 The Core Mechanism: A Shared Message Blackboard

The most common way for agents to communicate is that **every agent shares the same `messages` state** (all of them use `MessagesAnnotation`). Each agent reads and writes the same message list, like a team sharing one whiteboard:

```
messages (shared blackboard):
  [user question]
  [Supervisor: hand this to research_expert]     ← the supervisor's decision
  [research_expert: I found these sources…]      ← the expert's output
  [Supervisor: the sources are in; I'll summarize…]  ← the final answer
```

Each agent is a subgraph (Chapter 23). Put them together and you have a multi-agent system — that is the practical point of "a graph inside a graph."

---

## 💡 Style 1: Build a Supervisor by Hand

No extra packages. Use primitives you already know (a ReAct Agent plus shared state) to build a supervisor architecture.

Create `manual-supervisor.js`:

```javascript
import { ChatOpenAI } from "@langchain/openai";
import { HumanMessage, ToolMessage } from "@langchain/core/messages";
import { tool } from "@langchain/core/tools";
import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { MessagesAnnotation, StateGraph, START, END } from "@langchain/langgraph";
import { z } from "zod";

const model = new ChatOpenAI({
  model: "MiniMax/MiniMax-M2.5",
  apiKey: process.env.MODELSCOPE_API_KEY,
  configuration: {
    baseURL: "https://api-inference.modelscope.cn/v1",
  },
});

// ===== 1. Define tools for the two experts =====
const webSearchTool = tool(
  async ({ query }) => `Search results for "${query}": the AI agent market is projected to reach $50 billion in 2026.`,
  {
    name: "web_search",
    description: "Search the web for information",
    schema: z.object({ query: z.string() }),
  }
);

const calculatorTool = tool(
  async ({ expression }) => String(eval(expression)),
  {
    name: "calculator",
    description: "Evaluate a math expression",
    schema: z.object({ expression: z.string() }),
  }
);

// ===== 2. Create two expert agents (watch the name parameter!) =====
const researchAgent = createReactAgent({
  llm: model,
  tools: [webSearchTool],
  name: "research_expert",   // ← the name is how the supervisor assigns work
  prompt: "You are a research expert. You only search for information. Do not do math. Keep replies short.",
});

const mathAgent = createReactAgent({
  llm: model,
  tools: [calculatorTool],
  name: "math_expert",
  prompt: "You are a math expert. You only do calculations. Do not search for information. Keep replies short.",
});

// ===== 3. The supervisor: a model node bound to "assignment tools" =====
// The trick: wrap each expert as a "tool". A tool call from the model means "assign this work to that expert".
const askResearch = tool(
  async ({ question }) => {
    const res = await researchAgent.invoke({ messages: [new HumanMessage(question)] });
    return res.messages[res.messages.length - 1].content;
  },
  {
    name: "ask_research_expert",
    description: "Ask the research expert. Send them every question that needs a web search.",
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
    description: "Ask the math expert. Send them every question that needs a calculation.",
    schema: z.object({ question: z.string() }),
  }
);

async function supervisor(state) {
  const res = await model
    .bindTools([askResearch, askMath])
    .invoke(state.messages);

  // If the model called an "assignment tool", run it by hand (inside, that calls the expert agent)
  if (res.tool_calls?.length) {
    const results = [];
    for (const call of res.tool_calls) {
      const fn = call.name === "ask_research_expert" ? askResearch : askMath;
      const output = await fn.invoke(call.args);
      // Feed the expert's output back to the model with a ToolMessage
      results.push(new ToolMessage({ content: output, tool_call_id: call.id }));
    }
    return { messages: [res, ...results] };
  }

  return { messages: [res] };  // no tool call = the supervisor gave the final answer
}

// ===== 4. Assemble it: a single-node supervisor loop =====
const graph = new StateGraph(MessagesAnnotation)
  .addNode("supervisor", supervisor)
  .addEdge(START, "supervisor")
  .addEdge("supervisor", END)
  .compile();

const result = await graph.invoke({
  messages: [new HumanMessage(
    "Look up the 2026 AI agent market size, then convert the $50 billion into RMB (at a rate of 1:7.2)"
  )],
});

console.log(result.messages[result.messages.length - 1].content);
```

The heart of this example:

```
Inside the supervisor node:
  The model sees the question → it needs sources → tool_calls: [ask_research_expert]
  → run ask_research_expert → the researchAgent subgraph runs inside → sources come back
  → the model sees the sources → it needs a calculation → tool_calls: [ask_math_expert]
  → run ask_math_expert → the mathAgent subgraph runs inside → the calculation comes back
  → the model combines them → it outputs the final answer (and stops calling tools)
```

The Supervisor pattern is essentially **"experts as tools"**: wrap each expert agent as one of the supervisor's tools, and reuse the whole loop you learned in Chapter 20.

---

## ⚡ Style 2: The Official Package, createSupervisor

The official team packaged the pattern above as `@langchain/langgraph-supervisor`.

```bash
npm install @langchain/langgraph-supervisor
```

```javascript
import { createSupervisor } from "@langchain/langgraph-supervisor";
import { createReactAgent } from "@langchain/langgraph/prebuilt";

// Expert agents (same as style 1; remember to pass name)
const researchAgent = createReactAgent({
  llm: model,
  tools: [webSearchTool],
  name: "research_expert",
  prompt: "You are a research expert. You only search.",
});

const mathAgent = createReactAgent({
  llm: model,
  tools: [calculatorTool],
  name: "math_expert",
  prompt: "You are a math expert. You only calculate.",
});

// Create the supervisor workflow
const workflow = createSupervisor({
  agents: [researchAgent, mathAgent],
  llm: model,
  prompt: "You are the team supervisor. You manage a research expert and a math expert. " +
          "Send research to research_expert and math to math_expert.",
});

// createSupervisor returns a StateGraph; compile it before you use it
const app = workflow.compile();

const result = await app.invoke({
  messages: [new HumanMessage("Search for the 2026 AI agent market size, and calculate what half of it is")],
});
```

### Common Parameters

| Parameter | Description |
|-----------|-------------|
| `agents` | Array of expert agents (each must be a compiled graph **with a name**) |
| `llm` | The model the supervisor uses |
| `prompt` | The supervisor's system prompt |
| `outputMode` | How expert messages enter the main conversation: `"full_history"` (the default, the full history) or `"last_message"` (keep only the final reply, which saves tokens) |

### Attach Memory, and Supervisors of Supervisors

```javascript
import { MemorySaver } from "@langchain/langgraph";

// Supervisor + checkpointer = multi-turn conversation memory
const app = workflow.compile({
  checkpointer: new MemorySaver(),
});

// Hierarchical: a supervisor that supervises supervisors
const researchTeam = createSupervisor({
  agents: [researchAgent, mathAgent],
  llm: model,
}).compile({ name: "research_team" });

const topSupervisor = createSupervisor({
  agents: [researchTeam, writingTeam],  // a team can also act as an "expert"
  llm: model,
}).compile({ name: "top_supervisor" });
```

---

## 🔀 Another School: The Network Pattern (Handoff)

A Supervisor is **centralized**: every message goes through the supervisor. There is also a **decentralized** network pattern: agents hand off to each other directly. When agent A finishes its own work, it passes control to B with `Command({ goto: "agentB" })`.

```
Supervisor pattern:     Network pattern:
   ┌────────┐            A ──→ B ──→ C
   │Supervisor│            ↑         │
   └──────────┘            └─────────┘
   Central dispatch,          Free handoff, flexible
   easier to control          but harder to debug
```

> 💡 **How do you choose?** Clear division of labor and a flow you want to control → Supervisor. A relay race where each agent knows who should go next → Handoff. For a first project, prefer Supervisor. It is easier to debug.

---

## 🤝 Going Further: Handoff — Agents Pass the Baton Directly

A Supervisor is central dispatch. There is also a **decentralized** style: **Handoff**. When each agent finishes its own work, it passes control straight to the next agent with `Command({ goto })` (Chapter 18), without going through a supervisor.

```javascript
import { HumanMessage, ToolMessage } from "@langchain/core/messages";
import { Command, MessagesAnnotation, StateGraph, START, END } from "@langchain/langgraph";

// Front-desk triage agent: decide who owns the question, then hand it off directly
async function triageAgent(state) {
  const lastMsg = String(state.messages[state.messages.length - 1].content);

  if (lastMsg.includes("invoice") || lastMsg.includes("order")) {
    // ★ Do not return a plain state update; hand off to the billing specialist
    return new Command({
      update: { messages: [{ role: "ai", content: "I'll hand this question to the billing specialist." }] },
      goto: "billingAgent",
    });
  }
  return new Command({
    update: { messages: [{ role: "ai", content: "I'll hand this question to the tech specialist." }] },
    goto: "techAgent",
  });
}

async function billingAgent(state) {
  return { messages: [{ role: "ai", content: "Hello, the refund will arrive within 3 business days." }] };
}

async function techAgent(state) {
  return { messages: [{ role: "ai", content: "Please restart the app and then clear the cache." }] };
}

const graph = new StateGraph(MessagesAnnotation)
  .addNode("triageAgent", triageAgent)
  .addNode("billingAgent", billingAgent)
  .addNode("techAgent", techAgent)
  .addEdge(START, "triageAgent")
  // Note: neither specialist node points at the other — the handoff is decided at runtime by Command
  .addEdge("billingAgent", END)
  .addEdge("techAgent", END)
  .compile();

const result = await graph.invoke({
  messages: [new HumanMessage("Why hasn't my invoice been issued yet?")],
});
console.log(result.messages[result.messages.length - 1].content);
// Hello, the refund will arrive within 3 business days.  ← control was handed all the way to billingAgent
```

How to choose between the two architectures (a look back at the comparison in Chapter 19):

| | Supervisor (centralized) | Handoff (decentralized) |
|---|--------------------------|-------------------------|
| Control flow | The supervisor dispatches everything; clear and controllable | Each agent decides who to hand off to; flexible |
| Best for | Team tasks with a clear division of labor | Relay-style flows where the previous agent knows who is next |
| Debugging | Low | Higher (the handoff chain is hidden at runtime) |

> 💡 **Tip:** A real Handoff agent usually lets each expert LLM itself say "who to hand this to" (rather than a hardcoded `if`), then maps that choice to `Command({ goto })`. To learn the mechanism, start with hardcoded rules.

---

## ⚠️ Things to Watch Out For

### 1. Every expert agent must have a name

`createSupervisor` assigns work by name. You cannot omit the `name` parameter:

```javascript
// ❌ Forgot name, so the supervisor does not know who this is
createReactAgent({ llm: model, tools, prompt: "..." })

// ✅ name must be unique and clear
createReactAgent({ llm: model, tools, prompt: "...", name: "math_expert" })
```

### 2. Each expert's prompt should stay in its lane

Tell every expert clearly what it does and what it does not do. Otherwise an expert will take over someone else's job (for example the math expert starts searching).

### 3. Keep the number of agents and the depth of the hierarchy in check

Two to four experts is the sweet spot. If the hierarchy goes past two levels, seriously consider whether you split the work the wrong way.

### 4. Use outputMode to save tokens

By default, an expert's intermediate steps (tool calls and so on) all enter the main conversation. When you have many experts and many steps, switch to `outputMode: "last_message"`.

---

## 📝 Chapter Summary

- Multi-agent systems split work by responsibility: each agent has few tools and a dedicated prompt, and a coordinator assigns the work
- Communication uses **shared `messages`**, and each agent is a subgraph
- A hand-built Supervisor wraps each expert as an "assignment tool" on the supervisor and reuses the ReAct loop
- `createSupervisor({ agents, llm, prompt }).compile()` is the official wrapper, with support for outputMode, a checkpointer, and multiple levels
- If one agent can solve it, do not split it; if you do split it, give every expert a unique name

---

## 🏃 Next Chapter

[25-Streaming →](./25-流式输出.md)

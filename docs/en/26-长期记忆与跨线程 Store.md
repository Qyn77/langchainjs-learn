# 26-Long-term Memory and Cross-thread Store

> 📅 For LangGraph.js v1.x | 👶 Beginner-friendly
> 💡 **Note:** Finish Chapter 21 (Checkpointer) first. This chapter builds on it

---

## 🎯 Goals for This Chapter

- ✅ Tell short-term memory (Checkpointer) and long-term memory (Store) apart
- ✅ Use `InMemoryStore`: `put`, `get`, and `search`
- ✅ Remember a user profile across conversation threads

---

## 🤔 Isn't a Checkpointer Enough?

The Checkpointer from Chapter 21 has a natural boundary: **memory belongs to one thread (one conversation).**

```
thread-1: the user says "I like Americano" → remembered ✅
thread-2: three days later, a new conversation, the user asks "what do I like to drink?" → ❌ forgotten
```

In a real product, the user profile, preferences, and past conclusions need to be kept **across every conversation**. That is the job of the **Store**:

| Comparison | Checkpointer (Chapter 21) | Store (this chapter) |
|------------|---------------------------|----------------------|
| What it stores | A full snapshot of graph state | Application-defined key-value data |
| Scope | Inside a single thread | **Across every thread** |
| Kind of memory | Short-term memory (conversation continuity) | Long-term memory (user preferences, facts) |
| Typical use | Multi-turn chat, human-in-the-loop, fault tolerance | "Remember that the user likes Americano" |

> 💡 **The split in one sentence:** a Checkpointer remembers "where this conversation left off." A Store remembers "who this user is."

---

## 📦 Basic Usage of InMemoryStore

While you are learning, use the in-memory `InMemoryStore` (in production, swap in a persistent implementation such as Postgres; the interface is the same):

```javascript
import { InMemoryStore } from "@langchain/langgraph";

const store = new InMemoryStore();
```

### Three Core Operations

```javascript
// 1. put: write (namespace is an array of strings, like a "folder path")
const namespace = ["user_1", "memories"];
await store.put(namespace, "memory-id-001", {
  text: "The user likes Americano",
});

// 2. get: read one key exactly
const item = await store.get(namespace, "memory-id-001");
console.log(item.value);  // { text: "The user likes Americano" }

// 3. search: list or search memories under that namespace
const memories = await store.search(namespace, { limit: 10 });
memories.forEach((m) => {
  console.log(m.key, m.value, m.updatedAt);
});
```

Key points:

- A **namespace** is an array of strings. A common shape is `[userId, "memories"]`, so different users do not interfere with each other
- `search` returns **item objects**: `{ key, value, namespace, createdAt, updatedAt }`. The memory content is in `.value`
- Reads and writes are both async (they may come from a database)

---

## 💡 Full Example: Remember User Preferences Across Conversations

Create `long-term-memory.js`:

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

// Long-term memory store + short-term memory checkpointer (you need both)
const store = new InMemoryStore();
const checkpointer = new MemorySaver();

// Node 1: call the model, after injecting the user's long-term memory into the system prompt
async function callModel(state, config) {
  const userId = config.configurable.userId;

  // ★ Read this user's long-term memory from the Store (across threads!)
  const memories = await config.store.search([userId, "memories"], { limit: 5 });
  const facts = memories.map((m) => `- ${m.value.text}`).join("\n");

  // Send the memory as a system prompt together with the full conversation history
  const input = [
    new SystemMessage(`Here is the long-term memory about this user:\n${facts || "(none yet)"}`),
    ...state.messages,
  ];
  const response = await model.invoke(input);
  return { messages: [response] };
}

// Node 2: write anything worth remembering into the Store
async function saveMemory(state, config) {
  const userId = config.configurable.userId;

  // A keyword trigger for this demo; a real project usually lets an LLM decide "is this worth remembering?"
  const history = state.messages;
  const lastUserMsg = String(history[history.length - 2].content); // second-to-last = the user message

  if (lastUserMsg.includes("remember")) {
    await config.store.put(
      [userId, "memories"],
      crypto.randomUUID(),            // use a random ID as the key
      { text: lastUserMsg.replace("remember", "").trim() }
    );
    console.log("  💾 Saved to long-term memory");
  }
  return {};
}

const graph = new StateGraph(MessagesAnnotation)
  .addNode("callModel", callModel)
  .addNode("saveMemory", saveMemory)
  .addEdge(START, "callModel")
  .addEdge("callModel", "saveMemory")
  .addEdge("saveMemory", END)
  // ★ Attach both the checkpointer (short-term) and the store (long-term)
  .compile({ checkpointer, store });

// ===== First conversation: teach the agent a preference =====
const config1 = {
  configurable: { thread_id: "thread-1", userId: "user_1" },
};
const r1 = await graph.invoke(
  { messages: [new HumanMessage("remember I like Americano coffee")] },
  config1
);
console.log("AI:", r1.messages[r1.messages.length - 1].content);

// ===== Three days later: a brand-new thread, but the same user =====
const config2 = {
  configurable: { thread_id: "thread-2", userId: "user_1" },  // the thread changed!
};
const r2 = await graph.invoke(
  { messages: [new HumanMessage("What coffee do I like again?")] },
  config2
);
console.log("AI:", r2.messages[r2.messages.length - 1].content);
// AI: You like Americano coffee. ← a new conversation still remembers! The memory comes from the Store, not the thread
```

Sample output:

```
  💾 Saved to long-term memory
AI: Got it — I've remembered that you like Americano!
AI: You like Americano coffee.
        ↑ The key moment: thread-2 is a brand-new conversation, but the agent
          read the memory that thread-1 wrote into the Store
```

### What This Code Teaches

```
compile({ checkpointer, store })   ← attach both memory systems
config.store.search([...])         ← any node can read the Store
config.store.put([...])            ← any node can write the Store
config.configurable.userId         ← the user id (a field you define) used to split namespaces
```

> 💡 **Note:** `userId` is a custom field we put in `configurable`. LangGraph does not care what it is called. It is simply passed into every node with `config`, and you use it to build the namespace.

---

## 🔍 Going Further: Semantic Search over Memory

Once you have a lot of memories, listing everything with `search` is not smart enough. Give the Store an embedding model and you can find memories **by meaning**:

```javascript
import { InMemoryStore } from "@langchain/langgraph";
import { OpenAIEmbeddings } from "@langchain/openai";

const store = new InMemoryStore({
  index: {
    embeddings: new OpenAIEmbeddings({ model: "text-embedding-3-small" }),
    dims: 1536,
    fields: ["text"],   // which field of the memory to embed
  },
});

// Writing stays the same; when you read, ask in natural language:
const memories = await config.store.search([userId, "memories"], {
  query: "What does the user like to drink?",   // match by meaning, not by keyword
  limit: 3,
});
```

Even if what you stored years ago was "the user likes Americano," a question like "his coffee taste preferences" can still retrieve it.

> ⚠️ **Note:** Semantic search needs an embedding service (the example uses an OpenAI-compatible API), which adds latency and cost. When you have few memories, reading them all is simpler.

---

## 💾 Production

`InMemoryStore` is lost on restart. In production, switch to a persistent implementation. **The interface is exactly the same:**

| Implementation | Description |
|----------------|-------------|
| `PostgresStore` | Officially recommended; supports semantic search |
| `RedisStore` / `MongoDBStore` / `UpstashStore` | Other backends from the community or the official team |

All of them extend `BaseStore`. Switching is just changing the constructor line. The full list is in the official [store integrations](https://docs.langchain.com/oss/javascript/integrations/long-term-memory/index) docs.

> 💡 **Version note:** The latest official docs also show `MemoryStore`, which is a newer name for the same capability as `InMemoryStore`. When you use it, follow the API reference for the version you installed (when this tutorial was written, the name exported by the package was `InMemoryStore`).

---

## ⚠️ Things to Watch Out For

### 1. Do not mix up Store and Checkpointer

Conversation state goes in the Checkpointer (that part is automatic). The user profile goes in the Store (you read and write it yourself). Stuffing the conversation history into the Store is a common anti-pattern.

### 2. Memory values must be serializable, and they should be small

The value you `put` is written to storage. Store a distilled fact, not a long raw transcript.

### 3. Design the namespace on purpose

A two-level shape like `[userId, "memories"]` is a good default. You can add more levels by business area, such as `[userId, "travel", "preferences"]`.

### 4. Who decides "what to remember"?

Start with a keyword. Later, use a dedicated LLM call for memory extraction (decide what is worth storing, and distill it into one sentence). That is a core design choice when you build a memory system. The official docs discuss it in full (see the link below).

---

## 📝 Chapter Summary

- A **Checkpointer is short-term memory** (state snapshots inside one thread). A **Store is long-term memory** (key-value data across threads)
- `InMemoryStore`: write with `put(namespace, key, value)`, and read with `get` or `search`
- Attach both with `compile({ checkpointer, store })`. Nodes read and write through `config.store`
- The namespace `[userId, "memories"]` isolates users, and the same user is shared across conversations
- Add embeddings for semantic memory search. In production, switch to something like `PostgresStore`

---

## 🏃 Next Chapter

[27-Functional API →](./27-Functional API.md)

# 27-Functional API: Use LangGraph Without Drawing a Graph

> 📅 For LangGraph.js v1.x | 👶 Beginner-friendly
> 💡 **Note:** Finish Chapters 21–22 (persistence and human-in-the-loop) first. This chapter will be easier to follow

---

## 🎯 Goals for This Chapter

- ✅ Understand what the Functional API is for: add LangGraph capabilities to an ordinary function
- ✅ Master `entrypoint` (the workflow entry) and `task` (a unit of work)
- ✅ Use `getPreviousState` for memory across calls

---

## 🤔 Why Is There a Functional API?

You already know how to define nodes and edges with `StateGraph`. Why does the official API offer another way to write this?

Recall the Graph API flow: define state → write nodes → connect edges → compile. For a flow that is **structurally complex and needs to be visualized**, that is worth it. Some cases are different — "adapt a piece of existing sequential code," or "write a simple two-step flow" — and drawing a graph is a burden.

**The Functional API lets you write a workflow as an ordinary function.** Use `if/else` and `for` loops however you like, and you still keep LangGraph's three core capabilities:

| Capability | What it means |
|------------|---------------|
| Persistence | Attach a checkpointer, and you can resume after an interruption |
| Human-in-the-loop | Call `interrupt()` directly inside the function |
| Streaming | `stream` and `streamEvents` work as usual |

Two core primitives:

| Primitive | Role | Graph API analogy |
|-----------|------|-------------------|
| `entrypoint` | The entry function of the workflow | The whole graph |
| `task` | A checkpointed unit of work | One node |

---

## 📦 entrypoint: Turn a Function into a Workflow

```javascript
import { entrypoint } from "@langchain/langgraph";

const myWorkflow = entrypoint(
  { checkpointer, name: "myWorkflow" },   // optional: checkpointer, name, and so on
  async (input) => {
    // An ordinary function body: if/else, loops, and await are all fine
    return result;
  }
);

// You run it the same way you run a graph
const output = await myWorkflow.invoke(input, { configurable: { thread_id: "1" } });
```

Rules:

- The function **takes only one argument**. To pass several pieces of data, wrap them in an object
- The input and the return value must be **JSON-serializable** (they go into the checkpoint)
- The return value is a runnable object with `invoke`, `stream`, and `streamEvents`

---

## 📦 task: Put a Checkpoint on an "Important Step"

`task` wraps an ordinary function and turns it into a **checkpointed task**:

```javascript
import { task } from "@langchain/langgraph";

const slowComputation = task("slowComputation", async (input) => {
  // Call an API, write a file, run a long job…
  return result;
});

// Call it inside an entrypoint (a task can only be called inside an entrypoint, a task, or a graph node)
const result = await slowComputation(input);
```

**The superpower of `task`: its result is stored in the checkpoint.** When execution resumes, a finished task is not run again. That is essential for the human-in-the-loop case in Chapter 22 (an API call made before the pause will not charge the user twice after resume 😅).

---

## 💡 Full Example: Write an Essay, Then Ask a Human to Approve It

Create `essay-review.js` (a simplified version of the official classic example):

```javascript
import {
  MemorySaver, entrypoint, task, interrupt, Command,
} from "@langchain/langgraph";

// Wrap the long job in a task: the slow "write an essay" step
const writeEssay = task("writeEssay", async (topic) => {
  await new Promise((r) => setTimeout(r, 1000));  // simulate a slow step
  return `An essay about "${topic}"…`;
});

// Define the workflow with entrypoint: an ordinary function, written however you like
const workflow = entrypoint(
  { checkpointer: new MemorySaver(), name: "essayWorkflow" },
  async (topic) => {
    const essay = await writeEssay(topic);   // run the task (the result goes into the checkpoint)

    // ★ Call interrupt in the middle of the function: pause for human approval (Chapter 22)
    const isApproved = interrupt({
      essay,
      action: "Please approve or reject this essay",
    });

    return { essay, isApproved };
  }
);

const config = { configurable: { thread_id: "essay-1" } };

// First run: after the essay is written, pause and wait for approval
const result1 = await workflow.invoke("artificial intelligence", config);
console.log(result1.__interrupt__[0].value);
// { essay: "An essay about \"artificial intelligence\"…", action: "Please approve or reject this essay" }

// After the human approves, resume (same as the Graph API: Command resume)
const result2 = await workflow.invoke(
  new Command({ resume: true }),
  config
);
console.log(result2);
// { essay: "An essay about \"artificial intelligence\"…", isApproved: true }
```

> ⚠️ **The key mechanism:** on resume, the function **starts over from the top** (just like a graph node), but the result of `writeEssay` is already in the checkpoint, so **the essay is not actually rewritten**. That is why you wrap important steps in a `task`. The other way to say it: **any side effect you do not want to rerun after resume (an API call, writing a file) must be wrapped in a `task`.**

---

## 💡 getPreviousState: "Conversation Memory" for Functions

An `entrypoint` with a checkpointer can call `getPreviousState()` to get **the return value of the previous call**, which gives you memory across calls:

```javascript
import { entrypoint, getPreviousState, MemorySaver } from "@langchain/langgraph";

const counter = entrypoint(
  { checkpointer: new MemorySaver(), name: "counter" },
  async (number) => {
    const previous = getPreviousState() ?? 0;  // the return value of the previous call
    return number + previous;
  }
);

const config = { configurable: { thread_id: "c1" } };

console.log(await counter.invoke(1, config));  // 1 (there was no previous call)
console.log(await counter.invoke(2, config));  // 3 (the previous call returned 1)
```

> 💡 **Compared with the Graph API:** a graph's "memory" is the whole state object (`messages` and so on). Functional API memory is, by default, "the previous return value." If you want to store something richer, just return an object.

---

## 🆚 How Do You Choose Between the Graph API and the Functional API?

| | Graph API (this tutorial's main path) | Functional API |
|---|---------------------------------------|----------------|
| Mental model | Draw a graph: nodes + edges + shared state | Write a function: sequential logic + `task` |
| Branches and loops | Conditional edges, `Send` | `if/else` and `for` (supported natively) |
| State | Many nodes share one state | Local variables in the function; `getPreviousState` across calls |
| Visualization | ✅ You can export the graph structure | ❌ Not supported (the graph is generated dynamically at runtime) |
| Checkpoint granularity | One checkpoint per superstep | At the level of task results |
| Best for | Complex agents, multi-branch parallelism, teamwork | Adapting existing code, linear flows, fast prototypes |

> 💡 **Official advice:** both share the same runtime, and **you can mix them in one application** — for example, call a Functional workflow from one node of a graph. This tutorial teaches the Graph API as the main path because it covers structured cases the Functional API cannot, and once you know the Graph API the Functional API is easy to read.

---

## ⚠️ Things to Watch Out For

### 1. A task can only be called inside a "LangGraph context"

```javascript
// ❌ Wrong: call the task directly from application code
const r = await myTask("input");

// ✅ Correct: call it inside an entrypoint, another task, or a graph node
const workflow = entrypoint({...}, async (input) => {
  return await myTask(input);
});
```

### 2. Non-determinism and side effects must be wrapped in a task

On resume the function replays from the top. If random numbers, timestamps, or API calls are not inside a `task`, the replay will get different results.

### 3. An entrypoint function has only one parameter

```javascript
// ❌ entrypoint({...}, async (a, b) => {...})

// ✅ Pass an object
entrypoint({...}, async ({ a, b }) => {...})
```

### 4. Inputs and outputs must be JSON-serializable

They go into the checkpoint (persistence and resume). You cannot pass functions or class instances.

---

## 📝 Chapter Summary

- The Functional API means ordinary functions plus `entrypoint` and `task`, which gives you LangGraph persistence, human-in-the-loop, and streaming
- A `task` result is stored in the checkpoint: **finished tasks are not rerun when execution resumes**. Side effects must be wrapped in a `task`
- `getPreviousState()` reads the previous call's return value, which is memory for functions
- It shares a runtime with the Graph API, and you can mix them. Use a graph for complex structure, and a function for sequential logic

---

## 🏃 Next Chapter

[28-Capstone Project: Smart Travel Concierge →](./28-实战项目.md)

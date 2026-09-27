# Introduction to LangGraph: Why Graph Orchestration?

> 📅 For LangGraph.js v1.x (`@langchain/langgraph` 1.x) | 👶 Beginner-friendly
> 💡 **Note:** This chapter continues the LangChain tutorial (chapters 01–14). It requires Node.js 18+ (20+ recommended)

---

## 🎯 Goals for This Chapter

- ✅ Understand what LangGraph is and which problems it solves
- ✅ Tell LangChain and LangGraph apart
- ✅ Learn the core ideas: State, nodes, edges, and the graph
- ✅ See what LangGraph can do

---

## 📖 In One Sentence

**LangGraph is a low-level orchestration framework and runtime for building long-running, stateful AI Agents and workflows.**

If LangChain helps you "call a model and assemble a chain," LangGraph helps you "orchestrate the whole process." It connects steps as a **graph**, and it supports **loops, branches, parallelism, and pause-and-resume**.

---

## 🤔 Why Do You Need LangGraph?

### A Look Back: Tools You Already Know

In the LangChain tutorial you learned two ways to organize logic:

| Approach | Representative API | What it is good at | Limitation |
|------|---------|------|------|
| Chain | `.pipe()` | A one-way pipeline, one step after another | ❌ No loops |
| Prebuilt Agent | `createAgent` | A ReAct loop that works out of the box | ❌ The internal flow is hard to customize |

### What Real Agents Actually Need

```
User question
   │
   ▼
┌──────────┐   Need to look something up?   ┌──────────┐
│  Think   │ ─── yes ──→                    │ Call a   │──┐
└──────────┘                                │ tool     │  │
   ▲                                        └──────────┘  │
   │            Not satisfied? Try again                   │
   └──────────── loop ←────────────────────────────────────┘
   │
   ▼
Final answer
```

The important point: **an Agent's flow is not a straight line. It is a graph that can go around in circles.**

- 🔄 **Loops:** after a tool call, go back to "think" and iterate until the result is good enough
- 🔀 **Branches:** take different paths based on a condition
- ⏸️ **Pause:** wait for a human to approve, then continue (human-in-the-loop)
- 💾 **Remember State:** save progress at any time, and recover after a crash

A `.pipe()` chain cannot do this, and a prebuilt Agent is not flexible enough. **LangGraph is built for these cases.**

---

## 🧱 LangChain vs LangGraph

> ⚠️ **Important:** They are not competitors. They divide the work.

| | LangChain | LangGraph |
|--------|-----------|-----------|
| Role | An Agent framework (abstractions for models, tools, and prompts) | An orchestration framework and runtime |
| Level of abstraction | Higher (`createAgent` builds one in a single call) | Very low (you draw the graph and connect it yourself) |
| Best for | A standard ReAct tool-calling Agent | Complex workflows, multi-agent systems, and fine-grained control |
| Model and tool integration | ✅ Provided | Works with LangChain components, and can also be used without them |

**Official guidance:**
- Getting started, or you only need a simple tool loop → use LangChain's `createAgent` (see chapter 12)
- You need a custom flow, loops, parallelism, or human approval → use LangGraph

> 💡 **Note:** LangChain's `createAgent` is implemented on top of LangGraph. Once you learn LangGraph, you can also see what it is doing internally.

---

## 🧱 Core Concepts (Get Familiar with Them First)

LangGraph describes an Agent's behavior as a graph. There are only three core pieces:

```
                    ┌─────────────────────────────┐
                    │           Graph             │
                    │                             │
   input ──→ ┌─────────────┐    ┌─────────────┐   │
             │    Node     │───→│    Node     │   │──→ output
             │ (a function │    │ (a function │   │
             │  that works)│    │  that works)│   │
             └─────────────┘    └─────────────┘   │
                    ▲                  │
                    │      Edge        │
                    └──(what runs next)┘

   Every node shares one State
```

| Concept | What it is | Analogy |
|------|--------|------|
| **State** | The data structure shared by every node, updated as execution proceeds | A factory conveyor belt |
| **Node** | A function that receives the current State, does some work, and returns a State update | A worker at a station |
| **Edge** | Decides which node runs next after a node finishes | The conveyor track |
| **Graph** | The whole made of nodes plus edges. It can run only after `compile()` | The whole factory |
| **Checkpointer** | Automatically saves a State snapshot after every step | The factory's security footage |

> 💡 **Remember this:** the official line is **"nodes do the work, edges tell what to do next."**

### How Execution Works: Super-steps

Under the hood, LangGraph is inspired by Google's Pregel system. It runs one super-step at a time:

1. Every node starts **idle**
2. A node that receives a message (a State update) is **activated**
3. Nodes activated in the same super-step **run in parallel**
4. Nodes with nothing to do drop out. When every node has dropped out, the graph is finished

You do not need to memorize the details. Just know this: **multiple nodes in the same super-step run in parallel** (chapter 17 uses this).

---

## ⚡ What LangGraph Can Do

| Capability | What it means | Chapter |
|------|------|---------|
| **Durable execution** | A checkpoint is saved after every step, so a failure can resume from the previous step | Chapter 21 |
| **Memory** | Multi-turn conversation memory through `thread_id` | Chapter 21 |
| **Human-in-the-loop** | Pause the graph at any time, wait for a person to approve or edit, then continue | Chapter 22 |
| **Streaming** | Stream State, LLM tokens, and custom progress | Chapter 25 |
| **Loops and branches** | Conditional edges plus loops, so you can customize Agent behavior freely | Chapters 19–20 |
| **Subgraphs / multi-agent** | Graphs inside graphs, with multiple Agents working together | Chapters 23–24 |

---

## 🔀 Two Styles: the Graph API and the Functional API

LangGraph offers two API styles (this tutorial focuses on the **Graph API**):

| | Graph API | Functional API |
|------|------------------|------------------------|
| Core classes / functions | `StateGraph` + `Annotation` | `entrypoint` + `task` |
| Style | Declarative: define nodes and edges | Imperative: ordinary if/else plus function calls |
| Best for | Complex branches, parallelism, and flows you want to visualize | Adapting existing sequential code, and quick prototypes |
| Learning curve | A bit steeper (you need to understand State and edges) | Gentler |

> 💡 **Note:** Both styles share the same runtime (persistence, streaming, and human-in-the-loop all work), and you can mix them in one application. Start with the Graph API. It is also the foundation for understanding how LangChain's `createAgent` works internally. The Functional API is covered in [第 27 章](./27-Functional API.md).

---

## 🎯 Typical Use Cases

| Use case | What it looks like | Capabilities used |
|------|------|-----------|
| Customer support | Multi-turn chat plus tools such as order lookup and refunds | Memory + tools + conditional edges |
| Approval Agent | Wait for a human to confirm before a sensitive action | Human-in-the-loop |
| Deep research assistant | Search → summarize → search again, over many rounds | Loops + parallelism |
| Multiple specialists | A supervisor assigns work to several specialist Agents | Subgraphs + multi-agent |
| Long-running jobs | Data processing that runs for hours and can recover from a crash | Durable execution |

---

## 📦 Installation

```bash
npm install @langchain/langgraph @langchain/core

# When you need an LLM (this tutorial uses the ModelScope platform throughout)
npm install @langchain/openai
```

> 💡 **Note:** LangGraph.js requires Node.js 18+. To stay consistent with the LangChain tutorial, use Node.js 20+ LTS.

---

## 📝 Chapter Summary

- LangGraph = orchestrating an Agent workflow as a **graph**: **nodes do the work, edges show the way**
- LangChain handles model and tool abstractions. LangGraph handles process orchestration. Use them together
- Core concepts: State, nodes, edges, and the graph
- Core capabilities: durability, memory, human-in-the-loop, streaming, loops and branches, and subgraphs

---

## 🏃 Next Chapter

[16-环境搭建与第一个图 →](./16-环境搭建与第一个图.md)

---
title: LangChain & LangGraph Getting Started Tutorial
titleTemplate: false
description: A from-scratch tutorial for LangChain.js and LangGraph.js v1.x, from model calls, chains, and agents to stateful graphs.
---

# LangChain & LangGraph Getting Started Tutorial

> 🗺️ **This tutorial is split into two parts**:
> **LangChain** (chapters 01-14) teaches you to call large models, assemble chains, and build Agents;
> **LangGraph** (chapters 15-28) teaches you to build stateful, pausable, collaborative Agent systems with graph orchestration.
> The two are the golden pair of one ecosystem—LangChain provides the building blocks, and LangGraph provides the blueprint.

---

## 📚 LangChain (01-14)

### Basics

| Chapter | Topic | Description |
|------|------|------|
| [01](./01-基础概念.md) | Concepts | What is LangChain? What can it do? |
| [02](./02-环境搭建.md) | Environment Setup | Install Node.js, create a project, and configure an API key |
| [03](./03-模型调用.md) | Calling Models | Call a large model with ChatOpenAI (parameters in detail) |
| [04](./04-消息类型.md) | Message Types | HumanMessage and SystemMessage in detail |
| [05](./05-流式输出.md) | Streaming | Implement a typewriter effect |

### Intermediate

| Chapter | Topic | Description |
|------|------|------|
| [06](./06-Prompt 模板.md) | Prompt Templates | Generate prompts dynamically |
| [07](./07-输出解析器.md) | Output Parsers | Get structured data (withStructuredOutput / Zod) |
| [08](./08-链 (Chain).md) | Chains | Combine multiple steps |
| [09](./09-记忆 (Memory).md) | Memory | Implement multi-turn conversations |
| [10](./10-工具 (Tools).md) | Tools | Call external APIs and functions |
| [11](./11-Zod 使用说明.md) | Zod Guide | A complete guide to the Zod validation library |

### Advanced

| Chapter | Topic | Description |
|------|------|------|
| [12](./12-Agent（智能体）.md) | Agents | Decide on their own, use tools, and complete tasks |
| [13](./13-RAG（检索增强生成）.md) | RAG | Have the AI look things up before answering |
| [14](./14-VectorStore（向量存储）.md) | Vector Stores | A database you search by meaning |

---

## 📚 LangGraph (15-28)

### Basics

| Chapter | Topic | Description |
|------|------|------|
| [15](./15-LangGraph 简介.md) | Introduction to LangGraph | Why graph orchestration? A tour of the core concepts |
| [16](./16-环境搭建与第一个图.md) | Environment Setup and Your First Graph | Build and run your first graph |
| [17](./17-状态（State）详解.md) | State in Detail | Annotation, reducers, and MessagesAnnotation |
| [18](./18-节点与边.md) | Nodes and Edges | Node functions, Command, fan-out and fan-in |
| [19](./19-条件边与路由.md) | Conditional Edges and Routing | addConditionalEdges and dynamic dispatch with Send |
| [20](./20-构建 ReAct Agent.md) | Building a ReAct Agent | Build it by hand, plus the createReactAgent preset |

### Intermediate

| Chapter | Topic | Description |
|------|------|------|
| [21](./21-记忆与持久化.md) | Memory and Persistence | Checkpointer, thread_id, and getState |
| [22](./22-人机协同.md) | Human-in-the-loop | Pause with interrupt and resume with Command |
| [23](./23-子图.md) | Subgraphs | A graph inside a graph: reuse and divide-and-conquer |
| [24](./24-多 Agent 系统.md) | Multi-Agent Systems | Supervisor and createSupervisor |
| [25](./25-流式输出.md) | Streaming | streamMode, a messages typewriter, and writer progress |
| [26](./26-长期记忆与跨线程 Store.md) | Long-term Memory and the Cross-thread Store | InMemoryStore and user profiles across sessions |
| [27](./27-Functional API.md) | Functional API | entrypoint, task, and workflows without drawing a graph |
| [28](./28-实战项目.md) | Capstone | A smart travel concierge: putting everything you learned to work |

---

## 🚀 Quick Start

```bash
# 1. Install dependencies (LangChain)
npm install @langchain/core @langchain/openai zod

# 2. Extra install for LangGraph
npm install @langchain/langgraph

# 3. Set the API key (ModelScope as an example)
export MODELSCOPE_API_KEY="your API key"

# 4. Run the sample code
node 03-模型调用.js
```

---

## 📦 Core Dependencies

```json
{
  "@langchain/core": "^1.x",
  "@langchain/openai": "^1.x",
  "langchain": "^1.x",             // Agents (chapter 12)
  "@langchain/langgraph": "^1.x",  // LangGraph (chapters 15-28)
  "@langchain/classic": "^1.x",    // Classic components such as MemoryVectorStore (chapters 13-14)
  "zod": "^4.x"
}
```

---

## 💡 Study Tips

1. **Learn in order**: Build a foundation with LangChain first (models, messages, chains, and tools), then learn orchestration in LangGraph
2. **Understand the split**: LangChain's `createAgent` is enough for a simple tool loop; move to LangGraph when you need loops, branches, parallelism, or human approval
3. **Practice by doing**: Every chapter has runnable sample code. Getting it to run matters more than only understanding it

---

## 🔗 Official Resources

- [LangChain.js official docs](https://docs.langchain.com/oss/javascript/langchain/overview)
- [LangGraph.js official docs](https://docs.langchain.com/oss/javascript/langgraph/overview)
- [GitHub repository](https://github.com/langchain-ai/langchainjs)
- [Zod official docs](https://zod.dev/)

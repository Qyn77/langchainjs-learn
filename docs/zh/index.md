---
title: LangChain & LangGraph 入门教程
titleTemplate: false
description: 适用于 2026 年 LangChain.js / LangGraph.js v1.x 的零基础入门教程，从模型调用、链、Agent 到 LangGraph 状态图。
---

# LangChain & LangGraph 入门教程

> 🗺️ **本教程分两大篇**：
> **LangChain 篇**（01-14 章）教你调用大模型、组装链路与构建 Agent；
> **LangGraph 篇**（15-28 章）教你用图编排的方式构建有状态、可暂停、可协作的 Agent 系统。
> 两者是同一生态的黄金搭档——LangChain 负责"积木"，LangGraph 负责"图纸"。

---

## 📚 LangChain 篇（01-14）

### 基础篇

| 章节 | 主题 | 说明 |
|------|------|------|
| [01](./01-基础概念.md) | 基础概念 | 什么是 LangChain？能做什么？ |
| [02](./02-环境搭建.md) | 环境搭建 | 安装 Node.js、创建项目、配置 API Key |
| [03](./03-模型调用.md) | 模型调用 | 使用 ChatOpenAI 调用大模型（详细参数） |
| [04](./04-消息类型.md) | 消息类型 | HumanMessage、SystemMessage 详解 |
| [05](./05-流式输出.md) | 流式输出 | 实现打字机效果 |

### 进阶篇

| 章节 | 主题 | 说明 |
|------|------|------|
| [06](./06-Prompt 模板.md) | Prompt 模板 | 动态生成提示词 |
| [07](./07-输出解析器.md) | 输出解析器 | 获取结构化数据（withStructuredOutput / Zod） |
| [08](./08-链 (Chain).md) | 链 (Chain) | 组合多个操作步骤 |
| [09](./09-记忆 (Memory).md) | 记忆 (Memory) | 实现多轮对话 |
| [10](./10-工具 (Tools).md) | 工具 (Tools) | 调用外部 API/函数 |
| [11](./11-Zod 使用说明.md) | Zod 使用说明 | Zod 验证库完整指南 |

### 高级篇

| 章节 | 主题 | 说明 |
|------|------|------|
| [12](./12-Agent（智能体）.md) | Agent（智能体） | 自主决策、使用工具、完成任务 |
| [13](./13-RAG（检索增强生成）.md) | RAG（检索增强生成） | 让 AI 先查资料再回答 |
| [14](./14-VectorStore（向量存储）.md) | VectorStore（向量存储） | 按语义搜索的数据库 |

---

## 📚 LangGraph 篇（15-28）

### 基础篇

| 章节 | 主题 | 说明 |
|------|------|------|
| [15](./15-LangGraph 简介.md) | LangGraph 简介 | 为什么需要图编排？核心概念一览 |
| [16](./16-环境搭建与第一个图.md) | 环境搭建与第一个图 | 构建并运行第一张图 |
| [17](./17-状态（State）详解.md) | 状态（State）详解 | Annotation、reducer、MessagesAnnotation |
| [18](./18-节点与边.md) | 节点与边 | 节点函数、Command、扇出/扇入 |
| [19](./19-条件边与路由.md) | 条件边与路由 | addConditionalEdges、Send 动态分发 |
| [20](./20-构建 ReAct Agent.md) | 构建 ReAct Agent | 手动搭建 + createReactAgent 预置版 |

### 进阶篇

| 章节 | 主题 | 说明 |
|------|------|------|
| [21](./21-记忆与持久化.md) | 记忆与持久化 | Checkpointer、thread_id、getState |
| [22](./22-人机协同.md) | 人机协同 | interrupt 暂停与 Command resume 恢复 |
| [23](./23-子图.md) | 子图（Subgraphs） | 图里套图：复用、分治 |
| [24](./24-多 Agent 系统.md) | 多 Agent 系统 | Supervisor 与 createSupervisor |
| [25](./25-流式输出.md) | 流式输出 | streamMode、messages 打字机、writer 进度 |
| [26](./26-长期记忆与跨线程 Store.md) | 长期记忆与跨线程 Store | InMemoryStore、跨会话用户画像 |
| [27](./27-Functional API.md) | Functional API | entrypoint、task、不画图的工作流 |
| [28](./28-实战项目.md) | 实战项目 | 智能旅行管家：综合运用全部知识 |

---

## 🚀 快速开始

```bash
# 1. 安装依赖（LangChain 篇）
npm install @langchain/core @langchain/openai zod

# 2. LangGraph 篇额外安装
npm install @langchain/langgraph

# 3. 设置 API Key (以 ModelScope 为例)
export MODELSCOPE_API_KEY="你的 API Key"

# 4. 运行示例代码
node 03-模型调用.js
```

---

## 📦 核心依赖

```json
{
  "@langchain/core": "^1.x",
  "@langchain/openai": "^1.x",
  "langchain": "^1.x",             // Agent（第 12 章）
  "@langchain/langgraph": "^1.x",  // LangGraph 篇（15-28 章）
  "@langchain/classic": "^1.x",    // MemoryVectorStore 等经典组件（13-14 章）
  "zod": "^4.x"
}
```

---

## 💡 学习建议

1. **按顺序学习**：先 LangChain 篇打基础（模型、消息、链、工具），再进入 LangGraph 篇学编排
2. **理解分工**：简单工具循环用 LangChain 的 `createAgent` 就够；需要循环、分支、并行、人工审批时上 LangGraph
3. **动手实践**：每章都有可运行的示例代码，跑通比看懂更重要

---

## 🔗 官方资源

- [LangChain.js 官方文档](https://docs.langchain.com/oss/javascript/langchain/overview)
- [LangGraph.js 官方文档](https://docs.langchain.com/oss/javascript/langgraph/overview)
- [GitHub 仓库](https://github.com/langchain-ai/langchainjs)
- [Zod 官方文档](https://zod.dev/)

---
title: LangChain.js v1.x 入门教程
description: 适用于 2026 年 LangChain.js v1.x 版本的零基础入门教程
---

# LangChain.js v1.x 入门教程

---

## 📚 课程目录

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
| [07](./ 07-输出解析器.md) | 输出解析器 | 获取结构化数据 (JSON/Zod) |
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

## 🚀 快速开始

```bash
# 1. 安装依赖
npm install @langchain/core @langchain/openai zod

# 2. 设置 API Key (以 ModelScope 为例)
export MODELSCOPE_API_KEY="你的 API Key"

# 3. 运行示例代码
node 03-模型调用.js
```

---

## 📦 核心依赖

```json
{
  "@langchain/core": "^1.x",
  "@langchain/openai": "^1.x",
  "langchain": "^1.x",  // Agent 需要（LangChain 1.0+）
  "zod": "^4.x"  // 本项目使用 Zod v4
}
```

---

## 💡 学习建议

1. **按顺序学习**：基础篇 → 进阶篇 → 高级篇
2. **动手实践**：每章都有可运行的示例代码
3. **理解概念**：LangChain 的核心是"链式组合"思想

---

## 🔗 官方资源

- [LangChain.js 官方文档](https://js.langchain.com/)
- [GitHub 仓库](https://github.com/langchain-ai/langchainjs)
- [Zod 官方文档](https://zod.dev/)
- [LangGraph 文档](https://langchain-ai.github.io/langgraphjs/)

# 27-Functional API：不画图也能用 LangGraph

> 📅 适用于 LangGraph.js v1.x | 👶 零基础友好
> 💡 **注意：** 建议先学完第 21-22 章（持久化与人机协同），更容易理解本章

---

## 🎯 本章目标

- ✅ 理解 Functional API 的定位：把 LangGraph 能力加进"普通函数"
- ✅ 掌握 `entrypoint`（工作流入口）和 `task`（任务单元）
- ✅ 学会用 `getPreviousState` 实现跨调用记忆

---

## 🤔 为什么要有一个 Functional API？

你已经会用 `StateGraph` 定义节点和边了，为什么官方还要提供另一套写法？

回想 Graph API 的流程：定义状态 → 写节点 → 连边 → 编译。对于**结构复杂、需要可视化**的流程，这套很值。但有些场景——比如"改造一段已有的顺序代码"、"写个简单的两步流程"——画图反而是负担。

**Functional API 让你用普通函数写工作流**，`if/else`、`for` 循环随便用，同时保留 LangGraph 的三大核心能力：

| 能力 | 说明 |
|------|------|
| 持久化 | 挂 checkpointer，中断后可恢复 |
| 人机协同 | `interrupt()` 直接在函数里调用 |
| 流式 | `stream` / `streamEvents` 照常可用 |

两个核心原语：

| 原语 | 角色 | 类比 Graph API |
|------|------|---------------|
| `entrypoint` | 工作流的入口函数 | 整张图 |
| `task` | 一个可检查点的任务单元 | 一个节点 |

---

## 📦 entrypoint：把函数变成工作流

```javascript
import { entrypoint } from "@langchain/langgraph";

const myWorkflow = entrypoint(
  { checkpointer, name: "myWorkflow" },   // 可选：checkpointer、name 等
  async (input) => {
    // 普通函数体：if/else、循环、await 都可以随便用
    return result;
  }
);

// 执行方式和图一样
const output = await myWorkflow.invoke(input, { configurable: { thread_id: "1" } });
```

规则：

- 函数**只接受一个参数**——要传多份数据就包成对象
- 输入和返回值必须**可 JSON 序列化**（要进检查点）
- 返回值是一个可执行对象，有 `invoke` / `stream` / `streamEvents`

---

## 📦 task：给"重要步骤"加检查点

`task` 包装一个普通函数，让它变成**带检查点的任务**：

```javascript
import { task } from "@langchain/langgraph";

const slowComputation = task("slowComputation", async (input) => {
  // 调 API、写文件、跑长任务……
  return result;
});

// 在 entrypoint 里调用（task 只能在 entrypoint/task/图节点内部调用）
const result = await slowComputation(input);
```

**task 的超能力：结果会被存进检查点。** 恢复执行时，已完成的 task 不会重跑——这在第 22 章人机协同场景里是刚需（暂停前做过的 API 调用，恢复后不会重复扣款 😅）。

---

## 💡 完整示例：写文章 + 人工审批

创建 `essay-review.js`（官方经典示例的简化版）：

```javascript
import {
  MemorySaver, entrypoint, task, interrupt, Command,
} from "@langchain/langgraph";

// 用 task 包装长任务：耗时的"写文章"
const writeEssay = task("writeEssay", async (topic) => {
  await new Promise((r) => setTimeout(r, 1000));  // 模拟耗时
  return `关于「${topic}」的文章内容……`;
});

// 用 entrypoint 定义工作流：普通函数，想怎么写就怎么写
const workflow = entrypoint(
  { checkpointer: new MemorySaver(), name: "essayWorkflow" },
  async (topic) => {
    const essay = await writeEssay(topic);   // 执行任务（结果进检查点）

    // ★ 函数中间直接 interrupt：暂停等人工审批（第 22 章学的）
    const isApproved = interrupt({
      essay,
      action: "请批准或驳回这篇文章",
    });

    return { essay, isApproved };
  }
);

const config = { configurable: { thread_id: "essay-1" } };

// 第一次运行：写完文章后暂停，等待审批
const result1 = await workflow.invoke("人工智能", config);
console.log(result1.__interrupt__[0].value);
// { essay: "关于「人工智能」的文章内容……", action: "请批准或驳回这篇文章" }

// 人工审批后恢复（和图 API 一样用 Command resume）
const result2 = await workflow.invoke(
  new Command({ resume: true }),
  config
);
console.log(result2);
// { essay: "关于「人工智能」的文章内容……", isApproved: true }
```

> ⚠️ **关键机制：** 恢复时函数是**从头重新执行**的（和图节点一样），但 `writeEssay` 的结果已经存在检查点里，**不会真的重写一遍文章**——这就是"把重要步骤包成 task"的意义。反过来说：**凡是恢复后不想重跑的副作用（API 调用、写文件），都必须包进 task。**

---

## 💡 getPreviousState：函数版的"对话记忆"

挂了 checkpointer 的 entrypoint，可以用 `getPreviousState()` 拿到**上一次调用的返回值**，实现跨调用记忆：

```javascript
import { entrypoint, getPreviousState, MemorySaver } from "@langchain/langgraph";

const counter = entrypoint(
  { checkpointer: new MemorySaver(), name: "counter" },
  async (number) => {
    const previous = getPreviousState() ?? 0;  // 上一次调用的返回值
    return number + previous;
  }
);

const config = { configurable: { thread_id: "c1" } };

console.log(await counter.invoke(1, config));  // 1（上次不存在）
console.log(await counter.invoke(2, config));  // 3（上次返回了 1）
```

> 💡 **对比 Graph API：** 图的"记忆"是整个状态对象（messages 等），Functional API 的记忆默认就是"上一次的返回值"。想存更复杂的东西，直接让返回值是个对象即可。

---

## 🆚 Graph API vs Functional API 怎么选？

| | Graph API（本教程主线） | Functional API |
|---|---|---|
| 心智模型 | 画图：节点 + 边 + 共享状态 | 写函数：顺序逻辑 + task |
| 分支/循环 | 条件边、Send | if/else、for（天然支持） |
| 状态 | 多节点共享一份状态 | 函数局部变量，`getPreviousState` 跨调用 |
| 可视化 | ✅ 可导出图结构 | ❌ 不支持（图是运行时动态生成的） |
| 检查点粒度 | 每个超级步一个 | task 结果级别 |
| 适合 | 复杂 Agent、多分支并行、团队协作 | 改造现有代码、线性流程、快速原型 |

> 💡 **官方建议：** 两者共享同一套运行时，**可以在同一个应用里混用**——比如图的一个节点里调用 Functional 工作流。教程主线教 Graph API 是因为它能覆盖 Functional API 做不到的结构化场景，而且学会它再看 Functional API 会非常轻松。

---

## ⚠️ 注意事项

### 1. task 只能在"LangGraph 上下文"里调用

```javascript
// ❌ 错误：直接在应用代码里调用 task
const r = await myTask("input");

// ✅ 正确：在 entrypoint / 另一个 task / 图节点内部调用
const workflow = entrypoint({...}, async (input) => {
  return await myTask(input);
});
```

### 2. 非确定性和副作用必须包进 task

恢复时函数从头重放——随机数、时间、API 调用如果不放进 task，重放时会得到不同的结果。

### 3. entrypoint 函数只有一个参数

```javascript
// ❌ entrypoint({...}, async (a, b) => {...})

// ✅ 传对象
entrypoint({...}, async ({ a, b }) => {...})
```

### 4. 输入输出都要可 JSON 序列化

要进检查点（持久化 + 恢复），函数、类实例都传不了。

---

## 📝 本章小结

- Functional API = 用普通函数 + `entrypoint`/`task` 获得 LangGraph 的持久化、人机协同、流式能力
- `task` 的结果存检查点：**恢复执行时已完成任务不重跑**，副作用必须包进 task
- `getPreviousState()` 拿上一次调用的返回值，实现函数版记忆
- 与 Graph API 共享运行时，可混用；复杂结构用图，顺序逻辑用函数

---

## 🏃 下一章

[28-实战项目：智能旅行管家 →](./28-实战项目.md)

# Zod 使用说明

> 📅 适用于 Zod v3/v4 | 👶 零基础友好

> 💡 **注意：** 本项目使用 Zod v4 (`zod@^4.3.6`)。Zod v4 主要改进了错误处理 API，基础用法与 v3 相同。

---

## 📖 什么是 Zod？

**Zod 是一个 TypeScript 优先的模式验证库。**

简单说：它让你用代码定义数据的"形状"，然后验证数据是否符合这个形状。

---

## 🤔 为什么需要 Zod？

### 没有 Zod 时

```javascript
const data = JSON.parse(response.content);

// ❌ 问题：如果数据格式不对，会在运行时出错
console.log(data.name.toUpperCase());  // 如果 name 不存在就挂了
```

### 使用 Zod 后

```javascript
import { z } from "zod";

const schema = z.object({
  name: z.string(),
  age: z.number()
});

const data = schema.parse(JSON.parse(response.content));
// ✅ 如果数据格式不对，会立即抛出清晰的错误
```

---

## 📦 安装

```bash
npm install zod
```

---

## 🔧 基础用法

### 1. 定义模式

```javascript
import { z } from "zod";

const PersonSchema = z.object({
  name: z.string(),
  age: z.number(),
  email: z.string().email()
});
```

### 2. 验证数据

```javascript
// ✅ 正确数据
const person = { name: "小明", age: 25, email: "xiao@example.com" };
const result = PersonSchema.parse(person);
console.log(result);  // { name: "小明", age: 25, email: "xiao@example.com" }

// ❌ 错误数据 - 会抛出异常
const badPerson = { name: "小明", age: "二十五", email: "invalid" };
PersonSchema.parse(badPerson);  // ZodError!
```

### 3. 安全解析（推荐）

```javascript
try {
  const result = PersonSchema.parse(data);
  console.log("验证通过:", result);
} catch (error) {
  if (error instanceof z.ZodError) {
    console.log("验证失败:", error.errors);
  }
}
```

---

## 📋 常用类型

### 基础类型

| Zod 类型 | 说明 | 示例 |
|----------|------|------|
| `z.string()` | 字符串 | `z.string()` |
| `z.number()` | 数字 | `z.number()` |
| `z.boolean()` | 布尔值 | `z.boolean()` |
| `z.null()` | null | `z.null()` |
| `z.undefined()` | undefined | `z.undefined()` |
| `z.any()` | 任意类型 | `z.any()` |

```javascript
const name = z.string();
const age = z.number();
const isActive = z.boolean();
```

### 字符串验证

```javascript
z.string()
  .min(1, "不能为空")           // 最小长度
  .max(100, "太长了")           // 最大长度
  .email("邮箱格式不正确")       // 邮箱
  .url("URL 格式不正确")         // URL
  .regex(/^[A-Z]/, "必须大写开头") // 正则
  .includes("hello", "必须包含 hello") // 包含
  .startsWith("Mr.", "必须以 Mr.开头")  // 开头
  .endsWith(".com", "必须以.com 结尾")  // 结尾
```

### 数字验证

```javascript
z.number()
  .min(0, "不能小于 0")
  .max(100, "不能大于 100")
  .int("必须是整数")
  .positive("必须是正数")
  .negative("必须是负数")
  .finite("必须是有限数")
```

### 数组

```javascript
// 字符串数组
const stringArray = z.array(z.string());

// 数字数组，至少一个元素
const nonEmptyArray = z.array(z.number()).min(1);

// 长度固定的数组
const tuple = z.tuple([z.string(), z.number()]);  // [string, number]
```

### 对象

```javascript
const UserSchema = z.object({
  id: z.number(),
  name: z.string(),
  email: z.string().email(),
  age: z.number().min(0).max(150)
});
```

---

## 🎯 修饰符

### 可选字段

```javascript
const schema = z.object({
  name: z.string(),
  nickname: z.string().optional()  // 可选
});

schema.parse({ name: "小明" });  // ✅
schema.parse({ name: "小明", nickname: "小小" });  // ✅
```

### 可为空

```javascript
const schema = z.object({
  name: z.string(),
  bio: z.string().nullable()  // 可以是 null
});

schema.parse({ name: "小明", bio: null });  // ✅
```

### 默认值

```javascript
const schema = z.object({
  name: z.string(),
  role: z.string().default("user")  // 默认值
});

schema.parse({ name: "小明" });  
// { name: "小明", role: "user" }
```

### 捕获默认值

```javascript
const schema = z.object({
  name: z.string().catch("匿名")  // 出错时使用默认值
});

schema.parse({ name: 123 });  // { name: "匿名" }
```

---

## 🔄 类型转换

### 字符串转数字

```javascript
const schema = z.preprocess(
  (val) => Number(val),
  z.number()
);

schema.parse("123");  // 123
```

### 转换后验证

```javascript
const schema = z.string()
  .transform((val) => val.toUpperCase());

schema.parse("hello");  // "HELLO"
```

---

## 💡 与 LangChain 结合使用

### 场景 1：结构化输出

```javascript
import { ChatOpenAI } from "@langchain/openai";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { z } from "zod";

const model = new ChatOpenAI({
  modelName: "MiniMax/MiniMax-M2.5",
  apiKey: "你的 API Key",
  temperature: 0,
  configuration: {
    baseURL: "https://api-inference.modelscope.cn/v1",
  },
});

// 定义输出模式
const PersonSchema = z.object({
  name: z.string().describe("人物姓名"),
  age: z.number().describe("年龄"),
  occupation: z.string().describe("职业")
});

// 让 AI 返回 JSON
const messages = [
  new SystemMessage("你是一个数据提取助手。请从文本中提取信息，并只返回 JSON 格式。"),
  new HumanMessage(`
从以下文本中提取人物信息，返回 JSON：
{
  "name": "姓名",
  "age": 年龄（数字）,
  "occupation": "职业"
}

文本：张三今年 28 岁，是一名软件工程师
`)
];

const response = await model.invoke(messages);

// 解析并验证
try {
  const jsonMatch = response.content.match(/\{[\s\S]*\}/);
  const jsonStr = jsonMatch ? jsonMatch[0] : response.content;
  const parsed = JSON.parse(jsonStr);
  const result = PersonSchema.parse(parsed);
  
  console.log("✅ 验证通过:", result);
} catch (error) {
  if (error instanceof z.ZodError) {
    console.log("❌ 验证失败:", error.errors);
  }
}
```

### 场景 2：API 响应验证

```javascript
const APIResponseSchema = z.object({
  code: z.number(),
  data: z.object({
    users: z.array(z.object({
      id: z.number(),
      name: z.string(),
      email: z.string().email()
    }))
  }),
  message: z.string()
});

async function fetchUsers() {
  const response = await fetch('/api/users');
  const data = await response.json();
  
  try {
    const result = APIResponseSchema.parse(data);
    return result.data.users;
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.log("API 响应格式错误:", error.errors);
      throw error;
    }
  }
}
```

---

## 📊 完整工具函数

```javascript
import { z } from "zod";

/**
 * 解析并验证 AI 返回的 JSON
 * @param {string} content - AI 的原始回复
 * @param {z.ZodSchema} schema - Zod 验证模式
 * @returns {object|null} 验证后的对象，失败返回 null
 */
export function parseAIResponse(content, schema) {
  try {
    // 1. 提取 JSON 部分
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error("未找到 JSON 内容");
      return null;
    }
    
    // 2. 清理 Markdown 代码块
    let jsonStr = jsonMatch[0]
      .replace(/```json\s*/g, '')
      .replace(/```\s*/g, '')
      .trim();
    
    // 3. 解析 JSON
    const parsed = JSON.parse(jsonStr);
    
    // 4. Zod 验证
    return schema.parse(parsed);
  } catch (e) {
    if (e instanceof z.ZodError) {
      console.error("验证失败:", e.errors.map(err => ({
        field: err.path.join('.'),
        message: err.message
      })));
    } else {
      console.error("解析失败:", e.message);
    }
    return null;
  }
}

// 使用示例
const PersonSchema = z.object({
  name: z.string(),
  age: z.number()
});

const result = parseAIResponse(response.content, PersonSchema);
if (result) {
  console.log("姓名:", result.name);
  console.log("年龄:", result.age);
}
```

---

## ⚠️ 注意事项

### 1. 性能考虑

Zod 验证会增加运行时开销，对于大量数据：

```javascript
// ❌ 不要这样
const largeArray = z.array(z.object({...}));
largeArray.parse(hugeData);  // 可能很慢

// ✅ 考虑分批验证或使用轻量级方案
```

### 2. 错误处理

```javascript
// ✅ 推荐：使用 try-catch
try {
  schema.parse(data);
} catch (error) {
  if (error instanceof z.ZodError) {
    // 处理验证错误
  }
}

// 或者使用 safeParse
const result = schema.safeParse(data);
if (!result.success) {
  console.log(result.error.errors);
}
```

### 3. safeParse vs parse

```javascript
// parse - 抛出异常
try {
  schema.parse(data);
} catch (e) {
  // 处理错误
}

// safeParse - 返回结果对象
const result = schema.safeParse(data);
if (result.success) {
  console.log(result.data);  // 验证后的数据
} else {
  console.log(result.error);  // ZodError
}
```

---

## 📝 本章小结

- Zod 是 TypeScript 优先的模式验证库
- 用 `z.object()` 定义数据结构
- 用 `.parse()` 验证数据
- 用 `.safeParse()` 安全解析
- 与 LangChain 结合实现结构化输出

---

## 🔗 更多资源

- [Zod 官方文档](https://zod.dev/)
- [Zod GitHub](https://github.com/colinhacks/zod)

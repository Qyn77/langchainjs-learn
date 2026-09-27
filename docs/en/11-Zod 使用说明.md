# Zod Guide

> 📅 For Zod v3/v4 | 👶 Beginner-friendly

> 💡 **Note:** This project uses Zod v4 (`zod@^4.3.6`). Zod v4 mainly improved the error-handling API. The basic usage is the same as v3.

---

## 📖 What Is Zod?

**Zod is a TypeScript-first schema validation library.**

In short: you describe the "shape" of your data in code, then check whether the data matches that shape.

---

## 🤔 Why Do You Need Zod?

### Without Zod

```javascript
const data = JSON.parse(response.content);

// ❌ Problem: if the data has the wrong shape, it fails at runtime
console.log(data.name.toUpperCase());  // crashes if name is missing
```

### With Zod

```javascript
import { z } from "zod";

const schema = z.object({
  name: z.string(),
  age: z.number()
});

const data = schema.parse(JSON.parse(response.content));
// ✅ If the data has the wrong shape, Zod throws a clear error immediately
```

---

## 📦 Installation

```bash
npm install zod
```

---

## 🔧 Basic Usage

### 1. Define a schema

```javascript
import { z } from "zod";

const PersonSchema = z.object({
  name: z.string(),
  age: z.number(),
  email: z.string().email()
});
```

### 2. Validate data

```javascript
// ✅ Valid data
const person = { name: "Ming", age: 25, email: "ming@example.com" };
const result = PersonSchema.parse(person);
console.log(result);  // { name: "Ming", age: 25, email: "ming@example.com" }

// ❌ Invalid data — throws an exception
const badPerson = { name: "Ming", age: "twenty-five", email: "invalid" };
PersonSchema.parse(badPerson);  // ZodError!
```

### 3. Safe parsing (recommended)

```javascript
try {
  const result = PersonSchema.parse(data);
  console.log("Validation passed:", result);
} catch (error) {
  if (error instanceof z.ZodError) {
    console.log("Validation failed:", error.errors);
  }
}
```

---

## 📋 Common Types

### Basic types

| Zod type | Description | Example |
|----------|------|------|
| `z.string()` | String | `z.string()` |
| `z.number()` | Number | `z.number()` |
| `z.boolean()` | Boolean | `z.boolean()` |
| `z.null()` | null | `z.null()` |
| `z.undefined()` | undefined | `z.undefined()` |
| `z.any()` | Any type | `z.any()` |

```javascript
const name = z.string();
const age = z.number();
const isActive = z.boolean();
```

### String validation

```javascript
z.string()
  .min(1, "Cannot be empty")           // minimum length
  .max(100, "Too long")           // maximum length
  .email("Invalid email format")       // email
  .url("Invalid URL format")         // URL
  .regex(/^[A-Z]/, "Must start with an uppercase letter") // regex
  .includes("hello", "Must include hello") // includes
  .startsWith("Mr.", "Must start with Mr.")  // starts with
  .endsWith(".com", "Must end with .com")  // ends with
```

### Number validation

```javascript
z.number()
  .min(0, "Cannot be less than 0")
  .max(100, "Cannot be greater than 100")
  .int("Must be an integer")
  .positive("Must be a positive number")
  .negative("Must be a negative number")
  .finite("Must be a finite number")
```

### Arrays

```javascript
// An array of strings
const stringArray = z.array(z.string());

// An array of numbers, with at least one element
const nonEmptyArray = z.array(z.number()).min(1);

// A fixed-length array
const tuple = z.tuple([z.string(), z.number()]);  // [string, number]
```

### Objects

```javascript
const UserSchema = z.object({
  id: z.number(),
  name: z.string(),
  email: z.string().email(),
  age: z.number().min(0).max(150)
});
```

---

## 🎯 Modifiers

### Optional fields

```javascript
const schema = z.object({
  name: z.string(),
  nickname: z.string().optional()  // optional
});

schema.parse({ name: "Ming" });  // ✅
schema.parse({ name: "Ming", nickname: "Xiao" });  // ✅
```

### Nullable

```javascript
const schema = z.object({
  name: z.string(),
  bio: z.string().nullable()  // can be null
});

schema.parse({ name: "Ming", bio: null });  // ✅
```

### Default values

```javascript
const schema = z.object({
  name: z.string(),
  role: z.string().default("user")  // default value
});

schema.parse({ name: "Ming" });  
// { name: "Ming", role: "user" }
```

### Catch a default value

```javascript
const schema = z.object({
  name: z.string().catch("Anonymous")  // use this default when parsing fails
});

schema.parse({ name: 123 });  // { name: "Anonymous" }
```

---

## 🔄 Type Conversion

### Convert a string to a number

```javascript
const schema = z.preprocess(
  (val) => Number(val),
  z.number()
);

schema.parse("123");  // 123
```

### Transform the parsed value

```javascript
const schema = z.string()
  .transform((val) => val.toUpperCase());

schema.parse("hello");  // "HELLO"
```

---

## 💡 Using Zod with LangChain

### Use case 1: structured output

```javascript
import { ChatOpenAI } from "@langchain/openai";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { z } from "zod";

const model = new ChatOpenAI({
  model: "MiniMax/MiniMax-M2.5",
  apiKey: "your API key",
  temperature: 0,
  configuration: {
    baseURL: "https://api-inference.modelscope.cn/v1",
  },
});

// Define the output schema
const PersonSchema = z.object({
  name: z.string().describe("the person's name"),
  age: z.number().describe("age"),
  occupation: z.string().describe("occupation")
});

// Ask the AI to return JSON
const messages = [
  new SystemMessage("You are a data extraction assistant. Extract information from the text and return JSON only."),
  new HumanMessage(`
Extract the person's information from the following text and return JSON:
{
  "name": "name",
  "age": age (a number),
  "occupation": "occupation"
}

Text: Sam is 28 years old and works as a software engineer
`)
];

const response = await model.invoke(messages);

// Parse and validate
try {
  const jsonMatch = response.content.match(/\{[\s\S]*\}/);
  const jsonStr = jsonMatch ? jsonMatch[0] : response.content;
  const parsed = JSON.parse(jsonStr);
  const result = PersonSchema.parse(parsed);
  
  console.log("✅ Validation passed:", result);
} catch (error) {
  if (error instanceof z.ZodError) {
    console.log("❌ Validation failed:", error.errors);
  }
}
```

### Use case 2: validating an API response

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
      console.log("API response format error:", error.errors);
      throw error;
    }
  }
}
```

---

## 📊 A Complete Helper Function

```javascript
import { z } from "zod";

/**
 * Parse and validate JSON returned by the AI
 * @param {string} content - the AI's raw reply
 * @param {z.ZodSchema} schema - the Zod validation schema
 * @returns {object|null} the validated object, or null on failure
 */
export function parseAIResponse(content, schema) {
  try {
    // 1. Extract the JSON portion
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error("No JSON content found");
      return null;
    }
    
    // 2. Strip Markdown code fences
    let jsonStr = jsonMatch[0]
      .replace(/```json\s*/g, '')
      .replace(/```\s*/g, '')
      .trim();
    
    // 3. Parse the JSON
    const parsed = JSON.parse(jsonStr);
    
    // 4. Validate with Zod
    return schema.parse(parsed);
  } catch (e) {
    if (e instanceof z.ZodError) {
      console.error("Validation failed:", e.errors.map(err => ({
        field: err.path.join('.'),
        message: err.message
      })));
    } else {
      console.error("Parsing failed:", e.message);
    }
    return null;
  }
}

// Usage example
const PersonSchema = z.object({
  name: z.string(),
  age: z.number()
});

const result = parseAIResponse(response.content, PersonSchema);
if (result) {
  console.log("Name:", result.name);
  console.log("Age:", result.age);
}
```

---

## ⚠️ Notes

### 1. Performance

Zod validation adds runtime overhead. For a large amount of data:

```javascript
// ❌ Avoid this
const largeArray = z.array(z.object({...}));
largeArray.parse(hugeData);  // can be slow

// ✅ Consider validating in batches, or use a lighter-weight approach
```

### 2. Error handling

```javascript
// ✅ Recommended: use try-catch
try {
  schema.parse(data);
} catch (error) {
  if (error instanceof z.ZodError) {
    // Handle the validation error
  }
}

// Or use safeParse
const result = schema.safeParse(data);
if (!result.success) {
  console.log(result.error.errors);
}
```

### 3. safeParse vs parse

```javascript
// parse — throws an exception
try {
  schema.parse(data);
} catch (e) {
  // Handle the error
}

// safeParse — returns a result object
const result = schema.safeParse(data);
if (result.success) {
  console.log(result.data);  // the validated data
} else {
  console.log(result.error);  // ZodError
}
```

---

## 📝 Chapter Summary

- Zod is a TypeScript-first schema validation library
- Define a data structure with `z.object()`
- Validate data with `.parse()`
- Parse safely with `.safeParse()`
- Combine it with LangChain to get structured output

---

## 🔗 Further Reading

- [Zod official documentation](https://zod.dev/)
- [Zod GitHub](https://github.com/colinhacks/zod)

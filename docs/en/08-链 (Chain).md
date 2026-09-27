# 08-Chains: Combining Multiple Operations

> 💡 **Note:** This tutorial is for LangChain.js v1.x and requires Node.js 20+.

## 🎯 Chapter Goals

- ✅ Understand what a chain is
- ✅ Learn the `.pipe()` method
- ✅ Build a multi-step workflow

---

## 🤔 What Is a Chain?

**A chain connects several components the way a pipeline does.**

```
Input → Prompt → Model → Output
```

---

## 📦 The .pipe() Method

`.pipe()` is a core LangChain v1.x API for connecting components:

```javascript
const chain = A.pipe(B).pipe(C);
```

Data flow:
```
Input → A → B → C → Output
```

---

## 💡 Complete Example

### Example 1: a simple chain (Prompt + Model)

```javascript
import { ChatOpenAI } from "@langchain/openai";
import { PromptTemplate } from "@langchain/core/prompts";

const model = new ChatOpenAI({
  model: "MiniMax/MiniMax-M2.5",
  apiKey: process.env.MODELSCOPE_API_KEY,
  configuration: {
    baseURL: "https://api-inference.modelscope.cn/v1",
  },
});

// Create the prompt
const simplePrompt = PromptTemplate.fromTemplate(
  "Explain what {topic} is in one sentence"
);

// Create the chain: Prompt → Model
const simpleChain = simplePrompt.pipe(model);

// Call it
const result = await simpleChain.invoke({ topic: "artificial intelligence" });
console.log("Explanation:", result.content);
```

### Example 2: a chain with JSON parsing

```javascript
import { z } from "zod";

// Define the schema
const schema = z.object({
  term: z.string(),
  definition: z.string(),
  example: z.string()
});

// Create the prompt
const structuredPrompt = PromptTemplate.fromTemplate(
  "Explain what {topic} is in JSON format, with the three fields term, definition, and example. Return JSON only."
);

// Create the chain: Prompt → Model
const structuredChain = structuredPrompt.pipe(model);

// Call it
const response = await structuredChain.invoke({ topic: "machine learning" });

// Parse the JSON by hand
const jsonStr = response.content.match(/\{[\s\S]*\}/)[0];
const result = schema.parse(JSON.parse(jsonStr));

console.log("Term:", result.term);
console.log("Definition:", result.definition);
console.log("Example:", result.example);
```

### Example 3: a multi-step chain

```javascript
// Step 1: generate an outline
const outlinePrompt = PromptTemplate.fromTemplate(
  "Generate a 3-level outline for an article about '{topic}'"
);
const outlineChain = outlinePrompt.pipe(model);

// Step 2: write an introduction from the outline
const introPrompt = PromptTemplate.fromTemplate(
  `Write a 100-word introduction based on the following outline:
Outline: {outline}
Introduction:`
);
const introChain = introPrompt.pipe(model);

// Connect the two chains by hand
const topic = "the development of artificial intelligence";
const outline = await outlineChain.invoke({ topic });
const intro = await introChain.invoke({ outline: outline.content });

console.log("Outline:", outline.content);
console.log("Introduction:", intro.content);
```

---

## 📋 The Runnable Interface

Every LangChain component implements the `Runnable` interface and supports these methods:

| Method | Description | Return value | Example |
|------|------|--------|------|
| `.invoke(input)` | A single call | `Promise<T>` | `await chain.invoke({topic})` |
| `.stream(input)` | A streaming call | `AsyncIterable<T>` | `for await (const c of await chain.stream(input))` |
| `.batch(inputs)` | A batch call | `Promise<T[]>` | `await chain.batch([{topic1}, {topic2}])` |
| `.pipe(other)` | Connect to the next component | `RunnableSequence` | `A.pipe(B)` |

---

## 🔧 Ways to Combine Chains

### 1. A sequential chain

```javascript
const chain = prompt.pipe(model).pipe(parser);
```

### 2. A parallel chain (RunnableParallel)

```javascript
import { RunnableParallel } from "@langchain/core/runnables";

const chain = RunnableParallel({
  summary: summaryChain,
  keywords: keywordChain,
  sentiment: sentimentChain
});

const result = await chain.invoke({ text: "..." });
// result = { summary: "...", keywords: [...], sentiment: "..." }
```

### 3. A conditional chain

```javascript
const chain = condition ? chainA : chainB;
const result = await chain.invoke(input);
```

### 4. A custom chain

```javascript
import { RunnableSequence } from "@langchain/core/runnables";

const customChain = RunnableSequence.from([
  prompt,
  model,
  async (output) => {
    // Custom processing logic
    return output.content.toUpperCase();
  }
]);
```

---

## 🎯 Real-World Use Cases

### 1. A content-generation workflow

```javascript
// Outline → draft → polish
const outlineChain = outlinePrompt.pipe(model);
const draftChain = draftPrompt.pipe(model);
const polishChain = polishPrompt.pipe(model);

const outline = await outlineChain.invoke({ topic });
const draft = await draftChain.invoke({ outline: outline.content });
const final = await polishChain.invoke({ draft: draft.content });
```

### 2. A data-analysis workflow

```javascript
// Extract → analyze → summarize
const extractChain = extractPrompt.pipe(model);
const analyzeChain = analyzePrompt.pipe(model);
const summarizeChain = summarizePrompt.pipe(model);

const data = await extractChain.invoke({ text });
const analysis = await analyzeChain.invoke({ data: data.content });
const summary = await summarizeChain.invoke({ analysis: analysis.content });
```

### 3. Multilingual translation

```javascript
const detectChain = detectPrompt.pipe(model);
const translateChain = translatePrompt.pipe(model);

// Detect the language first, then translate
const detected = await detectChain.invoke({ text });
const isChinese = detected.content.includes("Chinese");

const targetPrompt = isChinese ? "Translate into English" : "Translate into Chinese";
const translation = await translateChain.invoke({ 
  text, 
  target: targetPrompt 
});
```

---

## ⚠️ Notes

### 1. Error handling

```javascript
try {
  const result = await chain.invoke(input);
} catch (error) {
  console.error("Chain execution failed:", error.message);
}
```

### 2. Matching inputs and outputs

Make sure the output of one component matches the input of the next:

```javascript
// ✅ Correct: the prompt outputs a string, and the model accepts messages
const prompt = PromptTemplate.fromTemplate("...");
const chain = prompt.pipe(model);

// ❌ Wrong: a type mismatch causes the chain to fail
```

### 3. Debugging a chain

```javascript
// Add logging
const loggingChain = prompt.pipe(model).pipe((output) => {
  console.log("Model output:", output);
  return output;
});
```

---

## 📊 Performance Tips for Chains

### 1. Batch processing

```javascript
// Faster than calling invoke() in a loop
const results = await chain.batch([
  { topic: "artificial intelligence" },
  { topic: "machine learning" },
  { topic: "deep learning" }
]);
```

### 2. Concurrent execution

```javascript
const [result1, result2] = await Promise.all([
  chain1.invoke(input1),
  chain2.invoke(input2)
]);
```

---

## 📝 Chapter Summary

- A chain combines multiple components
- `.pipe()` connects those components
- Every component implements the `Runnable` interface
- `invoke()`, `stream()`, and `batch()` are all supported

---

## 🏃 Next Chapter

[09-Memory →](./09-记忆 (Memory).md)

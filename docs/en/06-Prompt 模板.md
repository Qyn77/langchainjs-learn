# 06-Prompt Templates: Generating Prompts Dynamically

> 💡 **Note:** This tutorial is for LangChain.js v1.x and requires Node.js 20+.

## 🎯 Chapter Goals

- ✅ Understand what Prompt Templates do
- ✅ Learn the `PromptTemplate` class
- ✅ Learn how to generate prompts dynamically

---

## 🤔 What Is a Prompt Template?

### Without a template

```javascript
// ❌ Hard-coded prompt
const message = new HumanMessage(
  "Please translate the following English into Chinese: Hello, how are you?"
);
```

Problem: you have to concatenate strings by hand every time.

### With a template

```javascript
// ✅ Using a template
const prompt = PromptTemplate.fromTemplate(
  "Please translate the following {source_lang} into {target_lang}: {text}"
);

const result = await prompt.format({
  source_lang: "English",
  target_lang: "Chinese",
  text: "Hello, how are you?"
});
// Output: Please translate the following English into Chinese: Hello, how are you?
```

---

## 📦 Basic PromptTemplate Usage

### 1. Import the class

```javascript
import { PromptTemplate } from "@langchain/core/prompts";
```

### 2. Create a template

```javascript
const prompt = PromptTemplate.fromTemplate(
  "Hello, {name}! Today is {date}."
);
```

### 3. Fill in the variables

```javascript
const result = await prompt.format({
  name: "Ming",
  date: "March 11, 2026"
});

console.log(result);
// Output: Hello, Ming! Today is March 11, 2026.
```

---

## 💡 Complete Example

```javascript
import { ChatOpenAI } from "@langchain/openai";
import { HumanMessage } from "@langchain/core/messages";
import { PromptTemplate } from "@langchain/core/prompts";

const model = new ChatOpenAI({
  model: "MiniMax/MiniMax-M2.5",
  apiKey: process.env.MODELSCOPE_API_KEY,
  configuration: {
    baseURL: "https://api-inference.modelscope.cn/v1",
  },
});

// Example 1: a simple translation template
const translatePrompt = PromptTemplate.fromTemplate(
  "Please translate the following {source_lang} into {target_lang}: {text}"
);

const translated = await translatePrompt.format({
  source_lang: "English",
  target_lang: "Chinese",
  text: "The quick brown fox jumps over the lazy dog."
});

const response1 = await model.invoke([new HumanMessage(translated)]);
console.log("Translation:", response1.content);

// Example 2: an article summary template
const summaryPrompt = PromptTemplate.fromTemplate(
  `Write a summary of the following article in 50 words or fewer:

Article: {article}

Summary:`
);

const summaryInput = await summaryPrompt.format({
  article: "Artificial intelligence is a branch of computer science..."
});

const response2 = await model.invoke([new HumanMessage(summaryInput)]);
console.log("Summary:", response2.content);

// Example 3: a role-play template
const rolePrompt = PromptTemplate.fromTemplate(
  `You are a {role}. Please answer the following question:

Question: {question}`
);

const roleInput = await rolePrompt.format({
  role: "kindergarten teacher",
  question: "Why is the sky blue?"
});

const response3 = await model.invoke([new HumanMessage(roleInput)]);
console.log("Answer:", response3.content);
```

---

## 📋 Template Variable Syntax

### 1. A simple variable

```javascript
const prompt = PromptTemplate.fromTemplate(
  "Hello, {name}!"
);

await prompt.format({ name: "Ming" });
```

### 2. Multiple variables

```javascript
const prompt = PromptTemplate.fromTemplate(
  "From {start} to {end}, the development of {subject} has been {description}."
);

await prompt.format({
  start: "1950",
  end: "2026",
  subject: "artificial intelligence",
  description: "epic"
});
```

### 3. Default values (advanced)

```javascript
const prompt = new PromptTemplate({
  template: "Hello, {name}! {greeting}",
  inputVariables: ["name"],
  partialVariables: {
    greeting: "Have a great day!"  // default value
  }
});

await prompt.format({ name: "Ming" });
// Output: Hello, Ming! Have a great day!
```

---

## ⚙️ PromptTemplate Parameters in Detail

```javascript
const prompt = new PromptTemplate(options);

// options parameters:
// - template: string - the template string
// - inputVariables: string[] - the list of input variables
// - partialVariables?: object - partial variables (default values)
// - outputParser?: OutputParser - an output parser
```

### Example: a template with default values

```javascript
const prompt = new PromptTemplate({
  template: "Hello, {name}! I am {assistant_name}.",
  inputVariables: ["name"],
  partialVariables: {
    assistant_name: "AI Assistant"
  }
});

await prompt.format({ name: "Ming" });
// Output: Hello, Ming! I am AI Assistant.
```

---

## 🎯 Real-World Use Cases

### 1. Batch processing

```javascript
const texts = ["Text 1", "Text 2", "Text 3"];

const sentimentPrompt = PromptTemplate.fromTemplate(
  "Analyze the sentiment of the following text (positive/negative/neutral): {text}"
);

for (const text of texts) {
  const input = await sentimentPrompt.format({ text });
  const response = await model.invoke([new HumanMessage(input)]);
  console.log(`${text}: ${response.content}`);
}
```

### 2. Multilingual support

```javascript
const greetPrompt = PromptTemplate.fromTemplate(
  "Say 'Hello, world' in {language}"
);

await greetPrompt.format({ language: "English" });  // Hello, World
await greetPrompt.format({ language: "Japanese" });  // こんにちは、世界
await greetPrompt.format({ language: "French" });  // Bonjour le monde
```

### 3. Code generation

```javascript
const codePrompt = PromptTemplate.fromTemplate(
  `Write a function in {language} that implements {functionality}

Function name: {function_name}

Code:`
);

const codeInput = await codePrompt.format({
  language: "Python",
  functionality: "adding two numbers",
  function_name: "add"
});

const response = await model.invoke([new HumanMessage(codeInput)]);
```

---

## ⚠️ Notes

### 1. Variable names must match

```javascript
// ❌ Wrong: the variable names do not match
const prompt = PromptTemplate.fromTemplate("Hello, {name}!");
await prompt.format({ userName: "Ming" });  // throws an error

// ✅ Correct
await prompt.format({ name: "Ming" });
```

### 2. Escaping curly braces

If the template needs a literal `{` or `}`, use double curly braces:

```javascript
const prompt = PromptTemplate.fromTemplate(
  "JSON format: {{key: value}}, where value is {user_input}"
);

await prompt.format({ user_input: "test" });
// Output: JSON format: {{key: value}}, where value is test
```

### 3. Check that every variable is provided

```javascript
const prompt = PromptTemplate.fromTemplate("Hello, {name}!");

// Check the required variables
console.log(prompt.inputVariables);  // ['name']

// A missing variable throws an error
await prompt.format({});  // Error: Missing value for input variable: name
```

---

## 📝 Chapter Summary

- A Prompt Template is a reusable prompt template
- Use `{variableName}` as a placeholder
- Fill in the variables with `format()`
- A good fit for batch processing and dynamic generation

---

## 🏃 Next Chapter

[07-Output Parsers →](./07-输出解析器.md)

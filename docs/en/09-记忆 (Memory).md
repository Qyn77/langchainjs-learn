# 09-Memory: Conversation History

> 💡 **Note:** This tutorial is for LangChain.js v1.x and requires Node.js 20+.

## 🎯 Chapter Goals

- ✅ Understand why memory is needed
- ✅ Learn how to manage a message array by hand
- ✅ Build a multi-turn conversation

---

## 🤔 Why Do You Need Memory?

### Without memory

```javascript
// First turn
const response1 = await model.invoke([
  new HumanMessage("My name is Ming")
]);
// AI: Hi Ming!

// Second turn
const response2 = await model.invoke([
  new HumanMessage("What do I like?")  // ❌ The AI does not remember the first turn
]);
// AI: I don't know what you like...
```

### With memory

```javascript
const messageHistory = [];

// First turn
messageHistory.push(new HumanMessage("My name is Ming"));
const response1 = await model.invoke(messageHistory);
// AI: Hi Ming!

// Second turn
messageHistory.push(new HumanMessage("What do I like?"));  // ✅ The AI remembers the history
const response2 = await model.invoke(messageHistory);
// AI: You have not told me what you like yet, but we can talk about it...
```

---

## 📦 Memory Management in LangChain v1.x

**Important:** In LangChain 1.x, `ChatMessageHistory` has been removed from the main package (it moved to `@langchain/classic/memory/chat_memory`; older projects can install `@langchain/classic` and keep using it). For new projects, when you call the model directly, **manage the message array yourself** (that is what this chapter covers). If you are using `createAgent` from Chapter 12, pass a `checkpointer` and you get conversation memory (see Chapter 21 in the LangGraph section).

### Basic usage

```javascript
import { HumanMessage, AIMessage, SystemMessage } from "@langchain/core/messages";

// Create a message array
const messageHistory = [];

// Add a system message
messageHistory.push(new SystemMessage("You are a friendly AI assistant."));

// Add a user message
messageHistory.push(new HumanMessage("Hello"));

// Add an AI message
messageHistory.push(new AIMessage("Hello! How can I help you?"));

// Get every message
const messages = messageHistory;
```

---

## 💡 Complete Example

```javascript
import { ChatOpenAI } from "@langchain/openai";
import { SystemMessage, HumanMessage, AIMessage } from "@langchain/core/messages";

const model = new ChatOpenAI({
  model: "MiniMax/MiniMax-M2.5",
  apiKey: process.env.MODELSCOPE_API_KEY,
  temperature: 0.7,
  configuration: {
    baseURL: "https://api-inference.modelscope.cn/v1",
  },
});

// Manage the message array yourself
const messageHistory = [];

// Add a system message (set the role)
messageHistory.push(
  new SystemMessage("You are a friendly AI assistant. Remember the information the user tells you.")
);

async function chat(userMessage) {
  // Add the user message
  messageHistory.push(new HumanMessage(userMessage));
  
  // Get the reply
  const response = await model.invoke(messageHistory);
  
  // Save the AI reply
  messageHistory.push(new AIMessage(response.content));
  
  return response.content;
}

// First turn
console.log("User: My name is Ming and I am 25 years old");
let response = await chat("My name is Ming and I am 25 years old");
console.log("AI:", response);

// Second turn
console.log("\nUser: Do you like me?");
response = await chat("Do you like me?");
console.log("AI:", response);

// Third turn — testing memory
console.log("\nUser: How old am I?");
response = await chat("How old am I?");
console.log("AI:", response);  // The AI will remember: you are 25 years old
```

---

## 🎯 Wrap It in a Chat Class

```javascript
class ChatBot {
  constructor(model) {
    this.model = model;
    this.messageHistory = [];
    
    // Add a system message
    this.messageHistory.push(
      new SystemMessage("You are a friendly AI assistant.")
    );
  }

  async chat(userMessage) {
    // Add the user message
    this.messageHistory.push(new HumanMessage(userMessage));
    
    // Get the reply
    const response = await this.model.invoke(this.messageHistory);
    
    // Save the AI reply
    this.messageHistory.push(new AIMessage(response.content));
    
    return response.content;
  }

  // Clear the history
  clear() {
    this.messageHistory = [this.messageHistory[0]];  // keep the system message
  }

  // Get the history
  getHistory() {
    return this.messageHistory;
  }

  // Get the number of messages
  getMessageCount() {
    return this.messageHistory.length;
  }
}

// Usage example
const bot = new ChatBot(model);

console.log(await bot.chat("Hello"));
console.log(await bot.chat("My name is Ming"));
console.log(await bot.chat("Remember my name"));
console.log(await bot.chat("What is my name?"));  // The AI will remember
```

---

## 📋 Limiting the History Length

A long conversation history uses more tokens. You can cap the length:

```javascript
class LimitedChatBot {
  constructor(model, maxMessages = 10) {
    this.model = model;
    this.messageHistory = [];
    this.maxMessages = maxMessages;
  }

  async chat(userMessage) {
    // Add the user message
    this.messageHistory.push(new HumanMessage(userMessage));
    
    // Limit the history length (keep the system message + the most recent N messages)
    if (this.messageHistory.length > this.maxMessages + 1) {
      // Keep the first message (the system message) and the most recent maxMessages messages
      const systemMsg = this.messageHistory[0];
      const recentMsgs = this.messageHistory.slice(-this.maxMessages);
      this.messageHistory = [systemMsg, ...recentMsgs];
    }
    
    // Get the reply
    const response = await this.model.invoke(this.messageHistory);
    
    // Save the AI reply
    this.messageHistory.push(new AIMessage(response.content));
    
    return response.content;
  }
}
```

---

## ⚙️ Message Types in Detail

| Message type | Description | Example |
|----------|------|------|
| `SystemMessage` | A system instruction | `new SystemMessage("You are an assistant")` |
| `HumanMessage` | A user message | `new HumanMessage("Hello")` |
| `AIMessage` | An AI message | `new AIMessage("Hello!")` |

### AIMessage with metadata

```javascript
// An AIMessage can include extra information
const aiMsg = new AIMessage("Hello!", {
  name: "assistant",  // optional: the AI's name
  // other metadata...
});
```

---

## 🔄 Viewing the Conversation History

```javascript
// Print the full conversation history
console.log("=== Full conversation history ===");
messageHistory.forEach((msg, index) => {
  const type = msg.constructor.name;
  console.log(`${index + 1}. [${type}]: ${msg.content}`);
});
```

Output:
```
=== Full conversation history ===
1. [SystemMessage]: You are a friendly AI assistant.
2. [HumanMessage]: My name is Ming
3. [AIMessage]: Hi Ming! Nice to meet you!
4. [HumanMessage]: How old am I?
5. [AIMessage]: You are 25 years old!
```

---

## ⚠️ Notes

### 1. Token limits

A conversation history that grows too long will exceed the model's token limit:

```javascript
// Trim the history periodically
if (messageHistory.length > 50) {
  // Keep only the system message and the most recent 10 messages
  const systemMsg = messageHistory[0];
  const recentMsgs = messageHistory.slice(-10);
  messageHistory = [systemMsg, ...recentMsgs];
}
```

### 2. Where the system message goes

The system message should always come first:

```javascript
// ✅ Correct
const messages = [
  new SystemMessage("You are an assistant"),
  ...history,
  new HumanMessage("New message")
];

// ❌ Wrong
const messages = [
  ...history,
  new SystemMessage("You are an assistant"),  // it may be ignored
  new HumanMessage("New message")
];
```

### 3. Persistent storage

By default, the message array lives only in memory. The history is lost when the program restarts.

Save it to a file:
```javascript
import fs from 'fs';

// Save
function saveHistory(filename = 'history.json') {
  const history = messageHistory.map(msg => ({
    type: msg.constructor.name,
    content: msg.content
  }));
  fs.writeFileSync(filename, JSON.stringify(history, null, 2));
}

// Load
function loadHistory(filename = 'history.json') {
  try {
    const history = JSON.parse(fs.readFileSync(filename, 'utf-8'));
    messageHistory = history.map(msg => {
      if (msg.type === 'HumanMessage') {
        return new HumanMessage(msg.content);
      } else if (msg.type === 'AIMessage') {
        return new AIMessage(msg.content);
      } else if (msg.type === 'SystemMessage') {
        return new SystemMessage(msg.content);
      }
    });
  } catch (e) {
    console.log("No conversation history found. Starting fresh.");
  }
}
```

---

## 📝 Chapter Summary

- In LangChain 1.x, calling the model directly means **managing the message array yourself**; `createAgent` can take a checkpointer and get memory that way
- Use `push()` to add messages and `invoke()` to send the conversation
- You can limit the history length to save tokens
- You can wrap it in a ChatBot class
- You can persist the history to a file

---

## 🏃 Next Chapter

[10-Tools →](./10-工具 (Tools).md)

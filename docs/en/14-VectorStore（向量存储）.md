# Vector Stores

> 📅 For LangChain.js v1.x | 👶 Beginner-friendly
> 💡 **Note:** Requires Node.js 20+

> 💡 **Important:** In LangChain 1.x, `MemoryVectorStore` has moved to `@langchain/classic/vectorstores/memory`, and it is still available.
> This chapter starts with the concepts, then gives two runnable approaches: **real vector retrieval** (MemoryVectorStore + embeddings) and a **simplified stand-in when you have no embeddings service**.

---

## 📖 What Is a Vector Store?

**Vector store = a database that stores vectors + similarity search**

In short: a vector store is a database you can **search by meaning**.

---

## 🤔 Why Do You Need a Vector Store?

### Traditional Search vs Vector Search

```
[Traditional keyword search]
Search: "apple"
Results: documents that contain the word "apple"
❌ Misses related content such as "fruit", "iPhone", and so on

[Vector search]
Search: "apple"
Results: documents that contain "apple", plus semantically related documents such as "fruit", "iPhone", and "iPad"
✅ Finds content that is related in meaning
```

---

## 🧱 Core Concepts

### 1. Vectors

A vector is a list of numbers that represents the features of some data:

```javascript
// A text embedding
"cat" → [0.1, 0.5, -0.3, 0.8, ...]  // a 1536-dimensional vector
"dog" → [0.2, 0.4, -0.2, 0.7, ...]  // a 1536-dimensional vector
"car" → [-0.5, 0.1, 0.6, -0.4, ...]  // a 1536-dimensional vector
```

### 2. Similarity

```
Cosine similarity:
- Closer to 1 means more similar
- Closer to -1 means less similar

Similarity of "cat" and "dog": 0.85  // both animals, fairly similar
Similarity of "cat" and "car": 0.12  // unrelated, not similar
```

### 3. What a Vector Store Does

```
┌─────────────────────────────────────────┐
│              Vector Store               │
├─────────────────────────────────────────┤
│                                         │
│  Store: text → vector                   │
│  Search: query vector → most similar    │
│          text                           │
│                                         │
│  ┌───────────┐     ┌───────────┐       │
│  │  Text 1   │     │ Vector 1  │       │
│  │  Text 2   │  →  │ Vector 2  │       │
│  │  Text 3   │     │ Vector 3  │       │
│  └───────────┘     └───────────┘       │
│                          │              │
│                          ▼              │
│                   ┌───────────┐        │
│                   │   Query   │        │
│                   │  vector   │        │
│                   └───────────┘        │
│                          │              │
│                          ▼              │
│                   ┌───────────┐        │
│                   │ Similarity│        │
│                   │  search   │        │
│                   └───────────┘        │
│                          │              │
│                          ▼              │
│                   ┌───────────┐        │
│                   │  Top-K    │        │
│                   │ most      │        │
│                   │ similar   │        │
│                   └───────────┘        │
└─────────────────────────────────────────┘
```

---

## 📦 Install Dependencies

```bash
npm install @langchain/core @langchain/openai @langchain/classic zod
# @langchain/classic provides MemoryVectorStore
```

---

## 💡 Comparing Vector Store Types

| Vector store | Type | Traits | When to use it |
|---------|------|------|----------|
| `MemoryVectorStore` | In memory | Simple, fast, lost on restart | ✅ Lives in `@langchain/classic` |
| `Chroma` | Database | Open source, easy to use | Small and medium projects |
| `Pinecone` | Cloud service | High performance, hosted | Production |
| `Weaviate` | Database | Feature-rich | Enterprise applications |
| `Milvus` | Database | High performance, distributed | Large-scale applications |

---

## 🔧 Method A: A Real Vector Store (MemoryVectorStore + Embeddings, Recommended)

```javascript
import { OpenAIEmbeddings } from "@langchain/openai";
import { Document } from "@langchain/core/documents";
import { MemoryVectorStore } from "@langchain/classic/vectorstores/memory";

// Embeddings service (must support an OpenAI-compatible /embeddings API; see chapter 13)
const embeddings = new OpenAIEmbeddings({
  model: "text-embedding-3-small",
  apiKey: process.env.OPENAI_API_KEY,
});

// Create documents
const documents = [
  new Document({
    pageContent: "Python is a high-level programming language, invented by Guido van Rossum in 1989.",
    metadata: { source: "programming languages", category: "technology" }
  }),
  new Document({
    pageContent: "JavaScript is used mainly for web development and can run in the browser.",
    metadata: { source: "programming languages", category: "technology" }
  }),
  new Document({
    pageContent: "Java is an object-oriented programming language, widely used for enterprise applications.",
    metadata: { source: "programming languages", category: "technology" }
  }),
  new Document({
    pageContent: "C++ is a high-performance language, often used for game development and systems programming.",
    metadata: { source: "programming languages", category: "technology" }
  })
];

// Insert: documents are embedded automatically
const vectorStore = await MemoryVectorStore.fromDocuments(documents, embeddings);
console.log("📚 Building the knowledge base...");
console.log("✅ Knowledge base ready! Total documents:", documents.length, "\n");

// Semantic similarity search (real vector math)
const results = await vectorStore.similaritySearch("Which language is a good fit for games?", 2);

console.log("\n📚 Search results:");
results.forEach((doc, i) => {
  console.log(`  ${i + 1}. ${doc.pageContent}`);
  console.log(`     Metadata: ${JSON.stringify(doc.metadata)}`);
});
```

### Sample Output

```
📚 Building the knowledge base...
✅ Knowledge base ready! Total documents: 4

📚 Search results:
  1. C++ is a high-performance language, often used for game development and systems programming.
     Metadata: {"source":"programming languages","category":"technology"}
  2. Java is an object-oriented programming language, widely used for enterprise applications.
     Metadata: {"source":"programming languages","category":"technology"}
```

> 💡 Try changing the question to "Who invented Python?" The query and the source use different words, so character matching misses it, but vector search still hits. That is the point.

---

## 🔧 Method B: A Simplified Stand-in with No Embeddings Service (to See the Idea)

> When you do not have an embeddings service, the character-matching search below can stand in for retrieval, so you can see the shape of a vector store's API. Real projects should use Method A.

```javascript
import { ChatOpenAI } from "@langchain/openai";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { Document } from "@langchain/core/documents";

// Create the model
const model = new ChatOpenAI({
  model: "MiniMax/MiniMax-M2.5",
  apiKey: "your API key",
  temperature: 0,
  configuration: {
    baseURL: "https://api-inference.modelscope.cn/v1",
  },
});

// Create documents
const documents = [
  new Document({
    pageContent: "Python is a high-level programming language, invented by Guido van Rossum in 1989.",
    metadata: { source: "programming languages", category: "technology" }
  }),
  new Document({
    pageContent: "JavaScript is used mainly for web development and can run in the browser.",
    metadata: { source: "programming languages", category: "technology" }
  }),
  new Document({
    pageContent: "Java is an object-oriented programming language, widely used for enterprise applications.",
    metadata: { source: "programming languages", category: "technology" }
  }),
  new Document({
    pageContent: "C++ is a high-performance language, often used for game development and systems programming.",
    metadata: { source: "programming languages", category: "technology" }
  })
];

// Simple similarity search (character matching, standing in for vector search)
function similaritySearch(query, docs, topK = 2) {
  // Split into characters (a simple approach; the original tutorial used it for Chinese)
  const queryWords = query.split('').filter(c => c.trim());

  const scored = docs.map((doc, index) => {
    const content = doc.pageContent.toLowerCase();
    let score = 0;
    queryWords.forEach(word => {
      if (content.includes(word)) score += 1;
    });
    return { index, doc, score };
  });

  // Sort by score and return the top K
  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, topK)
    .map(item => item.doc);
}

console.log("📚 Building the knowledge base...\n");
console.log("✅ Knowledge base ready! Total documents:", documents.length, "\n");

// Similarity search
const results = similaritySearch("Which language is a good fit for games?", documents, 2);

console.log("\n📚 Search results:");
results.forEach((doc, i) => {
  console.log(`  ${i + 1}. ${doc.pageContent}`);
  console.log(`     Metadata: ${JSON.stringify(doc.metadata)}`);
});
```

### Sample Output

```
📚 Building the knowledge base...

✅ Knowledge base ready! Total documents: 4

📚 Search results:
  1. C++ is a high-performance language, often used for game development and systems programming.
     Metadata: {"source":"programming languages","category":"technology"}
  2. Java is an object-oriented programming language, widely used for enterprise applications.
     Metadata: {"source":"programming languages","category":"technology"}
```

### RAG Queries with Method B

```javascript
import { ChatOpenAI } from "@langchain/openai";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { Document } from "@langchain/core/documents";

const model = new ChatOpenAI({
  model: "MiniMax/MiniMax-M2.5",
  apiKey: "your API key",
  temperature: 0,
  configuration: {
    baseURL: "https://api-inference.modelscope.cn/v1",
  },
});

const documents = [
  new Document({
    pageContent: "Python is a high-level programming language, invented by Guido van Rossum in 1989.",
    metadata: { source: "programming languages" }
  }),
  new Document({
    pageContent: "JavaScript is used mainly for web development and can run in the browser.",
    metadata: { source: "programming languages" }
  }),
  new Document({
    pageContent: "C++ is a high-performance language, often used for game development and systems programming.",
    metadata: { source: "programming languages" }
  })
];

// Simple similarity search
function similaritySearch(query, docs, topK = 2) {
  const queryWords = query.split('').filter(c => c.trim());
  const scored = docs.map((doc) => {
    const content = doc.pageContent.toLowerCase();
    let score = 0;
    queryWords.forEach(word => {
      if (content.includes(word)) score += 1;
    });
    return { doc, score };
  });
  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, topK)
    .map(item => item.doc);
}

// RAG query
async function queryRAG(question) {
  console.log("📝 User question:", question);

  // 1. Retrieve related documents
  const relevantDocs = similaritySearch(question, documents, 2);

  console.log("\n📚 Retrieved documents:");
  relevantDocs.forEach((doc, i) => {
    console.log(`  ${i + 1}. ${doc.pageContent}`);
  });

  // 2. Assemble the context
  const context = relevantDocs.map(doc => doc.pageContent).join("\n");

  // 3. Generate the answer
  const prompt = new SystemMessage(`
You are a programming assistant. Answer the question using the reference material below.
If the material does not contain the answer, say so honestly.

Reference material:
${context}
`);

  const response = await model.invoke([
    prompt,
    new HumanMessage(question)
  ]);

  console.log("\n🤖 AI answer:", response.content);
  return response.content;
}

// Run it
await queryRAG("Who invented Python?");
await queryRAG("Which language is a good fit for game development?");
```

### Sample Output

```
📝 User question: Who invented Python?

📚 Retrieved documents:
  1. Python is a high-level programming language, invented by Guido van Rossum in 1989.
  2. C++ is a high-performance language, often used for game development and systems programming.

🤖 AI answer: According to the reference material, Python was invented by **Guido van Rossum** in 1989.
```

---

## 🎯 Other Vector Stores

### 1. Chroma (extra install)

```bash
npm install @langchain/community chromadb
```

```javascript
// Chroma needs a running Chroma server
// This only shows the idea. See the official docs for the full setup
import { Chroma } from "@langchain/community/vectorstores/chroma";

const vectorStore = await Chroma.fromTexts(
  ["Text 1", "Text 2"],
  embeddings,
  {
    collectionName: "my_collection",
    url: "http://localhost:8000",
  }
);
```

### 2. Pinecone (cloud service)

```bash
npm install @langchain/pinecone
```

```javascript
// Pinecone is a hosted service and needs an API key
import { PineconeStore } from "@langchain/pinecone";
import { Pinecone } from "@pinecone-database/pinecone";

const pc = new Pinecone({ apiKey: "your API key" });
const index = pc.index("my-index");

const vectorStore = await PineconeStore.fromTexts(
  ["Text 1", "Text 2"],
  embeddings,
  { pineconeIndex: index }
);
```

---

## 📊 Vector Store Operations in Detail

> 💡 The operations below use Method A's `MemoryVectorStore` (import: `import { MemoryVectorStore } from "@langchain/classic/vectorstores/memory";`).

### 1. How to Create One

```javascript
// Create from text
const vectorStore = await MemoryVectorStore.fromTexts(
  ["Text 1", "Text 2", "Text 3"],
  { source: "docs" },
  embeddings
);

// Create from documents
const vectorStore = await MemoryVectorStore.fromDocuments(
  documents,
  embeddings
);

// A simple implementation (no vector store)
const documents = [...];
function similaritySearch(query, docs, topK) { ... }
```

### 2. Search Methods

```javascript
// Similarity search (returns documents)
const results = await vectorStore.similaritySearch(query, k);

// The simple implementation
const results = similaritySearch(query, documents, k);

// Similarity search (with scores)
const results = await vectorStore.similaritySearchWithScore(query, k);

// Similarity search (with a filter)
const results = await vectorStore.similaritySearch(query, k, {
  filter: { source: "docs" }
});
```

### 3. Adding Documents

```javascript
// Add text
await vectorStore.addText("New text", { source: "docs" });

// Add several texts
await vectorStore.addTexts(["Text 1", "Text 2"]);

// Add documents
await vectorStore.addDocuments([new Document({...})]);
```

---

## 🎓 Hands-on Project: a Personal Knowledge Base

```javascript
import { ChatOpenAI, OpenAIEmbeddings } from "@langchain/openai";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { Document } from "@langchain/core/documents";
import { MemoryVectorStore } from "@langchain/classic/vectorstores/memory";

const model = new ChatOpenAI({
  model: "MiniMax/MiniMax-M2.5",
  apiKey: "your API key",
  temperature: 0,
  configuration: {
    baseURL: "https://api-inference.modelscope.cn/v1",
  },
});

// Embeddings model (used for vector retrieval; see chapter 13 for the service requirements)
const embeddings = new OpenAIEmbeddings({
  model: "text-embedding-3-small",
  apiKey: process.env.OPENAI_API_KEY,
});

// Personal knowledge-base content
const personalKnowledge = [
  `[Work notes] Project A: intelligent customer-service system — stack: Node.js + React + MongoDB`,
  `[Work notes] Project B: data analytics platform — stack: Python + Django + PostgreSQL`,
  `[Study notes] React Hooks in practice: useState, useEffect, useContext`,
  `[Meeting notes] Weekly meeting, March 10, 2026 — Project A is on track and should finish next week`,
  `[To-do] Finish the API for Project A, and write the requirements doc for Project B`
];

// Create documents
const documents = personalKnowledge.map((content, i) =>
  new Document({
    pageContent: content,
    metadata: { chunkIndex: i, source: "personal knowledge base" }
  })
);

// Build the vector store: documents are embedded and inserted automatically
const vectorStore = await MemoryVectorStore.fromDocuments(documents, embeddings);
console.log("✅ Knowledge base built (", documents.length, "documents)\n");

// RAG query
async function queryKnowledgeBase(question) {
  console.log("📝 Question:", question);

  // Semantic search for related documents
  const relevantDocs = await vectorStore.similaritySearch(question, 3);

  console.log("\n📚 Related documents:");
  relevantDocs.forEach((doc, i) => {
    console.log(`  ${i + 1}. ${doc.pageContent}`);
  });

  // Assemble the context
  const context = relevantDocs.map(doc => doc.pageContent).join("\n\n");

  // Generate the answer
  const prompt = new SystemMessage(`
You are a personal assistant. Answer the question using the user's knowledge base.
If the knowledge base has no relevant information, say so honestly.

Knowledge base:
${context}
`);

  const response = await model.invoke([
    prompt,
    new HumanMessage(question)
  ]);

  console.log("\n🤖 Answer:", response.content);
  console.log("\n" + "=".repeat(50) + "\n");

  return response.content;
}

// Run it
await queryKnowledgeBase("How is Project A going?");
await queryKnowledgeBase("Which React Hooks are there?");
await queryKnowledgeBase("Who owns Project B?");
```

---

## ⚠️ Things to Watch Out For

### 1. Choosing an Embeddings Model

```javascript
// English text
const embeddings = new OpenAIEmbeddings({
  model: "text-embedding-3-small",  // A good balance of cost and quality
});

// Chinese text (you need a model that supports Chinese)
// Options to consider:
// - OpenAI embedding models (multilingual)
// - A locally deployed Chinese embedding model
// - A Chinese embedding API from a cloud provider
```

### 2. Vector Dimensions

```javascript
// Different models produce different vector dimensions
// text-embedding-3-small: 1536 dimensions
// text-embedding-3-large: 3072 dimensions

// One vector store must use embeddings of the same dimension
```

### 3. Performance

```javascript
// Add documents in a batch (faster than adding them one by one)
await vectorStore.addDocuments(documents);

// Use an index to speed up search (large datasets)
// Pinecone, Milvus, and others support indexes

// Cache search results
const cache = new Map();
async function cachedSearch(query) {
  if (cache.has(query)) return cache.get(query);
  const result = similaritySearch(query, documents, 3);
  cache.set(query, result);
  return result;
}
```

---

## 📝 Chapter Summary

- A vector store = stored vectors + similarity search
- `MemoryVectorStore` lives at `@langchain/classic/vectorstores/memory` and is still available
- When you have no embeddings service, character matching can stand in so you can see the idea
- Chroma and Pinecone fit production
- Embeddings turn text into vectors
- Similarity search matches by meaning rather than by keywords

---

## 🎓 End of the Tutorial!

You have finished the entire LangChain.js v1.x beginner tutorial!

### Full Course List

| Chapter | Topic |
|------|------|
| 01 | Basic Concepts |
| 02 | Environment Setup |
| 03 | Calling Models |
| 04 | Message Types |
| 05 | Streaming Output |
| 06 | Prompt Templates |
| 07 | Output Parsers |
| 08 | Chains |
| 09 | Memory |
| 10 | Tools |
| 11 | Using Zod |
| 12 | Agents |
| 13 | RAG (Retrieval-Augmented Generation) |
| 14 | Vector Stores |

---

## 🔗 Further Reading

- [LangChain.js docs](https://js.langchain.com/)
- [Vector database comparison](https://python.langchain.com/docs/integrations/vectorstores/)
- [Embedding models](https://platform.openai.com/docs/guides/embeddings)

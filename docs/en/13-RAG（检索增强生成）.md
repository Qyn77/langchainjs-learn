# RAG (Retrieval-Augmented Generation)

> 📅 For LangChain.js v1.x | 👶 Beginner-friendly
> 💡 **Note:** Requires Node.js 20+

---

## 📖 What Is RAG?

**RAG = Retrieval-Augmented Generation**

In short: RAG is a technique that makes the AI **look something up before it answers**.

---

## 🤔 Why Do You Need RAG?

### Limits of a Large Language Model

```
❌ Knowledge cutoff: the model's training data stops at a date
❌ No access to private data: company documents, personal notes, and so on
❌ Hallucinations: it may invent information that is not true
❌ No updates: after training, its knowledge is fixed
```

### How RAG Solves This

```
User question
   │
   ▼
┌─────────────────┐
│ Retrieve related│ ←── Search a knowledge base or database
│ documents       │
└─────────────────┘
   │
   ▼
┌─────────────────┐
│ Assemble the    │ ←── Question + related documents
│ context         │
└─────────────────┘
   │
   ▼
┌─────────────────┐
│ AI writes the   │ ←── Based on the retrieved information
│ answer          │
└─────────────────┘
   │
   ▼
Return an accurate answer
```

---

## 🧱 Core Components of RAG

```
┌─────────────────────────────────────────────────────────┐
│                       RAG system                        │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │   Document   │  │     Text     │  │  Embedding   │  │
│  │    loader    │  │   splitter   │  │              │  │
│  │              │  │              │  │              │  │
│  │ Read files   │  │ Cut into     │  │ Turn text    │  │
│  │ and URLs     │  │ small chunks │  │ into vectors │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
│         │                │                │            │
│         ▼                ▼                ▼            │
│  ┌─────────────────────────────────────────────────┐   │
│  │                 Vector Store                    │   │
│  │                                                 │   │
│  │  Stores document vectors and supports           │   │
│  │  similarity search                              │   │
│  └─────────────────────────────────────────────────┘   │
│                          │                             │
│                          ▼                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │  Retriever   │  │    Prompt    │  │     LLM      │  │
│  │              │  │              │  │              │  │
│  │ Search for   │  │ Assemble the │  │ Write the    │  │
│  │ documents    │  │ context      │  │ answer       │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
└─────────────────────────────────────────────────────────┘
```

---

## 📦 Install Dependencies

```bash
npm install @langchain/core @langchain/openai @langchain/classic zod
# @langchain/classic provides MemoryVectorStore (a real vector store; see Method B below)
```

---

## 💡 A Complete RAG Flow

### Step 1: Prepare the Knowledge Base

```javascript
import { ChatOpenAI } from "@langchain/openai";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";

// Sample documents (a real app might load these from files or a database)
const documents = [
  `Company name: Future Tech Co., Ltd.
Founded: 2020
Headquarters: Haidian District, Beijing
Business: AI software development and technical consulting
Employees: 500`,
  
  `Product A: Intelligent customer-service system
Features: automatic answers to customer questions, ticket management
Price: 9999 yuan/year
Fits: e-commerce, finance, and education`,
  
  `Product B: Data analytics platform
Features: data visualization, report generation, predictive analytics
Price: 19999 yuan/year
Fits: business decisions and market analysis`,
  
  `Contact
Address: 1 Zhongguancun Street, Haidian District, Beijing
Phone: 400-123-4567
Email: contact@futuretech.com
Hours: Monday to Friday, 9:00–18:00`
];

// Split the text
const splitter = new RecursiveCharacterTextSplitter({
  chunkSize: 200,      // Each chunk is at most 200 characters
  chunkOverlap: 20,    // 20 characters of overlap between chunks
});

const splitDocs = await splitter.splitText(documents.join("\n\n"));
console.log("Number of chunks after splitting:", splitDocs.length);
splitDocs.forEach((doc, i) => {
  console.log(`\nChunk ${i + 1}:`, doc);
});
```

### Step 2: A Simple RAG (without a Vector Store)

```javascript
import { ChatOpenAI } from "@langchain/openai";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";

const model = new ChatOpenAI({
  model: "MiniMax/MiniMax-M2.5",
  apiKey: "your API key",
  temperature: 0,
  configuration: {
    baseURL: "https://api-inference.modelscope.cn/v1",
  },
});

// Knowledge-base documents
const knowledgeBase = [
  "The company was founded in 2020 and is headquartered in Beijing.",
  "The main products are an intelligent customer-service system (9999 yuan/year) and a data analytics platform (19999 yuan/year).",
  "Phone: 400-123-4567. Email: contact@futuretech.com.",
  "Hours: Monday to Friday, 9:00–18:00."
];

// Simple similarity search (keyword matching)
function simpleSearch(query, docs, topK = 2) {
  // Split into characters (a simple approach; the original tutorial used it for Chinese)
  const queryWords = query.split('').filter(c => c.trim());

  const scored = docs.map((doc, index) => {
    const docLower = doc.toLowerCase();
    let score = 0;
    queryWords.forEach(word => {
      if (docLower.includes(word)) score += 1;
    });
    return { index, doc, score };
  });

  // Sort by score and return the top K
  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, topK)
    .map(item => item.doc);
}

// Main RAG function
async function ragQuery(question) {
  console.log("\n📝 User question:", question);
  
  // 1. Retrieve related documents
  const relevantDocs = simpleSearch(question, knowledgeBase, 2);
  console.log("\n📚 Retrieved documents:");
  relevantDocs.forEach((doc, i) => {
    console.log(`  ${i + 1}. ${doc}`);
  });
  
  // 2. Assemble the prompt
  const context = relevantDocs.join("\n");
  
  const prompt = new SystemMessage(`
You are a customer-service assistant. Answer the question using the reference material below.
If the material does not contain the answer, say "Sorry, I could not find any relevant information."

Reference material:
${context}
`);
  
  // 3. Generate the answer
  const response = await model.invoke([
    prompt,
    new HumanMessage(question)
  ]);
  
  console.log("\n🤖 AI answer:", response.content);
  return response.content;
}

// Try it
await ragQuery("When was the company founded?");
await ragQuery("How much does the intelligent customer-service system cost?");
await ragQuery("How can I contact you?");
```

---

## 🎯 Method B: Real Vector Retrieval (MemoryVectorStore + Embeddings)

> 💡 **Where the package lives:** In LangChain 1.x, `MemoryVectorStore` is at `@langchain/classic/vectorstores/memory` (moved from the old package, and still available).
>
> ⚠️ **Embedding service:** Real vector retrieval needs an embeddings API. ModelScope's api-inference is mainly for chat and generation models. When this tutorial was written, it was not confirmed that ModelScope exposes an OpenAI-compatible `/embeddings` endpoint, so the example uses OpenAI's embeddings service. Any OpenAI-compatible embeddings platform (Alibaba Cloud Bailian's compatible mode, Zhipu, and others) only needs a different `apiKey` and `baseURL`.

```javascript
import { ChatOpenAI, OpenAIEmbeddings } from "@langchain/openai";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { MemoryVectorStore } from "@langchain/classic/vectorstores/memory";

const model = new ChatOpenAI({
  model: "MiniMax/MiniMax-M2.5",
  apiKey: process.env.MODELSCOPE_API_KEY,
  temperature: 0,
  configuration: {
    baseURL: "https://api-inference.modelscope.cn/v1",
  },
});

// 1. Embeddings model: turn text into vectors
const embeddings = new OpenAIEmbeddings({
  model: "text-embedding-3-small",
  apiKey: process.env.OPENAI_API_KEY,
});

// 2. Build the vector store: each piece of text is embedded automatically and stored in memory
const vectorStore = await MemoryVectorStore.fromTexts(
  [
    "Python is a high-level programming language, invented by Guido van Rossum in 1989.",
    "JavaScript is used mainly for web development, and it can also run on the backend with Node.js.",
    "C++ is a high-performance language, often used for game development and systems programming.",
    "Go was created by Google and is a good fit for high-performance backend services.",
  ],
  [{ source: "python" }, { source: "javascript" }, { source: "cpp" }, { source: "go" }],
  embeddings
);

// 3. Semantic retrieval: different wording with a similar meaning can still match!
const results = await vectorStore.similaritySearch("Who created this language?", 2);
results.forEach((doc, i) => {
  console.log(`${i + 1}. [${doc.metadata.source}] ${doc.pageContent}`);
});
// 1. [python] Python is a high-level programming language, invented by Guido van Rossum in 1989.
//    ↑ Note: "created" and "invented" are different words. Character matching misses this; vector search finds it.

// 4. Full RAG: retrieve → assemble context → generate
async function ragQuery(question) {
  console.log("\n📝 User question:", question);

  const relevantDocs = await vectorStore.similaritySearch(question, 2);
  const context = relevantDocs.map((d) => d.pageContent).join("\n");

  const response = await model.invoke([
    new SystemMessage(
      `You are a programming assistant. Answer the question using the reference material below. Do not invent information that is not in the material.\n\nReference material:\n${context}`
    ),
    new HumanMessage(question),
  ]);

  console.log("🤖 AI answer:", response.content);
  return response.content;
}

await ragQuery("Who invented Python?");
await ragQuery("Which language is a good fit for writing games?");
```

### Character Matching vs Vector Retrieval

| | Character matching (Method A) | Vector retrieval (Method B) |
|---|---|---|
| How it works | Count how often query characters appear in a document | Turn text into vectors and compute cosine similarity |
| Paraphrases | ❌ Not retrieved | ✅ A similar meaning is enough to match |
| Extra dependencies | None | Needs an embeddings service |
| Where it fits | A quick prototype, and for understanding the flow | The standard approach for production RAG |

---

## 📎 Appendix: Character-Matching RAG (a Stand-in When You Have No Embeddings Service)

> The snippet below uses character matching to simulate the "retrieve → assemble → generate" flow, so you can see the skeleton of RAG without an embeddings service. Real projects should use the vector retrieval above.

```javascript

import { ChatOpenAI } from "@langchain/openai";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";

// How a vector store works:
// 1. Document → embedding → vector
// 2. Query → embedding → vector
// 3. Similarity search → find the most similar documents
// 4. Assemble the context → generate the answer

// A simple implementation (no vector store)
const documents = [
  "Python is a high-level programming language, invented by Guido van Rossum in 1989.",
  "JavaScript is used mainly for web development and can run in the browser.",
  "Java is an object-oriented programming language, widely used for enterprise applications.",
  "C++ is a high-performance language, often used for game development and systems programming.",
  "Go was created by Google and is a good fit for high-performance backend services."
];

// Simple similarity search (character matching)
function simpleSearch(query, docs, topK = 2) {
  // Split into characters (a simple approach; the original tutorial used it for Chinese)
  const queryWords = query.split('').filter(c => c.trim());

  const scored = docs.map((doc, index) => {
    const docLower = doc.toLowerCase();
    let score = 0;
    queryWords.forEach(word => {
      if (docLower.includes(word)) score += 1;
    });
    return { index, doc, score };
  });

  // Sort by score and return the top K
  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, topK)
    .map(item => item.doc);
}

const model = new ChatOpenAI({
  model: "MiniMax/MiniMax-M2.5",
  apiKey: "your API key",
  temperature: 0,
  configuration: {
    baseURL: "https://api-inference.modelscope.cn/v1",
  },
});

// RAG query
async function queryRAG(question) {
  console.log("📝 User question:", question);

  // 1. Retrieve related documents
  const relevantDocs = simpleSearch(question, documents, 2);

  console.log("\n📚 Retrieved documents:");
  relevantDocs.forEach((doc, i) => {
    console.log(`  ${i + 1}. ${doc}`);
  });

  // 2. Assemble the context
  const context = relevantDocs.join("\n");

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
  2. Go was created by Google and is a good fit for high-performance backend services.

🤖 AI answer: According to the reference material, Python was invented by **Guido van Rossum** in 1989.
```

---

## 🔄 The RAG Workflow in Detail

```
┌─────────────────────────────────────────────────────────────┐
│                      The full RAG flow                      │
└─────────────────────────────────────────────────────────────┘

[Indexing] (offline)
1. Load documents → 2. Split the text → 3. Embed → 4. Store in a vector database

[Querying] (online)
1. The user asks a question
        │
        ▼
2. Embed the question
        │
        ▼
3. Similarity search → find the most relevant document chunks
        │
        ▼
4. Assemble the prompt → question + related documents
        │
        ▼
5. The AI writes the answer
        │
        ▼
6. Return the answer
```

---

## 📊 Text-Splitting Strategies

### 1. Split by Character Count

```javascript
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";

const splitter = new RecursiveCharacterTextSplitter({
  chunkSize: 500,      // Each chunk is at most 500 characters
  chunkOverlap: 50,    // 50 characters of overlap, so context stays connected
});

const chunks = await splitter.splitText(longText);
```

### 2. Split by Paragraph

```javascript
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";

const splitter = new RecursiveCharacterTextSplitter({
  chunkSize: 1000,
  chunkOverlap: 0,
  separators: ["\n\n", "\n", "。", "！", "？", "。", " ", ""],  // Prefer splitting on paragraphs
});
```

### 3. Split Code

```javascript
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";

const splitter = RecursiveCharacterTextSplitter.fromLanguage("python", {
  chunkSize: 500,
  chunkOverlap: 0,
});

const codeChunks = await splitter.splitText(pythonCode);
```

---

## 🎯 Real-World Use Cases

### Use Case 1: Company Knowledge-Base Q&A

```javascript
const companyDocs = [
  "Employee handbook: working hours are 9:00–18:00, with weekends off.",
  "Expense process: submit last month's invoices before the 15th. Finance pays after review.",
  "Leave policy: 5 days of annual leave. Sick leave requires a hospital certificate.",
  "Benefits: social insurance and housing fund, an annual checkup, and holiday gifts."
];

// An employee asks: "How many days of annual leave do we get?"
// RAG retrieves the document about the leave policy
// The AI answers: "According to company policy, annual leave is 5 days."
```

### Use Case 2: Product Documentation Q&A

```javascript
const productDocs = [
  "Install steps: 1. Download the installer 2. Run the installer 3. Choose the install path 4. Finish",
  "System requirements: Windows 10+, 8 GB of memory, 50 GB of disk space",
  "FAQ: if it will not start, check the firewall settings"
];

// A user asks: "What do I need in order to install it?"
// RAG retrieves the document about system requirements
// The AI answers: "You need Windows 10 or later, 8 GB of memory, and 50 GB of disk space."
```

### Use Case 3: Paper and Literature Search

```javascript
const papers = [
  "Paper A: deep learning for image recognition, 95% accuracy",
  "Paper B: recent progress in natural language processing, an introduction to the BERT model",
  "Paper C: case studies of reinforcement learning in game AI"
];

// A researcher asks: "What is the accuracy for image recognition?"
// RAG retrieves "Paper A"
// The AI answers: "According to Paper A, deep learning reaches 95% accuracy on image recognition."
```

---

## ⚠️ Things to Watch Out For

### 1. Document Quality

```javascript
// ✅ Good documents: clear structure and accurate information
const goodDocs = [
  "Company name: XX Tech, founded in 2020.",
  "Product A price: 999 yuan/year. Features include..."
];

// ❌ Poor documents: messy, and the information is wrong
const badDocs = [
  "It was maybe around 2020, I think",
  "Not sure about the price, maybe 999"
];
```

### 2. How Many Results to Retrieve

```javascript
// Too few: you may miss key information
const retriever = vectorStore.asRetriever(1);  // Return only 1

// Too many: costs more tokens, and the model may get confused
const retriever = vectorStore.asRetriever(20);  // Return 20

// ✅ Recommended: 3–5
const retriever = vectorStore.asRetriever(3);  // Return 3
```

### 3. Prompt Design

```javascript
// ✅ A good prompt
const prompt = new SystemMessage(`
You are a customer-service assistant. Answer the question using the reference material below.
If the material does not contain the answer, say "Sorry, I could not find any relevant information."
Do not invent anything that is not in the material.

Reference material:
{context}
`);

// ❌ A poor prompt
const prompt = new SystemMessage("Answer the question:");  // It never says to use the reference material
```

---

## 📝 Chapter Summary

- RAG = retrieval + generation. The AI looks something up before it answers
- Core components: document loading, text splitting, embedding, retrieval, and generation
- It addresses the knowledge cutoff, private data, and hallucinations
- Real vector retrieval: `MemoryVectorStore` (`@langchain/classic`) + `OpenAIEmbeddings`, matching by meaning rather than keywords
- Character matching is only a simplified stand-in when you have no embeddings service
- Prompt design matters

---

## 🏃 Next Chapter

[14-VectorStore（向量存储） →](./14-VectorStore（向量存储）.md)

---

## 🔗 Further Reading

- [LangChain RAG docs](https://js.langchain.com/docs/tutorials/rag/)
- [Vector database comparison](https://python.langchain.com/docs/integrations/vectorstores/)

# 17-State in Detail

> 📅 For LangGraph.js v1.x | 👶 Beginner-friendly
> 💡 **Note:** This is the most important chapter in LangGraph. Once you understand State, everything that follows clicks into place

---

## 🎯 Goals for This Chapter

- ✅ Define your own graph State with `Annotation.Root`
- ✅ Understand **reducers**: what happens when several nodes update the same field
- ✅ Master the built-in `MessagesAnnotation` and how to extend it
- ✅ Understand why parallel nodes must have a reducer

---

## 🤔 What Is State?

**State = one shared piece of data that every node can use.**

```
        ┌──────────────────────────────┐
        │   State (shared state)       │
        │   {                          │
        │     messages: [...],         │
        │     topic: "AI",             │
        │     jokes: []                │
        │   }                          │
        └──────────────────────────────┘
           ▲ read/write  ▲ read/write  ▲ read/write
           │              │             │
        ┌──┴───┐      ┌───┴───┐     ┌──┴────┐
        │Node A │      │Node B │     │Node C │
        └──────┘      └───────┘     └───────┘
```

Nodes do not talk to each other directly. They pass notes through State:
- Each node reads the current State → does its work → returns an **update**
- LangGraph merges that update back into State

---

## 📦 Defining State with Annotation

Use `Annotation.Root` to define graph State. Each field is one key in that State:

```javascript
import { Annotation } from "@langchain/langgraph";

const StateAnnotation = Annotation.Root({
  // Field 1: a plain field (default: the new value overwrites the old one)
  topic: Annotation,

  // Field 2: a field with a reducer (the new value and the old value are merged by a rule)
  jokes: Annotation({
    reducer: (existing, update) => existing.concat(update),
    default: () => [],
  }),
});
```

Two ways to declare a field:

| Syntax | Behavior | When to use it |
|------|------|---------|
| `Annotation` | **Overwrite**: the new value a node returns replaces the old value | The current step's result, config values |
| `Annotation({ reducer, default })` | **Merge**: the old value and the new value are combined by the reducer | Message history, logs, collected results |

### The two arguments of a reducer

```javascript
reducer: (existing, update) => {
  // existing: the current value already in State (the old value)
  // update: the value the node just returned (the new value)
  // The return value becomes the new State for this field
}
```

> 💡 **Key point:** Each field has its own reducer. A field with no reducer defaults to overwrite.

---

## 💡 Full Example: Overwrite vs Merge

Create `state-demo.js`:

```javascript
import { Annotation, StateGraph, START, END } from "@langchain/langgraph";

// Define State
const StateAnnotation = Annotation.Root({
  // Plain field: overwrite
  foo: Annotation,

  // Array field: merge (append)
  bar: Annotation({
    reducer: (existing, update) => existing.concat(update),
    default: () => [],
  }),
});

const graph = new StateGraph(StateAnnotation)
  .addNode("nodeA", (state) => {
    // A node returns only an "update", not the full State!
    return { foo: 2 };
  })
  .addNode("nodeB", (state) => {
    return { bar: ["bye"] };
  })
  .addEdge(START, "nodeA")
  .addEdge("nodeA", "nodeB")
  .addEdge("nodeB", END)
  .compile();

const result = await graph.invoke({ foo: 1, bar: ["hi"] });

console.log(result);
// { foo: 2, bar: ["hi", "bye"] }
//      ↑ overwritten    ↑ appended and merged
```

Walk through the run:

```
Initial input:     { foo: 1, bar: ["hi"] }
nodeA returns:     { foo: 2 }
  → foo overwritten: 1 → 2
  → bar unchanged:   ["hi"]
nodeB returns:     { bar: ["bye"] }
  → foo unchanged:   2
  → bar merged:      ["hi"] + ["bye"] = ["hi", "bye"]
Final State:       { foo: 2, bar: ["hi", "bye"] }
```

---

## 💬 MessagesAnnotation: Built-in Message State

Storing conversation messages in State is the most common pattern. The library ships a ready-made `MessagesAnnotation`:

```javascript
import { MessagesAnnotation, StateGraph, START, END } from "@langchain/langgraph";

const graph = new StateGraph(MessagesAnnotation)
  .addNode("callModel", async (state) => {
    // state.messages is the full conversation history
    const response = await model.invoke(state.messages);
    return { messages: [response] };
  })
  .addEdge(START, "callModel")
  .addEdge("callModel", END)
  .compile();
```

It is equivalent to:

```javascript
import { Annotation, messagesStateReducer } from "@langchain/langgraph";

const StateAnnotation = Annotation.Root({
  messages: Annotation({
    reducer: messagesStateReducer,
    default: () => [],
  }),
});
```

### What does messagesStateReducer do?

It is smarter than a plain concat:

- ✅ A new message → **appended** to the end of the list
- ✅ A message with the same id → **updated in place** (not appended again)
- ✅ You can pass a plain `{ role, content }` object. It is converted into a LangChain message class automatically

That is why `invoke({ messages: [{ role: "user", ... }] })` in Chapter 16 works directly.

---

## 🔧 Extending MessagesAnnotation

State usually holds more than messages. You also need your own business fields. Use the spread syntax to inherit the message field and add more:

```javascript
import { Annotation, MessagesAnnotation } from "@langchain/langgraph";

// Inherit the messages field, then add your own fields
const StateWithDocs = Annotation.Root({
  ...MessagesAnnotation.spec,        // ← spread it to keep messages
  documents: Annotation({            // ← a new field
    reducer: (existing, update) => existing.concat(update),
    default: () => [],
  }),
  searchQuery: Annotation,           // ← a plain overwrite field
});

const graph = new StateGraph(StateWithDocs)
  .addNode("search", async (state) => {
    return {
      documents: [`Search result 1 for "${state.searchQuery}"`],
    };
  })
  // ... other nodes
  .compile();
```

> ⚠️ **Note:** `...MessagesAnnotation.spec` spreads the field definitions. The `messages` reducer is kept in full, so conversation history still works.

---

## 🔀 Why Must Parallel Nodes Have a Reducer?

Recall the superstep from Chapter 15: **several nodes activated in the same superstep run in parallel**.

```
        ┌─→ [Node B] returns { jokes: ["Joke B"] } ─┐
START ──┤                                           ├→ How is State merged?
        └─→ [Node C] returns { jokes: ["Joke C"] } ─┘
```

Two nodes write the `jokes` field **at the same time**:

- ❌ If `jokes` has no reducer (overwrite semantics): LangGraph does not know which write to keep, and throws an error
- ✅ If it has a reducer (merge semantics): both results are kept

### Full example

Create `parallel-demo.js`:

```javascript
import { Annotation, StateGraph, START, END } from "@langchain/langgraph";

const StateAnnotation = Annotation.Root({
  jokes: Annotation({
    reducer: (existing, update) => existing.concat(update),
    default: () => [],
  }),
});

const graph = new StateGraph(StateAnnotation)
  // Both nodes write the jokes field
  .addNode("jokeA", () => ({ jokes: ["Joke A: Why can't programmers tell Halloween from Christmas?"] }))
  .addNode("jokeB", () => ({ jokes: ["Joke B: Because Oct 31 == Dec 25."] }))
  // Both edges leave START → the two nodes run in parallel!
  .addEdge(START, "jokeA")
  .addEdge(START, "jokeB")
  .addEdge("jokeA", END)
  .addEdge("jokeB", END)
  .compile();

const result = await graph.invoke({});

console.log(result.jokes);
// [ "Joke A: Why can't programmers tell Halloween from Christmas?", "Joke B: Because Oct 31 == Dec 25." ]
//  ↑ Both results are kept (the reducer merged them)
```

Remove the reducer and you get an error like this:

```
Error: Can receive only one value per step. Use an Annotated key to update more than one value per step.
```

> 💡 **Rule of thumb:** Whenever more than one node writes the same field (especially in parallel), that field must have a reducer.

---

## 🆚 Newer Style: StateSchema (Optional Reading)

The latest official docs also offer a Zod-based way to define State. The effect is the same:

```javascript
import { StateSchema, ReducedValue, MessagesValue } from "@langchain/langgraph";
import { z } from "zod/v4";

const State = new StateSchema({
  messages: MessagesValue,               // built-in messages field
  topic: z.string(),                     // overwrite field
  jokes: new ReducedValue(               // field with a reducer
    z.array(z.string()).default(() => []),
    { reducer: (x, y) => x.concat(y) }
  ),
});

const graph = new StateGraph(State)
  .addNode("myNode", (state) => ({ topic: "new value" }))
  .addEdge(START, "myNode")
  .compile();
```

> 💡 **Note:** Both styles are officially supported. `Annotation` came first and appears in the most examples, so this tutorial uses `Annotation` throughout. If you prefer the Zod style (Chapter 11 of this project), you can try `StateSchema`. Use one style or the other, and do not mix them.

---

## ⚠️ Things to Watch Out For

### 1. A node returns an update, not the full State

```javascript
// ❌ Wrong: trying to return the full State
.addNode("bad", (state) => {
  return state;  // Nothing is updated, and you may overwrite fields written by other nodes
})

// ✅ Right: return only the fields you want to change
.addNode("good", (state) => {
  return { foo: state.foo + 1 };
})
```

### 2. A field with a reducer must provide default

```javascript
// ❌ Wrong: a reducer field with no default. On the first update, existing is undefined
jokes: Annotation({
  reducer: (existing, update) => existing.concat(update),
})

// ✅ Right: add default
jokes: Annotation({
  reducer: (existing, update) => existing.concat(update),
  default: () => [],
})
```

### 3. State must be JSON-serializable

Later you will save State with a Checkpointer (Chapter 21), so field values should be serializable. Numbers, strings, arrays, plain objects, and LangChain message classes are all fine. Do not put objects such as database connections into State.

### 4. Do not mutate the original state object

```javascript
// ❌ Wrong: mutating in place (this does not trigger the State update mechanism)
.addNode("bad", (state) => {
  state.foo = 100;
  return {};
})

// ✅ Right: return a new value
.addNode("good", (state) => {
  return { foo: 100 };
})
```

---

## 📝 Chapter Summary

- State is data shared by every node. Nodes change it by returning an update
- Two field semantics: `Annotation` (overwrite) and `Annotation({ reducer, default })` (merge)
- `MessagesAnnotation` is the built-in message State. Spread `...MessagesAnnotation.spec` to extend it
- **Parallel nodes that write the same field must have a reducer**, or LangGraph throws
- The newer `StateSchema` + Zod style does the same job. Pick one

---

## 🏃 Next Chapter

[18-节点与边 →](./18-节点与边.md)

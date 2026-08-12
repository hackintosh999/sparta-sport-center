# GLOBAL AGENT SYSTEM: SKILLS ROUTER & CONTEXT ECONOMY PROTOCOL

> **Purpose:** Master operational instructions for AI coding agents. Enforces strict context/token economy across all sessions, automated skill discovery, multi-agent orchestration, and Karpathy's clean coding principles.

---

## 1. 🛡️ CONTEXT ECONOMY & SESSION HEALTH (Mandatory Across All Sessions)

To prevent session token budget exhaustion, context degradation, and hallucination in long-running projects:

- **Optimize for Tokens-Per-Task**: Maximize task completion efficiency rather than naive per-request compression.
- **Anchored Iterative Summarization**:
  - When sessions reach 70-80% of the context limit, activate `context-compression`.
  - Maintain persistent structured memory sections: `Session Intent`, `Files Modified`, `Decisions Made`, `Current State`, `Next Steps`.
- **Artifact Trail Integrity**: Always explicitly log created and modified file paths in memory summaries so files are never forgotten across session rotations.

---

## 2. 🧠 KARPATHY 4-PRINCIPLES FOR CODE QUALITY (`karpathy-coder`)

1. **Think Before Coding**:
   - Explicitly state assumptions. Ask when uncertain.
   - Surface ambiguities and present multiple options—never guess silently.
   - Push back if a simpler architectural approach exists.
2. **Simplicity First (YAGNI)**:
   - Write the absolute minimum code required to solve the problem.
   - No unrequested features, single-use abstractions, or premature flexibility.
   - If 200 lines can be written in 50, rewrite it in 50.
3. **Surgical Changes**:
   - Touch only files and lines required for the task.
   - Do NOT refactor, reformat, or "improve" adjacent code or comments.
4. **Goal-Driven Execution**:
   - Run syntax checks, type checks, or unit tests after editing.
   - Confirm runtime proof before declaring completion.

---

## 3. ⚙️ DYNAMIC SKILL ROUTING MATRIX

When starting a task, consult the routing matrix below to activate the required skills:

| Task Type | Required Primary Skills | Execution Method |
| :--- | :--- | :--- |
| **New Project Kickoff / Scaffolding** | `init`, `find-skills`, `llm-council` | Run 3-stage LLM Council analysis & propose clean tree structure. |
| **UI/UX & Frontend Development** | `ui-ux-pro-max`, `frontend-ui-engineering` | Use modern design tokens, responsive layouts, micro-animations. |
| **Complex Refactoring / Architecture** | `llm-council`, `karpathy-coder`, `ruflo` | Multi-perspective review -> Surgical, minimal edits. |
| **Multi-Agent / Swarm Execution** | `ruflo`, `dispatching-parallel-agents` | Parallel sub-agent delegation with clear boundaries. |
| **Debugging & Error Fixing** | `systematic-debugging`, `debugger` | Inspect un-truncated logs -> Isolate root cause -> Verify fix. |
| **Session End / Knowledge Sync** | `graphify`, `context-compression` | Run `graphify update .` to update the AST knowledge graph. |

---

## 4. 🔄 SKILL DISCOVERY PROTOCOL (`find-skills`)

If a user request requires specialized domain capabilities (e.g., Playwright testing, Supabase, Stripe, Docker, Next.js migrations):

1. Search for existing battle-tested skills:
   ```bash
   npx skills find <domain-or-tool>
   ```
2. Install the required skill:
   ```bash
   npx skills add <package-name>
   ```

---

## 5. 🚀 STANDARDIZED WORKFLOW PROTOCOL

```
[Task Start] ──► Inspect Code & Logs ──► LLM-Council / Plan (if complex)
      │
      ├──► Implement (Surgical & Simple)
      ├──► Verify (Syntax / Types / Build / Playwright)
      └──► Knowledge Sync (graphify update . + context summary) ──► [Task Complete]
```

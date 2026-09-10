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

## 5. 🚀 STANDARDIZED WORKFLOW PROTOCOL

```
[Task Start] ──► Inspect Code & Logs ──► LLM-Council / Plan (if complex)
      │
      ├──► Implement (Surgical & Simple)
      ├──► Verify (Syntax / Types / Build / Playwright)
      └──► Knowledge Sync (graphify update . + context summary) ──► [Task Complete]
```

---

## 6. 🔄 НАВЫК: ФИКСАЦИЯ СЕССИИ ДЛЯ БЕСШОВНОГО ПЕРЕХОДА (`session-handoff`)

### 📌 Триггер:
Когда пользователь пишет:
> **"Заканчиваем сессию, подготовь передачу контекста"** (или аналогичную команду завершения сессии)

### 📋 Алгоритм действий агента:
1. **Создать/перезаписать файл `docs/session-handoff.md`** (и синхронизировать `HANDOFF_NEXT_SESSION.md`).
2. **Обязательная структура файла:**
   - **Цель и фокус сессии:** что конкретно реализовывали, чинили или оптимизировали в рамках сессии.
   - **Внесенные изменения (по файлам):** точный список измененных/созданных файлов с описанием ключевой логики и новых функций (без раздутого сырого кода, только суть изменений).
   - **Текущее состояние и решенные баги:** какие проблемы были устранены (например: импорт 131 ученика, каскад тренеров, автоскрытие плееров, устранение скрытых кнопок).
   - **Нерешенные вопросы / Задачи на следующую сессию:** что планируется делать дальше (чек-лист `[ ]`).
   - **Готовый стартовый промпт для нового чата:** короткий блок текста в формате цитаты (`> ...`), который пользователь просто копирует и вставляет в первую строку новой сессии, чтобы новый агент моментально включился в работу.
3. **Обновить граф кодовой базы:**
   Запустить команду актуализации графа (AST-only, без внешних API-затрат):
   ```bash
   npx graphify update .
   ```
4. **Финальное подтверждение:**
   Предоставить краткий резюмирующий ответ пользователю, подтвердить готовность файла передачи и уведомить, что можно безопасно переходить в новую сессию через `+ New Conversation`.

---

## 7. 🧠 ПРОТОКОЛ СТАРТА НОВОЙ СЕССИИ (Session Resume & Obsidian Memory)

### 📌 Триггер:
При старте новой сессии, либо когда пользователь пишет:
> **"Где мы остановились?"**, **"Продолжаем"**, **"Какое текущее состояние?"** (или начинает новый диалог с любого контекстного вопроса)

### 📋 Алгоритм действий агента:
1. **Мгновенное чтение памяти (БЕЗ сплошного сканирования кодовой базы):**
   - Первым делом прочитать последнюю сессию из `D:\AgentVault\Projects\Sparta_Sports\sessions\` (или `docs/session-handoff.md`).
   - Запрещено запускать тяжелый поиск по всему проекту (`grep`, полный листинг файлов), если задача уже описана в памяти.
2. **Точный ответ пользователю:**
   - Четко и кратко доложить:
     1. Что было сделано и протестировано в прошлый раз.
     2. Текущий рабочий статус кодовой базы.
     3. Следующие задачи из чек-листа `[ ]`.
     4. Запросить подтверждение для перехода к первой открытой задаче.
3. **Синхронизация:** Все новые решения и завершенные сессии по завершении чата синхронизируются в `D:\AgentVault\Projects\Sparta_Sports\sessions\` и `docs/session-handoff.md`.


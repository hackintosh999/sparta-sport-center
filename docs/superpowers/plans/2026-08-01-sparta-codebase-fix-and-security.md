# Sparta Codebase Fix and Security Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix runtime site crashes caused by React importmap duplication in index.html, remove hardcoded sensitive API keys into environment variables, fix server startup crash risks, fix build script in package.json, and add ESLint v9 flat configuration.

**Architecture:** Remove CDN importmap in index.html to allow Vite bundler single-instance module resolution; decouple environment secrets via .env and process.env/import.meta.env; implement lazy initialization for external AI services in Express; provide flat ESLint config.

**Tech Stack:** React 19, Vite, Express, TypeScript, Supabase, OpenRouter, Firebase, ESLint 9.

## Global Constraints

- React 19 and Vite 6 build compatibility must be preserved.
- No sensitive API keys or tokens are allowed in source control files.
- All client environment variables must be exposed via `import.meta.env.VITE_*`.

---

### Task 1: Fix `index.html` ImportMap & CDN Conflict

**Files:**
- Modify: [index.html](file:///c:/Users/User/Downloads/sparta-sports-center/index.html#L29-L100)

**Interfaces:**
- Consumes: Local npm packages bundled by Vite (`react`, `react-dom`, `lucide-react`, `framer-motion`).
- Produces: Clean single-instance React runtime without CDN script conflicts.

- [ ] **Step 1: Inspect `index.html` lines 29 and 90-100**

- [ ] **Step 2: Remove CDN Tailwind script and `<script type="importmap">`**

In [index.html](file:///c:/Users/User/Downloads/sparta-sports-center/index.html):
Remove:
```html
<script src="https://cdn.tailwindcss.com"></script>
```
and remove:
```html
<script type="importmap">
{
  "imports": {
    "react": "https://esm.sh/react@^19.2.4",
    "react-dom/": "https://esm.sh/react-dom@^19.2.4/",
    "react/": "https://esm.sh/react@^19.2.4/",
    "lucide-react": "https://esm.sh/lucide-react@^0.563.0",
    "framer-motion": "https://esm.sh/framer-motion@^12.30.0"
  }
}
</script>
```

- [ ] **Step 3: Verify HTML syntax**

Run: `npx vite build`
Expected: Successful bundle generation or no importmap error.

---

### Task 2: Sanitize Hardcoded OpenRouter API Key & Add `.env.example`

**Files:**
- Modify: [openrouter.js](file:///c:/Users/User/Downloads/sparta-sports-center/openrouter.js#L6)
- Create: [.env.example](file:///c:/Users/User/Downloads/sparta-sports-center/.env.example)

**Interfaces:**
- Consumes: `process.env.OPENROUTER_API_KEY`
- Produces: Secure OpenRouter query helper.

- [ ] **Step 1: Create [.env.example](file:///c:/Users/User/Downloads/sparta-sports-center/.env.example)**

```env
OPENROUTER_API_KEY=your_openrouter_api_key_here
GEMINI_API_KEY=your_gemini_api_key_here
VITE_SUPABASE_URL=https://iheyjovfbmrgwuswoatl.supabase.co
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key_here
VITE_YOOKASSA_SHOP_ID=your_shop_id
VITE_YOOKASSA_SECRET_KEY=your_secret_key
VITE_VK_ACCESS_TOKEN=your_vk_token
```

- [ ] **Step 2: Update [openrouter.js](file:///c:/Users/User/Downloads/sparta-sports-center/openrouter.js#L6)**

Replace:
```javascript
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || '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';
```
With:
```javascript
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || '';
```

- [ ] **Step 3: Verify node syntax**

Run: `node -c openrouter.js`
Expected: Code compiles without syntax error.

---

### Task 3: Sanitize Hardcoded Supabase Credentials & Gemini Startup Crash in `server.js` and `supabase.ts`

**Files:**
- Modify: [server.js](file:///c:/Users/User/Downloads/sparta-sports-center/server.js#L31-L33)
- Modify: [server.js](file:///c:/Users/User/Downloads/sparta-sports-center/server.js#L401)
- Modify: [supabase.ts](file:///c:/Users/User/Downloads/sparta-sports-center/supabase.ts#L3-L6)

**Interfaces:**
- Consumes: Environment variables `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `GEMINI_API_KEY`.
- Produces: Resilient backend and Supabase client.

- [ ] **Step 1: Update [supabase.ts](file:///c:/Users/User/Downloads/sparta-sports-center/supabase.ts#L3-L6)**

```typescript
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://iheyjovfbmrgwuswoatl.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
```

- [ ] **Step 2: Update [server.js](file:///c:/Users/User/Downloads/sparta-sports-center/server.js#L31-L33) and Lazy Gemini Initialization**

In `server.js`:
```javascript
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://iheyjovfbmrgwuswoatl.supabase.co';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
```
And replace line 401 `const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);` with:
```javascript
let genAI = null;
const getGeminiClient = () => {
    if (!genAI) {
        if (!process.env.GEMINI_API_KEY) {
            throw new Error('GEMINI_API_KEY is missing');
        }
        genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    }
    return genAI;
};
```
Inside `/api/transcribe`:
```javascript
const model = getGeminiClient().getGenerativeModel({ model: "gemini-1.5-flash" });
```

- [ ] **Step 3: Verify node syntax**

Run: `node -c server.js`
Expected: Syntax OK.

---

### Task 4: Add ESLint v9 Flat Config (`eslint.config.js`) and Fix Build Script

**Files:**
- Create: [eslint.config.js](file:///c:/Users/User/Downloads/sparta-sports-center/eslint.config.js)
- Modify: [package.json](file:///c:/Users/User/Downloads/sparta-sports-center/package.json#L9)

**Interfaces:**
- Consumes: `@eslint/js`, `typescript-eslint`, `eslint-plugin-react`, `globals`.
- Produces: Working `npm run lint` and `npm run build`.

- [ ] **Step 1: Create [eslint.config.js](file:///c:/Users/User/Downloads/sparta-sports-center/eslint.config.js)**

```javascript
import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import reactPlugin from 'eslint-plugin-react';

export default tseslint.config(
  { ignores: ['dist', 'node_modules', 'release', 'scripts', 'scratch'] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2022,
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
    plugins: {
      react: reactPlugin,
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': 'warn',
      'react/react-in-jsx-scope': 'off',
    },
  }
);
```

- [ ] **Step 2: Update [package.json](file:///c:/Users/User/Downloads/sparta-sports-center/package.json#L9)**

Replace `"build": "tsc -b && vite build"` with `"build": "tsc --noEmit && vite build"`.

- [ ] **Step 3: Verify ESLint execution**

Run: `npx eslint "App.tsx"`
Expected: ESLint executes cleanly without missing configuration error.

---

### Task 5: Update `vite.config.ts` Environment Define

**Files:**
- Modify: [vite.config.ts](file:///c:/Users/User/Downloads/sparta-sports-center/vite.config.ts#L21-L25)

**Interfaces:**
- Consumes: Vite configuration defines.
- Produces: Safe runtime environment variable access without clobbering process.env completely.

- [ ] **Step 1: Update [vite.config.ts](file:///c:/Users/User/Downloads/sparta-sports-center/vite.config.ts#L21-L25)**

Replace:
```typescript
        define: {
            'process.env': {},
            'process.version': JSON.stringify('v18.0.0'), // Some libraries check this
            'process.platform': JSON.stringify('browser')
        },
```
With:
```typescript
        define: {
            'process.env.NODE_ENV': JSON.stringify(mode),
            'process.version': JSON.stringify('v18.0.0'),
            'process.platform': JSON.stringify('browser')
        },
```

- [ ] **Step 2: Verify Vite build**

Run: `npx vite build`
Expected: Build succeeds without error.

# Future Asif — Project Plan

## Working Agreement

- **Asif** — Senior MLE, designer, decision-maker
- **Claude** — Builder, implementer

Design decisions flow from Asif. Claude proposes, Asif disposes.

## Overview

A personal AI chat backend that maintains one infinite conversation thread. No sessions — it's a lifelong continuous relationship with a wiser version of yourself.

## Progress

### Completed

- [x] **Project scaffold** — uv init, pyproject.toml, dependencies
- [x] **SOLID architecture** — Protocol-based abstractions (`MessageStore`, `LLMClient`) with dependency injection
- [x] **Test infrastructure** — Fakes for both protocols, pytest-asyncio + httpx async test client
- [x] **POST /chat** — TDD: tests first, then implementation
- [x] **GET /chat/history** — Cursor-based pagination (newest first)
- [x] **POST /admin/archive** — Atomic transaction: moves messages to cold storage
- [x] **SqliteMessageStore** — Real SQLite implementation with WAL mode
- [x] **ClaudeClient** — Anthropic SDK wrapper with system prompt
- [x] **GeminiClient** — Google Gemini SDK wrapper (added as alternative provider)
- [x] **Multi-provider LLM support** — Factory pattern to switch between Anthropic and Gemini via config
- [x] **Docker setup** — Dockerfile + docker-compose.yml with volume for DB persistence
- [x] **12 tests passing** — All endpoints tested with fakes (no API key required)
- [x] **Frontend (Next.js 16.1)** — Chat UI with optimistic updates, infinite scroll, Tailwind styling
- [x] **CORS middleware** — Backend configured for frontend on localhost:3000/3001 and *.vercel.app

### File Structure

```
mega_meem/
├── pyproject.toml
├── Dockerfile
├── docker-compose.yml
├── .env.example
├── CLAUDE.md                 # Dev principles (TDD, SOLID)
├── app/
│   ├── config.py             # Settings from env vars
│   ├── schemas.py            # Pydantic models
│   ├── protocols.py          # MessageStore, LLMClient interfaces
│   ├── dependencies.py       # FastAPI DI wiring
│   ├── db.py                 # SqliteMessageStore
│   ├── claude_client.py      # ClaudeClient (Anthropic)
│   ├── gemini_client.py      # GeminiClient (Google)
│   └── main.py               # FastAPI app, lifespan, routes
├── tests/
│   ├── conftest.py           # Fakes + test client fixture
│   ├── test_chat.py
│   ├── test_history.py
│   └── test_archive.py
├── docs/
│   └── plan.md               # This file
└── data/                     # SQLite DB (gitignored)
```

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | /chat | Send message, get LLM response (Gemini or Claude) |
| GET | /chat/history | Paginated message history (newest first) |
| POST | /admin/archive | Move all messages to cold storage |

## Next Steps

### Immediate

1. **Ollama support (local inference)** — Privacy-first, free local models
   - Why: No data leaves machine, no API costs, no provider logging
   - Target model: `llama3.2:8b`
   - Hardware: M1 Pro 16GB ✓
   - Implementation:
     - [ ] `OllamaClient` implementing `LLMClient` protocol
     - [ ] Config: `LLM_PROVIDER=ollama`, `OLLAMA_MODEL`, `OLLAMA_BASE_URL`
     - [ ] Update factory in `dependencies.py`
     - [ ] Test with fake (no Ollama required for CI)

### Deployment

1. **Deploy frontend to Vercel** — Push `web/` directory
2. **Deploy backend** — Railway, Fly.io, or other container host
3. **Set production API URL** — Update `NEXT_PUBLIC_API_URL` in Vercel

### Future Enhancements

- [ ] **Conversation context** — Pass recent history to LLM for context-aware responses
- [ ] **Message validation** — Reject empty or overly long messages (add `min_length`/`max_length` to schema)
- [ ] **Rate limiting** — Prevent API abuse
- [ ] **Admin auth** — Protect `/admin/archive` with API key header
- [ ] **Search endpoint** — Full-text search across message history
- [ ] **Export endpoint** — Download conversation as JSON/Markdown
- [ ] **Health check** — `GET /health` for container orchestration
- [ ] **Streaming responses** — SSE for real-time Claude output

## Running Locally

### Backend

```bash
# Install dependencies
uv sync

# Create .env
cp .env.example .env
# Edit .env — set LLM_PROVIDER and API key (GEMINI_API_KEY or ANTHROPIC_API_KEY)

# Run tests (no API key needed)
uv run pytest -v

# Start server
uv run uvicorn app.main:app --reload

# Open Swagger UI
open http://localhost:8000/docs
```

### Frontend

```bash
cd web
npm install
npm run dev
# Open http://localhost:3000
```

### LLM Provider Configuration

Set in `.env`:
```bash
LLM_PROVIDER=gemini          # or "anthropic"
GEMINI_API_KEY=your-key      # Get from https://aistudio.google.com/apikey
GEMINI_MODEL=gemini-2.5-flash

# Or for Anthropic:
# LLM_PROVIDER=anthropic
# ANTHROPIC_API_KEY=sk-ant-...
# ANTHROPIC_MODEL=claude-sonnet-4-20250514
```

## Running with Docker

```bash
docker compose up --build
# API at http://localhost:8000
# SQLite persisted in ./data/
```

---

## Frontend — Vercel App

### Approach

Build a minimal chat interface using **Next.js 15** (App Router) deployed to Vercel. The frontend will be a separate project in a `web/` directory, connecting to the FastAPI backend.

### Tech Stack

- **Next.js 16.1** — Latest stable with App Router, React 19.2, View Transitions, `use cache` directive
- **TypeScript** — Type safety
- **Tailwind CSS v4** — Styling (latest version)
- **Vercel** — Deployment (zero-config for Next.js)

### Features (MVP)

1. **Chat interface** — Single page with message input and conversation display
2. **Message history** — Load previous messages on page load, infinite scroll for older messages
3. **Real-time feel** — Optimistic UI updates while waiting for Claude response
4. **Loading states** — Show typing indicator while Claude responds
5. **Responsive design** — Works on mobile and desktop

### Pages/Routes

| Route | Description |
|-------|-------------|
| `/` | Main chat interface |

### Components

```
web/
├── app/
│   ├── layout.tsx          # Root layout with metadata
│   ├── page.tsx            # Chat page (Server Component wrapper)
│   └── globals.css         # Tailwind imports
├── components/
│   ├── chat.tsx            # Main chat container (Client Component)
│   ├── message.tsx         # Single message bubble
│   ├── message-input.tsx   # Input form with send button
│   └── loading-indicator.tsx
├── lib/
│   ├── api.ts              # API client for backend calls
│   └── types.ts            # TypeScript types matching backend schemas
└── next.config.ts
```

### API Integration

The frontend needs to call the FastAPI backend. Options:

1. **Direct calls** — Frontend calls backend API directly (requires CORS on backend)
2. **Next.js API routes as proxy** — Frontend calls Next.js API routes, which proxy to backend

Going with **Option 1** (direct calls) for simplicity. Will add CORS middleware to FastAPI.

### Environment Variables

```
NEXT_PUBLIC_API_URL=http://localhost:8000  # Dev
NEXT_PUBLIC_API_URL=https://api.example.com  # Prod
```

### Implementation Order

1. Add CORS to FastAPI backend
2. Scaffold Next.js 15 app with TypeScript + Tailwind
3. Create API client (`lib/api.ts`)
4. Build message components
5. Build chat page with message history loading
6. Add message sending with optimistic updates
7. Add infinite scroll for history pagination
8. Deploy to Vercel

### Backend Changes Required

- Add `fastapi.middleware.cors.CORSMiddleware` to allow frontend origin
- Consider adding `GET /health` endpoint for monitoring

---

## Architecture Notes

- **Protocols over concrete classes** — Route handlers depend on `MessageStore` and `LLMClient` protocols, not concrete implementations. This enables testing with fakes and swapping providers.
- **Multi-provider LLM** — Factory function `create_llm_client()` selects Gemini or Anthropic based on `LLM_PROVIDER` env var. Easy to add more providers.
- **Dependency injection via FastAPI** — `Depends(get_message_store)` allows swapping implementations at runtime or in tests via `app.dependency_overrides`.
- **Cursor pagination** — Uses ISO 8601 timestamps as cursors. They sort lexicographically, so `WHERE timestamp < cursor` works correctly.
- **Atomic archive** — Uses SQLite transaction: INSERT SELECT + DELETE wrapped in BEGIN/COMMIT.
- **Async everywhere** — `aiosqlite` for DB, `run_in_executor` for sync LLM SDKs.

# Architecture & Phase Plan

## Core Principles
- Clean, layered modules (`routes -> controllers -> services -> models`)
- Secure-by-default middleware stack
- Role-driven authorization boundaries
- Feature modules for independent scaling (`auth`, `exam`, `coding`, `ai`, `realtime`)
- API-first integration contract for React client

## Folder Structure

```text
project/
  backend/src/
    config/ constants/ controllers/ middlewares/ models/ routes/ services/ sockets/ modules/
  frontend/src/
    app/ components/ features/ layouts/ pages/ services/ styles/
```

## Phase 1 Decisions (Implemented)
- JWT access token + refresh token cookie strategy
- Input validation with `express-validator`
- Password hashing with `bcryptjs`
- XSS + NoSQL injection protection middleware
- Centralized error handling and standardized API shape

## Phase 2 Decisions (Implemented)
- Redux Toolkit for auth/session state
- Axios interceptors for transparent token refresh
- Route-level RBAC with protected route wrapper
- Tailwind + Framer Motion for SaaS-style responsive UI

## Phase 3–8 (Shipped)

See [docs/PHASES_3_8.md](../docs/PHASES_3_8.md) for the full breakdown. Highlights:

- Exam engine analytics, teacher reporting, server-synced timers
- Judge0-backed coding execution + Monaco workspace + plagiarism hooks
- AI inference layer (OpenAI optional) + weak-topic recommendations
- Socket.IO collaboration + Redis-ready caching + production Docker/CI/nginx samples

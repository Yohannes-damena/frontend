# Adwa Non-Mobile Platform Scope

This document consolidates all work that is **not mobile application implementation** from:

- `backend-implementation-plan.md`
- `design.md`

It is intended as the shared reference for backend, admin web, platform, and operations workstreams.

## 1) Scope Included vs Excluded

Included here:

- Backend architecture, API contracts, auth, data model, tenancy, AI/TTS pipeline
- Admin dashboard product scope and role model
- Cost/abuse controls, testing strategy, deployment, and implementation phases
- SaaS boundaries and open backend/platform questions

Explicitly excluded here:

- Visitor mobile UX journeys and screen-by-screen UI specs
- Mobile navigation, widgets, animations, and visual implementation details
- Flutter-specific implementation tasks

## 2) Product and Platform Intent

The platform serves multiple museums from one backend deployment with strict tenant isolation. Two product surfaces rely on the same backend:

- Visitor client consumes public museum content and grounded AI responses
- Admin web app manages museums, rooms, items, narration, and operations

Core quality goals:

- **Tenant isolation first**: museum admins never access another museum's data
- **Historical answer fidelity**: grounded responses only; fail visibly rather than fabricate

## 3) Admin Product Scope (Web)

Frontend experience and phased delivery are specified in [`admin-web-design.md`](admin-web-design.md). This section remains a platform capability summary.

From `design.md` and backend contract:

- JWT-based admin authentication with role separation:
  - `SYSTEM_ADMIN`
  - `MUSEUM_ADMIN`
- Museum lifecycle management (create, activate/suspend)
- Museum-level configuration:
  - Ticket validation URL
  - AI system prompt/persona
  - Default TTS voice
- Content authoring:
  - Room CRUD + sequencing constraints
  - Item CRUD + ordering
  - Draft/publish style operational flow support
- Operational visibility:
  - Visitor/ticket visibility and exports
  - Traffic and content engagement metrics
  - Prompt review for unanswered/flagged AI queries

## 4) Backend Architecture and Stack

Primary stack (`backend-implementation-plan.md`):

- Node.js + Express + TypeScript (strict)
- PostgreSQL + Prisma
- Zod-based validation (also for OpenAPI generation)
- JWT auth + bcrypt
- Pino structured logging
- Vitest + Supertest integration tests
- Render deployment + managed Postgres
- Provider adapters for LLM, TTS, and object storage

Architecture model:

- One multi-tenant backend service
- No third-party API keys in mobile or admin clients
- All provider credentials and calls owned server-side

## 5) Data Model (Non-Mobile Concern)

Core entities:

- `Museum` (tenant root, status, ticket config, AI persona, default voice)
- `AdminUser` (roles and museum scope)
- `Room` (story order, overview text, narration script, sequencing)
- `Item` (grounding content and display order)
- `ChatAnswer` (answer cache + audio linking)
- `AudioAsset` (TTS dedupe/content-addressed cache)
- `AdminAuditLog` (write-path traceability)

Key invariants:

- Room IDs globally unique for QR-addressable lookup
- Cross-tenant writes blocked by DB-resolved scope, never request-claimed scope
- Room sequence cannot cross museums or form cycles
- Suspended museums are hidden from public read surfaces

## 6) API Surface (Platform Contract)

Public/visitor-facing backend endpoints:

- `GET /waypoint/:id`
- `POST /chat`
- `GET /museums/:slug`
- `GET /narrate/room/:roomId`
- `GET /narrate/answer/:answerId`
- `POST /tickets/validate`

Admin/auth endpoints:

- `POST /admin/login`
- `/admin/museums*` (role/scoped access)
- `/admin/rooms*` (scoped)
- `/admin/items*` (scoped)
- `POST /admin/narrate`

Error contract:

- Non-2xx envelope contains machine code + request ID
- Structured status/code semantics for validation, auth, conflict, rate-limiting, and upstream failures

## 7) AI, Grounding, and Narration Pipeline

Backend AI requirements:

- Answers grounded only in museum content (item detail or room context)
- Matched item IDs validated against real room items
- On upstream failure, return explicit backend failure (no fabricated fallback)

Narration and audio model:

- `/chat` returns text response and `audioUrl` handle (audio streamed separately)
- Content-addressed TTS caching via `AudioAsset`
- Object storage required (no runtime local disk persistence)
- Offline pre-generation for room narration scripts where possible

## 8) Security, Cost, and Abuse Controls

Security and isolation controls:

- Role middleware + museum scope middleware on every admin path
- Suspension checks enforced on active admin tokens
- Strict route validation and bounded request sizes

Cost and abuse controls:

- Route-specific rate limits
- 24h answer caching for repeated questions
- TTS dedupe for identical text/voice/model tuples
- Input caps and LLM output caps
- Provider timeout/retry/circuit breaker pattern
- Spend attribution through structured usage logs

## 9) Testing and Quality Gates

Primary strategy:

- Integration tests against real throwaway Postgres
- Automated tenant-isolation matrix in CI (cross-tenant read/write attempts)
- Chat behavior tests (cache, malformed model output, stale item fallback)
- Provider resilience tests (timeouts/retries/circuit breaker)
- Manual fact-fidelity reviews for historically sensitive generated responses

## 10) Delivery Roadmap (Non-Mobile Tracks)

Phased backend/platform progression:

1. Contract + skeleton + OpenAPI + mock server
2. Foundation (DB, errors, logging, health, env)
3. Seed + visitor read path
4. Auth and authorization middleware
5. Admin write path + audit + isolation matrix
6. Provider adapters and resilience wrappers
7. Chat grounding + cache
8. Narration/audio pipeline + storage
9. Ticket validation + stub strategy
10. Hardening, load testing, deployment verification

## 11) Deployment and Operations

Deployment baseline:

- Render web service + managed Postgres
- Migrations on deploy
- External object storage for generated audio
- Secrets only in environment configuration
- Health endpoint validates DB round-trip

## 12) Out-of-Scope (Platform v1)

Non-mobile out-of-scope items captured from specs:

- Museum billing/subscription enforcement implementation
- Visitor account system
- Multi-language backend model expansion
- Realtime voice websocket assistant
- Multi-turn conversation memory
- Full production ticketing vendor integration (stub-first)
- Password reset/MFA/email verification

## 13) Open Platform Decisions

Decisions that impact non-mobile execution:

- Final LLM provider/model choice for production quality/cost
- S3-compatible object storage vendor choice
- Legacy QR migration strategy (`legacyId` resolution needs)
- Museum-specific voice configuration strategy
- Production traffic assumptions for rate-limit tuning and load tests

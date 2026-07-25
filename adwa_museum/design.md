# Adwa Museum Management SaaS - Design Specification

This document is the implementation contract for product, design, mobile, web, and backend teams.
It is intentionally UX-first: user outcomes and journeys come before technical detail.

---

## Table of Contents

1. Product Vision and Outcomes
2. Product Surfaces
3. Core Visitor Journeys
4. Visitor App UX Blueprint
5. Design System Foundations
6. Components and Motion
7. AI Tour Guide Experience
8. Admin Dashboard Product Scope
9. Platform Architecture and Data
10. API Reference
11. SaaS Model and Scope Boundaries

---

## 1) Product Vision and Outcomes

Adwa is a white-label museum SaaS platform: museums manage content once, then instantly deliver a premium AI-guided visitor experience.

### North-star outcomes

- Visitors feel guided by a knowledgeable companion, not a software flow.
- Museums launch and operate without building custom apps.
- AI responses remain grounded in museum-authored content.
- Multi-tenant architecture keeps museum data isolated and secure.

---

## 2) Product Surfaces

| Surface | Primary user | Technology |
|---|---|---|
| Visitor App | Museum visitors | Flutter (iOS + Android + Web) |
| Admin Dashboard | Curators and museum staff | React web app |
| Backend API | Both clients + AI/TTS services | Node.js + Express |

Guiding architecture rule: clients only call Adwa backend APIs; third-party services are backend-only.

---

## 3) Core Visitor Journeys

These journeys are P0 and block all lower-priority features.

### 3.1 Guiding Loop (Primary)

```
Scan room QR
  -> Hear short room overview
  -> View room items
  -> Explore item details or ask questions
  -> Hear direction to next room
  -> Scan next room QR
```

- Optimized for low friction: no login, no account, ticket only.
- Works offline after required content is downloaded.

### 3.2 Exploration Loop (Nested)

```
Tap item OR ask question
  -> Backend grounds answer in room/item content
  -> Return text + optional matched item image
  -> Visitor asks follow-up or returns to room
```

- P0: tap + text interactions.
- P1: realtime voice conversation.

---

## 4) Visitor App UX Blueprint

### 4.1 Navigation map

```
/welcome -> /validate -> /affirmation -> /home
                 |                         |
              QR or OTP                 /map /museums /profile
```

### 4.2 Screen requirements

#### Welcome (`/`)
- Cinematic dark-first entry with staggered reveal: logo, title, tagline, CTA.
- Single primary CTA: `Enter Gallery`.
- No account sign-in; moves directly to validation.

#### Validate (`/validate`)
- Two paths with equal visual priority: QR scan and OTP.
- QR path: framed target zone + moving scan line feedback.
- OTP path: registered phone, send code cooldown, 6-digit auto-advance input.
- Validation errors are explicit and animated.

#### Affirmation (`/affirmation`)
- Success state with celebratory but restrained motion.
- Auto-progress to Home with skip-on-tap.

#### Home (`/home`)
- Main hub with greeting, featured active card, and upcoming cards.
- Always-on footer navigation.

#### Map (`/map`)
- Nearby venues map with active location card and list fallback.

#### Museums (`/museums`)
- Discovery list with search and clear active/inactive card distinction.

#### Profile (`/profile`)
- Pass summary, visit history, saved works, and end-session control.

#### Footer navigation
- Five tabs: Home, Map, Scan, Browse, Profile.
- Scan is elevated as the central high-attention action.

---

## 5) Design System Foundations

## Palette Lock (Do Not Change Hex Values)

The following palette is locked and must remain aligned with `lib/theme/app_colors.dart`.
Only usage can evolve; base values cannot.

### 5.1 Core palette

| Token | Hex | Role |
|---|---|---|
| `gold` | `#C08A2E` | Primary accent - CTAs, active icons, progress, play buttons |
| `deepRed` | `#7F1425` | Secondary accent - error states, end session, brand emphasis |
| `ember` | `#8C3B3B` | Tertiary - inactive card backgrounds, warm depth layers |
| `darkGray` | `#383838` | Primary background - all screens |
| `parchment` | `#F0E6D2` | Primary surface - active cards, main text, high-contrast |
| `white` | `#FFFFFF` | Text on dark, inactive icons |
| `ink` | `#383838` | Text on light surfaces (same value as darkGray intentionally) |
| `panelDark` | `#2B2B2B` | Card/panel backgrounds, footer bar |

### 5.2 Derived tokens

| Token | Value | Usage |
|---|---|---|
| `goldGlow` | gold @ 20% | Glow shadows, focus rings |
| `darkOverlay` | darkGray @ 80% | Image overlays, modal backdrops |
| `parchmentMuted` | parchment @ 60% | Disabled text, placeholders |
| `emberSubtle` | ember @ 10% | Background tints, hover states |

### 5.3 Typography

| Family | Role | Weights |
|---|---|---|
| Cormorant | Display and headings | 400, 600, 700 |
| Open Sans | UI and body | 300, 400, 500, 600 |

| Token | Family | Size | Weight | Usage |
|---|---|---|---|---|
| `hero` | Cormorant | 36pt | 700 | Hero headings |
| `screen` | Cormorant | 28pt | 600 | Screen titles |
| `section` | Cormorant | 22pt | 600 | Section headings |
| `card` | Cormorant | 18pt | 400 | Card titles |
| `body` | Open Sans | 16pt | 400 | Body text |
| `secondary` | Open Sans | 14pt | 400 | Secondary text |
| `button` | Open Sans | 16pt | 600 | Button labels |
| `caption` | Open Sans | 13pt | 300 | Captions and metadata |
| `footer` | Open Sans | 11pt | 500 | Footer tabs |
| `overline` | Open Sans | 10pt | 600 | Uppercase overlines, letter spacing 3pt |

---

## 6) Components and Motion

### 6.1 Card system

#### ActiveCard
- Background: `parchment`
- Radius: 16pt
- Padding: 24pt
- Content order: overline -> title -> body -> trailing action/progress

#### InactiveCard
- Background: `ember` at 70%
- Radius: 12pt
- Padding: 16pt
- Scale: 0.95, left-aligned

### 6.2 Motion principles

- Motion should clarify state change, never distract.
- Keep easing and timing consistent across screens.

| Context | Animation | Duration |
|---|---|---|
| Welcome reveal | Staggered fade-up | 600ms each, 150ms interval |
| Validate scanner | Sweep line loop | 1200ms |
| Validate error | Slide-up feedback | 250ms |
| Affirmation success | Check draw + text + progress | 600ms to 2500ms |
| Navigation | Screen fade transition | 350ms |

---

## 7) AI Tour Guide Experience

### 7.1 Grounding contract

The `/chat` endpoint must answer only from provided museum content.

- Item-specific mode: grounded in selected item detail text.
- Room-open mode: grounded in room overview plus room item set.
- Matched item IDs must be validated against real room items.

### 7.2 Response quality and safety

- Return explicit uncertainty when source text does not contain the answer.
- If upstream fails, return clear failure state (prefer visible failure over fabricated answer).

### 7.3 TTS behavior

- ElevenLabs model: `eleven_flash_v2_5`.
- Chat answers: low-latency streamed output.
- Room overview narration: pre-generated and stored, not live-rendered on request path.

---

## 8) Admin Dashboard Product Scope

### 8.1 Authentication and roles
- JWT auth (12h expiry).
- Roles: `SYSTEM_ADMIN`, `MUSEUM_ADMIN`.

### 8.2 Museum management
- Create/activate/suspend museums.
- Configure ticket validation URL per museum.

### 8.3 Content management
- Rooms: create, reorder, update, QR generation, audio management.
- Items: create, update, delete, and preview.
- Draft and publish flow.

### 8.4 Operations and analytics
- Visitor/ticket visibility and export.
- Traffic, room popularity, dwell time, completion rate, peak hours, and question logs.

### 8.5 AI configuration
- Per-museum guide tone/persona.
- Scope what content AI may discuss.
- Review flagged/unanswered prompts.

---

## 9) Platform Architecture and Data

### 9.1 System topology

```
Visitor Flutter App <-> Backend API <-> Postgres
                              |
                              +-> Addis AI
                              +-> ElevenLabs
Admin React Dashboard <------>|
```

### 9.2 Multi-tenancy rules

1. Museum-scoped admins only access their museum resources.
2. Resource museum ownership is resolved server-side, never trusted from request body.
3. Suspended museums resolve as not found to visitor surfaces.
4. Inter-room links (`nextRoomId`) must stay inside the same museum.

### 9.3 Data model summary

- `Museum`: tenant root, status, ticket config.
- `AdminUser`: role-based admin identity.
- `Room`: ordered story node + optional pre-generated audio.
- `Item`: grounded knowledge unit for AI answers.

---

## 10) API Reference

### 10.1 Visitor-facing routes (public)

| Method | Route | Purpose |
|---|---|---|
| `GET` | `/waypoint/:id` | Fetch room and items by room UUID |
| `POST` | `/chat` | Return grounded AI answer |
| `POST` | `/narrate` | Generate TTS |
| `POST` | `/tickets/validate` | Validate ticket if configured |

### 10.2 Admin routes (JWT)

| Method | Route | Scope |
|---|---|---|
| `POST` | `/admin/login` | Public auth entry |
| `GET/POST/PATCH` | `/admin/museums*` | System admin + scoped actions |
| `GET/POST/PATCH` | `/admin/rooms*` | Scoped museum admin |
| `GET/POST/PATCH` | `/admin/items*` | Scoped museum admin |

### 10.3 Error shape

```json
{ "error": { "message": "human-readable", "code": "MACHINE_READABLE_CODE" } }
```

Standard semantics: `400`, `401`, `403`, `404`, `502`.

---

## 11) SaaS Model and Scope Boundaries

### 11.1 Subscription tiers

| Tier | Museums | Rooms | Items | AI Chat | Analytics |
|---|---|---|---|---|---|
| Free | 1 | 5 | 20 | 100 questions/month | Basic |
| Pro | 3 | Unlimited | Unlimited | Unlimited | Full |
| Enterprise | Unlimited | Unlimited | Unlimited | Unlimited | Full + export |

White-label branding remains an Enterprise add-on.

### 11.2 Explicit out-of-scope (v1)

- Visitor account system and login.
- Multi-language support.
- Realtime websocket voice assistant.
- Live third-party ticketing integration (stubbed for now).
- Billing enforcement logic.
- Runtime image generation and runtime web ingestion.

---

## Implementation Notes

- Keep this document synchronized with:
  - `lib/theme/app_colors.dart`
  - `lib/theme/app_theme.dart`
- Any update to palette tokens must be treated as a breaking design-system change.

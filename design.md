# Adwa Museum Management SaaS — Design Document

A complete product and technical design for the Adwa museum management platform. This covers
the full system: the Flutter visitor app, the admin web dashboard, the backend API, the AI tour
guide layer, and the multi-tenant SaaS architecture. Every team member (mobile, backend, web,
design) can use this as their single source of truth.

---

## 1. Product Vision

Adwa is a **white-label museum SaaS** — a platform that any museum can join, manage their
content through a web dashboard, and immediately offer visitors a premium AI-guided tour
experience on mobile without building their own app.

The product has three surfaces:

| Surface | Who uses it | Tech |
|---|---|---|
| **Visitor App** | Museum visitors | Flutter (iOS + Android + Web) |
| **Admin Dashboard** | Museum curators, staff | React web app |
| **Backend API** | Both surfaces + AI/TTS | Node.js + Express on Render |

The guiding principle: **visitors should never feel like they're using software**. The tour
should feel like a knowledgeable companion walking them through history.

---

## 2. The Two Core Loops

Everything in this product serves one of two loops. These are non-negotiable P0 features — no
other feature ships before these are solid.

### 2.1 The Guiding Loop (backbone)

```
Scan room QR code
  → Hear short spoken overview of the room (its place in the story)
  → See list of items in this room with images
  → Explore items (tap, ask, listen)
  → Hear "next, walk to Room X" at end of audio
  → Scan next room's QR code
```

This loop works entirely offline once content is loaded. The QR code is the only input — no
login, no account, no friction.

### 2.2 The Exploration Loop (nested inside each room)

```
Tap an item → see detail + image
  OR
Ask freely ("what's that drum for?") → backend identifies the item + answers

→ Get spoken + written answer, grounded ONLY in that room's real content
→ If an item was matched, show its image alongside the answer
→ Ask a follow-up, or return to the room overview
```

The exploration loop is P0 for **text + tap**. Realtime voice is P1.

---

## 3. Platform Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      VISITOR APP (Flutter)                   │
│  Welcome → Validate → Affirmation → Home → Map → Browse     │
│  Profile | QR Scanner | AI Chat | Audio Player              │
└──────────────────────────┬──────────────────────────────────┘
                           │  REST
┌──────────────────────────▼──────────────────────────────────┐
│                    BACKEND API (Express)                     │
│  GET /waypoint/:id    POST /chat    POST /narrate            │
│  POST /tickets/validate    Admin routes (/admin/*)           │
└────────┬─────────────────┬──────────────────┬───────────────┘
         │                 │                  │
   ┌─────▼───┐      ┌──────▼────┐      ┌──────▼───────┐
   │Addis AI │      │ElevenLabs │      │  Postgres    │
   │ (LLM,   │      │  (TTS,    │      │  (Prisma     │
   │  chat)  │      │ streamed) │      │   ORM)       │
   └─────────┘      └───────────┘      └──────────────┘

┌─────────────────────────────────────────────────────────────┐
│                   ADMIN DASHBOARD (React)                    │
│  Museum CMS | Room/Item builder | QR generator | Analytics  │
└──────────────────────────┬──────────────────────────────────┘
                           │  REST (JWT auth)
                    (same backend)
```

**Golden rule:** The Flutter app and the admin web app never call Addis AI, ElevenLabs, or any
third-party API directly. Every credential lives in the backend. Clients only ever talk to our
own API.

---

## 4. Visitor App — Screens & Flows

### 4.1 Screen Map

```
/welcome ──────► /validate ──────► /affirmation ──────► /home
                    │                                     │
                 QR Scan                               /map
                 OTP Entry                          /museums
                                                   /profile
```

### 4.2 Welcome Screen (`/`)

- Full-screen dark background with a radial ember gradient.
- Museum logo/wordmark fades in with a staggered animation sequence:
  logo → title → tagline → CTA button.
- Gold "Enter Gallery" CTA with a pulsing glow animation (infinite loop).
- Tapping CTA navigates to `/validate`.
- **No login required** — the ticket QR is the visitor's credential.

### 4.3 Validate Screen (`/validate`)

Two equal-weight tabs: **Scan QR** and **Enter Code**.

**QR Tab:**
- Live camera preview occupying the full card.
- Animated scan sweep line (continuous animation, 1200ms loop).
- Four gold corner brackets define the scan target zone.
- Instructional overline: `ALIGN QR CODE WITHIN FRAME`.
- On successful scan → navigate to `/affirmation`.

**OTP Tab:**
- Registered mobile number field with `REGISTERED MOBILE` overline label.
- `SEND CODE` button (active only when ≥6 digits entered).
- 60-second cooldown timer after sending — button shows `{n}s` countdown.
- 6-digit OTP input boxes — auto-focus advances on each digit, backspace retreats.
- Auto-submits on last digit entry → navigate to `/affirmation`.
- Invalid OTP → animated deep red error bar slides in at the bottom.

### 4.4 Affirmation Screen (`/affirmation`)

- Animated stroke-drawn gold checkmark (600ms ease-out draw animation).
- Gold particle burst (12 particles, 1500ms) radiates from centre.
- "Welcome to the Museum" text fades up (400ms delay after checkmark).
- "Your journey begins now" subtitle fades in (300ms interval after primary text).
- Gold progress bar fills over 2500ms, then auto-navigates to `/home`.
- Tapping anywhere skips straight to `/home`.

### 4.5 Home Screen (`/home`)

The main hub. Layout top-to-bottom:

1. **Header bar** — visitor avatar circle (left), "THE GALLERY" wordmark (centre), spacer (right).
2. **Greeting** — "WELCOME BACK" overline in gold + "Today's Journey" hero heading (Cormorant, 36pt).
3. **Featured ActiveCard** — parchment background, gold tag, exhibition title + description,
   gold play button + "BEGIN TOUR" label, "01 / 12" progress indicator.
4. **"UP NEXT" section** — overline label + stack of `InactiveCard` widgets (ember bg, 95% scale).
5. **FooterNav** — persistent across all tab screens.

### 4.6 Map Screen (`/map`)

- Header with back button and "NEARBY" label.
- Custom-painted stylized map (dark grid lines on darker background).
- Positioned gold pin markers with a glow blur shadow. Each pin shows a museum name label.
- "You Are Here" info card at the bottom: museum name + distance + "OPEN NOW" status badge.
- Scrollable venue list below the map (name + distance + city).
- FooterNav with Map tab active.

### 4.7 Museums Screen (`/museums`)

- "DISCOVER MUSEUMS" screen header.
- Search bar (rounded, dark fill, magnifier icon).
- Scrollable list of museum cards:
  - **First card (active style)**: parchment background, full info, gold CTA.
  - **Subsequent cards (inactive style)**: ember background, 95% scale.
- Each card shows: city tag, museum name, pieces count, "PERMANENT COLLECTION" or custom tag.
- FooterNav with Browse tab active.

### 4.8 Profile Screen (`/profile`)

- "YOUR PROFILE" header.
- **All-Access Pass card** — dark panel with visitor name, ticket ID, admission type,
  and 3 stat bubbles (Visits, Exhibits, Hours).
- **Visit History** section — chronological list with museum name, date, stops completed.
- **Saved Works** section — list with item name, artist, museum name.
- "END SESSION" button at bottom — outlined deep red, navigates back to `/welcome`.
- FooterNav with Profile tab active.

### 4.9 Footer Navigation

Five tabs (left to right): Home | Map | **Scan** | Browse | Profile.

- Active tab label and icon are gold. Inactive labels are parchment at 70% opacity.
- **Scan tab** (index 2) is visually elevated: 56×56 gold circle, raised 16px above the bar,
  `qr_code_scanner` icon, gold glow shadow (blurRadius: 16).
- The footer persists across all five tabs via `IndexedStack` in `_MainShell`.

---

## 5. Color Palette

| Token | Hex | Role |
|---|---|---|
| `gold` | `#C08A2E` | Primary accent — CTAs, active icons, progress, play buttons |
| `deepRed` | `#7F1425` | Secondary accent — error states, end session, brand emphasis |
| `ember` | `#8C3B3B` | Tertiary — inactive card backgrounds, warm depth layers |
| `darkGray` | `#383838` | Primary background — all screens |
| `parchment` | `#F0E6D2` | Primary surface — active cards, main text, high-contrast |
| `white` | `#FFFFFF` | Text on dark, inactive icons |
| `ink` | `#383838` | Text on light surfaces (same value as darkGray intentionally) |
| `panelDark` | `#2B2B2B` | Card/panel backgrounds, footer bar |

**Derived tokens:**

| Token | Value | Usage |
|---|---|---|
| `goldGlow` | gold @ 20% | Glow shadows, focus rings |
| `darkOverlay` | darkGray @ 80% | Image overlays, modal backdrops |
| `parchmentMuted` | parchment @ 60% | Disabled text, placeholders |
| `emberSubtle` | ember @ 10% | Background tints, hover states |

---

## 6. Typography

Two font families, loaded via `google_fonts`:

| Family | Role | Weights used |
|---|---|---|
| **Cormorant** | Display / headings — titles, card headlines, museum names | 400, 600, 700 |
| **Open Sans** | UI / body — labels, descriptions, overlines, captions | 300, 400, 500, 600 |

**Type scale:**

| Name | Family | Size | Weight | Use |
|---|---|---|---|---|
| `hero` | Cormorant | 36pt | 700 | Screen hero headings |
| `screen` | Cormorant | 28pt | 600 | Screen titles |
| `section` | Cormorant | 22pt | 600 | Section headings |
| `card` | Cormorant | 18pt | 400 | Card titles |
| `body` | Open Sans | 16pt | 400 | Primary body text |
| `secondary` | Open Sans | 14pt | 400 | Secondary body text |
| `button` | Open Sans | 16pt | 600 | Button labels |
| `caption` | Open Sans | 13pt | 300 | Captions, metadata |
| `footer` | Open Sans | 11pt | 500 | Footer tab labels |
| `overline` | Open Sans | 10pt | 600 | Section overlines (UPPERCASE, ls: 3pt) |

---

## 7. Card System

### ActiveCard (Featured / Current)

- Background: `parchment`
- Border radius: 16pt
- Padding: 24pt all
- Box shadow: `rgba(0,0,0,0.25)` blur 24, offset (0, 8)
- Content order: gold overline tag → Cormorant title → Open Sans body → trailing widget
- Trailing widget slot: play button + progress counter

### InactiveCard (Upcoming / Queued)

- Background: `ember` @ 70%
- Border radius: 12pt
- Padding: 16pt all
- Box shadow: `rgba(0,0,0,0.15)` blur 12, offset (0, 4)
- Transform: `scale(0.95)`, aligned left
- Content: Cormorant title + Open Sans body at 70% opacity

---

## 8. Animations

| Screen | Element | Animation | Duration | Curve |
|---|---|---|---|---|
| Welcome | Logo, title, tagline, CTA | Staggered fade-up | 600ms each, 150ms interval | easeOut |
| Welcome | Gold CTA glow | Infinite pulse (scale 1.0→1.08) | 1800ms | easeInOut |
| Validate | Scan sweep line | Translate Y top→bottom | 1200ms loop | linear |
| Validate | Error bar | Slide up | 250ms | easeOut |
| Affirmation | Checkmark stroke | Path draw | 600ms | easeOut |
| Affirmation | Particle burst | Expand + fade | 1500ms | easeOut |
| Affirmation | Text entrance | Fade + slide up | 800ms | easeOut |
| Affirmation | Progress bar | Linear fill | 2500ms | linear |
| App-wide | Screen transitions | Fade | 350ms | linear |

---

## 9. AI Tour Guide Layer

### 9.1 Chat Grounding

The `/chat` endpoint always answers from content, never from the model's training knowledge.

**Case A — Item specified (visitor tapped an item first):**
1. Fetch item by `itemId`, confirm it belongs to the room.
2. Send `question` + `item.detailText` to Addis AI.
3. System prompt: "Answer from the provided text only. 2–3 spoken-length sentences.
   If the content doesn't cover the question, say so explicitly."
4. Return `{ answer, matchedItemId: itemId, imageUrl: item.imageUrl }`.

**Case B — Free-form question (no item tapped):**
1. Fetch room's full item list (name + short description) and `roomOverviewText`.
2. Build single prompt: room overview + item list + visitor's question.
3. Instruct model to return structured JSON:
   `{ matchedItemId: string | null, answer: string }`.
4. Validate `matchedItemId` is a real item in this room (defend against hallucination).
5. Fetch `imageUrl` for matched item if any.
6. Return `{ answer, matchedItemId, imageUrl }`.

**No answer fabrication.** If the backend or model call fails, return 502 and show the
visitor a clear "couldn't get an answer, try again" state. A visible failure is better than
a silently wrong one at a memorial museum.

### 9.2 Audio (TTS)

- Model: `eleven_flash_v2_5` (ElevenLabs) — optimized for low latency.
- **Chat answers**: streamed response (don't wait for full file before returning audio).
- **Room overview narration**: generated once offline, stored as an `mp3` URL on the room record.
  Not generated live on any user-facing request path.

### 9.3 Voice Input (P1)

- On-device transcription via the platform's native speech recognition.
- No server-side STT for English. If Amharic support is re-introduced, add `POST /transcribe`
  routed to Addis AI — this is the only change needed to re-enable it.

---

## 10. Admin Dashboard — Features

### 10.1 Authentication
- Email + password login → JWT (12h expiry).
- Two roles: `SYSTEM_ADMIN` (full access, all museums) and `MUSEUM_ADMIN` (scoped to one museum).
- No self-serve signup — accounts created by system admin or via onboarding flow.

### 10.2 Museum Management (SYSTEM_ADMIN only)
- List all museums with status badges (Active / Suspended).
- Create new museum — bootstraps the museum record + its first `MUSEUM_ADMIN` account atomically.
- Activate / suspend a museum (suspended museums return 404 to visitors).
- Set `ticketValidationUrl` per museum (nullable — absence means no ticket gate).

### 10.3 Content Management (MUSEUM_ADMIN)

**Rooms:**
- Create, reorder, and edit rooms.
- Fields: title, story order, room overview text, next room pointer.
- Upload or generate room overview audio.
- Generate and download QR code for each room.

**Items (within a room):**
- Create, edit, delete items.
- Fields: name, short description, detail text, image URL.
- Preview how the item will appear in the visitor app.

**Draft / Published states:**
- Content can be saved as draft before going live.
- A museum admin publishes when ready.

### 10.4 Visitor & Ticket Management
- Configure ticket validation URL (points at external ticketing vendor or the built-in stub).
- View live session count and capacity status.
- Export visitor data (CSV).

### 10.5 Analytics
- Visitor traffic (daily / weekly / monthly charts).
- Most visited rooms and exhibits (ranked).
- Average time spent per room.
- Tour completion rate (% of visitors who scanned all rooms).
- Peak hours heatmap.
- Chat questions log — see what visitors are actually asking.

### 10.6 AI Configuration
- Set AI guide persona/tone per museum.
- Configure which rooms/items the AI is allowed to discuss.
- Review flagged or unanswered questions.

---

## 11. Multi-Tenancy Model

### Tenant isolation rules (enforced at the API layer)

1. A `MUSEUM_ADMIN` token carries a `museumId`. Every write operation resolves the target
   resource's museum from the database — never from the request body.
2. A museum admin cannot read, write, or link to resources in another museum.
3. A `SYSTEM_ADMIN` token can act on any museum's resources (intentional — for support).
4. A suspended museum's rooms return 404 to visitors — indistinguishable from not existing.
5. `Room.nextRoomId` must always point to a room in the same museum.

### QR code design (tenant-agnostic on the visitor side)

Room IDs are globally unique UUIDs. A QR code encodes only the room ID. The visitor app
calls `GET /waypoint/:roomId` — the backend resolves which museum that room belongs to
internally. The visitor app never needs to know which museum it's inside.

This means the visitor-facing API surface is identical regardless of how many museums exist.

---

## 12. Ticket Validation Flow

**Museum with no `ticketValidationUrl` set (default):**
- `/tickets/validate` returns `{ valid: true, ticketRequired: false }` immediately.
- No gate, no friction. Works for open-access museums.

**Museum with `ticketValidationUrl` set:**
1. Visitor app calls `/tickets/validate` with `{ museumId, ticketCode }`.
2. Backend calls the configured URL server-side, maps the response to `{ valid: boolean }`.
3. Returns `{ valid, ticketRequired: true }` to the app.
4. On `valid: true` → proceed to Affirmation screen.
5. On `valid: false` → show "Ticket not recognized" error, stay on Validate screen.

**Client-side session flag:**
The app checks the ticket once per visit (not per room scan). After a valid check, a local
session flag prevents re-prompting at every QR scan within the same visit.

**Stub vendor (until a real vendor is chosen):**
Self-hosted `POST /stub-ticket-vendor` — checks the code against a hardcoded list of valid
demo codes. Swapping in a real vendor later only requires changing `ticketValidationUrl` in
the museum's config — no backend code changes.

---

## 13. Data Model Summary

```
Museum
  ├── id (UUID, PK)
  ├── name
  ├── slug (unique)
  ├── status (ACTIVE | SUSPENDED)
  ├── ticketValidationUrl (nullable)
  ├── AdminUsers[]
  └── Rooms[]

AdminUser
  ├── id
  ├── email (unique)
  ├── passwordHash
  ├── role (SYSTEM_ADMIN | MUSEUM_ADMIN)
  └── museumId (nullable — null for SYSTEM_ADMIN)

Room
  ├── id (globally unique UUID — encoded in QR)
  ├── museumId (FK)
  ├── storyOrder
  ├── title
  ├── roomOverviewText
  ├── roomAudioUrl (nullable — pre-generated MP3)
  ├── nextRoomId (nullable — FK to Room)
  └── Items[]

Item
  ├── id (UUID)
  ├── roomId (FK)
  ├── name
  ├── shortDescription
  ├── detailText (full historical content — the grounding source)
  └── imageUrl (nullable)
```

**Content budget:** 6–8 rooms × 3–4 items each = 20–30 `detailText` entries to author,
plus 6–8 room overviews. This is the total content surface the AI is grounded against.

---

## 14. API Surface Reference

### Visitor-facing (public, no auth)

| Method | Route | Description |
|---|---|---|
| `GET` | `/waypoint/:id` | Room + items by room UUID |
| `POST` | `/chat` | Grounded AI answer for a question |
| `POST` | `/narrate` | TTS audio generation |
| `POST` | `/tickets/validate` | Ticket check (museum-optional) |

### Admin (JWT required)

| Method | Route | Auth | Description |
|---|---|---|---|
| `POST` | `/admin/login` | — | Get JWT |
| `GET` | `/admin/museums` | SYSTEM | List all museums |
| `POST` | `/admin/museums` | SYSTEM | Create museum + first admin |
| `PATCH` | `/admin/museums/:id` | SYSTEM/SCOPED | Update status or ticket URL |
| `GET` | `/admin/rooms` | SCOPED | List rooms for a museum |
| `POST` | `/admin/rooms` | SCOPED | Create room |
| `PATCH` | `/admin/rooms/:id` | SCOPED | Update room |
| `GET` | `/admin/items` | SCOPED | List items for a room |
| `POST` | `/admin/items` | SCOPED | Create item |
| `PATCH` | `/admin/items/:id` | SCOPED | Update item |

### Error response shape (all routes)

```json
{ "error": { "message": "human-readable", "code": "MACHINE_READABLE_CODE" } }
```

| Code | Meaning |
|---|---|
| `400` | Malformed or missing fields |
| `401` | Missing or invalid auth token |
| `403` | Authenticated but wrong role or museum scope |
| `404` | Resource not found (or suspended museum) |
| `502` | Upstream third-party call failed |

---

## 15. SaaS Subscription Model

| Tier | Museums | Rooms | Items | AI Chat | Analytics | Price |
|---|---|---|---|---|---|---|
| **Free** | 1 | 5 | 20 | 100 questions/mo | Basic | $0/mo |
| **Pro** | 3 | Unlimited | Unlimited | Unlimited | Full | $49/mo |
| **Enterprise** | Unlimited | Unlimited | Unlimited | Unlimited | Full + export | Custom |

White-labeling (custom brand colors, logo in app) is an Enterprise add-on.

---

## 16. Out of Scope (v1)

These are deliberate cuts, not oversights. If re-introduced, the sections above note exactly
where each one plugs back in.

- Visitor accounts / login — visitors are anonymous; ticket validation is a one-time gate.
- Amharic / multi-language — no `language` field exists anywhere in v1.
- Realtime voice conversation (WebSocket agent) — chat is request/response, not a live session.
- Real ticketing vendor integration — stubbed until a vendor is selected.
- Billing / subscription enforcement in the backend — tracked but not enforced in v1.
- Image generation pipeline (Fal.ai) — run offline during content authoring; not a live route.
- Firecrawl content ingestion — offline tooling only; no runtime dependency.

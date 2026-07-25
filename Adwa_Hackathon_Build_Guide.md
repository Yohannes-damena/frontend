# Adwa AI Tour Guide — 24-Hour Hackathon Build Guide (v2)

A step-by-step build plan for the whole team, including exactly what to ask Cursor at each step.

**What changed in v2:** one QR code per room (not per item), an item list with images inside each room, free-form "what am I looking at" chat that identifies the item itself, image shown alongside answers, a realtime voice mode (English, via ElevenLabs Conversational AI), and an Amharic toggle (via Addis AI). The room-to-room chronological guiding is still the spine of the whole app — everything below hangs off it.

---

## 1. What We're Building

A Flutter mobile app that guides visitors through the Adwa Victory Memorial Museum **in the correct historical order**, room by room, while letting them go as deep as they want inside each room.

**The guiding loop (this is the backbone — never lose sight of it):**
Scan a room's QR code → hear a short spoken overview of the room and its place in the story → see a list of the items in that room → at the end of the room's audio, hear where to go next.

**The exploration loop (nested inside each room):**
Tap an item in the list → see its detail + image → ask a question about it by voice or text, either by tapping it first or just asking freely ("what's that drum for?") → get a spoken + written answer, grounded only in that room's real content, with the relevant image shown if applicable.

The guiding loop is P0. The exploration loop is P0 for text+tap, P1 for realtime voice and Amharic.

---

## 2. Architecture (v2)

```
Flutter App
   │
   ├── GET /waypoint/:id ───────────────► room overview + item list + next room
   │
   ├── POST /chat  {waypoint_id, item_id?, question, lang} ─► Addis AI (grounded answer,
   │                                                            item matching, translation)
   │                                                          ElevenLabs (English TTS)
   │                                                          Addis AI (Amharic TTS)
   │
   ├── POST /transcribe {audio, lang} ──► Wispr Flow (English) or Addis AI (Amharic)
   │
   └── GET /agent-session/:waypoint_id ─► ElevenLabs Conversational AI Agent
         (P1, English only, realtime, grounded via prompt override + client tool)
```

**Golden rule unchanged:** the Flutter app never calls Addis AI / ElevenLabs / Wispr Flow / Fal directly. It only ever talks to our own Express backend (or, for the P1 realtime agent, uses a short-lived token our backend issued — the API key still never touches the phone).

---

## 3. Team & Roles

| # | Name | Role |
|---|------|------|
| Dev 1 | | Backend (Express on Render) |
| Dev 2 | | Flutter UI/Screens |
| Dev 3 | | Flutter audio/QR integration |
| Dev 4 | | Content + AI grounding |
| Dev 5 | | Design + demo ops |

---

## 4. Data Model & API Contract (lock this in hour 1 — nobody codes before this exists)

### `waypoints.json` — one room = one waypoint = one QR code

```json
{
  "id": "wp3",
  "story_order": 3,
  "title": "Mobilization Hall",
  "room_overview_text": "This room covers how Ethiopian regions rallied their forces after the call to arms...",
  "room_audio_url": "https://.../wp3_overview.mp3",
  "next_waypoint_id": "wp4",
  "items": [
    {
      "id": "wp3_item1",
      "name": "Menelik's War Drum",
      "short_description": "A ceremonial drum used to summon regional forces.",
      "detail_text": "Full historical detail about the drum, its origin, its role in mobilization...",
      "image_url": "https://.../drum.png"
    },
    {
      "id": "wp3_item2",
      "name": "Empress Taytu's Letter",
      "short_description": "A letter demonstrating Taytu's role in strategy.",
      "detail_text": "Full historical detail about the letter...",
      "image_url": "https://.../letter.png"
    }
  ]
}
```

Budget for content: ~6-7 rooms × ~3-4 items each = roughly 20-25 pieces of `detail_text` to write/structure, plus 6-7 room overviews. Bigger content lift than a flat waypoint list — see Dev 4's steps for how to produce this fast.

### `GET /waypoint/:id`
Returns the full object above.

### `POST /chat`
Body: `{ "waypoint_id": "wp3", "item_id": null, "question": "what's this drum for?", "lang": "en" }`

`item_id` is **optional** — sent when the visitor tapped a specific item first, `null` when they just asked freely and the backend has to figure out what they mean.

Response:
```json
{
  "answer": "This drum was used to summon regional forces before the battle...",
  "matched_item_id": "wp3_item1",
  "image_url": "https://.../drum.png",
  "audio_url": "https://.../answer_123.mp3"
}
```

Backend logic (this is the important part — see Dev 1 Step 4):
1. If `item_id` is provided, ground the answer in that item's `detail_text` only.
2. If `item_id` is null, send the visitor's question **plus the list of item names + short_descriptions in that room** to Addis AI and ask it to (a) decide which item, if any, the question refers to, and (b) answer using only that item's `detail_text`, in one structured response.
3. If nothing matches a specific item, fall back to `room_overview_text`.
4. If nothing in the room's content covers it, say so — never invent an answer.
5. If `lang === "am"`, route the whole thing through Addis AI's Amharic chat/TTS instead of Addis AI-chat + ElevenLabs-TTS.

### `POST /transcribe`
Body: audio file (multipart/form-data, field `audio`) + `lang` field.
- `lang: "en"` → Wispr Flow
- `lang: "am"` → Addis AI STT

Returns: `{ "text": "..." }`

### `GET /agent-session/:waypoint_id` (P1 — realtime English mode only)v 4
Returns a short-lived ElevenLabs conversation token plus a prompt override string built from that room's `room_overview_text` and all its items' `detail_text` (see Dev 1 Step 8 and Dev 4 Step 6).

```json
{ "token": "...", "promptOverride": "You are a museum guide currently standing in Mobilization Hall..." }
```

---

## 5. Hour-by-Hour Timeline

| Hours | Milestone |
|---|---|
| 0–1 | Repo created, API contract (section 4) locked, Render + Flutter project both scaffolded |
| 1–4 | Dev 4 delivers first draft `waypoints.json` with rooms + items (mock data unblocks everyone else) |
| 4–14 | Backend routes go live one by one; Flutter screens (room overview, item list, item detail, chat) built against mock data, swapped to real API as routes land |
| 14–16 | **Checkpoint: full guiding loop works end to end** — scan every room's QR in order, hear overview, see item list, tap an item, get a grounded text+voice answer. If not hit, cut all P1 features now. |
| 16–21 | P1 polish only if checkpoint held, in priority order: (1) free-form item-matching in chat, (2) Amharic toggle via Addis AI, (3) realtime English agent via ElevenLabs |
| 21–22 | Feature freeze — bug fixes and polish only |
| 22–24 | Final release APK built, tested on 2 phones, demo rehearsed 3+ times, backup video recorded |

---

## 6. Accounts & API Keys Checklist

- [ ] Render account + new Web Service (Dev 1)
- [ ] Addis AI platform account + API key (Dev 1, Dev 4) — platform.addisassistant.com
- [ ] ElevenLabs account + API key (Dev 1) — includes Conversational AI Agent dashboard access for P1
- [ ] Wispr Flow API account + key (Dev 1) — platform.wisprflow.ai
- [ ] Firecrawl account + API key (Dev 4)
- [ ] Fal account + API key (Dev 5)
- [ ] `.env` template pushed to repo (keys filled locally, never committed) — Dev 1 owns this

`.env.example`:
```
ADDIS_AI_API_KEY=
ELEVENLABS_API_KEY=
WISPRFLOW_API_KEY=
FIRECRAWL_API_KEY=
FAL_API_KEY=
```

---

## 7. Dev 1 — Backend (Express + Render)

### Step 1 — Scaffold and deploy "hello world" (Hour 0–1)
Same as before: minimal Express app, `/health` route, deployed to Render immediately, URL shared with the team.

**Ask Cursor:** *"Create a minimal Express server with a `/health` GET route returning JSON status ok, CORS enabled, using dotenv for config, ready to deploy on Render with a start script."*

### Step 2 — Verify each API with a raw call first (Hour 1–2)
Same rule as always: curl the real API with the real key before writing any route against it. Do this for Addis AI (chat, TTS, STT, translation) and ElevenLabs (TTS) and Wispr Flow (STT).

### Step 3 — Build `GET /waypoint/:id` (Hour 2–3)
Reads the room object (with its nested `items` array) from `waypoints.json`.

**Ask Cursor:** *"Add a GET route `/waypoint/:id` that reads from a local waypoints.json file (an array of room objects, each with a nested items array) and returns the matching room object, or 404 if not found."*

### Step 4 — Build `POST /chat` with item matching (Hour 3–7)
This is the most important route in the app now. Two cases to handle:

**Ask Cursor (case 1 — item_id provided):** *"Write an Express POST route `/chat` that takes `{waypoint_id, item_id, question, lang}`. If item_id is provided, look up that item's detail_text from waypoints.json and send it plus the question to [Addis AI chat endpoint], with this instruction: 'Only answer using this content, and say you don't know if the answer isn't in it.' Return `{answer, matched_item_id: item_id, image_url}`."*

**Ask Cursor (case 2 — item_id is null):** *"Now extend this route: if item_id is null, instead build a prompt listing all items in that room (name + short_description) plus the room's overview text, and ask Addis AI to return structured JSON: `{matched_item_id_or_null, answer}`. Parse that response, look up the matched item's image_url if any, and return the same `{answer, matched_item_id, image_url}` shape. If Addis AI doesn't match any item, fall back to answering from room_overview_text instead."*

**Ask Cursor (language routing):** *"Add a `lang` parameter to this route. If lang is 'am', use Addis AI's Amharic chat and TTS endpoints for both the answer generation and audio; if 'en', use Addis AI (or your chosen provider) for the answer and ElevenLabs for TTS as before."*

### Step 5 — Build `POST /transcribe` with language routing (Hour 7–9)
Route to Wispr Flow for English, Addis AI STT for Amharic.

**Ask Cursor:** *"Add a POST route `/transcribe` using multer to accept an audio file plus a `lang` field. If lang is 'en', forward the file to [Wispr Flow's endpoint]. If lang is 'am', forward it to [Addis AI's STT endpoint] instead. Return `{text}` either way."*

### Step 6 — Build `POST /narrate` (Hour 9–10)
Same as before — wraps ElevenLabs for English, Addis AI TTS for Amharic. Mostly used for pre-generating room overview audio, not called live except for chat answers.

### Step 7 — Test every route with curl before calling it "ready" for Devs 2/3.

### Step 8 — P1: `GET /agent-session/:waypoint_id` for realtime English mode (Hour 16+, only after checkpoint)
Builds a grounding prompt from the room's full content and requests a short-lived ElevenLabs conversation token.

**Ask Cursor:** *"Add a GET route `/agent-session/:waypointId` that looks up the room in waypoints.json, builds a single prompt string combining the room_overview_text and every item's name + detail_text with the instruction 'only answer from this content, and call the show_item tool with an item id when discussing a specific item', then calls [ElevenLabs's conversation token endpoint — paste their docs example] with that prompt as an override, and returns `{token, promptOverride}` to the client."*

---

## 8. Dev 2 — Flutter UI/Screens

### Step 1 — Scaffold + theme (Hour 0–1)
Same as before — Material 3, one seed color.

### Step 2 — Build 4 screens against hardcoded fake data (Hour 1–7)
**Scan** (unchanged) → **Room screen** (title, overview narration indicator, progress dots, item list with thumbnail + short_description, "next room" hint) → **Item detail screen** (image, full detail text, ask-a-question button) → **Chat overlay** (text answer, image if present, audio playing indicator).

**Ask Cursor:** *"Build a Flutter 'RoomScreen' widget: a title, a small 'speaking' indicator while narration plays, a progress dot row, and a scrollable list of item cards below — each card shows a thumbnail image, item name, and short_description, and navigates to an ItemDetailScreen on tap. Use this hardcoded fake data for now: [paste one room object from the schema above]. Keep the fake data in one variable I can delete later."*

**Ask Cursor:** *"Build an 'ItemDetailScreen' widget: large image at top, item name, full detail_text below, and a floating action button that opens a ChatOverlay for asking a question about this specific item."*

**Ask Cursor:** *"Build a 'ChatOverlay' widget: a text input plus a mic button, a scrollable area showing past question/answer pairs, and — when an answer includes an image_url — show that image inline above the answer text."*

### Step 3 — Add the free-form "ask without tapping" entry point (Hour 7–9)
Put the same mic/text input on the Room screen itself, not just inside an item's detail screen — this is what lets a visitor ask "what's this drum for?" without tapping anything first. It calls the same `/chat` route, just without an `item_id`.

**Ask Cursor:** *"Add the same ChatOverlay widget to the RoomScreen, but calling /chat with item_id set to null. When the response comes back with a non-null matched_item_id, show a small 'Showing: [item name]' chip above the answer and the item's image."*

### Step 4 — Swap in real data (Hour 9–13)
Replace hardcoded objects with real `http.get`/`http.post` calls to Dev 1's routes as they go live.

### Step 5 — Amharic toggle (Hour 16+, P1)
A simple language switch (e.g. a toggle in the app bar) that gets passed as `lang` on every `/chat`, `/transcribe`, and `/narrate` call.

**Ask Cursor:** *"Add a language toggle (EN/AM) in the app bar using a simple state provider, and thread a `lang` value through every existing API call in the app."*

---

## 9. Dev 3 — Flutter Audio/QR Integration

### Steps 1–3 — same as before (Hour 0–5)
Add `mobile_scanner`, `record`, `just_audio`; set Android/iOS permissions; test QR scanning alone; test record/playback alone.

### Step 4 — Wire QR scan → Room screen (Hour 5–6)
On scan, navigate to the Room screen with the scanned waypoint ID.

### Step 5 — Wire room overview narration + "next room" cue (Hour 6–8)
Auto-play `room_audio_url` on room load. Make sure the pre-generated narration audio ends with the spoken "head to [next room] next" line Dev 4 writes into the script — this is the sentence that makes it a *guided* tour, not a room browser.

### Step 6 — Wire the voice-question chain, both entry points (Hour 8–14)
Hold-to-talk → record → `/transcribe` with `lang` → text → `/chat` with `item_id` (if tapped) or null (if free-form) and `lang` → play `audio_url`, show `answer` + `image_url` if present.

**Ask Cursor:** *"Write a function chain: on mic press-and-hold, record; on release, upload to /transcribe with the current lang value, take the returned text, POST it to /chat along with waypoint_id, item_id (nullable), and lang, then play the returned audio_url and pass the answer/image_url back to the UI to display."*

### Step 7 — P1: realtime agent integration (Hour 16+, only after checkpoint, English only)
Add the official `elevenlabs_agents` Flutter SDK, fetch a session from `/agent-session/:waypoint_id`, start a session with that token and prompt override, register a `show_item` client tool that looks up the item's `image_url` from the already-loaded room data and displays it.

**Ask Cursor:** *"Using the elevenlabs_agents Flutter package, write a function that fetches {token, promptOverride} from my backend's /agent-session/:waypointId route, starts a conversation session with that token and prompt override, and registers a client tool called show_item(item_id) that looks up image_url from a local room data object and updates a state variable to display it."*

If this isn't solid by hour 20, fall back to the manual voice pipeline for everyone — that's a scope decision, not a failure.

---

## 10. Dev 4 — Content + AI Grounding

### Step 1 — Scrape source material with Firecrawl (Hour 0–1)
Same as before, but now scrape enough material to cover both room-level context and individual items (e.g. broader Battle of Adwa history plus any available detail on specific artifacts/generals/events you'll represent as items).

### Step 2 — Structure into rooms + items (Hour 1–4)
Paste scraped text into Cursor's chat panel directly — this is a one-time task, no runtime API needed.

**Ask Cursor:** *"Structure the following historical text into exactly 6-7 chronological rooms about the Battle of Adwa (pre-war context, treaty dispute, mobilization, the battle, aftermath, legacy). For each room, output JSON matching this schema: id, story_order, title, room_overview_text (3-4 sentences), next_waypoint_id, and an items array of 3-4 plausible artifacts/documents/figures for that room, each with id, name, short_description (1 sentence), and detail_text (3-4 sentences). [paste scraped text]"*

### Step 3 — Fact-check (Hour 4–5)
Cross-check both room overviews and item details against a second source before locking in. Historical accuracy matters more here than before since there's more content to get wrong.

### Step 4 — Deliver `waypoints.json` to the team (Hour 4–5)
This unblocks Dev 1, 2, and 3 simultaneously — top priority.

### Step 5 — Write the room-overview narration scripts, ending with the "next room" cue (Hour 5–7)
For each room, write the exact spoken script that will be sent to TTS — this should read naturally aloud, not just be the raw `room_overview_text`, and must end with a direction to the next room.

**Ask Cursor:** *"For each room in this JSON, write a natural-sounding spoken narration script (not just the raw overview_text — rephrase for speech) that ends with a direction to the next room by name. Keep each script under 45 seconds of spoken audio (~100 words)."*

### Step 6 — Write the grounding + item-matching prompt for `/chat` (Hour 7–8)
Hand this to Dev 1 as plain text — it's the backbone of both the tap-to-ask and free-form-ask flows.

```
You are a museum guide currently standing in "{room_title}".

Room overview: {room_overview_text}

Items in this room:
{for each item: "- {name}: {short_description}"}

The visitor asked: "{question}"

If item_id was already specified, only use that item's detail_text:
{detail_text}

If no item_id was specified, decide which item (if any) this question is
about, using the item names/descriptions above. Then answer using only
that item's full detail_text, provided separately below:
{all items' detail_text, keyed by id}

If nothing above covers the question, say clearly that you don't have
that information at this stop — never use outside knowledge.

Respond as JSON: {"matched_item_id": "..." or null, "answer": "..."}
Keep the answer to 2-3 spoken sentences.
```

### Step 7 — Stretch: Amharic content (Hour 16+)
Translate `room_overview_text` and every item's `detail_text`/`name`/`short_description` via Addis AI's translation endpoint, store as parallel `_am` fields.

**Ask Cursor:** *"Write a script that loops through waypoints.json and its nested items, calling [Addis AI translation endpoint] to translate room_overview_text, and each item's name, short_description, and detail_text into Amharic, adding _am suffixed fields, and saves the result."*

### Step 8 — Stretch: realtime agent prompt (Hour 16+)
Confirm the combined room+items prompt built in Dev 1 Step 8 stays under the agent platform's context limits — trim `detail_text` if needed for rooms with many items.

---

## 11. Dev 5 — Design + Demo Ops

### Steps 1–2 — same as before (Hour 0–4)
Generate item images with Fal (now one per **item**, not per room — more images than before, budget accordingly: ~20-25 instead of ~7). Print physical QR codes for each **room**.

**Ask Cursor:** *"Write a Node.js script that loops through waypoints.json and its nested items array, calls the Fal API with a prompt built from each item's name plus a fixed style suffix, downloads the resulting image, and saves the URL back into that item's image_url field."*

### Steps 3–6 — same as before
Pitch deck (start hour 4), continuous demo testing (hour 12+), backup recording (hour 20), final APK build + install test on a second phone (hour 22).

Update the pitch deck's differentiator line to reflect the fuller feature set: *"Unlike a generic museum app, this always keeps visitors moving through the correct historical order — and inside each room, they can ask about any artifact by name, by tapping, or just by asking naturally, in English or Amharic."*

---

## 12. Integration Checkpoints (whole team)

- [ ] **Hour 4-5:** `waypoints.json` with rooms + items exists, everyone building against it
- [ ] **Hour 9:** One room screen shows real data, item list renders, narration plays
- [ ] **Hour 13:** Tap-an-item → detail screen → ask a question → grounded text+voice answer works
- [ ] **Hour 14–16: full guiding-loop checkpoint.** Every room's QR scans → narrates → shows items → item Q&A works → ends with correct next-room direction, for all 6-7 rooms in sequence. **This is the real MVP. Everything below is bonus.**
- [ ] **Hour 18:** (P1) Free-form "ask without tapping" correctly identifies items most of the time
- [ ] **Hour 20:** (P1) Amharic toggle works end to end for at least 2 rooms
- [ ] **Hour 20:** (P1) Realtime agent works for at least 1 room, with graceful fallback if not
- [ ] **Hour 22:** Release APK installs and runs on a phone with zero dev tools attached

---

## 13. Cheat Codes Recap

- Pre-generate and cache all room narration audio ahead of time — don't call TTS live for these.
- Mock data first, real API second — never let one teammate block another.
- Test every unfamiliar API with a raw curl call before writing any code against it.
- The **guiding loop (hour 14-16 checkpoint) is the actual product.** Free-form chat, Amharic, and realtime voice are impressive garnish — never let them eat time the guiding loop needs.
- Open the demo already mid-scan on Room 1, never from a cold loading screen.
- Pre-decide and rehearse the exact question you'll ask live for both the tap-to-ask and free-form-ask demos.
- Bring printed QR cards for each room — physical interaction beats a screen share.
- Say the differentiator sentence out loud during the pitch; judges won't infer it themselves.

---

## 14. Common Pitfalls to Watch For

- **Item-matching silently failing:** if Addis AI can't reliably pick the right item from a free-form question, don't let it derail the demo — the tap-to-ask flow is always the safe fallback, lead with that live and treat free-form as a bonus you show second.
- **Content volume underestimated:** ~25 items' worth of detail_text is a real writing/fact-checking load — Dev 4 should not also be expected to help elsewhere before hour 8.
- **Two voice pipelines (manual + realtime agent) diverging:** if you build both, make sure the manual pipeline stays the default and working at all times — the agent is additive, never a replacement it depends on.
- **Mismatched API contract:** any field-name change in `/waypoint/:id` or `/chat` gets posted in team chat immediately.
- **Committing API keys:** double-check `.env` is in `.gitignore` before the first commit.
- **Universal APK bloat:** always build with `--split-per-abi`, hand judges the `arm64-v8a` build only.
- **Scope creep after hour 16:** if the guiding-loop checkpoint isn't hit, cut P1 features, don't add them.

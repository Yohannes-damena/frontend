# Adwa Admin Web — Frontend Specification

## Purpose

This document specifies the frontend for the Adwa platform's two administrative planes. It complements [non-mobile-platform-scope.md](non-mobile-platform-scope.md): that file defines platform scope; this file defines the web experience used to operate it.

The product is not a single museum's admin panel. It is a service: museum clients operate their own content, and we operate the fleet as the provider. Those are two distinct planes that share a vocabulary and must never be confused for each other.

Backend implementation is outside this document. Every data-dependent screen must work against fixtures until its teammate-owned API integration is available.

## 1. Product Shape — Two Planes, One Family

### Tenant plane

What a museum's own staff use. A curator signs in and sees only their museum: its rooms in story order, its objects, its narration, its guide persona, its own visitors and questions, its own team. They never learn that other museums exist on the platform.

Primary role: `MUSEUM_ADMIN`.

### Control plane

What we use as the provider. An operator signs in and sees the whole fleet: every museum's status, onboarding, suspension, per-tenant spend attribution, provider health for the language, speech, and storage adapters, rate-limit pressure, and a cross-tenant change history. From here an operator can enter any tenant to help.

Primary role: `SYSTEM_ADMIN`.

### Scoped-in state

An operator inside a tenant. This is the tenant plane rendered normally, plus one persistent, unmistakable indicator of whose data is on screen and how to leave.

## 2. The Isolation Guarantee

Tenant isolation is the platform's highest correctness property. In the interface it reduces to one question the user must never get wrong: **which museum am I changing right now?**

An operator who edits the wrong museum's narration because two screens looked alike is the failure this design exists to prevent. Treat plane legibility as a structural requirement, not a banner bolted on at the end.

Three rules follow, and they are non-negotiable across every phase:

1. The two planes must be distinguishable at a glance, before any text is read.
2. The scoped-in state must be visible on every screen it applies to, never only on entry.
3. A museum administrator must have no route, no control, and no rendered affordance that references another tenant. Absent, not disabled.

## 3. Information Architecture

### Tenant navigation

| Area | Purpose | Phase |
|---|---|---|
| Overview | Readiness, KPIs, and recent change | 4 |
| Rooms | Ordered tour structure and room authoring | 5 |
| Items | Room-scoped collection item authoring | 5 |
| Narration | Audio status, script review, generation controls | 6 |
| Team | Museum staff and their access | 6 |
| Activity | This museum's change history | 6 |
| Settings | Identity, ticket gate, AI persona, default voice | 6 |

### Control plane navigation

| Area | Purpose | Phase |
|---|---|---|
| Fleet | Every museum, status, readiness, and entry point | 7 |
| Health | Provider adapter state and rate-limit pressure | 9 |
| Spend | Per-tenant cost attribution | 9 |
| Audit | Cross-tenant change history | 9 |
| Admins | Operator accounts and museum administrator seats | 9 |

### Route map

```text
/sign-in                                  museum door, MUSEUM_ADMIN only
/sign-out

/app                                      tenant plane
/app/overview
/app/rooms
/app/rooms/new
/app/rooms/:roomId
/app/rooms/:roomId/items
/app/rooms/:roomId/items/:itemId
/app/narration
/app/team
/app/activity
/app/settings/museum
/app/settings/gate
/app/settings/guide
/app/settings/voice

/operator/sign-in                         operator door, SYSTEM_ADMIN only
/operator/sign-out

/operator                                 control plane, SYSTEM_ADMIN only
/operator/fleet
/operator/fleet/new
/operator/fleet/:museumId
/operator/health
/operator/spend
/operator/audit
/operator/admins

/operator/tenant/:museumId/*              scoped-in: tenant plane under operator identity
```

Each plane has its own door. `/sign-in` accepts only `MUSEUM_ADMIN` and lands on `/app/overview`; `/operator/sign-in` accepts only `SYSTEM_ADMIN` and lands on `/operator/fleet`. Neither door offers a role picker, and every rejected attempt returns one generic message so a wrong role is indistinguishable from a wrong password.

A museum administrator hitting any `/operator` route — including `/operator/sign-in` — receives a not-found, not an unauthorized page, so the control plane's existence is not disclosed. The museum door therefore never links to the operator door; the operator door does link back, since an operator already knows both planes exist. Signing out or being bounced by the auth guard returns you to the door for your own plane rather than a shared one.

## 4. App Shell and Layout

The shell is a collapsible left sidebar beside a main region. Navigation lives in the sidebar for two reasons. Both planes are dominated by long, dense tables, and a table reads better in a tall uninterrupted column than under a horizontal band of links. And a permanent rail gives each plane a large, continuous field of its own color, which is the surface a user registers before reading anything — the mechanism the isolation guarantee depends on. The horizontal room that museum titles, locations, and description excerpts need is recovered by collapsing the rail to icons rather than by removing it.

### Sidebar anatomy

Top to bottom, in both planes:

- Product mark and a collapse control.
- A search field carrying its keyboard shortcut hint.
- Primary navigation items: icon, label, and an optional count badge for queues that need attention.
- A divider, then a secondary group: notifications, help, settings.
- The signed-in user pinned to the bottom, opening the account menu.

Collapsed, the rail keeps icons, badges, and the user avatar, and exposes labels as tooltips. The collapse choice persists per user.

### Main region anatomy

- Page title with primary and secondary actions aligned right.
- A filter chip row beneath the title.
- The dense data table, or the screen's primary content.
- Optionally, on overview-style screens, a right insights rail: a summary gauge, a segmented status-breakdown bar, a KPI grid, and a ranked list. The rail is supplementary and is the first region to collapse.

Two overlays sit above the main region. The **detail peek panel** opens over the table without navigating away, carrying its own tab strip and an action footer, so a record can be inspected and dismissed without losing table position or filters. The **bulk-action bar** floats above the content when table rows are selected, showing the selection count and the batch actions that apply.

### Tenant plane

```text
+---------------+-------------------------------------+-----------------+
| [A] ADWA    < | Overview          [Export] [Import] | READINESS       |
| [ Search  ^K ]|                                     |   (o) 78%       |
|---------------| Adwa Victory Memorial               |   14 of 18 rooms|
| * Overview    | [Type v][Status v][Updated v][More] |-----------------|
| # Rooms     4 |-------------------------------------| ####-- breakdown|
| # Items    19 | 01 Road > 02 Voices > 03 Battle o > |-----------------|
| # Narration 2 |-------------------------------------| KPI    | KPI    |
| # Team        | ROOM       ITEMS NARRATION  UPDATED | KPI    | KPI    |
| # Activity    | 01 Road       4  * Ready    Jun 19  |-----------------|
|---------------| 02 Voices     5  * Ready    Jun 18  | TOP ROOMS       |
| # Notices   7 | 03 Battle     7  o Pending  Jun 12  | 1 Battle    412 |
| # Help        | 04 Legacy     3  * Ready    Jun 08  | 2 Voices    388 |
| # Settings    |                                     |                 |
|---------------|                                     |                 |
| (AM) Aster M. |                                     |                 |
+---------------+-------------------------------------+-----------------+
  sidebar #18181B  canvas #F4F4F5, surfaces #FFFFFF     insights rail
```

### Control plane

```text
+---------------+---------------------------------------------------+
| [A] ADWA OPS <| Fleet            [Gallery|Table] [Onboard museum] |
| [ Search  ^K ]| 42 museums . 3 need attention                     |
|---------------| [Status v][Readiness v][Region v][All filters]    |
| # Fleet    42 |---------------------------------------------------|
| # Health    2 | MUSEUM        STATUS    SPINE     SPEND   HEALTH  |
| # Spend       | [x] Adwa Vic. * Active  ###-  +----------------+  |
| # Audit       | [x] Entoto Hs * Active  ####  | Adwa Victory X |  |
| # Admins      | [ ] Harar Mus X Susp'd  ----  | * Active . 4 rm|  |
|---------------| [x] Sheger Mu o Onboard #---  | Rooms|Spend|Log|  |
| # Notices     |                               | spend    $1,240|  |
| # Help        |                               | [Enter tenant] |  |
| # Settings    |                               +----------------+  |
|---------------|     +-------------------------------------+       |
| (OP) Operator |     | X 3 selected [Suspend] [Export] ... |       |
+---------------+-----+-------------------------------------+-------+
  sidebar #09090B,     canvas #09090B, raised surfaces #18181B;
  #27272A border       peek panel and bulk-action bar shown as overlays
```

### Operator scoped into a tenant

```text
+----------------------------------------------------------------------+
| ! Operator view . Adwa Victory Memorial           [Leave tenant]      |  #F59E0B band, #09090B text
+---------------+------------------------------------------------------+
| [A] ADWA    < | Overview                        [Export] [Import]    |
| [ Search  ^K ]| Adwa Victory Memorial                                |
|---------------|------------------------------------------------------|
| * Overview    | the tenant plane, rendered light and otherwise        |
| # Rooms     4 | unchanged                                            |
| # Items    19 |                                                      |
|---------------|                                                      |
| (OP) Operator |                                                      |
+---------------+------------------------------------------------------+
  the amber band spans the full viewport, above both the sidebar and the main region
```

Settings breaks the table pattern in both planes: a sub-navigation rail inside the main region, beside a form panel. That rail is second-level navigation and never replaces the shell sidebar.

### Responsive behavior

| Viewport | Behavior |
|---|---|
| Wide `>= 1280px` | Sidebar expanded with labels and badges; insights rail visible; full table columns; peek panel overlays the table |
| Desktop `1024–1279px` | Sidebar collapses to a 64px icon rail with tooltips; the insights rail moves below the table; full table columns |
| Tablet `768–1023px` | Sidebar becomes an overlay drawer opened from a menu button; filter chips scroll horizontally; charts stack; the peek panel becomes a right sheet |
| Mobile `< 768px` | Drawer navigation; one-column editors; table rows become labelled stacked records; the spine scrolls horizontally; the peek panel becomes a full-screen sheet; the bulk-action bar docks to the bottom edge |

The amber scoped-in band never collapses, never scrolls away, and never moves into an overflow menu. At every width it spans the full viewport above both the sidebar and the main region, including when the sidebar is a closed drawer.

## 5. Visual Language and Tokens

The admin web runs its own palette: a neutral zinc scale with a single emerald accent, the vocabulary that dense operational software reads best in. This palette is independent of the mobile brand palette. [design.md](design.md) is unchanged, remains locked, and still governs the Flutter visitor app; nothing in this section applies to that app, and nothing here may be back-ported into it. The thread tying the two products together is typographic rather than chromatic — Cormorant Garamond still sets museum names, and only museum names. See Typography below.

Within the admin web, these primitives are now the locked layer. Every semantic token resolves to a value in the scales below; no one-off hex values in component code.

### Primitive layer — neutrals

| Token | Value |
|---|---|
| `zinc.950` | `#09090B` |
| `zinc.900` | `#18181B` |
| `zinc.800` | `#27272A` |
| `zinc.700` | `#3F3F46` |
| `zinc.600` | `#52525B` |
| `zinc.500` | `#71717A` |
| `zinc.400` | `#A1A1AA` |
| `zinc.300` | `#D4D4D8` |
| `zinc.200` | `#E4E4E7` |
| `zinc.100` | `#F4F4F5` |
| `zinc.50` | `#FAFAFA` |
| `white` | `#FFFFFF` |

### Primitive layer — emerald accent

| Token | Value |
|---|---|
| `emerald.950` | `#022C22` |
| `emerald.800` | `#065F46` |
| `emerald.700` | `#047857` |
| `emerald.600` | `#059669` |
| `emerald.500` | `#10B981` |
| `emerald.100` | `#D1FAE5` |

### Primitive layer — status

Each status carries four values: a light-plane hue, a dark-plane hue stepped brighter to hold contrast, a light-plane tint, and the text color that tint requires. The text-on-tint values are darker than the hue itself because the hue alone does not clear 4.5:1 on its own tint; see Contrast rules.

| Status | Light hue | Dark hue | Light tint | Text on light tint |
|---|---|---|---|---|
| Success / paid / ready | `#059669` | `#10B981` | `#D1FAE5` | `#065F46` |
| Danger / cancelled / failed | `#DC2626` | `#F87171` | `#FEE2E2` | `#991B1B` |
| Warning / pending | `#D97706` | `#FBBF24` | `#FEF3C7` | `#92400E` |
| Neutral / draft | `#71717A` | `#A1A1AA` | `#F4F4F5` | `#52525B` |

On the dark plane, tints are the dark hue at 16% over `surface.raised` and the label is the dark hue itself.

### Primitive layer — scope

| Token | Value | Use |
|---|---|---|
| `scope.amber` | `#F59E0B` | The scoped-in band fill, and nothing else |
| `scope.onAmber` | `#09090B` | Text and icons on that band |
| `scope.amberEdge` | `#92400E` | A 2px bottom edge on that band, on both planes |

The edge exists because the amber fill alone measures only 1.95:1 against the light plane's `#F4F4F5` canvas, which is not enough boundary for the one indicator the isolation guarantee depends on. `#92400E` reaches 6.45:1 against that canvas and 3.30:1 against the amber fill, so the band has a hard edge on both planes.

### Plane theming

Color separates the planes, and the lever is a light/dark inversion. The metaphor survives the palette change intact: a museum has a front of house and a back of house, and they do not look alike. The tenant plane is the lit gallery — light canvas, white surfaces, one near-black rail. The control plane is the instrument room behind it — near-black canvas, raised charcoal surfaces, bright text. A user landing on either sees a different amount of light on screen before resolving a single glyph.

| Semantic role | Tenant plane (light) | Control plane (dark) |
|---|---|---|
| `surface.canvas` | `#F4F4F5` | `#09090B` |
| `surface.raised` | `#FFFFFF` | `#18181B` |
| `surface.sunken` | `#E4E4E7` | `#27272A` |
| `surface.sidebar` | `#18181B` | `#09090B` |
| `surface.sidebarEdge` | `#27272A` | `#27272A` |
| `surface.overlay` | `#FFFFFF` | `#18181B` |
| `content.primary` | `#18181B` | `#FAFAFA` |
| `content.secondary` | `#52525B` | `#A1A1AA` |
| `content.muted` | `#71717A` | `#71717A` |
| `content.onSidebar` | `#FAFAFA` | `#FAFAFA` |
| `content.onSidebarMuted` | `#A1A1AA` | `#A1A1AA` |
| `border.hairline` | `#E4E4E7` | `#27272A` |
| `border.control` | `#71717A` | `#71717A` |
| `accent.mark` | `#059669` | `#10B981` |
| `accent.fill` | `#047857` | `#10B981` |
| `accent.onFill` | `#FFFFFF` | `#022C22` |
| `accent.tint` | `#D1FAE5` | `rgba(16,185,129,0.16)` |
| `accent.onTint` | `#065F46` | `#10B981` |
| `action.primary.fill` | `#18181B` | `#FAFAFA` |
| `action.primary.text` | `#FFFFFF` | `#09090B` |
| `action.secondary.fill` | `#FFFFFF` | `#18181B` |
| `action.secondary.text` | `#18181B` | `#FAFAFA` |
| `action.secondary.border` | `#71717A` | `#71717A` |
| `action.danger.fill` | `#DC2626` | `#DC2626` |
| `action.danger.text` | `#FFFFFF` | `#FFFFFF` |
| `feedback.success` | `#059669` | `#10B981` |
| `feedback.danger` | `#DC2626` | `#F87171` |
| `feedback.warning` | `#D97706` | `#FBBF24` |
| `feedback.neutral` | `#71717A` | `#A1A1AA` |
| `selection.row` | `#D1FAE5` | `rgba(16,185,129,0.16)` |
| `focus.ring` | `#059669` | `#059669` |

Notes on the table:

- **The tenant sidebar is dark on a light plane.** That is not a plane signal, it is a shell signal: it anchors navigation and holds the page's only large dark field. Plane identity is carried by the canvas and the content surfaces, which is where the eye spends its time and where the inversion is unambiguous.
- **Emerald steps brighter on dark.** `#059669` is correct on white and loses too much separation on `#09090B`, so the dark plane uses `#10B981`.
- **`content.muted` is the same value on both planes** and is restricted to text at 18.66px/bold or larger, icons, and disabled labels. It does not carry body copy on either plane.
- **`border.control` is heavier than `border.hairline` on purpose.** Hairlines separate rows and card edges decoratively, where the surface change already does the work. Control boundaries — input, chip, and secondary-button edges — must clear 3:1 against their surface to be identifiable, and the light zinc steps do not.

### Primary buttons are near-black, not emerald

`action.primary` is a solid near-black `#18181B` with white text on the light plane, and a solid `#FAFAFA` with `#09090B` text on the dark plane. Emerald is reserved for status, data, selection, and focus. A palette that spends its one accent on every Save button has nothing left to say when a value is healthy or a row is selected, and emerald-as-success stops meaning anything. Destructive actions are `#DC2626` with white text in both planes.

### The single-use amber rule

Amber `#F59E0B` appears as chrome in exactly one place across the entire product: the scoped-in band, with its `#92400E` edge. It is the loudest color available against both a near-white and a near-black canvas, and amber-as-impersonation is a convention operators already read correctly from other tools. Nothing else in either theme may use amber as a chrome fill. The warning status is the only other amber-family usage, and it appears as a tint behind a label or as a small marker, never as a chrome surface. That scarcity is what makes the band unmistakable.

### Status needs shape as well as hue

The palette's status hues are genuinely distinct — emerald, red, amber, and gray do not resemble one another — so hue now carries real information and is the fastest read for most users. Shape is retained for the users hue fails: red-green deficiency affects roughly one in twelve men, and success-versus-failure is the exact distinction this palette leans on hardest. Every status badge therefore carries a text label plus a distinct marker, and neither the marker nor the label may be dropped in dense layouts.

| State | Marker |
|---|---|
| Active / ready | Filled dot |
| Pending / generating | Hollow ring |
| Suspended / failed | Cross |
| Draft / not started | Dash |

### Typography

| Role | Family | Use |
|---|---|---|
| UI | Inter 400–700, falling back to system UI sans | Navigation, tables, forms, controls, page titles, KPI figures — everything |
| Data | Inter with `font-variant-numeric: tabular-nums` | Every numeric column, KPI value, spend figure |
| Museum name | Cormorant Garamond 600 | Museum names only |

Inter is the workhorse. Dense tables, small labels, and numeric columns are what this product is made of, and a serif slows all three down.

Cormorant survives in one role: the name of a museum. It appears in the tenant plane's museum header and on the operator's fleet plates and nowhere else — not on page titles, not on KPI figures, not on section headings. Held to that single role it still signals a cultural product rather than a billing tool, and it doubles as a useful cue: the Cormorant string on any screen is the name of the institution whose data is loaded.

Column headers are 12px, weight 600, uppercase, letter-spacing `0.08em`. Nothing visible drops below 12px. 8px spacing rhythm; 44px minimum interactive target.

### Radius and elevation

| Surface | Radius |
|---|---|
| Cards, panels, buttons, peek panel, bulk bar | 8px |
| Filter chips, inputs, selects | 6px |
| Avatars, status pills | Full round |

Elevation is a hairline border plus a very soft shadow — enough to lift an overlay off the canvas, never a heavy drop shadow. Overlays that need more separation get a scrim, not a deeper shadow.

### Focus

A 2px `#059669` ring at a 2px offset, on both planes, on every interactive element. The offset gap shows the underlying surface, and the ring clears 3:1 against every surface in both themes.

### Contrast rules

Verified pairs that constrain the palette, all measured rather than assumed:

- Secondary body text is `#52525B`, not `#71717A`. `#71717A` measures 4.40:1 on the `#F4F4F5` canvas and fails AA for body copy; `#52525B` measures 7.03:1 there and 7.73:1 on white. `#71717A` remains available as `content.muted` for large text, icons, and disabled states, where 3:1 applies.
- Solid emerald fills carrying white text use `#047857` (5.48:1). `#059669` with white measures 3.77:1 — fine for a marker, a rule, a chart series, or the focus ring, and not fine for a label.
- Text on a status tint uses the darker step: `#065F46` on `#D1FAE5`, `#991B1B` on `#FEE2E2`, `#92400E` on `#FEF3C7`, `#52525B` on `#F4F4F5`.
- The warning fill never carries white text. `#D97706` with white is 3.19:1; the warning fill takes `#09090B` text at 6.25:1.
- `#A1A1AA` on `#18181B` (6.91:1) and on `#09090B` (7.76:1) passes as dark-plane secondary text and needs no substitute.
- Control boundaries use `border.control` `#71717A`: 4.83:1 on white, 3.67:1 on `#18181B`, 4.12:1 on `#09090B`. The lighter zinc steps do not qualify — `#D4D4D8` on white is 1.48:1 — so they stay decorative hairlines.
- The scoped-in band carries its `#92400E` edge, because the amber fill alone is 1.95:1 against the light canvas.
- Eyebrow and label text placed on a dark rail — the tenant sidebar or the sign-in panel — uses `content.onSidebarMuted` `#A1A1AA`, not `content.secondary`. `#52525B` on `#18181B` is 2.42:1.

The full pair-by-pair audit table in both themes is a Phase 1 deliverable.

## 6. Signature Element — The Readiness Spine

A museum's rooms drawn as numbered segments in story order, each segment carrying its narration-readiness marker.

It renders at two scales:

- **Full width** at the top of the tenant main region, above the table, where it doubles as a jump control into any room.
- **Miniaturized** inside each tenant plate on the operator's fleet gallery wall, where forty museums' readiness becomes scannable at once.

Numbering is justified here and only here, because story order is real information a curator depends on rather than decoration. One device, two scales, encoding sequence and readiness together. Everything around it stays quiet.

In the new palette the spine is drawn in emerald and neutral only. A ready segment is filled `accent.mark` — `#059669` on the light plane, `#10B981` on the dark. A pending segment is the same hue as a hollow outline. A failed segment is `feedback.danger` with the cross marker. A not-started segment is `surface.sunken` with the dash marker. Segment numbers sit in `content.secondary` at tabular numerals, and connectors are `border.hairline`. The segment markers are the same four shapes the status badges use, so the spine and the narration table teach each other. At miniature scale the numbers drop and the shapes remain, which is why the shapes exist.

## 7. Shared Components and States

One kit, consumed by both planes, themed per plane rather than duplicated.

| Component | Required behavior |
|---|---|
| Sidebar nav | Plane-themed, collapsible to an icon rail with tooltips, active indicator, count badges, search field with shortcut hint, account menu pinned at the bottom |
| Scoped-in band | Persistent, names the museum, offers the exit, never collapses |
| Status badge | Label plus marker shape; never color-only |
| Filter chip row | Chips with value summaries, clear-one and clear-all, horizontal scroll below 1024px |
| Data table | Column sort exposed via `aria-sort`, text search, status filter, row hover, row selection, labelled row actions, Previous/Next pagination |
| Detail peek panel | Opens over the table without navigation, tab strip, action footer, Escape to close, focus returned to the originating row |
| Bulk-action bar | Appears on row selection, states the selection count, offers batch actions and a clear-selection control |
| Insights rail | Summary gauge, segmented status breakdown, KPI grid, ranked list; collapses first at narrow widths |
| Form field | Label, helper text, validation, disabled and read-only states |
| Editor workspace | Sticky save bar, dirty indicator, discard confirmation |
| Modal | Focus trap, Escape to close, focus returned on close |
| Confirmation | Names the entity and the consequence |
| Toast | Plain-language success and failure feedback |
| KPI card | Inter figure with tabular numerals, provenance marker |
| Grouped bar chart | Chart.js via `react-chartjs-2`, series toggle, accessible fallback table |
| Integration-pending panel | Names the missing dependency and what remains usable |

### State rules

Every data-dependent region defines five states:

- **Loading** — preserve layout with named skeleton regions; never a page-wide spinner.
- **Empty** — an invitation to the next action, not a shrug.
- **Failure** — name what broke and offer a way forward.
- **Unauthorized** — explain the role limit without leaking the data.
- **Integration pending** — a labelled shell, never a fabricated live value.

## 8. Screen Specifications

### 8.1 Sign-in

Single focused panel, email and password, tenant-plane theming. Successful mock submission routes by role. Invalid credentials appear below the relevant field. Lockout is an integration-driven state.

### 8.2 Tenant — Overview

The museum name in Cormorant beside the page title, then the readiness spine, then a four-card KPI row separated by a hairline rule, then two grouped bar charts with volume and value toggles, then a recent-change list. The insights rail carries the readiness gauge, the room-status breakdown bar, and the most-visited-rooms list. Chart series use emerald as the primary series and zinc as the comparison series. Every figure carries a provenance marker.

### 8.3 Tenant — Rooms and Items

The rooms list is the tour's editorial spine in table form: sequence, title, item count, narration status, last edited, edit action. The room editor holds title, story order, overview text used for AI grounding, narration script, next-room selection, item summary, and a sticky save bar.

Items are always shown in their room context. The item editor holds name, visitor-facing description, grounding detail, image with preview, display order, and a delete confirmation that names the item.

Validation covers duplicate story order, invalid next-room selection, and sequence cycles.

### 8.4 Tenant — Narration

Rooms grouped by audio state: ready, needs generation, unavailable. A selected room panel shows script, voice, status, playback, and regenerate. Playback stays visibly disabled with an integration-pending explanation until real provider state connects.

### 8.5 Tenant — Team, Activity, Settings

Team lists museum staff and access. Activity lists this museum's changes only. Settings uses the left rail: identity and activation, ticket gate, AI guide persona, default voice. Controls a museum administrator cannot use are absent, not disabled.

### 8.6 Control — Fleet

The gallery wall is the default: each museum a framed plate carrying its name in Cormorant, a status badge, room count, miniaturized readiness spine, spend, and health. A toggle switches to a dense sortable table, because at two hundred tenants an operator needs to sort by spend and a wall of plates stops being the right tool.

Actions: onboard a museum, open a tenant record, enter a tenant, suspend or reinstate. Suspension confirms by naming the museum and stating that its public content disappears.

### 8.7 Control — Health, Spend, Audit, Admins

Health models real adapter states: healthy, degraded, retrying, breaker open, plus rate-limit pressure. Spend attributes cost per tenant over a time window. Audit is the cross-tenant change history with tenant, actor, action, and time. Admins manages operator accounts and museum administrator seats.

### 8.8 Scoped-in

Entering a tenant from the fleet renders the tenant plane — light, with its own sidebar — beneath the amber band. The operator's identity stays visible in the account menu. Leaving returns to the fleet at the same scroll position. Any write performed while scoped in is attributed to the operator in both the tenant's activity view and the cross-tenant audit.

## 9. Voice, Motion, and Accessibility

### Copy

Write from the user's side of the screen. Name things by what people control, not by how the system is built: a curator manages narration, not a text-to-speech adapter. Active voice. An action's name stays stable through its whole flow, so the control that says Publish produces a message that says Published. Errors explain what happened and what to do next; they do not apologize and are never vague. Empty states invite. Sentence case, plain verbs, no filler.

### Motion

Motion clarifies state change and nothing else. Roughly 350ms for view transitions, 250ms for inline feedback, matching the established brand timings. Charts animate on first paint only. `prefers-reduced-motion` disables chart animation and view transitions outright. No ambient movement; on this subject it reads as unserious.

### Accessibility floor

AA contrast for all text, verified per badge and per button in **both** plane themes: 4.5:1 for body text, 3:1 for large text and for the boundaries of interactive controls. `#059669` and `#D97706` never carry small text on a light surface and never sit under white text; the darker steps named in the contrast rules do that work. `content.muted` never carries body copy. Visible focus on every interactive element. Full keyboard traversal. Escape closes every overlay; modals trap focus and return it. Status never conveyed by color alone. Tables use real header semantics.

## 10. Data Provenance and Honesty

The backend has no visitor telemetry tables and no billing enforcement, so visit counts, dwell time, completion rates, and plan tiers cannot be sourced yet.

- Charts and KPI figures may ship with demo data, but each carries a visible demo marker.
- Any view with no data contract at all shows an integration-pending state naming the dependency.
- Never render a plausible number that has no source. On a memorial museum's platform, a confidently wrong figure is worse than an honest gap.

Provider health and rate-limit pressure do have a backend basis in the adapter timeout, retry, and circuit-breaker design, so those views model real states rather than placeholders.

## 11. Delivery Phases

Ten phases, each independently reviewable. Every phase names what is out of scope so review does not drift into the next one.

### Phase 1 — Token layer and plane theming

Primitive, semantic, and per-plane component tokens as CSS custom properties, with the dark plane expressed as an override block on a `data-plane` attribute. Base element styles, type scale, spacing rhythm, radius and elevation scales, focus ring, font loading for Inter and the single Cormorant weight. A theme switch that flips a container between tenant and control values. A contrast audit table for every text-on-surface and text-on-fill pair in both themes.

**Review gate:** a reviewer can view both themes side by side, resolve every semantic token to a named step in the zinc, emerald, or status scales with no loose hex values in component code, and read a measured contrast result for each pair.

**Not in this phase:** components, routing, any screen.

### Phase 2 — Shared UI kit

Buttons, form fields, filter chips, status badges with marker shapes, tabs, data table with sort and filter and pagination and row selection, bulk-action bar, detail peek panel, modal with focus trap, toast, KPI card, and the Chart.js grouped bar wrapper. Each rendered in both themes on a component gallery route, each with its loading, empty, failure, unauthorized, and integration-pending states.

**Review gate:** a reviewer can operate every component by keyboard alone in both themes and see all five states without navigating the real app.

**Not in this phase:** real screens, fixtures beyond what the gallery needs.

### Phase 3 — Tenant shell, router, and sign-in

Router with the full route map, sign-in panel, mock auth with role, role-based landing, route guards, the `/operator` not-found behavior for museum administrators, the tenant sidebar with active state, count badges, search field, collapse control and persisted collapse state, the account menu, and the responsive drawer.

**Review gate:** a reviewer can sign in as each role, land correctly, traverse the tenant sidebar expanded, collapsed, and as a drawer at four viewport widths, and confirm a museum administrator cannot reach or discover `/operator`.

**Not in this phase:** control plane shell, page content beyond placeholders.

### Phase 4 — Readiness spine and tenant overview

The spine component at full scale, wired to room fixtures with story order and narration state, acting as a jump control. The overview KPI row, two grouped bar charts with series toggles and accessible fallback tables, the recent-change list, the insights rail with its gauge, breakdown bar, KPI grid and ranked list, and provenance markers on every figure.

**Review gate:** a reviewer can read a museum's readiness from the spine alone, toggle both charts, reach chart data without sight, and identify which numbers are demo data.

**Not in this phase:** the miniaturized spine, any authoring.

### Phase 5 — Rooms and items authoring

Rooms table with search, sort, and status filter. Room editor with sticky save bar, dirty state, discard confirmation, and sequence validation. Room-scoped item table, item editor with media preview and display order, create modals, and delete confirmations that name the entity.

**Review gate:** a reviewer can complete a full create, edit, reorder, and delete cycle for a room and its items against fixtures, and cannot lose unsaved work without an explicit confirmation.

**Not in this phase:** narration generation, settings.

### Phase 6 — Narration, team, activity, and settings

Narration grouping by audio state with the script workspace and disabled playback carrying its integration-pending explanation. Team list. Tenant activity list. Settings left rail with the four nested routes and role-absent controls.

**Review gate:** a reviewer can configure a mocked museum end to end and can tell, for every disabled or absent control, whether it is a role limit or a pending integration.

**Not in this phase:** anything cross-tenant.

### Phase 7 — Control plane shell and fleet

Control plane shell in the dark theme with its own sidebar. The fleet gallery wall with tenant plates, the miniaturized spine inside each plate, the gallery and table toggle, the sortable fleet table with row selection and the bulk-action bar, the tenant peek panel, fleet search and status filter, the onboard-museum modal, the tenant record view, and suspend and reinstate confirmations.

**Review gate:** a reviewer can tell which plane they are in from a glance at a screenshot with the text blurred, and can find the three museums needing attention in a fleet of forty from the gallery wall alone.

**Not in this phase:** entering a tenant, health, spend, audit.

### Phase 8 — Tenant scoping

The amber scoped-in band, the enter-tenant flow from the fleet, the `/operator/tenant/:museumId/*` route tree, persistence of the band across every tenant route and viewport including when the sidebar is a closed drawer, the exit path returning to the fleet at its prior position, and operator attribution on writes in both activity and audit views.

**Review gate:** a reviewer scoped into a tenant can name the museum they are editing from any screen without scrolling, and can leave from any screen in one action. This is the isolation guarantee's acceptance test and it does not pass on partial coverage.

**Not in this phase:** the remaining control plane views.

### Phase 9 — Health, spend, audit, and admins

Provider health with the four adapter states and rate-limit pressure. Per-tenant spend with a time-window control. Cross-tenant audit with tenant, actor, action, and time filters. Admin and seat management. Integration-pending treatment wherever no contract exists.

**Review gate:** a reviewer can distinguish, on every view, a real modelled state from demo data, and no view renders an unsourced figure.

**Not in this phase:** polish and audits deferred to Phase 10.

### Phase 10 — Quality gate

Full keyboard pass, focus-order audit, screen-reader pass on tables and charts, contrast verification against the shipped build in both themes, reduced-motion verification, responsive pass at all four widths across both planes, state coverage audit, copy consistency pass against the voice rules, and a production build with no type or lint errors.

**Review gate:** the frontend is ready for API integration without a layout or interaction redesign, and the isolation guarantee's three rules hold on every route.

## 12. Frontend-to-Backend Handshake

Every feature declares only:

- The fields it needs to render
- The user action it emits
- Loading, success, failure, and permission outcomes
- Which plane and which tenant scope the request belongs to

Do not create database tables, API endpoints, provider behavior, or backend roadmaps in this frontend specification. When data does not exist, the UI labels the dependency as `Integration pending`.

## 13. Open Questions

Two decisions change the design and should be settled before Phase 7 begins:

1. **Is an operator inside a tenant read-only or read-write?** Read-write demands a louder band and write-time confirmations that name the tenant. Read-only demands a consistent disabled-with-reason treatment across every authoring control.
2. **Can one museum hold more than one venue?** If so, a third scope level sits between fleet and rooms, and the spine, the route map, and the scoped-in band all need to carry it.

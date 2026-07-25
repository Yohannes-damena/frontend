# Muse Backoffice — UI Design Reference

> *Control how your museum looks and feels inside the Muse app. Track earnings, manage tickets,
> add new exhibits, update images and descriptions, oversee admins, and customize every detail —
> whether you're a museum manager or a super admin.*

---

## Table of Contents

1. [Brand Identity](#brand-identity)
2. [Color Palette](#color-palette)
3. [Typography](#typography)
4. [Layout & Grid System](#layout--grid-system)
5. [Navigation](#navigation)
6. [Pages Overview](#pages-overview)
7. [UI Components](#ui-components)
8. [Data Visualization](#data-visualization)
9. [Spacing & Density](#spacing--density)
10. [Accessibility Notes](#accessibility-notes)

---

## Brand Identity

The Muse Backoffice uses a **warm, editorial aesthetic** — a deliberate departure from the cold,
clinical SaaS dashboards. The design draws from the museum world itself: rich burgundy, warm
amber, and ivory, evoking illuminated manuscripts and exhibition catalogues.

The top-level marketing wrapper uses a **warm amber/terracotta background** (`#C08A2E` range)
to present the product. The working dashboard surfaces are clean white and light gray —
ensuring the editorial palette reads as branding, not noise, when admins are doing real work.

---

## Color Palette

### Primary Colors

| Name | Hex | Role |
|---|---|---|
| **Burgundy** | `#7F1425` | Navigation bar, active states, primary buttons, accent borders |
| **Gold / Amber** | `#C08A2E` | Chart bars (secondary series), marketing wrapper background, highlights |
| **Ivory / White** | `#FFFFFF` | Main content surface, table rows, cards |
| **Off-White** | `#F5F3EF` | Page background, alternating table rows |

### Secondary / Status Colors

| Name | Hex | Role |
|---|---|---|
| **Success Green** | `#22C55E` | "Active" status badges |
| **Alert Red** | `#EF4444` | "Inactive" / "Declined" status badges, destructive actions |
| **Warning Amber** | `#F59E0B` | "Pending" status badges |
| **Dark Charcoal** | `#1A1A2E` | Primary body text on light surfaces |
| **Muted Gray** | `#6B7280` | Secondary text, placeholder labels, disabled states |
| **Border Gray** | `#E5E7EB` | Table row dividers, card outlines, input borders |

### Color Usage Rules

- **Burgundy** is reserved exclusively for the navigation bar and primary interactive elements
  (buttons, selected tabs, active indicators). It should never appear as a background for large
  content areas.
- **Gold/Amber** appears in charts and data callouts — never for buttons or status indicators.
- Status colors (green, red, amber) are **only** used inside badges. They must never be used for
  decorative purposes.
- All text on burgundy backgrounds must be white (`#FFFFFF`) to meet WCAG AA contrast.

---

## Typography

### Font Families

| Family | Weight(s) | Usage |
|---|---|---|
| **Cormorant Garamond** (Serif) | 700 | Marketing headline ("BACKOFFICE"), page hero titles |
| **Inter** or **Open Sans** (Sans-serif) | 300, 400, 500, 600 | All UI text — nav labels, table data, form fields, buttons |

The split between a **display serif** (Cormorant) for titles and a **functional sans-serif**
(Inter/Open Sans) for UI is intentional: it positions Muse as a premium product without
sacrificing the legibility that dense admin data requires.

### Type Scale

| Name | Size | Weight | Line Height | Usage |
|---|---|---|---|---|
| `display` | 48–64px | 700 (Serif) | 1.0 | Marketing hero (`BACKOFFICE`) |
| `page-title` | 24px | 600 | 1.3 | Page headings (`Analytics`, `Museums`) |
| `section-label` | 12px | 600, UPPERCASE, ls: 2px | 1.0 | Column headers, overlines |
| `body` | 14px | 400 | 1.5 | Table row data, descriptions |
| `caption` | 12px | 400 | 1.4 | Timestamps, metadata, helper text |
| `button` | 13px | 600 | 1.0 | Button labels, tab labels |
| `stat-value` | 20–24px | 700 | 1.0 | KPI numbers (visitor count, ticket count) |

### Letter Spacing

- Navigation tab labels: `letter-spacing: 0.04em`
- Table column headers: `letter-spacing: 0.08em` (uppercase)
- Status badges: `letter-spacing: 0.06em`

---

## Layout & Grid System

### Shell Structure

```
┌─────────────────────────────────────────────────────┐
│  TOP NAV BAR (burgundy, 56px tall)                  │
│  [Logo] [Dashboard] [Team] [Museums] [Approved]     │
│         [Daily #]              [Search] [Avatar]     │
├─────────────────────────────────────────────────────┤
│                                                     │
│   MAIN CONTENT AREA (white / off-white)             │
│   • Page header (title + primary CTA button)        │
│   • Filter / search bar row                         │
│   • Data table OR chart grid                        │
│   • Pagination footer                               │
│                                                     │
└─────────────────────────────────────────────────────┘
```

The layout is **full-width**, no sidebar. All navigation lives in the top bar. This maximizes
horizontal space for data-dense tables — the right call for a backoffice with wide tables.

### Content Max-Width

- Content area: `max-width: 1280px`, centered.
- Table containers: full-width within the content area.
- Chart cards: 2-column grid (50% / 50%) on desktop, stacked on tablet.

### Page Header Row

Every page has a consistent header row:
```
[Page Title (left)]                     [Primary CTA Button (right)]
[Breadcrumb or subtitle (left)]         [Secondary actions (right)]
```

---

## Navigation

### Top Navigation Bar

- Background: **Burgundy** (`#7F1425`)
- Height: ~56px
- Left: **Muse logo** (white wordmark) + navigation tabs
- Right: Search bar (white, rounded, ~240px wide) + user avatar circle

### Navigation Tabs

| Tab | Visibility |
|---|---|
| Dashboard | All roles |
| Team | SYSTEM_ADMIN + MUSEUM_ADMIN |
| Museums | SYSTEM_ADMIN only |
| Approved | MUSEUM_ADMIN + SYSTEM_ADMIN |
| Daily # | All roles |

Tab states:
- **Default:** white text, no background
- **Active/Selected:** white text + **white bottom border** (2px) OR burgundy-tinted pill background
- **Hover:** white text at 80% opacity

---

## Pages Overview

### 1. Analytics

**Purpose:** High-level business metrics for the museum.

**Layout:**
- Row of 4–5 KPI stat cards at the top (labeled "Sales Revenue", "Entry Tickets Sold",
  "Estimated Num Visitors Today, Sold", "Guide Tickets, Sold") — each showing a numeric
  value with a gold/red accent.
- Below: 2-column chart grid — both charts are grouped bar charts showing monthly data.
- Chart legend: two series (gold bars and burgundy bars) representing two comparable metrics
  (e.g., Volume vs. Value).
- X-axis: Month abbreviations (Jan → Dec).
- Y-axis: Numeric values, auto-scaled.
- Time range toggle: `All` | `2021` | `2022` | `Custom`

### 2. Museums

**Purpose:** SYSTEM_ADMIN view of all onboarded museums.

**Layout:**
- Search bar (top left) + `+ Add New` button (top right, burgundy)
- Data table with columns: `#`, `Museum Name`, `Location`, `Admin Name`, `Email`, `Status`
- Status column uses color badges (green = Active, red = Inactive)
- Avatar photos for admin names
- Pagination controls at the bottom

### 3. Team

**Purpose:** Manage admin accounts per museum.

**Layout:**
- `Filter by Zone` dropdown + `+ Add New` button
- User data table: Avatar, Name, Email, Phone Number, Date Added, Status badge, Action icons
- Action icons per row: Edit (pencil), Delete (trash)
- Pagination footer

### 4. Daily / Exhibits

**Purpose:** View daily exhibit scheduling and visitor flow.

**Layout:**
- `Search...` bar + filter
- Wide data table: `#`, Museum, Title, Premiere, Location, Duration, Capacity, Status, Description preview
- Inline description excerpts visible in the table (richer than most admin tables)
- Pagination with "Previous / Next" controls

### 5. Settings

**Purpose:** Museum-level configuration.

**Layout:**
- Left: Settings navigation list (General Information, Team, Reviews, Create QR label,
  Tickets, Notification templates, Address, Museum Layout Plans)
- Right: Form panel — input fields, image upload zones, logo section
- Two-column layout (sidebar + form), unlike the full-width tables on other pages

---

## UI Components

### Buttons

| Variant | Background | Text | Border | Use |
|---|---|---|---|---|
| Primary | Burgundy `#7F1425` | White | None | "Add New", Save actions |
| Secondary | White | Burgundy | 1px Burgundy | Cancel, Export |
| Danger | Red `#EF4444` | White | None | Delete, Suspend |
| Ghost | Transparent | Muted Gray | None | Icon-only actions |

Border radius: `6px` on all buttons.
Padding: `8px 16px` for normal, `6px 12px` for compact table row buttons.

### Status Badges

Pill shape (`border-radius: 999px`), small padding (`4px 10px`), 12px font.

| Status | Background | Text |
|---|---|---|
| Active | `#DCFCE7` | `#15803D` |
| Inactive | `#FEE2E2` | `#B91C1C` |
| Pending | `#FEF3C7` | `#B45309` |

### Data Tables

- Header row: off-white background, uppercase column labels, `letter-spacing: 0.08em`
- Body rows: alternating white / off-white (`#F9FAFB`)
- Row height: 48–52px (comfortable for touch and mouse)
- Hover state: subtle blue-gray tint (`#F0F4FF`)
- Divider: `1px solid #E5E7EB` between rows
- Avatar cells: 32×32px circle photo
- Action cells: icon buttons, right-aligned

### Input Fields

- Background: White
- Border: `1px solid #D1D5DB` (default), `1px solid #7F1425` (focused)
- Border radius: `6px`
- Height: `38px`
- Placeholder: Muted gray `#9CA3AF`

### KPI Stat Cards (Analytics)

- White background, subtle shadow
- Bold numeric value (24px, 700 weight)
- Label below in muted gray (12px)
- Gold or burgundy accent bar on the left edge

---

## Data Visualization

### Bar Charts

- **Two series** per chart — gold (`#C08A2E`) and burgundy (`#7F1425`).
- Grouped side-by-side bars (not stacked).
- Grid lines: light gray, horizontal only.
- Axis labels: 11px, muted gray.
- No chart border/frame — floats on white background.
- Legend: two color swatches with "Volume" and "Value" labels (or equivalent).

### Chart Toolbar

- Period selector: `All` | year tabs | `Custom` — renders as a small tab group
- Export button: `Download Report` (top right of chart card, secondary button style)

---

## Spacing & Density

| Context | Value |
|---|---|
| Page padding (left/right) | `24–32px` |
| Section gap | `24px` |
| Card padding | `16–20px` |
| Table cell padding | `12px 16px` |
| Input field gap (forms) | `16px` |
| Nav tab padding | `0 16px` |

The overall density targets **"comfortable"** — not compact (like a trading terminal) and not
spacious (like a marketing site). Every row of a data table must be readable at a glance without
needing to expand it.

---

## Accessibility Notes

- **Contrast:** All text on burgundy must be white (ratio ≥ 4.5:1 for AA compliance).
  Gold on white does not meet AA for small text — gold should only be used for large display
  values (KPI numbers) or decorative elements, not body text.
- **Focus states:** All interactive elements must show a visible focus ring — `2px solid #7F1425`
  offset by `2px` — for keyboard navigation.
- **Status not color-only:** Status badges must include a text label (e.g., "Active") alongside
  the color, not rely on color alone to convey state.
- **Table accessibility:** All data tables must use `<th>` with `scope="col"` for column headers
  and `aria-sort` for sortable columns.
- **Icon buttons:** Icon-only action buttons (edit, delete) must include an `aria-label`.
- **Font sizes:** Minimum 12px for any visible text. Caption text should never go below 11px.

---

## Design Decisions & Rationale

| Decision | Rationale |
|---|---|
| No sidebar | Maximizes horizontal table space — backoffice is table-heavy |
| Burgundy nav on white content | High contrast, strong brand recall without overwhelming the data |
| Serif only for hero text | Signals "premium museum product" without making data harder to read |
| Gold + Burgundy chart pairing | Both colors come from the brand palette — charts feel native, not generic |
| Avatar photos in tables | Humanizes admin/team management; important when overseeing real people |
| Full-width tables | Museum content (title, description, location) requires horizontal space |

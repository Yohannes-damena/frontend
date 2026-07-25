# Adwa Admin Web — Phase 2 Implementation Contract

## 0. Orientation

### What this document is

The implementation contract for **Phase 2 — Shared UI kit** of the Adwa admin web frontend. It is written to be the direct and sufficient input to implementation agents: everything needed to build a component is here, so no implementer needs to re-derive a decision from the specification or from a chat transcript.

For every component it specifies the file path, the full TypeScript props interface, the semantic tokens it consumes for each surface and each interaction state, the keyboard interaction model with its ARIA attributes, how each of the five states renders, and the copy strings it ships. It then specifies the status marker shapes, the Chart.js wrapper, the component gallery, the fixture boundary, the build order, and the open risks.

### Which phase this covers

Phase 2, quoted from the specification:

> Buttons, form fields, filter chips, status badges with marker shapes, tabs, data table with sort and filter and pagination and row selection, bulk-action bar, detail peek panel, modal with focus trap, toast, KPI card, and the Chart.js grouped bar wrapper. Each rendered in both themes on a component gallery route, each with its loading, empty, failure, unauthorized, and integration-pending states.

**Review gate:** a reviewer can operate every component by keyboard alone in both themes and see all five states without navigating the real app.

**Not in this phase:** real screens, fixtures beyond what the gallery needs.

### What a reader should have read first

`admin-web-design.md`, and specifically:

| Section | Why it is load-bearing here |
|---|---|
| 5 — Visual language and tokens | The palette, the plane theming table, the near-black primary button rule, the single-use amber rule, the marker shapes, typography, radius, focus, and the measured contrast rules |
| 6 — Signature element, the readiness spine | Phase 4 work, but it reuses this phase's marker glyphs at miniature scale, which is why the glyphs are built the way they are |
| 7 — Shared components and states | The sixteen-row component table and the five state rules that every component contract below answers to |
| 9 — Voice, motion, and accessibility | The copy rules every shipped string obeys, the motion timings, and the accessibility floor |
| 10 — Data provenance and honesty | Why `KpiCard` and `GroupedBarChart` require a provenance prop and why a null value renders a shell rather than a number |
| 11 — Delivery phases | Phase 2's scope and its exclusions, and the boundaries against Phases 3 to 9 that the fixture set and the router decision below are drawn against |

`non-mobile-platform-scope.md` supplies platform vocabulary — tenant, museum, room, item, narration, adapter, `MUSEUM_ADMIN`, `SYSTEM_ADMIN` — and nothing in this document contradicts it.

### How to read the state contracts

Every component says which of the five states apply and, where a state does not apply, why. That is not padding. The most common error in a kit like this is bolting a `loading` prop onto something that has no loading condition, and the second most common is omitting `unauthorized` from a region that leaks data without it.

---

## 1. Verified state of the project

Phase 1 was **still running while this document was written.** Everything below is split into what was read from disk and what remains provisional. Re-run the precondition checklist in section 13 before starting work.

### 1.1 Confirmed — read directly from disk

**Build and tooling** (`admin-web/package.json`):

```json
"scripts": {
  "dev": "vite",
  "prebuild": "node scripts/tokens.ts --check",
  "build": "tsc -b && vite build",
  "lint": "oxlint",
  "preview": "vite preview",
  "tokens:build": "node scripts/tokens.ts",
  "tokens:check": "node scripts/tokens.ts --check",
  "audit:contrast": "node scripts/audit-contrast.ts"
}
```

| Fact | Value | Consequence for Phase 2 |
|---|---|---|
| Build | `prebuild` runs `tokens.ts --check`, then `tsc -b && vite build` | Token CSS cannot drift from its TypeScript source without failing the build |
| Lint | `oxlint` with `react`, `typescript`, `oxc` plugins; `react/only-export-components` at `warn` | A file exporting a component *and* a context or hook trips the rule; split them |
| React | 19.2.7 | `ref` is a plain prop — `forwardRef` is not used anywhere in the kit. `inert` is supported as a boolean prop |
| Fonts | `@fontsource-variable/inter`, `@fontsource/cormorant-garamond` self-hosted, imported in `main.tsx` | No network font dependency; the kit never declares `font-family` |
| `verbatimModuleSyntax` | on | Every type import must be `import type` or `import { type X }` |
| `allowImportingTsExtensions` | on | Imports carry explicit extensions: `import { Button } from './Button.tsx'` |
| `erasableSyntaxOnly` | on | **No `enum`, no parameter properties, no namespaces.** Unions are string literals or `as const` objects |
| `noUnusedLocals` / `noUnusedParameters` | on | A prop destructured but unused fails the build |
| `types: ["vite/client"]` | on | `*.module.css` is typed with no extra declaration file |
| Router | not installed | See the decision in section 9 |
| `chart.js` / `react-chartjs-2` | not installed | See section 8 |

**Token pipeline** (`admin-web/scripts/tokens.ts`). Four layers generated from `src/tokens/*.ts` into `src/styles/*.css`, with two guards that run on every invocation: `assertUniqueCssVars()` (no two layers may claim the same custom property) and `assertComponentTokensResolve()` (a component token may only point at a semantic, scale, or effect token — never a primitive, never a raw value). Name mangling is `foo.barBaz` → `--foo-bar-baz`.

**R1 is resolved.** `componentsCss()` now emits:

```css
:root,
[data-plane] {
```

with the reasoning in a comment in the generated file. The bare `[data-plane]` attribute selector matches any element carrying the attribute, so the component token block is re-declared inside a nested `[data-plane="control"]` frame and `--panel-surface: var(--surface-raised)` re-resolves there against the control value. **Side-by-side plane framing works, and the gallery's two-frame layout is safe to build on.**

**R2 is resolved.** The scope-band component handles were renamed and no longer collide with the semantic layer. `components.css` now contains `--scope-band-content: var(--scope-band-text);` and `--scope-band-edge-color: var(--scope-band-edge);`. There is no self-referential declaration, and `assertUniqueCssVars()` passes.

**Style entry point** — `src/styles/index.css` imports in this order: `primitives.css`, `semantic.css`, `scales.css`, `components.css`, `base.css`, `typography.css`.

**`base.css` already provides**, and the kit must therefore *not* re-declare:

- A `box-sizing: border-box` reset and body painting from `--surface-canvas` / `--content-primary` / `--font-ui` / `--text-body-*`
- `color-scheme: light` on `:root, [data-plane='tenant']` and `color-scheme: dark` on `[data-plane='control']`
- `[data-plane] { background-color: var(--surface-canvas); color: var(--content-primary); }` — every plane container paints itself
- Heading sizing for `h1`–`h6` from the type scale
- A `button` reset: `cursor: pointer; border: 0; background: none; padding: 0`
- **The 44px floor**: `min-block-size: var(--target-min)` on `button`, `select`, `input:not([type='checkbox']):not([type='radio'])`, and `[role='button']`
- `table { border-collapse: collapse; width: 100% }` and `th { text-align: start }`
- **A global focus ring**: `:focus-visible { outline: var(--focus-ring-width) solid var(--focus-ring-color); outline-offset: var(--focus-ring-offset); }`
- `::selection { background-color: var(--selection-row) }`
- A reduced-motion block that sets `--motion-view: 0ms` and `--motion-inline: 0ms` and forces all animation and transition durations to `0ms`

Two consequences worth stating plainly. **The kit needs no focus-ring utility class** — the global `:focus-visible` rule covers every interactive element, and a component's only obligation is never to remove it. And **any component transition written as `var(--motion-inline)` or `var(--motion-view)` gets reduced-motion handling for free**, because those tokens go to zero under the media query. Only JavaScript-driven animation, which in Phase 2 means Chart.js alone, needs the `useReducedMotion` hook.

**`typography.css` provides global utility classes** the kit should use by name rather than re-declaring: `.text-display`, `.text-title`, `.text-subtitle`, `.text-lead`, `.text-body-large`, `.text-body`, `.text-caption`, `.column-header`, `.numeric` (tabular numerals), and `.museum-name` — the single application of Cormorant Garamond in the product.

**Confirmed token inventory.** All of the following resolve on disk today:

- **Surface** — `--surface-canvas`, `--surface-raised`, `--surface-sunken`, `--surface-sidebar`, `--surface-sidebar-edge`, `--surface-overlay`, `--surface-scrim`
- **Content** — `--content-primary`, `--content-secondary`, `--content-muted`, `--content-on-sidebar`, `--content-on-sidebar-muted`
- **Border** — `--border-hairline`, `--border-control`
- **Accent** — `--accent-mark`, `--accent-fill`, `--accent-on-fill`, `--accent-tint`, `--accent-on-tint`
- **Action** — `--action-primary-fill`, `--action-primary-text`, `--action-secondary-fill`, `--action-secondary-text`, `--action-secondary-border`, `--action-danger-fill`, `--action-danger-text`
- **Feedback** — `--feedback-success`, `--feedback-danger`, `--feedback-warning`, `--feedback-neutral`
- **Selection and focus** — `--selection-row`, `--focus-ring`
- **Status** — `--status-{success,danger,warning,neutral}-tint`, `--status-{…}-on-tint`
- **Scope** — `--scope-band-fill`, `--scope-band-text`, `--scope-band-edge` (semantic); `--scope-band-surface`, `--scope-band-content`, `--scope-band-edge-color`, `--scope-band-edge-width`, `--scope-band-min-height` (component)
- **Elevation** — `--elevation-flat`, `--elevation-soft`
- **Scales** — `--font-ui`, `--font-museum`, `--weight-{regular,medium,semibold,bold}`, `--text-{display,title,subtitle,lead,body-large,body,caption,column-header}-{size,line,weight,tracking}`, `--text-column-header-transform`, `--space-{0-5,1,2,3,4,5,6,8,10}`, `--target-min`, **`--border-hairline-width` (1px)**, **`--border-scope-edge-width` (2px)**, `--radius-{surface,control,round}`, `--focus-{width,offset}`, `--motion-{view,inline,ease}`
- **Component handles** — `--sidebar-*`, `--badge-{success,danger,warning,neutral}-{tint,text}`, `--badge-radius`, `--focus-ring-{color,width,offset}`, `--panel-{surface,border,radius,shadow}`, `--overlay-{surface,scrim,radius}`, `--table-{surface,hairline,header-text,row-selected,row-min-height}`, `--field-{surface,border,text,label,radius,min-height}`

Border widths are now tokens. **The kit writes `var(--border-hairline-width) solid var(--border-hairline)`, never `1px solid …`.**

**The contrast audit exists.** `docs/contrast-audit.md`, generated by `npm run audit:contrast` from `src/audit/contrast-audit.ts`: 106 pairs measured, 97 pass, 2 fail, 3 intentional and mitigated, 4 not applicable. Two results constrain Phase 2 directly and are carried into the risk register as R19 and R20:

| Pair | Ratio | Requirement | Result |
|---|---|---|---|
| Tenant `feedback.warning` `#D97706` on `surface.canvas` `#F4F4F5` | 2.90:1 | 3:1 marks | **Fail** |
| Tenant `focus.ring` `#059669` on `surface.sunken` `#E4E4E7` | 2.97:1 | 3:1 control boundary | **Fail** |

**Phase 1's review harness.** `src/App.tsx` is no longer the old prototype — it is now the Phase 1 token review harness (`src/preview/{PlaneSpecimen,ContrastTable,TokenSwatches,Specimens}.tsx`, `src/preview/useComputedTokens.ts`, `src/styles/preview.css`). `src/App.css`, the old `src/index.css`, and `src/assets/` are gone. **Phase 2 must not delete `App.tsx`.**

### 1.2 Provisional — true when read, may have moved since

- **`.visually-hidden` does not exist anywhere in the project.** Phase 2 owns it. If Phase 1 adds one to `base.css` before Phase 2 starts, use theirs and delete the kit's copy.
- **`"strict": true` is still absent from `tsconfig.app.json`.** See R3.
- **No token-usage linter exists.** `scripts/` holds `tokens.ts` and `audit-contrast.ts` only. See R13.
- The exact contents of `src/tokens/components.ts` group titles, which Phase 2 appends to. Read the file before appending rather than trusting the list in section 4.
- Whether Phase 1 adds further scale tokens. It added `--border-hairline-width` and `--border-scope-edge-width` after the first reading of this project, so assume more may arrive.

### 1.3 Status of the risks raised during review

| Risk | Status | Note |
|---|---|---|
| R1 — component tokens frozen to the root plane | **Resolved** | `:root, [data-plane]` in `componentsCss()`; verified in the generated CSS |
| R2 — `scopeBand.*` colliding with `scope.band.*` | **Resolved** | Renamed to `scopeBand.content` / `scopeBand.edgeColor`; no self-reference |
| R3 — `strict` not enabled | **Still stands** | `tsconfig.app.json` has `noUnusedLocals`, `noUnusedParameters`, `erasableSyntaxOnly`, `noFallthroughCasesInSwitch`, but no `strict` |
| R4 — no `tokens:build` script | **Resolved** | `tokens:build`, `tokens:check`, and a `prebuild` hook running `--check` all present |
| R10 — no `color-scheme` per plane | **Resolved** | `base.css` sets `light` on tenant and `dark` on control |
| R13 — nothing prevents a loose hex or stray amber in component CSS | **Still stands** | The token guards cover the token layers; nothing yet inspects component stylesheets |
| R18 — prototype leftovers | **Resolved, with a changed consequence** | The prototype is gone and `App.tsx` is now Phase 1's harness. Phase 2 mounts the gallery *alongside* it rather than replacing it |

---

## 2. Proposed file structure

```text
admin-web/
  scripts/
    tokens.ts                       Phase 1
    audit-contrast.ts               Phase 1
    check-token-usage.ts            new, Phase 2 (R13)
  src/
    App.tsx                         Phase 1 harness + Phase 2 gallery, behind a hash switch
    kit/
      index.ts                      the only public entry point
      types.ts                      shared unions, KitState, resolveState, Provenance
      kit.css                       .visually-hidden and --control-press-inset
      internal/
        useFocusTrap.ts
        useDismiss.ts               Escape, outside press, focus return
        useRovingTabIndex.ts
        useReducedMotion.ts
        useResolvedTokens.ts        computed-style reader, for canvas painting only
      Button/          Button.tsx  Button.types.ts  Button.module.css  index.ts
      Field/           Field.tsx  TextInput.tsx  TextArea.tsx  Select.tsx  Checkbox.tsx
                       Field.types.ts  Field.module.css  index.ts
      FilterChip/      FilterChip.tsx  FilterChipRow.tsx  FilterChipMenu.tsx  …
      StatusBadge/     StatusBadge.tsx  StatusMarkerGlyph.tsx  …
      Tabs/            Tabs.tsx  TabPanel.tsx  …
      DataTable/       DataTable.tsx  useDataTable.ts  TableToolbar.tsx
                       ColumnHeaderButton.tsx  TableSkeleton.tsx  …
      Pagination/      Pagination.tsx  …
      BulkActionBar/   BulkActionBar.tsx  …
      PeekPanel/       PeekPanel.tsx  …
      Modal/           Modal.tsx  ConfirmDialog.tsx  …
      Toast/           ToastProvider.tsx  ToastRegion.tsx  toastContext.ts  useToast.ts  …
      KpiCard/         KpiCard.tsx  ProvenanceTag.tsx  …
      Chart/           GroupedBarChart.tsx  chartSetup.ts  ChartDataTable.tsx  SeriesToggle.tsx
      Panel/           Panel.tsx  IntegrationPendingPanel.tsx  …
      State/           StateBlock.tsx  Skeleton.tsx  …
    gallery/
      Gallery.tsx
      GalleryNav.tsx
      GallerySpecimen.tsx
      PlaneFrame.tsx
      StateSwitcher.tsx
      useHashSection.ts
      specimens/<Component>.specimen.tsx
      fixtures/
    preview/                        Phase 1
    tokens/                         Phase 1
    styles/                         Phase 1, generated
    audit/                          Phase 1
```

**Decisions embedded in the structure.**

*One folder per component, one `index.ts` barrel, one top-level `src/kit/index.ts`.* The gallery and every later phase import from the kit barrel only, so internal file moves are never breaking changes.

*CSS Modules (`*.module.css`), not global class names and not inline styles.* Vite types `*.module.css` through `vite/client` with no extra setup; module scope makes collisions between eleven parallel-authored components impossible; and a `.css` file is greppable for the no-hex check in a way that a `style={{}}` object is not. **Inline `style` is permitted for exactly one purpose — passing a dynamic scalar into a custom property**, for example `style={{ '--rows': String(n) }}` — and never for a colour.

*Global type utilities are used by name.* A component that needs column-header type writes `className={`column-header ${styles.header}`}` rather than re-declaring the four type custom properties. Re-declaring them is how a type scale drifts.

*Types live in `<Component>.types.ts`, separate from the implementation.* This is what makes the build order in section 12 parallel: the types land in one small drop and dependent workstreams compile against them before the implementations exist.

---

## 3. Shared contracts

### 3.1 `src/kit/types.ts`

```ts
import type { ReactNode } from 'react'

/** The four status families. Each has a fixed marker shape; see StatusBadge. */
export type StatusTone = 'success' | 'warning' | 'danger' | 'neutral'

/** The four marker shapes from admin-web-design.md section 5. */
export type StatusMarker = 'dot' | 'ring' | 'cross' | 'dash'

/** Section 10: no figure is rendered without saying where it came from. */
export type Provenance = 'live' | 'demo' | 'pending'

/** A labelled thing the user can do from inside a state message. */
export type StateAction = {
  readonly label: string
  readonly onAct: () => void
}

/**
 * The five states from section 7, plus `ready`. Required fields are required
 * on purpose: a failure cannot compile without saying what broke, and an
 * integration-pending state cannot compile without naming its dependency.
 */
export type KitState =
  | { readonly kind: 'ready' }
  | { readonly kind: 'loading'; readonly label?: string }
  | {
      readonly kind: 'empty'
      readonly title: string
      readonly body?: string
      readonly action?: StateAction
    }
  | {
      readonly kind: 'failure'
      readonly title: string
      readonly body: string
      readonly retry?: StateAction
    }
  | {
      readonly kind: 'unauthorized'
      readonly title: string
      readonly body: string
    }
  | {
      readonly kind: 'integrationPending'
      readonly dependency: string
      readonly body: string
      readonly stillUsable?: string
    }

export type StateKind = KitState['kind']

/** Highest first. Every component resolves conflicts in this order. */
export const STATE_PRECEDENCE = [
  'unauthorized',
  'integrationPending',
  'failure',
  'loading',
  'empty',
  'ready',
] as const satisfies readonly StateKind[]

export function resolveState(...candidates: readonly (KitState | undefined)[]): KitState {
  for (const kind of STATE_PRECEDENCE) {
    const hit = candidates.find((candidate) => candidate?.kind === kind)
    if (hit !== undefined) return hit
  }
  return { kind: 'ready' }
}

export const READY: KitState = { kind: 'ready' }

/** Sizes never go below the 44px target; density changes padding, not height. */
export type ControlSize = 'md' | 'lg'
export type Density = 'comfortable' | 'compact'

export type WithChildren = { readonly children: ReactNode }
```

**Decision — precedence is unauthorized > integrationPending > failure > loading > empty > ready.** A role limit outranks everything, because showing a loading skeleton for data the user may never see implies the data exists. Integration-pending outranks failure because a missing contract is not a fault to retry.

**Decision — every state-bearing component takes one `state?: KitState` prop defaulting to `{ kind: 'ready' }`,** never a set of booleans. Booleans permit `loading && failure`, and eleven components would each resolve that differently.

### 3.2 `src/kit/kit.css`

The only global stylesheet the kit owns. Imported once from `src/kit/index.ts`.

```css
/*
 * Kit-level globals. Everything else lives in a CSS module.
 * base.css already supplies the reset, the 44px floor, the :focus-visible ring
 * and the reduced-motion block, so none of that is repeated here.
 */

.visually-hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  margin: -1px;
  padding: 0;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
  border: 0;
}

/* One shared press treatment, so no button variant needs a third fill step. */
:root,
[data-plane] {
  --control-press-inset: inset 0 1px 2px var(--zinc-950-a40);
}
```

If Phase 1 later moves `.visually-hidden` into `base.css`, delete it here rather than shadowing it.

### 3.3 Rules every workstream follows

1. **No raw colour anywhere** under `src/kit/` or `src/gallery/`. No hex, no `rgb()`, no named colours, no `style={{ color }}`. Every colour is `var(--token)`.
2. **No `font-family` declaration in the kit.** Inter arrives from `base.css`. Cormorant arrives only through `.museum-name`, applied to a museum name, in the components that legitimately take one.
3. **Never remove the focus ring.** `base.css` supplies it globally; a component's only job is not to set `outline: none` and not to clip it with `overflow: hidden` on a wrapper that hugs the control.
4. **44px minimum interactive target, in both axes.** `base.css` gives `min-block-size`; icon-only controls must also set `min-inline-size: var(--target-min)`. Visual size may be smaller — a 16px checkbox — but the hit area may not.
5. **All spacing from `--space-*`.** `--space-0-5` (4px) only for icon-to-label gaps.
6. **Borders use the width tokens**: `var(--border-hairline-width) solid var(--border-hairline)`.
7. **Nothing with text below `--text-caption-size`** (12px).
8. **Radius**: `--radius-surface` (8px) for cards, panels, buttons, peek panel, bulk bar; `--radius-control` (6px) for chips, inputs, selects; `--radius-round` for avatars and status pills.
9. **Transitions use `var(--motion-inline)` for inline feedback and `var(--motion-view)` for anything that moves a panel**, with `var(--motion-ease)`. Both go to zero under reduced motion automatically.
10. **No component reads `data-plane`, accepts a `plane` prop, or branches on a theme.** One kit, themed by inheritance. There is never a tenant variant and a control variant of anything. The single exception is `GroupedBarChart`, which paints to a canvas and must resolve tokens to concrete strings — and even there the plane is a repaint trigger, never a colour source.
11. **No amber as chrome.** `--status-warning-tint` behind a badge label is the only amber-family value the kit may touch. No `--scope-*`, no `--amber-*` fills.
12. **New tokens go through `src/tokens/` and a regeneration.** Generated CSS is never hand-edited.

---

## 4. Token additions Phase 2 must introduce

The specification names no token for hover, active, row hover, skeletons, tabs, chips-as-distinct-from-fields, or chart series. Each gap is flagged below with the addition Phase 2 makes to `src/tokens/semantic.ts` and `src/tokens/components.ts`.

### 4.1 New semantic tokens

| New token | Tenant | Control | Why |
|---|---|---|---|
| `surface.hover` | `zinc.100` | `zinc.800` | Section 7 requires row hover and names no token. Also serves ghost buttons, menu options, tab hover |
| `surface.shimmer` | `zinc.300` | `zinc.700` | Skeleton sheen. No skeleton token exists |
| `action.primary.fillHover` | `zinc.800` | `zinc.200` | Hover on near-black / near-white. White on `#27272A` is 14.5:1; `#09090B` on `#E4E4E7` is 15.6:1 |
| `action.secondary.fillHover` | `zinc.100` | `zinc.800` | Same value as `surface.hover`, kept separate so a later divergence is a one-line change |
| `action.danger.fillHover` | `red.800` | `red.800` | White on `#991B1B` is 7.06:1, clears AA for the button label |

All five resolve to primitives that already exist. **The locked primitive layer is not touched.**

**Decision — hover gets a fill step; active gets a shared inset shadow, not a third fill.** An active fill for every variant would need `red.700`, which is not in the locked scale. `--control-press-inset` gives an unambiguous pressed read on all four variants from an existing translucent primitive.

### 4.2 New effect token

| Token | Tenant | Control |
|---|---|---|
| `elevation.pressInset` | `inset 0 1px 2px var(--zinc-950-a08)` | `inset 0 1px 2px var(--zinc-950-a40)` |

### 4.3 New component tokens

Appended to `componentGroups` in `src/tokens/components.ts`. Each resolves to a semantic, scale, or effect token, per that file's own guard.

**Button** — `button.radius`→`radius.surface`, `button.minHeight`→`target.min`, `button.primary.{fill,text,fillHover}`, `button.secondary.{fill,text,border,fillHover}`, `button.ghost.text`→`content.primary`, `button.ghost.fillHover`→`surface.hover`, `button.danger.{fill,text,fillHover}`, `button.disabled.fill`→`surface.sunken`, `button.disabled.text`→`content.muted`, `button.disabled.border`→`border.hairline`.

**Chip** — `chip.{fill,text,border,hoverFill}`, `chip.selected.fill`→`accent.tint`, `chip.selected.text`→`accent.onTint`, `chip.selected.border`→`accent.mark`, `chip.radius`→`radius.control`, `chip.minHeight`→`target.min`. Kept separate from `field.*` because chips have a selected state fields never have.

**Table** — `table.rowHover`→`surface.hover`, `table.headerSurface`→`surface.raised`, `table.cellText`→`content.primary`, `table.cellTextMuted`→`content.secondary`, `table.sortIcon`→`content.muted`, `table.sortIconActive`→`accent.mark`, `table.selectionBar`→`accent.mark`.

**Tabs** — `tab.text`→`content.secondary`, `tab.textActive`→`content.primary`, `tab.indicator`→`accent.mark`, `tab.hoverFill`→`surface.hover`, `tab.minHeight`→`target.min`.

**Skeleton** — `skeleton.base`→`surface.sunken`, `skeleton.sheen`→`surface.shimmer`.

**Toast** — `toast.surface`→`surface.overlay`, `toast.border`→`border.hairline`, `toast.text`→`content.primary`, `toast.radius`→`radius.surface`, `toast.shadow`→`elevation.soft`, `toast.mark.{success,danger,neutral}`→`feedback.*`.

**KPI** — `kpi.surface`→`surface.raised`, `kpi.border`→`border.hairline`, `kpi.label`→`content.secondary`, `kpi.value`→`content.primary`, `kpi.radius`→`radius.surface`, `kpi.provenanceTint`→`status.neutral.tint`, `kpi.provenanceText`→`status.neutral.onTint`.

**Chart** — `chart.series.primary`→`accent.mark`, `chart.series.comparison`→`feedback.neutral`, `chart.grid`→`border.hairline`, `chart.axisText`→`content.secondary`, `chart.tooltipSurface`→`surface.overlay`, `chart.tooltipText`→`content.primary`, `chart.tooltipBorder`→`border.hairline`.

**Bulk bar** — `bulkBar.surface`→`surface.overlay`, `bulkBar.border`→`border.control` (a floating white bar over white content needs a boundary that clears 3:1, which a hairline does not), `bulkBar.radius`→`radius.surface`, `bulkBar.shadow`→`elevation.soft`, `bulkBar.count`→`content.primary`.

**Reused, no new tokens:** Modal and PeekPanel both consume `overlay.surface`, `overlay.scrim`, `overlay.radius`, `panel.border`, `panel.shadow`. Two overlays with identical treatment do not need two token sets.

### 4.4 Contrast audit rows to add

The five new semantic tokens introduce text-on-fill pairs that the audit does not yet measure. Extend `src/audit/contrast-audit.ts` and regenerate:

- `action.primary.text` on `action.primary.fillHover`, both planes
- `action.secondary.text` on `action.secondary.fillHover`, both planes
- `action.danger.text` on `action.danger.fillHover`, both planes
- `content.primary` and `content.secondary` on `surface.hover`, both planes
- `focus.ring` against `surface.hover`, both planes, as a control boundary

This is an edit to a Phase 1 file. Coordinate rather than racing it.

---

## 5. Component contracts

Ordering: foundation, then the twelve Phase 2 components, then the four section 7 components owned by later phases.

### 5.0 Foundation — `StateBlock`, `Skeleton`, marker glyphs

**Path:** `src/kit/State/StateBlock.tsx`, `src/kit/State/Skeleton.tsx`

```ts
// src/kit/State/State.types.ts
import type { ReactNode } from 'react'
import type { KitState } from '../types.ts'

export type StateBlockProps = {
  /** Non-ready state to render. `ready` renders nothing. */
  readonly state: KitState
  /** Sized to the region it replaces, so layout never jumps. */
  readonly size?: 'inline' | 'region' | 'page'
  /** Named skeleton regions the loading state should draw. */
  readonly skeleton?: ReactNode
  /** Announced politely when the state changes. Default true. */
  readonly announce?: boolean
  readonly id?: string
}

export type SkeletonProps = {
  /** Names the region, e.g. "table rows". Used for the aria-busy label. */
  readonly region: string
  readonly shape?: 'text' | 'line' | 'block' | 'pill' | 'circle'
  readonly lines?: number
  readonly width?: string
  readonly height?: string
}
```

**Tokens.** Surface `--panel-surface`; border `var(--border-hairline-width) solid var(--panel-border)`; title `--content-primary` at `.text-subtitle`; body `--content-secondary` at `.text-body`; state marker `--feedback-danger` (failure), `--content-muted` (unauthorized), `--feedback-neutral` (integration pending), `--accent-mark` (empty). Skeleton `--skeleton-base` with a `--skeleton-sheen` sweep. No hover, active, selected, disabled, or focus state — the only interactive element is the optional action, which is a `Button`.

**Keyboard and ARIA.** No focusable chrome of its own; the optional action button is the only tab stop and comes last in DOM order. `role="status"` with `aria-live="polite"` for `loading` and `empty`; `role="alert"` for `failure`; `role="status"` for `unauthorized` and `integrationPending`. The loading wrapper sets `aria-busy="true"` and `aria-label={`Loading ${region}`}`, and its skeleton children are `aria-hidden="true"`, so a screen reader hears one "Loading rooms" rather than nine empty boxes.

**States.** This is the state renderer; all five apply by definition.

**Copy shipped, overridable:**

- Failure — `Something did not load` / `The request failed. Try again, or reload the page.` / action `Try again`
- Unauthorized — `You do not have access to this` / `Your role does not include this data. Ask a system administrator if you need it.`
- Integration pending — eyebrow `Integration pending`, title `{dependency} is not connected yet`, body from the caller, optional footer `Everything else on this page still works.`
- Empty ships **no default**. A generic empty state is a shrug, and the specification forbids shrugs. `title` is required on the `empty` variant so the caller must write the invitation.

---

### 5.1 Button

**Path:** `src/kit/Button/Button.tsx`

```ts
// src/kit/Button/Button.types.ts
import type { MouseEvent, ReactNode, Ref } from 'react'

export type ButtonTone = 'primary' | 'secondary' | 'ghost' | 'danger'

/** md = 44px, lg = 52px. There is no small button: 44px is the floor. */
export type ButtonSize = 'md' | 'lg'

type ButtonBase = {
  readonly tone?: ButtonTone
  readonly size?: ButtonSize
  /** Narrows horizontal padding only. Height never drops below 44px. */
  readonly compact?: boolean
  readonly fullWidth?: boolean
  readonly type?: 'button' | 'submit' | 'reset'
  readonly disabled?: boolean
  /**
   * Rendered as a tooltip and as aria-describedby text. Use for pending
   * integrations only. A control the user's role forbids is not disabled —
   * it is absent (spec section 8.5).
   */
  readonly disabledReason?: string
  /** Shows a spinner and sets aria-busy. The label does not change. */
  readonly busy?: boolean
  readonly onClick?: (event: MouseEvent<HTMLButtonElement>) => void
  readonly ref?: Ref<HTMLButtonElement>
  readonly id?: string
  readonly className?: string
  readonly 'aria-describedby'?: string
  readonly 'aria-expanded'?: boolean
  readonly 'aria-controls'?: string
  readonly 'aria-haspopup'?: 'dialog' | 'listbox' | 'menu' | true
  readonly 'aria-pressed'?: boolean
  readonly 'data-testid'?: string
}

export type ButtonProps =
  | (ButtonBase & {
      readonly children: ReactNode
      readonly leadingIcon?: ReactNode
      readonly trailingIcon?: ReactNode
      readonly iconOnly?: false
    })
  | (ButtonBase & {
      readonly iconOnly: true
      /** Required: an icon-only button cannot ship without an accessible name. */
      readonly label: string
      readonly icon: ReactNode
      readonly children?: never
    })
```

**Tokens.**

| Surface | Token |
|---|---|
| primary fill / text | `--button-primary-fill` / `--button-primary-text` |
| primary hover | `--button-primary-fill-hover` |
| secondary fill / text / border | `--button-secondary-fill` / `--button-secondary-text` / `--button-secondary-border` |
| secondary hover | `--button-secondary-fill-hover` |
| ghost text / hover fill | `--button-ghost-text` / `--button-ghost-fill-hover`; no border |
| danger fill / text / hover | `--button-danger-fill` / `--button-danger-text` / `--button-danger-fill-hover` |
| active, all tones | base fill plus `box-shadow: var(--control-press-inset)` |
| disabled fill / text / border | `--button-disabled-fill` / `--button-disabled-text` / `--button-disabled-border` |
| focus | the global `:focus-visible` ring; do not re-declare, do not remove |
| radius / min height / label | `--button-radius` (8px) / `--button-min-height` (44px) / `.text-body` at `--weight-medium` |
| selected | *not applicable* — a button has no selected state; use `FilterChip` or `Tabs` |

> **The thing implementers get wrong.** `tone="primary"` is **near-black on the light plane and near-white on the dark plane**, from `--button-primary-fill` → `action.primary.fill` (`zinc.900` / `zinc.50`). It is **never emerald.** Emerald belongs to status, data, selection, and the focus ring only. If a Save button is green, the palette has spent its one accent and `feedback.success` stops meaning anything. `tone="danger"` is `#DC2626` with white text **on both planes** — danger does not invert. The only emerald a Button ever paints is its focus ring.

**Keyboard and ARIA.** A real `<button>`; Enter and Space activate natively; one tab stop. Disabled uses the `disabled` attribute rather than `aria-disabled`, because a disabled Button in this product always means "pending integration", never "you may not", and pending controls should not be in the tab order. When `disabledReason` is set, the reason renders in a `.visually-hidden` span referenced by `aria-describedby` on a wrapper — a disabled button is not reliably described by assistive technology — and also as a `title`. `busy` sets `aria-busy="true"` and keeps the button focusable and labelled with the same words. `iconOnly` renders `aria-label={label}` with the icon `aria-hidden`, and sets `min-inline-size: var(--target-min)`.

**States.** `loading` — not applicable as a `KitState`; a button's in-flight condition is `busy`, which preserves the label rather than replacing the control. `empty`, `failure`, `unauthorized`, `integrationPending` — **none apply.** A button is not a data region: an unauthorized action is absent, a failed action produces a Toast, and a pending integration is `disabled` plus `disabledReason`. This is the reference case for the "say which do not apply and why" requirement.

**Copy.** Ships none. The label is the caller's verb, and it must be the same word through the whole flow — the control that says `Publish` produces a toast that says `Published`. `busy` deliberately has no "Saving…" swap for that reason.

---

### 5.2 Form field family

**Path:** `src/kit/Field/` — `Field.tsx` (label, hint, error, required scaffolding), `TextInput.tsx`, `TextArea.tsx`, `Select.tsx`, `Checkbox.tsx`

```ts
// src/kit/Field/Field.types.ts
import type { ChangeEvent, ReactNode, Ref } from 'react'

/** Props the Field computes and the control must spread onto its element. */
export type FieldControlProps = {
  readonly id: string
  readonly 'aria-describedby': string | undefined
  readonly 'aria-invalid': true | undefined
  readonly 'aria-required': true | undefined
  readonly disabled: boolean
  readonly readOnly: boolean
}

export type FieldProps = {
  readonly id: string
  readonly label: string
  /** Persistent guidance. Stays visible when an error appears. */
  readonly hint?: string
  /** Validation message. Its presence sets aria-invalid on the control. */
  readonly error?: string
  readonly required?: boolean
  /** Marks optional fields instead of required ones, for mostly-optional forms. */
  readonly markOptional?: boolean
  readonly readOnly?: boolean
  readonly disabled?: boolean
  readonly disabledReason?: string
  readonly labelHidden?: boolean
  readonly children: (control: FieldControlProps) => ReactNode
}

export type TextInputProps = {
  readonly value: string
  readonly onChange: (value: string) => void
  readonly placeholder?: string
  readonly inputMode?: 'text' | 'numeric' | 'email' | 'search' | 'url'
  readonly type?: 'text' | 'email' | 'password' | 'search' | 'number' | 'url'
  readonly maxLength?: number
  readonly autoComplete?: string
  readonly leadingIcon?: ReactNode
  /** Renders a clear button when non-empty. Search fields only. */
  readonly clearable?: boolean
  readonly clearLabel?: string
  /** Keyboard hint pill rendered inside the field, e.g. "⌘K". */
  readonly shortcutHint?: string
  readonly ref?: Ref<HTMLInputElement>
} & FieldControlProps

export type TextAreaProps = {
  readonly value: string
  readonly onChange: (value: string) => void
  readonly rows?: number
  readonly maxLength?: number
  /** Shows "220 of 500" beneath. Requires maxLength. */
  readonly showCount?: boolean
  readonly ref?: Ref<HTMLTextAreaElement>
} & FieldControlProps

export type SelectOption = {
  readonly value: string
  readonly label: string
  readonly disabled?: boolean
}

export type SelectProps = {
  readonly value: string
  readonly onChange: (value: string) => void
  readonly options: readonly SelectOption[]
  readonly placeholder?: string
  readonly ref?: Ref<HTMLSelectElement>
} & FieldControlProps

export type CheckboxProps = {
  readonly checked: boolean
  /** Header select-all uses this; sets the DOM indeterminate property. */
  readonly indeterminate?: boolean
  readonly onChange: (checked: boolean, event: ChangeEvent<HTMLInputElement>) => void
  readonly label: string
  readonly labelHidden?: boolean
  readonly disabled?: boolean
  readonly ref?: Ref<HTMLInputElement>
  readonly id?: string
  readonly 'aria-describedby'?: string
}
```

**Decision — `Select` is a native `<select>`.** Keyboard behaviour, type-ahead, and touch pickers come free and are impossible to regress. `base.css` already gives it the 44px floor and `color-scheme` makes its UA chrome correct per plane. A custom listbox appears in exactly one place, the filter chip menu, which needs multi-select and a value summary that `<select multiple>` cannot express well.

**Tokens.** Control surface `--field-surface`; text `--field-text`; border `var(--border-hairline-width) solid var(--field-border)` (`border.control`, chosen because it clears 3:1 where a light hairline does not); radius `--field-radius` (6px); min height `--field-min-height` (44px). Label `--field-label` at `.text-caption` weight `--weight-semibold`. Hint `--content-secondary` at `.text-caption` — **not** `--content-muted`, which the specification forbids for body copy. Error text and border `--feedback-danger`, with the cross glyph as its marker. Hover border `--content-secondary`. Focus: the global ring; the border does not change. Disabled: fill `--surface-sunken`, text and label `--content-muted`, border `--border-hairline`. Read-only: fill `--surface-sunken`, text `--content-primary`, border `--border-hairline`, no focus-within emphasis but still focusable and selectable. Checkbox: unchecked border `--field-border` on `--field-surface`; checked fill `--accent-fill` with an `--accent-on-fill` tick; indeterminate the same fill with a dash glyph; `--radius-control` on the 16px box.

**Keyboard and ARIA.** Every control is native. `<label for>` binds the visible label; `labelHidden` keeps the `<label>` in the DOM with `.visually-hidden` rather than swapping to `aria-label`. Hint and error are two elements joined into `aria-describedby` in that order, so the error is heard last. `error` sets `aria-invalid="true"`, and the error container is `role="alert"` only when the error appears after first blur — a form that shouts on mount is hostile. Required uses `aria-required` plus a visible `Required` word, never a bare asterisk. `clearable` renders a **sibling** button after the input inside the field shell, never nested inside it, with `aria-label={clearLabel}`; Escape inside the input clears it as a shortcut. `shortcutHint` is `aria-hidden` — the shortcut itself is registered by the shell in Phase 3. Checkbox hit area: the 16px box sits inside a 44×44 padded `<label>`, so the density the specification wants and the 44px floor both hold.

**States.** `loading` — applies, as a skeleton the exact height of the control plus its label, so a form does not reflow when values arrive. `empty` — not applicable; a field with no value is a placeholder, not an empty state. `failure` — not applicable at field level; a failed *save* is a Toast, a failed *value* is `error`. `unauthorized` — not applicable; role-forbidden fields are absent. `integrationPending` — applies: `disabled` plus `disabledReason`, for example a voice `Select` before the provider is wired. The value area then shows an em dash, never a plausible fabricated value.

**Copy.** `Required`, `Optional`, `Read only`, `Clear`, `{n} of {max}`, and for a pending control `Not editable until {dependency} is connected.`

---

### 5.3 Filter chip and filter chip row

**Path:** `src/kit/FilterChip/FilterChip.tsx`, `FilterChipRow.tsx`, `FilterChipMenu.tsx`

```ts
// src/kit/FilterChip/FilterChip.types.ts
import type { ReactNode } from 'react'
import type { KitState } from '../types.ts'

export type FilterOption = {
  readonly value: string
  readonly label: string
  readonly count?: number
}

export type FilterChipProps = {
  readonly id: string
  /** The dimension, e.g. "Status". Always visible, selected or not. */
  readonly label: string
  readonly options: readonly FilterOption[]
  readonly selected: readonly string[]
  readonly onChange: (next: readonly string[]) => void
  readonly multiple?: boolean
  /** Default: one selection shows its label, more shows "Status: 3". */
  readonly summarize?: (selected: readonly FilterOption[]) => string
  readonly disabled?: boolean
  readonly disabledReason?: string
  /** Options can load or fail independently of the page. */
  readonly state?: Extract<KitState, { kind: 'ready' | 'loading' | 'failure' }>
}

export type FilterChipRowProps = {
  /** Accessible name for the group, e.g. "Filter rooms". */
  readonly label: string
  readonly children: ReactNode
  readonly activeCount: number
  readonly onClearAll: () => void
  /** Rendered at the row end, e.g. an "All filters" overflow trigger. */
  readonly overflow?: ReactNode
}
```

**Tokens.** Idle: fill `--chip-fill`, text `--chip-text`, border `var(--border-hairline-width) solid var(--chip-border)`, radius `--chip-radius` (6px), min height `--chip-min-height` (44px), label `.text-body`. Hover `--chip-hover-fill`. Active `var(--control-press-inset)`. Selected: fill `--chip-selected-fill` (`accent.tint`), text `--chip-selected-text` (`accent.onTint` — the verified `#065F46` on `#D1FAE5` pair), border `--chip-selected-border` (`accent.mark`). Disabled `--button-disabled-*`. Focus: the global ring, independently on the chip button and on the clear button. Open menu: `--overlay-surface`, `--panel-border`, `--panel-shadow`, `--overlay-radius`; option hover `--surface-hover`; option tick `--accent-mark`.

**Keyboard and ARIA.** The chip shell is a `<div>` containing **two sibling buttons**, never a button inside a button: the trigger and, only when something is selected, a clear button. Trigger: `aria-haspopup="listbox"`, `aria-expanded`, `aria-controls`. Enter, Space, Down, or Alt+Down opens the menu and moves focus to the first option, or to the first selected option. Menu: `role="listbox"` with `aria-multiselectable` when `multiple`; options are `role="option"` with `aria-selected`; Up and Down move, Home and End jump, printable characters type-ahead, Enter or Space toggles — single-select closes and returns focus to the trigger, multi-select stays open — Tab commits and closes, Escape closes and returns focus to the trigger with the selection unchanged. Clear button: `aria-label={`Clear ${label} filter`}`; after clearing, focus moves to the trigger, because the clear button itself disappears. The row is `role="group"` with `aria-label`, and clear-all is the last tab stop in the group. Below 1024px the row scrolls horizontally with `overflow-x: auto`; because every chip is a real focusable button, the browser scrolls it into view on Tab and no custom scroll logic is needed.

**States.** `loading` — applies: chips render at full size with a skeleton where the summary goes, so the row does not reflow. `failure` — applies at chip level: the trigger disables and `disabledReason` reads `Filter options did not load.`, with the row-level retry. `empty` — not applicable; a filter with no options should not be rendered by the caller. `unauthorized` — not applicable; a filter over data a role cannot see is absent. `integrationPending` — applies: disabled trigger, reason names the dependency.

**Copy.** `All` (shown after the label as `Status: All`), `{label}: {n}` for multi-select, `Clear {label} filter`, `Clear all filters`, `{n} filters applied`, `Filter options did not load.`, `Try again`.

---

### 5.4 Status badge

**Path:** `src/kit/StatusBadge/StatusBadge.tsx`, `StatusMarkerGlyph.tsx`

```ts
// src/kit/StatusBadge/StatusBadge.types.ts
import type { StatusMarker, StatusTone } from '../types.ts'

export type StatusBadgeProps = {
  readonly tone: StatusTone
  /** Always rendered. There is deliberately no prop to hide it. */
  readonly label: string
  /** Overrides the tone default only where the spec's mapping demands it. */
  readonly marker?: StatusMarker
  /** Longer explanation, e.g. "Suspended on 12 June by an operator". */
  readonly detail?: string
  readonly id?: string
}

export type StatusMarkerGlyphProps = {
  readonly marker: StatusMarker
  /** Box size in px. 12 in badges, 8 in the miniaturised spine (Phase 4). */
  readonly size?: 8 | 12 | 16
}

export const TONE_MARKER: Readonly<Record<StatusTone, StatusMarker>> = {
  success: 'dot',
  warning: 'ring',
  danger: 'cross',
  neutral: 'dash',
}
```

**Tokens.** Tint `--badge-{tone}-tint`; label and marker both `--badge-{tone}-text`; radius `--badge-radius` (`radius.round`); label `.text-caption` at `--weight-semibold`; padding `--space-0-5` vertical, `--space-1` horizontal, `--space-0-5` between marker and label. No hover, active, selected, disabled, or focus state: **the badge is not interactive.** If a status needs to be clickable, the caller wraps it in a `Button tone="ghost"`, which supplies the ring.

**Decision — the marker inherits the label colour rather than taking `feedback.*`, and the contrast audit now proves this was necessary.** The `status.*.onTint` steps are the pairs the specification measured against the tint. Painting the marker in `feedback.warning` `#D97706` would put it at 2.90:1 against the light canvas — a measured **failure** in `docs/contrast-audit.md`. Using `currentColor` makes the marker inherit a verified pair, guarantees the 3:1 graphic floor, and removes four tokens.

**Keyboard and ARIA.** Not focusable, not in the tab order. A `<span>` with the marker as `<svg aria-hidden="true" focusable="false">` and the label as real text, so the accessible name is the text itself and no `aria-label` is needed. When `detail` is present it renders in a `.visually-hidden` span inside the badge, appended to the accessible name. Never `title` alone: a tooltip is not reachable by keyboard.

**States.** None of the five apply. A badge *is* a rendered state; it has no independent loading, empty, failure, unauthorized, or pending condition. When the underlying status is unknown, the caller renders `tone="neutral" label="Unknown"` or a `Skeleton shape="pill"`. The badge never renders a guess. Do not add a `state` prop here.

**Copy.** Ships the marker mapping, not the words. Labels come from the domain — `Ready`, `Pending`, `Suspended`, `Draft`, `Active`, `Failed`, `Not started`. `Unknown` is the only default.

---

### 5.5 Tabs

**Path:** `src/kit/Tabs/Tabs.tsx`, `TabPanel.tsx`

```ts
// src/kit/Tabs/Tabs.types.ts
import type { ReactNode } from 'react'

export type TabItem = {
  readonly id: string
  readonly label: string
  /** Count badge, e.g. unanswered questions. Omit for zero. */
  readonly count?: number
  readonly disabled?: boolean
  readonly disabledReason?: string
}

export type TabsProps = {
  /** Accessible name for the tablist, e.g. "Room details". */
  readonly label: string
  readonly items: readonly TabItem[]
  readonly activeId: string
  readonly onChange: (id: string) => void
  /**
   * 'automatic' switches on arrow key. 'manual' requires Enter or Space.
   * Default 'automatic'; use 'manual' when a panel triggers a fetch.
   */
  readonly activation?: 'automatic' | 'manual'
  /** Prefix for the generated tab/panel id pair. Defaults to useId(). */
  readonly idPrefix?: string
  readonly variant?: 'underline' | 'enclosed'
  readonly children?: ReactNode
}

export type TabPanelProps = {
  readonly tabId: string
  readonly idPrefix: string
  readonly active: boolean
  readonly children: ReactNode
}
```

**Tokens.** Idle label `--tab-text`; active label `--tab-text-active` at `--weight-semibold`; 2px active indicator `--tab-indicator` (`accent.mark`); hover `--tab-hover-fill`; strip bottom border `var(--border-hairline-width) solid var(--border-hairline)`; min height `--tab-min-height` (44px); count badge `--badge-neutral-tint` / `--badge-neutral-text`; disabled `--content-muted`; the global focus ring on the tab, and on the panel when it scrolls. The selected state is the indicator **plus** the weight change — never colour alone, for the same reason status markers exist.

**Keyboard and ARIA.** The standard tablist pattern, no deviations. `role="tablist"` with `aria-label` and `aria-orientation="horizontal"`. Each tab is a `<button role="tab">` with `aria-selected`, `aria-controls={`${idPrefix}-panel-${id}`}`, and `id={`${idPrefix}-tab-${id}`}`. **Roving tabindex:** the active tab is `tabIndex={0}`, all others `tabIndex={-1}`, so the strip is one tab stop. Left and Right move focus and wrap; Home and End jump to first and last; disabled tabs are skipped; in `automatic` mode arrow movement also calls `onChange`; in `manual` mode Enter or Space commits. Tab from the active tab moves into the panel. The panel is `role="tabpanel"` with `aria-labelledby` pointing at its tab and `tabIndex={0}` so it can be focused and scrolled by keyboard. Only the active panel is mounted, which keeps the accessibility tree honest about what exists.

**States.** `loading` — applies to the strip when the tab set itself is unknown, for example a peek panel opening before its record loads: render skeleton pills at tab width. Panel content states belong to the panel. `empty` — not applicable; a tablist with no tabs is not rendered. `failure` and `unauthorized` — not applicable at strip level; a tab whose data a role cannot see is absent from `items`, which is the isolation guarantee working correctly. `integrationPending` — applies per tab: `disabled` with a reason, and the panel, if reachable, shows the `IntegrationPendingPanel`.

**Copy.** `{label}` from the caller; `{label}, {count}` as the accessible name when a count badge is present, so a screen reader hears "Activity, 7". Disabled reason default `Available when {dependency} is connected.`

---

### 5.6 Data table

**Path:** `src/kit/DataTable/DataTable.tsx`, `useDataTable.ts`, `TableToolbar.tsx`, `ColumnHeaderButton.tsx`, `TableSkeleton.tsx`

```ts
// src/kit/DataTable/DataTable.types.ts
import type { ReactNode } from 'react'
import type { Density, KitState } from '../types.ts'

export type SortDirection = 'ascending' | 'descending'
export type SortState = { readonly columnId: string; readonly direction: SortDirection }

export type Column<Row> = {
  readonly id: string
  readonly header: string
  /** Actions columns keep a real header, visually hidden — never an empty th. */
  readonly headerHidden?: boolean
  readonly cell: (row: Row) => ReactNode
  /** Applies tabular numerals and end alignment. */
  readonly numeric?: boolean
  readonly sortable?: boolean
  /** Required when sortable and the cell is not a plain string. */
  readonly sortValue?: (row: Row) => string | number
  readonly width?: string
  /** Columns dropped below this width; content moves into the peek panel. */
  readonly hideBelow?: 768 | 1024 | 1280
}

export type RowSelection<Row> = {
  readonly selectedKeys: ReadonlySet<string>
  readonly onChange: (next: ReadonlySet<string>) => void
  /** Names the row in the checkbox label: "Select The Road to Adwa". */
  readonly rowLabel: (row: Row) => string
  readonly selectableRow?: (row: Row) => boolean
}

export type TablePagination = {
  readonly page: number
  readonly pageSize: number
  readonly total: number
  readonly onPageChange: (page: number) => void
}

export type DataTableProps<Row> = {
  /** Visually hidden <caption>. Required: a table without a name is unusable by AT. */
  readonly caption: string
  readonly columns: readonly Column<Row>[]
  readonly rows: readonly Row[]
  readonly rowKey: (row: Row) => string
  readonly state?: KitState
  readonly sort?: SortState | null
  readonly onSortChange?: (next: SortState | null) => void
  readonly selection?: RowSelection<Row>
  readonly pagination?: TablePagination
  readonly rowActions?: (row: Row) => ReactNode
  /** Opens the peek panel. Rendered as a real button in the first cell. */
  readonly onRowActivate?: (row: Row) => void
  readonly activeRowKey?: string | null
  readonly density?: Density
  readonly skeletonRows?: number
  readonly toolbar?: ReactNode
  readonly stickyHeader?: boolean
}

export type TableToolbarProps = {
  readonly searchValue: string
  readonly onSearchChange: (value: string) => void
  readonly searchLabel: string
  readonly searchPlaceholder?: string
  readonly filters?: ReactNode
  readonly actions?: ReactNode
  readonly resultSummary?: string
}

/** Headless sorting, filtering, paging and selection. No DOM, no tokens. */
export type UseDataTableOptions<Row> = {
  readonly rows: readonly Row[]
  readonly rowKey: (row: Row) => string
  readonly columns: readonly Column<Row>[]
  readonly pageSize?: number
  readonly searchFields?: readonly ((row: Row) => string)[]
  readonly initialSort?: SortState | null
}
```

**Tokens.** Table surface `--table-surface`; header row `--table-header-surface` with a bottom `var(--border-hairline-width) solid var(--table-hairline)`; header text `--table-header-text` with the global `.column-header` utility; cell text `--table-cell-text`, secondary `--table-cell-text-muted`; row bottom border `--table-hairline`; row min height `--table-row-min-height` (44px); row hover `--table-row-hover`; row selected `--table-row-selected` (`selection.row`) **plus** a 2px left bar in `--table-selection-bar`, because a tint alone is a colour-only signal; the active peek-open row gets the same bar with a `--surface-hover` fill; sort icon `--table-sort-icon`, and `--table-sort-icon-active` on the sorted column; the global focus ring on every header button, checkbox, and action button. Numeric columns take the `.numeric` utility.

**Decision — selected beats hover.** A hovered selected row stays `selection.row`; there is no third blended token. The left bar makes selection unambiguous without one.

**Keyboard and ARIA.**

- Real semantics: `<table>` → `<caption class="visually-hidden">` → `<thead>` / `<tbody>`, `<th scope="col">`, `<th scope="row">` on the first data cell of each row. No `role="grid"`.
- **Decision — sequential tab order through interactive cells; no arrow-key grid navigation.** `role="grid"` obliges full two-dimensional focus management and is a frequent source of screen-reader regressions. The Phase 2 gate is "operate every component by keyboard alone", which sequential tabbing satisfies. Revisit at Phase 10 if the reader pass says otherwise.
- **Sorting.** The `<th>` carries `aria-sort="ascending" | "descending" | "none"` — on the `th`, not on the button. Inside it, a full-width `<button>` whose accessible name is `{header}, sorted ascending. Activate to sort descending.` Enter and Space cycle ascending → descending → none, with `onSortChange(null)` returning the natural order. Exactly one column carries a non-`none` `aria-sort` at a time.
- **Selection.** Header checkbox labelled `Select all rows on this page`, with the DOM `indeterminate` property set on partial selection — an attribute cannot express it. Row checkbox labelled `Select {rowLabel(row)}` so a screen reader hears the entity, never "checkbox, checkbox, checkbox". Space toggles. **Shift+Space and Shift+Click extend the range** from the last anchor; the anchor resets on any non-shift toggle. Selection survives sorting and page changes because it is keyed, not indexed. Escape anywhere inside the table clears the selection and moves focus to the header checkbox.
- **Row activation.** Rows are not focusable and never carry `onClick` alone. The first cell renders a real `<button>`, or the row-actions cell renders `Open`, because a clickable `<tr>` is invisible to keyboard users. `activeRowKey` sets `aria-current="true"` on the row.
- **Pagination** is a `<nav aria-label="Table pages">` with Previous and Next buttons, disabled at the bounds, and an `aria-live="polite"` region reading `Page 2 of 7`. Focus stays on the pressed button after a page change; the live region announces the new page, so focus does not jump.
- **Sticky header** uses `position: sticky`, which does not affect focus order.
- The table is wrapped in a `<div role="region" aria-labelledby>` with `tabIndex={0}` **only when it scrolls horizontally**, so keyboard users can pan it — and only then, since an always-focusable wrapper adds a dead tab stop.

**States.** All five apply; this is the component the state rules were written for.

- **Loading** — named skeleton regions, never a page-wide spinner: `toolbar` (search field and chip row at full size), `header` (real headers, always rendered, so column widths stay stable), `rows` (`skeletonRows`, default 5, each cell a `Skeleton shape="text"` at the column's width), `pagination` (Previous and Next disabled, summary a skeleton). The `<tbody>` carries `aria-busy="true"` and a `.visually-hidden` "Loading rooms".
- **Empty** — two distinct cases, and conflating them is the classic mistake. *No records at all:* the caller's invitation, for example `No rooms yet` / `Add the first room to start the tour.` / `Add room`. *No matches for the current filters:* kit default, `No matches` / `No rows match the current search and filters.` / `Clear all filters`. The table chooses between them from `pagination.total` versus `rows.length` when both are supplied; otherwise the caller passes the state.
- **Failure** — header and toolbar stay rendered so filters are not lost; the body shows `The table did not load` / `The request failed. Try again, or reload the page.` with `Try again`.
- **Unauthorized** — the whole table region is replaced with `You do not have access to this` / `Your role does not include these records.` The toolbar is **not** rendered, because a filter row over data the user cannot see leaks its shape.
- **Integration pending** — header and toolbar render; the body shows `{dependency} is not connected yet` as a labelled shell. Never a table of fabricated rows.

**Copy.** `Select all rows on this page`, `Select {row}`, `{n} of {total}`, `Page {n} of {m}`, `Previous`, `Next`, `Sorted ascending`, `Sorted descending`, `Not sorted`, `No matches`, `No rows match the current search and filters.`, `Clear all filters`, `The table did not load`, `Try again`, `Search {entity}`.

---

### 5.7 Bulk-action bar

**Path:** `src/kit/BulkActionBar/BulkActionBar.tsx`

```ts
// src/kit/BulkActionBar/BulkActionBar.types.ts
import type { KitState } from '../types.ts'

export type BulkAction = {
  readonly id: string
  readonly label: string
  readonly tone?: 'secondary' | 'danger'
  readonly disabled?: boolean
  readonly disabledReason?: string
  /** Destructive actions route through ConfirmDialog before onAct fires. */
  readonly confirm?: {
    readonly title: string
    readonly consequence: string
    readonly confirmLabel: string
  }
  readonly onAct: (selectedKeys: ReadonlySet<string>) => void
}

export type BulkActionBarProps = {
  readonly selectedKeys: ReadonlySet<string>
  /** Singular and plural noun: { one: 'museum', many: 'museums' }. */
  readonly noun: { readonly one: string; readonly many: string }
  readonly actions: readonly BulkAction[]
  readonly onClear: () => void
  /** 'float' above content, 'dock' to the bottom edge below 768px. */
  readonly anchor?: 'float' | 'dock'
  readonly state?: Extract<KitState, { kind: 'ready' | 'loading' | 'failure' }>
}
```

**Tokens.** Surface `--bulk-bar-surface` (`surface.overlay`); border `var(--border-hairline-width) solid var(--bulk-bar-border)` (`border.control`, not a hairline — a floating white bar over white content needs a 3:1 edge); radius `--bulk-bar-radius` (8px); shadow `--bulk-bar-shadow` (`elevation.soft`); count `--bulk-bar-count` at `--weight-semibold`; buttons are `Button` with `tone="secondary"` and `tone="danger"`; the clear control is `Button tone="ghost" iconOnly` with a cross glyph. Entry: `transform: translateY(8px)` to `0` plus opacity over `var(--motion-inline)`, which zeroes itself under reduced motion.

**Keyboard and ARIA.** `role="region"` with `aria-label="Bulk actions"`. **Placed in the DOM immediately after the table**, so Tab from the last table control lands in the bar — a visually-floating bar that lives at the end of `<body>` is unreachable in a sensible order. The count sits inside an `aria-live="polite"` span, so "3 museums selected" is announced as selection changes without moving focus. Escape while focus is inside the bar clears the selection and returns focus to the table's header checkbox. Focus is **not** auto-moved into the bar on appearance: stealing focus from the checkbox the user just pressed breaks range selection. Disabled actions use `aria-disabled="true"` rather than `disabled` here, unlike Button, so a keyboard user can reach them and hear the reason — a bulk action unavailable for the current mix of rows is information.

**States.** `loading` — applies while a batch runs: the bar stays, actions go `aria-disabled`, the triggering button shows `busy`. `failure` — applies inline: `{n} of {m} did not update` with `Try again` for the failures, because a toast alone loses which rows failed. `empty` — not applicable; zero selection means the bar is not rendered. `unauthorized` — not applicable; actions a role cannot perform are absent from `actions`. `integrationPending` — applies per action, via `disabled` plus `disabledReason`.

**Copy.** `1 {noun.one} selected`, `{n} {noun.many} selected`, `Clear selection`, `{n} of {m} did not update`, `Try again`. Action labels come from the caller and must match the confirmation's verb.

---

### 5.8 Detail peek panel

**Path:** `src/kit/PeekPanel/PeekPanel.tsx`

```ts
// src/kit/PeekPanel/PeekPanel.types.ts
import type { ReactNode, RefObject } from 'react'
import type { KitState, StatusTone } from '../types.ts'

export type PeekTab = {
  readonly id: string
  readonly label: string
  readonly count?: number
  readonly content: ReactNode
}

export type PeekPanelProps = {
  readonly open: boolean
  readonly title: string
  /**
   * When the record is a museum. Rendered through Phase 1's .museum-name
   * utility — the panel never declares a font-family.
   */
  readonly museumName?: string
  readonly subtitle?: ReactNode
  readonly status?: { readonly tone: StatusTone; readonly label: string }
  readonly tabs: readonly PeekTab[]
  readonly activeTabId: string
  readonly onTabChange: (id: string) => void
  readonly footer?: ReactNode
  readonly onClose: () => void
  /**
   * The control that opened the panel — the originating row's Open button.
   * Focus returns here on close. Required: the spec names this behaviour.
   */
  readonly returnFocusTo: RefObject<HTMLElement | null>
  /**
   * 'overlay' (>=1024px) is non-modal: Tab can leave, the table stays usable.
   * 'sheet' (<1024px) is modal: focus trapped, scrim, Escape closes.
   */
  readonly variant?: 'overlay' | 'sheet'
  readonly state?: KitState
  readonly width?: 'md' | 'lg'
}
```

**Tokens.** Surface `--overlay-surface`; border `var(--border-hairline-width) solid var(--panel-border)`; radius `--overlay-radius` (8px); shadow `--panel-shadow` (`elevation.soft`, never heavier); scrim `--overlay-scrim`, rendered **only** in the `sheet` variant; header and footer hairlines `--border-hairline`; title `--content-primary` at `.text-subtitle`; subtitle `--content-secondary`; the tab strip from Tabs; close button `Button tone="ghost" iconOnly`; footer actions are Buttons. Enter and exit `transform: translateX(8px)` to `0` over `var(--motion-view)`.

**Keyboard and ARIA.** `role="dialog"` with `aria-labelledby` on the title. In `overlay` (desktop) it is **non-modal**: no `aria-modal`, no `inert` on the background, Tab may leave the panel and continue into the page — which is the point, since the reviewer keeps their table position. On open, focus moves to the panel container at `tabIndex={-1}` so the next Tab lands on the close button and the title is announced. **Escape closes from anywhere inside the panel and returns focus to `returnFocusTo.current`** — the exact behaviour section 7 names. If that element has been unmounted because the row was filtered away, focus falls back to the table's region wrapper, never to `<body>`. In `sheet` (below 1024px) it is modal: `aria-modal="true"`, `inert` on the app root, a full focus trap, and scrim click closes. Tab order inside: close button, tab strip (one roving stop), panel content, footer actions.

**States.** All five apply, and they render **inside** the panel body with the header and tab strip intact — the panel chrome must never disappear, or the user loses the close affordance.

- **Loading** — skeleton regions named `header meta` (status pill and subtitle line), `tab strip` (pill skeletons), `body` (four label-and-value line pairs).
- **Empty** — applies to a tab's content: `No activity yet` / `Changes to this room will appear here.`
- **Failure** — `This record did not load` / `The request failed. Try again, or close and reopen.` with `Try again`.
- **Unauthorized** — `You do not have access to this record` / `Your role does not include it.` The header shows the title only, never the status, the counts, or any field.
- **Integration pending** — a labelled shell in the body, header intact.

**Copy.** `Close`, `This record did not load`, `Try again`, `You do not have access to this record`.

---

### 5.9 Modal and confirmation

**Path:** `src/kit/Modal/Modal.tsx`, `ConfirmDialog.tsx`

```ts
// src/kit/Modal/Modal.types.ts
import type { ReactNode, RefObject } from 'react'
import type { KitState } from '../types.ts'

export type ModalProps = {
  readonly open: boolean
  readonly title: string
  /** Rendered as the first paragraph and wired to aria-describedby. */
  readonly description?: string
  readonly size?: 'sm' | 'md' | 'lg'
  readonly onClose: () => void
  /** Focus returns here. Defaults to whatever was focused before opening. */
  readonly returnFocusTo?: RefObject<HTMLElement | null>
  /** Where focus lands on open. Defaults to the first tabbable element. */
  readonly initialFocusTo?: RefObject<HTMLElement | null>
  readonly dismissOnScrim?: boolean
  readonly dismissOnEscape?: boolean
  readonly footer?: ReactNode
  readonly state?: KitState
  readonly children: ReactNode
}

export type ConfirmDialogProps = {
  readonly open: boolean
  /** e.g. "Suspend this museum?" */
  readonly title: string
  /** The entity by name. Required: a confirmation must name what it affects. */
  readonly entityName: string
  /** What will happen, in the user's terms. Required. */
  readonly consequence: string
  /** Must be the same verb as the control that opened this dialog. */
  readonly confirmLabel: string
  readonly cancelLabel?: string
  readonly tone?: 'primary' | 'danger'
  readonly busy?: boolean
  readonly onConfirm: () => void
  readonly onCancel: () => void
  readonly returnFocusTo?: RefObject<HTMLElement | null>
}
```

**Tokens.** Scrim `--overlay-scrim`; surface `--overlay-surface`; border `var(--border-hairline-width) solid var(--panel-border)`; radius `--overlay-radius`; shadow `--panel-shadow`; title `--content-primary` at `.text-subtitle`; description `--content-secondary` at `.text-body-large`; header and footer hairlines `--border-hairline`. A `tone="danger"` confirmation uses `Button tone="danger"` for confirm — the `#DC2626` and white pair in both planes — and `tone="secondary"` for cancel. **No red panel border and no red header band:** danger lives in the action, not in the chrome. Enter and exit: the scrim fades and the panel scales `0.98` to `1` over `var(--motion-view)`.

**Keyboard and ARIA.** `role="dialog"`, `aria-modal="true"`, `aria-labelledby`, `aria-describedby`. **Focus trap:** Tab from the last tabbable element wraps to the first and Shift+Tab from the first wraps to the last, computed from a live query of tabbable descendants on each Tab, not cached at open, since content changes. The background is `inert` in addition to the trap, so pointer and virtual-cursor navigation are also contained. **Focus on open:** `initialFocusTo`, else the first tabbable element, else the dialog container at `tabIndex={-1}`. For `ConfirmDialog` with `tone="danger"` the default initial focus is **Cancel**, so a stray Enter does not destroy anything. **Focus on close:** `returnFocusTo.current`, else the element recorded as `document.activeElement` at open time, else the app root — restored in a layout effect after unmount so React's cleanup does not steal it. Escape closes unless `dismissOnEscape={false}`; scrim click closes unless `dismissOnScrim={false}`, which `ConfirmDialog` sets to `false` by default so a destructive dialog is never dismissed by a misclick. Body scroll is locked while open. Nested modals are not supported, and the implementation should throw in development if a second one opens — Phase 2 has no legitimate case for one.

**States.** `loading` — applies to modal *content*, for example a create form waiting on option lists: skeleton the field rows, keep the footer, disable confirm. `empty` — not applicable; an empty modal should not be opened. `failure` — applies inline above the footer: `That did not save` / `{reason}. Try again.` **The modal stays open**, so typed input is not lost. `unauthorized` — not applicable; an action a role cannot take has no trigger. `integrationPending` — applies to individual controls, not to the whole modal.

**Copy.** `Cancel`, `Close`, `That did not save`, `Try again`. `ConfirmDialog` composes its body as `{entityName} {consequence}`, for example *Harar Museum will be hidden from visitors immediately. Its content stays in place and you can reinstate it later.* The confirm button repeats the originating verb exactly — `Suspend museum`, not `Confirm`, and not `OK`.

---

### 5.10 Toast

**Path:** `src/kit/Toast/ToastProvider.tsx`, `ToastRegion.tsx`, `toastContext.ts`, `useToast.ts`

```ts
// src/kit/Toast/Toast.types.ts
import type { StateAction } from '../types.ts'

export type ToastTone = 'success' | 'danger' | 'neutral'

export type ToastInput = {
  readonly tone: ToastTone
  /** One sentence, past tense for success: "Room published." */
  readonly message: string
  readonly detail?: string
  readonly action?: StateAction
  /** ms, or 'persist'. Defaults: success 6000, neutral 6000, danger 'persist'. */
  readonly duration?: number | 'persist'
}

export type Toast = ToastInput & { readonly id: string }

export type ToastContextValue = {
  readonly show: (toast: ToastInput) => string
  readonly dismiss: (id: string) => void
  readonly dismissAll: () => void
}

export type ToastRegionProps = {
  readonly toasts: readonly Toast[]
  readonly onDismiss: (id: string) => void
  /** Newest first at the bottom-right; 'dock' bottom-centre below 768px. */
  readonly placement?: 'bottom-end' | 'dock'
  readonly max?: number
}
```

**Tokens.** Surface `--toast-surface`; border `var(--border-hairline-width) solid var(--toast-border)`; radius `--toast-radius` (8px); shadow `--toast-shadow`; message `--toast-text` at `.text-body`; detail `--content-secondary` at `.text-caption`; leading marker `--toast-mark-success` / `--toast-mark-danger` / `--toast-mark-neutral`, drawn with the same glyph set as the status badge (filled dot, cross, dash) so success and failure are not colour-only; dismiss is `Button tone="ghost" iconOnly`; action is `Button tone="ghost"`. Entry: translate 8px plus fade over `var(--motion-inline)`.

**Keyboard and ARIA.** The region is `<div role="region" aria-label="Notifications">`, last in the DOM and positioned fixed. Success and neutral toasts are `role="status"` with `aria-live="polite"`; danger toasts are `role="alert"` with `aria-live="assertive"`. **Toasts never steal focus.** The dismiss button and the optional action are real tab stops while the toast is on screen, reachable by tabbing to the end of the page — acceptable because failures persist, so there is always time. Auto-dismiss timers pause on `pointerenter` and `focusin`, resume on leave and blur, and are cancelled outright when the toast has an action, because a timed action is a trap. Escape while focus is inside the region dismisses the focused toast and moves focus to the next one, or back to the previously focused element when the region empties. Maximum three visible; older ones are dropped from the top, never stacked into a scroll.

**States.** None of the five apply. A toast is a transient message *about* an outcome, not a data region. The gallery still shows all three tones plus the with-action and long-detail variants.

**Copy.** Ships `Dismiss` and the region label `Notifications`. Callers obey the stable-verb rule: `Publish` produces `Room published.` Failure messages state what happened and the next step: `Room did not publish. The request timed out. Try again.` No apologies, no "Oops", no exclamation marks.

---

### 5.11 KPI card

**Path:** `src/kit/KpiCard/KpiCard.tsx`, `ProvenanceTag.tsx`

```ts
// src/kit/KpiCard/KpiCard.types.ts
import type { KitState, Provenance, StatusTone } from '../types.ts'

export type KpiDelta = {
  readonly direction: 'up' | 'down' | 'flat'
  /** Pre-formatted, e.g. "+12% vs last month". */
  readonly label: string
  /** Which direction is good is domain knowledge, so the caller says. */
  readonly tone?: StatusTone
}

export type KpiCardProps = {
  readonly label: string
  /**
   * Pre-formatted for display; the kit never formats numbers or currency.
   * null renders the em-dash shell — never a fabricated value.
   */
  readonly value: string | null
  readonly unit?: string
  readonly caption?: string
  readonly delta?: KpiDelta
  /** Required. Section 10: every figure says where it came from. */
  readonly provenance: Provenance
  readonly provenanceNote?: string
  readonly state?: KitState
}

export type ProvenanceTagProps = {
  readonly provenance: Provenance
  readonly note?: string
}
```

**Tokens.** Surface `--kpi-surface`; border `var(--border-hairline-width) solid var(--kpi-border)`; radius `--kpi-radius` (8px); label `--kpi-label` with the `.column-header` utility; value `--kpi-value` at `.text-display` with `.numeric`; caption `--content-secondary` at `.text-caption`; delta text takes `--feedback-success`, `--feedback-danger`, or `--content-secondary` from `delta.tone`, always alongside an arrow glyph so direction is not colour-only; provenance tag `--kpi-provenance-tint` and `--kpi-provenance-text`. No hover, active, selected, or focus state — the card is not interactive in Phase 2. If a later phase makes it a jump control, it wraps in a Button and gains the ring then.

**Decision — the provenance tag is always neutral-toned, never amber.** `Demo data` uses the neutral tint with a hollow-ring marker; `Integration pending` uses the neutral tint with a dash marker; `live` renders no tag at all, so the absence of a tag means the number is real. Amber as chrome is reserved for the scoped-in band, and a warning tint on every demo KPI would put amber on almost every overview card.

**Keyboard and ARIA.** Not focusable. Structured as a `<div>` containing a `<p>` label and a `<p>` value, with the label bound to the value by `aria-labelledby` on a wrapper, so a screen reader reads "Rooms ready, 14". The unit sits in the same text node as the value where it is a symbol, or in a separate `<span>` with a space where it is a word. The provenance tag is visible text, never a `title`.

**States.** `loading` — applies: the label renders for real so the grid does not reflow, the value becomes a `Skeleton shape="block"` at the display line height, the caption a text skeleton. `empty` — applies as `value={null}`, rendering an em dash with a `.visually-hidden` `No value yet` and a caption explaining why. `failure` — applies: the card keeps its label and shows `Did not load` with `Try again`, sized to the card so the grid holds. `unauthorized` — applies: label plus `Not available to your role`, with no value and no caption; the figure is never rendered. `integrationPending` — applies, and is the common case for this product: a labelled shell, em dash for the value, provenance tag reading `Integration pending`, caption naming the dependency.

**Copy.** `Demo data`, `Integration pending`, `No value yet`, `Did not load`, `Try again`, `Not available to your role`, and the caption pattern `Available when {dependency} is connected.`

---

### 5.12 Grouped bar chart wrapper

Full specification in section 8. Props and states here for completeness.

**Path:** `src/kit/Chart/GroupedBarChart.tsx`, `chartSetup.ts`, `ChartDataTable.tsx`, `SeriesToggle.tsx`

**States.** All five apply. **Loading** — a skeleton at the same fixed height as the chart, drawing six named skeleton bars plus an axis line, never a spinner over an empty box. **Empty** — `No data for this range` / `Widen the time window to see results.` **Failure** — `The chart did not load` / `The request failed. Try again.`, with the fallback table still offered if any data arrived. **Unauthorized** — `You do not have access to this chart`, with no axis labels rendered, since category names alone can leak the shape of the data. **Integration pending** — a labelled shell: axes and legend drawn in `--chart-grid`, no bars, provenance tag reading `Integration pending`, body naming the dependency.

---

### 5.13 Integration-pending panel

**Path:** `src/kit/Panel/IntegrationPendingPanel.tsx`, with `Panel.tsx` as the plain container

```ts
// src/kit/Panel/Panel.types.ts
import type { ReactNode } from 'react'
import type { StateAction } from '../types.ts'

export type PanelProps = {
  readonly title?: string
  readonly description?: string
  readonly actions?: ReactNode
  readonly padded?: boolean
  readonly children: ReactNode
}

export type IntegrationPendingPanelProps = {
  /** The missing dependency, in the user's words: "the visit reporting API". */
  readonly dependency: string
  /** What is missing and why, one or two sentences. */
  readonly body: string
  /** What still works. Section 7: name what remains usable. */
  readonly stillUsable?: string
  readonly action?: StateAction
  /** Inline sits within a card; region replaces a whole content area. */
  readonly variant?: 'inline' | 'region'
}
```

**Tokens.** Surface `--panel-surface`; **a dashed** `var(--border-hairline-width) dashed var(--border-control)` — dashed is the one place a border style carries meaning, marking a shell rather than a real surface, and `border.control` clears the 3:1 boundary rule that a hairline would not; radius `--panel-radius`; eyebrow `--content-secondary` with `.column-header`; title `--content-primary` at `.text-subtitle`; body `--content-secondary` at `.text-body`; marker the dash glyph in `--feedback-neutral`. **No amber anywhere** — a pending integration is not a warning, it is an honest gap.

**Keyboard and ARIA.** `role="status"`, so the shell is announced when it replaces a loading region. The optional action is the only tab stop.

**States.** This component *is* one of the five states, promoted to a component because it appears standalone as a whole-region treatment. The others do not apply.

**Copy.** Eyebrow `Integration pending`; title `{dependency} is not connected yet`; body from the caller; footer `{stillUsable}`, defaulting to nothing — better silent than vaguely reassuring.

---

### 5.14 The four section 7 components owned by later phases

Section 7's table has sixteen rows. Four belong to later phases, and building them now would break the phase boundary: each depends on the router, the shell, or fixtures Phase 2 explicitly excludes. **Decision: Phase 2 reserves their paths, exports nothing for them, and freezes the prop names below so later phases inherit a kit that already fits.** What Phase 2 does build is every primitive they need.

**Sidebar nav — Phase 3.** `src/kit/SidebarNav/`. Depends on the router for active-route matching, on persisted collapse state, and on the account menu. Reserved shape:

```ts
export type NavItem = {
  readonly id: string
  readonly label: string
  readonly icon: ReactNode
  readonly count?: number
  readonly href: string
}

export type SidebarNavProps = {
  readonly items: readonly NavItem[]
  readonly secondary: readonly NavItem[]
  readonly activeId: string
  readonly collapsed: boolean
  readonly onCollapsedChange: (next: boolean) => void
  readonly search: ReactNode
  readonly account: ReactNode
}
```

Tokens already exist and are complete: `--sidebar-surface`, `--sidebar-edge`, `--sidebar-text`, `--sidebar-text-muted`, `--sidebar-active-marker`, `--sidebar-item-radius`, `--sidebar-item-min-height`. Phase 2 does **not** build the tooltip primitive the collapsed rail needs. Note for Phase 3: sidebar text uses `content.onSidebar` and `content.onSidebarMuted`, never `content.secondary` — the audit measures `#52525B` on `#18181B` at 2.29:1 and marks it intentional-and-mitigated precisely because the sidebar has its own content roles.

**Scoped-in band — Phase 8.** `src/kit/ScopeBand/`. Reserved shape `{ museumName: string; onLeave: () => void; leaveLabel: string }`. Tokens exist and the naming collision is fixed: `--scope-band-surface`, `--scope-band-content`, `--scope-band-edge-color`, `--scope-band-edge-width`, `--scope-band-min-height`. **No Phase 2 component may consume any `--scope-*` or `--amber-*` token as a chrome fill.**

**Insights rail — Phase 4.** `src/kit/InsightsRail/`. Depends on the readiness gauge and the segmented breakdown bar, both Phase 4 signature work, and on overview aggregates Phase 2 has no fixtures for. Reserved shape `{ gauge: ReactNode; breakdown: ReactNode; kpis: readonly KpiCardProps[]; ranked: ReactNode; collapsed: boolean }`. Phase 2 supplies its `KpiCard` and `Panel`.

**Editor workspace — Phase 5.** `src/kit/EditorWorkspace/`. Depends on dirty-state tracking and navigation blocking, which need the router. Reserved shape `{ dirty: boolean; saving: boolean; onSave: () => void; onDiscard: () => void; lastSavedLabel?: string; children: ReactNode }`. Phase 2 supplies its `Button`, `ConfirmDialog`, `Toast`, and `Field` family, so Phase 5 writes only the sticky bar and the blocker.

---

## 6. The status badge marker shapes

Four shapes on one 12×12 geometry grid, one stroke width, all in `currentColor`.

```tsx
// src/kit/StatusBadge/StatusMarkerGlyph.tsx — geometry
// dot   filled circle, r = 4
// ring  circle, r = 3.25, fill none, stroke-width 1.5
// cross two strokes, (3,3)→(9,9) and (9,3)→(3,9), stroke-width 1.75, round caps
// dash  line (2.5,6)→(9.5,6), stroke-width 1.75, round caps
```

Every glyph renders as `<svg viewBox="0 0 12 12" width={size} height={size} aria-hidden="true" focusable="false">` with `stroke="currentColor"` or `fill="currentColor"` and no colour attribute of its own.

**Inline SVG, not CSS.** Four reasons, in order of weight:

1. **The cross cannot be drawn cleanly in CSS.** It needs two rotated strokes, which means two pseudo-elements on a positioned wrapper. Pseudo-elements do not attach reliably to an inline element inside a flex row, and rotated 1.75px borders alias badly at 12px.
2. **The four shapes must read as one family.** A `border-radius` dot, a `border` ring, a pseudo-element cross, and a `background` dash would each land on a slightly different optical weight. One `viewBox`, one stroke width, one grid guarantees a set — which is the entire premise of "the spine and the narration table teach each other" in section 6 of the specification.
3. **They must scale down without text.** Phase 4's full-scale spine and Phase 7's miniaturised spine reuse these glyphs at 8px, where numbers drop and only shape survives. An SVG at `size={8}` keeps its proportions; a CSS ring built from a 1px border does not.
4. **`currentColor` gives measured contrast for free.** The glyph inherits the label's verified `status.*.onTint` colour, so no marker can drift onto an unmeasured pair. The audit proves the alternative fails: `feedback.warning` `#D97706` on the light canvas measures 2.90:1 against a 3:1 requirement.

**Why neither the marker nor the label may ever be dropped in dense layouts.** Roughly one in twelve men has a red-green colour vision deficiency, and success-versus-failure is precisely the distinction this palette leans on hardest — a ready room and a failed narration differ, for those users, by nothing at all if hue is the only channel. Dense tables are exactly where a designer is tempted to collapse a badge to a coloured dot to save sixty pixels, and they are also where the error is most expensive: an operator scanning forty museums for the three that need attention is doing the one task this product exists for. There is a second, less obvious reason: on the dark plane `feedback.success` `#10B981` and `feedback.warning` `#FBBF24` are both high-chroma brights at 8px, and peripheral vision separates them far less reliably than on the light plane.

**Enforcement is structural, not procedural.** `StatusBadgeProps` has no `hideLabel`, no `compact`, no `markerOnly`, and no `size`. A dense layout cannot drop the label because the API exposes no way to. The one legitimate marker-without-label case, the miniaturised spine, imports `StatusMarkerGlyph` directly and is obliged to supply its own `.visually-hidden` text plus an `aria-label` on the spine as a whole. Code review is the wrong place to catch this; the type system is the right one.

---

## 7. Reserved

*(Section number retained so cross-references in review notes stay stable. Content moved into section 6.)*

---

## 8. The Chart.js grouped bar wrapper

### 8.1 Dependencies

```bash
npm install chart.js@^4.5.1 react-chartjs-2@^5.3.1
```

Verified against the registry: `chart.js` latest is **4.5.1**, `react-chartjs-2` latest is **5.3.1**, whose peers are `chart.js: ^4.1.1` and `react: ^16.8 || ^17 || ^18 || ^19`. Both satisfy the installed React 19.2.7. Pin with a caret to match the rest of `package.json`. Add no other chart package — no `chartjs-plugin-datalabels`, no adapters, no `date-fns`. Grouped bars over category labels need none of them, and every plugin is a new place for an un-tokenised colour to appear.

### 8.2 Registration

```ts
// src/kit/Chart/chartSetup.ts — imported once, from GroupedBarChart.tsx
import { BarElement, CategoryScale, Chart, LinearScale, Tooltip } from 'chart.js'

Chart.register(BarElement, CategoryScale, LinearScale, Tooltip)
```

`Legend` is deliberately **not** registered: the kit ships its own series toggle, which is a real button group with a 44px target and an `aria-pressed` state, and the canvas legend is neither focusable nor announced. `Title` is not registered either — the heading is DOM text so it can be a real `<h3>`.

### 8.3 Series colours map to tokens through computed style

A canvas cannot resolve `var(--accent-mark)`. Colours must be read as concrete strings and re-read whenever the plane changes.

```ts
// src/kit/internal/useResolvedTokens.ts
export function useResolvedTokens<K extends string>(
  ref: RefObject<HTMLElement | null>,
  names: readonly K[],
  deps: readonly unknown[],
): Readonly<Record<K, string>>
```

It reads `getComputedStyle(ref.current).getPropertyValue(name).trim()` in a `useLayoutEffect` keyed on `deps`, and re-runs once more after `document.fonts.ready` resolves — a read before the stylesheet applies returns an empty string. The element it reads from is the chart's own wrapper, which sits inside whichever `[data-plane]` frame contains it, so the same component yields `#059669` in a tenant frame and `#10B981` in a control frame with no plane branch in the code.

| Chart element | Token | Tenant | Control |
|---|---|---|---|
| Primary series bars | `--chart-series-primary` → `accent.mark` | `#059669` | `#10B981` |
| Comparison series bars | `--chart-series-comparison` → `feedback.neutral` | `#71717A` | `#A1A1AA` |
| Grid lines and axis border | `--chart-grid` → `border.hairline` | `#E4E4E7` | `#27272A` |
| Tick labels | `--chart-axis-text` → `content.secondary` | `#52525B` | `#A1A1AA` |
| Tooltip surface / text / border | `--chart-tooltip-{surface,text,border}` | white / `#18181B` / `#E4E4E7` | `#18181B` / `#FAFAFA` / `#27272A` |
| Bar hover | the series colour at 88% opacity, computed from the resolved string | — | — |

`planeKey`, an optional prop typically supplied by the gallery or shell that already knows the plane, is passed into `deps` **purely as a repaint trigger**. The component never reads it to choose a colour. This is the single, explicitly-scoped exception to the "no component knows about planes" rule, and the code comment must say so, or a reviewer will read it as a variant.

Bars use `borderRadius: 0`. The radius scale governs surfaces — cards, panels, buttons — and a bar is data, not a surface. Inventing a 4px step to round bar tops would put a value in the product that no token names.

### 8.4 The series toggle

A `role="group"` with `aria-label="Chart series"` containing one `Button tone="ghost" aria-pressed` per series. Each carries a 12px swatch in its series colour **plus** the series label, so the mapping is not colour-only. Tab reaches each; Space or Enter toggles; the pressed state is announced through `aria-pressed`. The last visible series' button becomes `aria-disabled="true"` with `disabledReason="Keep at least one series visible."` rather than `disabled`, so a keyboard user can reach it and hear why. Toggling updates the chart with `chart.update('none')` — no animation on a user-initiated change, which is both faster and consistent with the first-paint-only rule.

### 8.5 The accessible fallback table

```ts
export type ChartDataTableProps = {
  readonly id: string
  readonly caption: string
  readonly categories: readonly string[]
  readonly series: readonly ChartSeries[]
  readonly valueFormat: (value: number) => string
  readonly visible: boolean
}
```

The canvas is `role="img"` with an `aria-label` summarising the chart in one sentence — for example `Room narration volume by month, two series, six months` — and an `aria-describedby` pointing at the fallback table's id. The table is a real `<table>` with categories as row headers and series as column headers, rendered **always in the DOM**, hidden with the `.visually-hidden` clip technique and never `display: none`, so it stays in the accessibility tree. A visible `Show data table` / `Hide data table` toggle promotes it, because sighted keyboard users and anyone who needs the exact number deserve it too. Values run through `valueFormat`, and cells take the `.numeric` utility.

### 8.6 First-paint-only animation and reduced motion

```ts
const reduceMotion = useReducedMotion()          // matchMedia, live-updating
const chartRef = useRef<ChartJS<'bar'> | null>(null)
const hasPainted = useRef(false)

const animation = reduceMotion || hasPainted.current
  ? (false as const)
  : { duration: 350, easing: 'easeOutCubic' as const }

useEffect(() => { hasPainted.current = true }, [])

// every subsequent data or visibility change:
useEffect(() => {
  if (!hasPainted.current) return
  chartRef.current?.update('none')
}, [series, hiddenSeriesIds])
```

The 350ms duration is `motion.view` from the scale. It appears as a number because Chart.js takes a number, not a CSS value; the wrapper resolves it from `--motion-view` through the same `useResolvedTokens` call and parses the `ms` suffix, so the timing still lives in the token layer.

`useReducedMotion` subscribes to `window.matchMedia('(prefers-reduced-motion: reduce)')` through `useSyncExternalStore`, so a mid-session preference change takes effect. Under reduced motion: chart animation is `false` entirely, the toggle has no transition, and the fallback-table reveal is instant. Note that CSS-driven motion elsewhere in the kit needs no hook, because `base.css` zeroes `--motion-view` and `--motion-inline` under the same media query.

### 8.7 Props

```ts
// src/kit/Chart/Chart.types.ts
import type { KitState, Provenance } from '../types.ts'

export type ChartSeries = {
  readonly id: string
  readonly label: string
  /** Exactly one series should be 'primary'; the rest are 'comparison'. */
  readonly role: 'primary' | 'comparison'
  /** Same length and order as `categories`. */
  readonly values: readonly number[]
}

export type GroupedBarChartProps = {
  readonly title: string
  /** One sentence, used as the canvas's accessible summary. */
  readonly description: string
  readonly categories: readonly string[]
  readonly series: readonly ChartSeries[]
  /** The kit never formats numbers; locale and currency are the caller's. */
  readonly valueFormat: (value: number) => string
  readonly axisLabel?: string
  readonly provenance: Provenance
  readonly hiddenSeriesIds?: readonly string[]
  readonly onSeriesToggle?: (id: string, visible: boolean) => void
  readonly state?: KitState
  /** Fixed height so the skeleton and the chart occupy the same box. */
  readonly height?: number
  /** Repaint trigger only. Never read as a colour source. */
  readonly planeKey?: string
}
```

**Copy.** `Show data table`, `Hide data table`, `Chart series`, `Keep at least one series visible.`, `Demo data`, `No data for this range`, `Widen the time window to see results.`, `The chart did not load`, `Try again`.

---

## 9. The gallery

### 9.1 The router tension, and how to resolve it

**Decision: no router in Phase 2. Ship a gallery surface with hash-based section selection, mounted alongside the Phase 1 harness.**

Rationale, against the phase boundaries:

- Phase 3's scope is "Router with the full route map … role-based landing, route guards, the `/operator` not-found behavior", and its review gate tests exactly those. Installing `react-router-dom` in Phase 2 means Phase 2's reviewer implicitly approves a routing library, a data-router-versus-component-router choice, and a route-tree shape that Phase 3's gate was written to evaluate. That is drift in the direction the specification's "every phase names what is out of scope so review does not drift into the next one" exists to prevent.
- The gallery is not a screen. Phase 2's exclusion is "real screens, fixtures beyond what the gallery needs" — a review surface is neither, and it does not need a URL to satisfy "without navigating the real app". It needs the opposite: to exist *outside* the real app.
- The cost of not installing the router is about twenty lines:

```ts
// src/gallery/useHashSection.ts
export function useHashSection(fallback: string): [string, (next: string) => void]
```

implemented over `useSyncExternalStore` on `hashchange`, reading `location.hash.slice(1)`.

- Hash routing does not collide with the path routing Phase 3 installs, so the swap is additive rather than a rewrite. Phase 3 replaces `App.tsx` with its router and mounts the gallery at a development-only route, keeping `#section` deep links working.

**Mounting, given `App.tsx` is now Phase 1's review harness.** Do not delete it. `App.tsx` gains a top-level, hash-driven switch between two surfaces — `#tokens` for the Phase 1 harness, `#kit` for the Phase 2 gallery — defaulting to `#kit` once Phase 2 lands. That preserves the Phase 1 reviewer's surface, keeps both reviews reachable from one dev server, and is a smaller edit than a replacement. It is also the only Phase 2 change to a file Phase 1 owns, so it should be the last thing W0 does and it should be coordinated.

### 9.2 Page structure

```text
┌─ Skip to component index ─────────────────────────────────────────┐
│ Adwa admin kit — Phase 2 gallery                                   │
│ [ Both planes | Tenant | Control ]  [ All states | pick ]          │
│ [ Reduced motion: off/on ]  [ Always show focus rings: off/on ]    │
├──────────────┬────────────────────────────────────────────────────┤
│ Index (nav)  │  <h2 id="button">Button</h2>                        │
│  Button      │  one-line contract; props summary                   │
│  Field       │  ┌─ Tenant plane ─────┐ ┌─ Control plane ────────┐  │
│  Filter chip │  │ data-plane=tenant  │ │ data-plane=control     │  │
│  Status badge│  │  ready             │ │  ready                 │  │
│  Tabs        │  │  loading           │ │  loading               │  │
│  Data table  │  │  empty             │ │  empty                 │  │
│  …           │  │  failure           │ │  failure               │  │
│              │  │  unauthorized      │ │  unauthorized          │  │
│              │  │  integration pend. │ │  integration pending   │  │
│              │  └────────────────────┘ └────────────────────────┘  │
└──────────────┴────────────────────────────────────────────────────┘
```

Every specimen is a `<section>` with an `<h2 id>`; the index is a `<nav aria-label="Components">` of in-page anchors, each a real link, so the whole gallery is traversable by keyboard from the first Tab. `Skip to component index` is the first focusable element.

### 9.3 How the plane switch works

Phase 1 exposes theming as `data-plane` on a container, so the gallery uses containers rather than a global toggle:

```tsx
// src/gallery/PlaneFrame.tsx
<div data-plane={plane} className={styles.frame}>
  <p className={styles.frameLabel}>
    {plane === 'tenant' ? 'Tenant plane (light)' : 'Control plane (dark)'}
  </p>
  {children}
</div>
```

Three dependencies, all now satisfied on disk:

1. **The component token layer is re-declared per plane** — `:root, [data-plane]` in `components.css`. This was R1 and it is fixed. Without it the control frame would inherit tenant panel, badge, field, and table colours while text and canvas inverted correctly, and the whole side-by-side review would be silently wrong.
2. **`color-scheme` is set per plane** in `base.css`, so the native `<select>`, native checkboxes, and scrollbars inside the control frame render with dark UA chrome. This was R10 and it is fixed.
3. **Every plane container paints its own canvas** — `base.css` gives `[data-plane]` its `background-color` and `color`, so `PlaneFrame` needs no colour rules of its own beyond padding and the label.

The header's `Both | Tenant | Control` control changes which frames render, not which values apply, so "Both" — the default — is simply both frames mounted.

The `Always show focus rings` toggle adds a class to the gallery root promoting `:focus-visible` rules to `:focus`, letting a reviewer verify the ring during mouse-driven inspection. The `Reduced motion` toggle adds a class applying the same suppression the media query applies, so reduced motion can be checked without changing an OS setting. Both are gallery-only classes and never appear inside `src/kit/`.

### 9.4 How the five states are shown

Each specimen defaults to **All states stacked**, so the review gate's "see all five states without navigating the real app" is met by scrolling, with zero interaction. A per-specimen state picker — a `Tabs` instance, dogfooding the kit — narrows to one state for focused inspection. States that do not apply are rendered as a short muted note giving the reason, for example under Button: *"Unauthorized does not apply: a control the user's role forbids is absent, not disabled (spec section 8.5)."* That turns the which-states-apply analysis into something a reviewer can check rather than something buried in a document.

Overlay components — Modal, PeekPanel, Toast, BulkActionBar — cannot be stacked, so their specimens render a trigger button per state plus a **static, non-portalled visual replica** for the stacked view. The trigger proves the keyboard behaviour (focus trap, Escape, focus return); the replica proves appearance in both planes at once. Each overlay specimen prints the exact keyboard sequence a reviewer should run, above the trigger.

---

## 10. Minimum fixture set

All fixtures live in `src/gallery/fixtures/`, are typed with `as const satisfies readonly T[]`, and are imported only by files under `src/gallery/`.

| File | Contents | Why exactly this much |
|---|---|---|
| `rooms.ts` | 7 rooms: `{ id, order, title, itemCount, narrationStatus, updatedAt }`, `narrationStatus` covering all four tones | 7 rows over a page size of 5 gives two pages, so Previous and Next each reach both enabled and disabled. Four tones exercise every badge and every marker |
| `museums.ts` | 4 museums: `{ id, name, status, roomCount, spend, health }` | Only enough to run the same `DataTable` in a control-plane frame with a Cormorant museum name and a currency column. **Not a fleet** |
| `series.ts` | 6 categories × 2 series of integers, plus `provenance: 'demo'` | Two series is the grouped-bar minimum that proves emerald-primary against zinc-comparison; six categories fill the axis without scrolling |
| `kpis.ts` | 4 KPI inputs: one `demo` with a value, one `demo` with a delta, one `pending` with `value: null`, one `live` | Proves all three provenance renderings and the em-dash shell side by side |
| `filters.ts` | 3 filter definitions (Type, Status, Updated), 3–5 options each, one with counts | Enough for single-select, multi-select, clear-one, and clear-all |
| `toasts.ts` | 3 messages: success, failure with action, neutral with detail | One per tone |
| `peek.ts` | 1 record with 3 tabs of short content | One is enough; the panel is about behaviour, not data |

**The boundary against later phases, stated as a rule:** *if a fixture would still be needed after the gallery is deleted, it does not belong here.*

Explicitly out of Phase 2 fixtures:

- **Phase 3** — no users, roles, sessions, credentials, nav trees, or count badges.
- **Phase 4** — no readiness-spine data, no overview aggregates, no recent-change list, no ranked lists, no gauge values. `rooms.ts` carries a narration status per room but **no `nextRoomId`**, precisely so nobody builds a spine from it.
- **Phase 5** — no room or item editor payloads, no image URLs, no validation cases (duplicate order, cycles), no create or delete flows.
- **Phase 6** — no narration scripts, no audio state, no voices, no team members, no activity entries, no settings shapes.
- **Phase 7** — no fleet of forty, no tenant plates, no onboarding payloads, no suspend or reinstate records.
- **Phase 9** — no adapter health states, no rate-limit pressure, no spend attribution, no audit rows.

The directory choice does the enforcement: Phase 4 onward creates `src/fixtures/` for real fixtures, which cannot collide with `src/gallery/fixtures/`, and no file outside `src/gallery/` may import from it. Worth adding to `scripts/check-token-usage.ts` as a second assertion once Phase 3 lands.

---

## 11. Copy inventory

Every string the kit ships, in one place, so a Phase 10 copy pass has something to audit against. Sentence case, active voice, plain verbs, no filler, no apologies, verb stable through the flow.

| Component | Strings |
|---|---|
| StateBlock | `Something did not load` · `The request failed. Try again, or reload the page.` · `Try again` · `You do not have access to this` · `Your role does not include this data. Ask a system administrator if you need it.` · `Integration pending` · `{dependency} is not connected yet` · `Everything else on this page still works.` |
| Button | none (labels are the caller's verb; `busy` never changes the label) |
| Field | `Required` · `Optional` · `Read only` · `Clear` · `{n} of {max}` · `Not editable until {dependency} is connected.` |
| FilterChip | `All` · `{label}: {n}` · `Clear {label} filter` · `Clear all filters` · `{n} filters applied` · `Filter options did not load.` |
| StatusBadge | `Unknown` |
| Tabs | `{label}, {count}` (accessible name) · `Available when {dependency} is connected.` |
| DataTable | `Select all rows on this page` · `Select {row}` · `Sorted ascending` · `Sorted descending` · `Not sorted` · `No matches` · `No rows match the current search and filters.` · `Clear all filters` · `The table did not load` · `Search {entity}` · `{start}–{end} of {total}` |
| Pagination | `Previous` · `Next` · `Page {n} of {m}` · `Table pages` |
| BulkActionBar | `1 {noun} selected` · `{n} {nouns} selected` · `Clear selection` · `{n} of {m} did not update` |
| PeekPanel | `Close` · `This record did not load` · `You do not have access to this record` |
| Modal | `Cancel` · `Close` · `That did not save` |
| Toast | `Dismiss` · `Notifications` (region label) |
| KpiCard | `Demo data` · `Integration pending` · `No value yet` · `Did not load` · `Not available to your role` · `Available when {dependency} is connected.` |
| Chart | `Show data table` · `Hide data table` · `Chart series` · `Keep at least one series visible.` · `No data for this range` · `Widen the time window to see results.` · `The chart did not load` |

---

## 12. Build order and workstreams

### 12.1 What changed now that R1, R2, R4, R10, and R18 are resolved

The original plan made W0 a full-day, hard serialization point: it had to fix the token generator, rename the scope-band handles, wire `tokens:build`, add `color-scheme`, delete the prototype, and *then* lay the foundation. Five of those are done. W0 is now materially smaller, and the blocking part of it is smaller still.

### 12.2 Revised W0, split into a blocking and a non-blocking half

**W0a — blocking. One worker, roughly half a day. Nothing else starts until this merges.**

1. `"strict": true` and `"exactOptionalPropertyTypes": true` in `tsconfig.app.json`. Must land before any component code, or it is a retrofit across eleven components. One line, but in a shared file — check with the Phase 1 owner first.
2. `src/kit/types.ts` — the shared unions, `KitState`, `STATE_PRECEDENCE`, `resolveState`, `Provenance`.
3. **Every `<Component>.types.ts`, complete, with no implementations.** This is what makes the rest parallel: W3 can build a Modal footer against `ButtonProps` before W1 writes a line of Button.
4. `src/kit/kit.css` — `.visually-hidden` and `--control-press-inset`. Small but blocking, because half the components reference `.visually-hidden` in their first commit.
5. The token additions from section 4 into `src/tokens/semantic.ts` and `src/tokens/components.ts`, plus `npm run tokens:build`. Blocking because a component's CSS module cannot be finalised against a token that does not resolve.
6. `src/kit/index.ts` re-exporting all types.

**W0b — non-blocking. Same worker, runs in parallel with W1 to W4.**

7. The contrast-audit rows from section 4.4 in `src/audit/contrast-audit.ts`, plus `npm run audit:contrast`.
8. The internal hooks: `useFocusTrap`, `useDismiss`, `useRovingTabIndex`, `useReducedMotion`, `useResolvedTokens`. W3 needs the first two and W2 the last two; both can stub against the signatures for a day.
9. `StateBlock`, `Skeleton`, `StatusMarkerGlyph`.
10. The gallery shell — `Gallery`, `GalleryNav`, `GallerySpecimen`, `PlaneFrame`, `StateSwitcher`, `useHashSection` — with zero specimens.
11. The `App.tsx` hash switch between the Phase 1 harness and the gallery. **Do last, and coordinate**, since Phase 1 owns that file.
12. `scripts/check-token-usage.ts` and a `lint:tokens` script (R13).

**No longer in W0 at all:** the `componentsCss()` selector fix, the scope-band rename, the `tokens:build` wiring, `color-scheme`, deleting the prototype, and a kit focus-ring utility class — the global `:focus-visible` in `base.css` covers the last of these.

### 12.3 Dependency graph

```text
W0a types + tokens ──┬─────────────────────────────────────────────┐
                     │                                             │
                     ├─> W1 controls ─────┬─> W4 data table ───────┤
                     │   Button           │   (headless half can   │
                     │   Field family     │    start with W0a)     │
                     │   FilterChip       │                        │
                     │   Tabs             │                        │
                     │                    │                        │
                     ├─> W2 display ──────┤                        │
                     │   StatusBadge      │                        │
                     │   KpiCard          │                        │
                     │   Panel / pending  │                        │
                     │   Chart            │                        │
                     │                    │                        │
                     ├─> W3 overlays ─────┴─> BulkActionBar ───────┤
                     │   Modal / Confirm                           │
                     │   Toast                                     │
                     │   PeekPanel                                 │
                     │                                             │
                     └─> W0b foundation + gallery shell ───────────┘
                         (parallel, not blocking)
```

### 12.4 The workstreams

**W1 — Controls.** `Button`, `Field` plus `TextInput`, `TextArea`, `Select`, `Checkbox`, `FilterChip` plus `FilterChipRow` and `FilterChipMenu`, `Tabs`, and their specimens. The largest surface area with almost no internal coupling; splittable into two workers along Button-and-Field versus FilterChip-and-Tabs.

**W2 — Display and data.** `StatusBadge`, `ProvenanceTag`, `KpiCard`, `Panel` plus `IntegrationPendingPanel`, `GroupedBarChart` plus `chartSetup`, `ChartDataTable` and `SeriesToggle`, and their specimens. Owns the `chart.js` and `react-chartjs-2` install. Depends on W1's Button only for the series toggle, and stubs against the type until W1 merges.

**W3 — Overlays and feedback.** `Modal`, `ConfirmDialog`, `ToastProvider` plus `ToastRegion`, `toastContext`, `useToast`, `PeekPanel`, `BulkActionBar`, and their specimens. Depends on `useFocusTrap` and `useDismiss` from W0b, and on `Tabs` and `Button` by type until W1 merges. This is the highest-risk keyboard work in the phase and should get the most experienced worker.

**W4 — Data table.** `useDataTable` — sort, search, filter, page, and selection as a pure reducer with no DOM and no tokens — can start the moment W0a merges, since it needs only `types.ts`. Then `DataTable`, `TableToolbar`, `ColumnHeaderButton`, `TableSkeleton`, `Pagination`, and the specimen. The rendering half must serialize behind W1's Button, Checkbox, TextInput, and FilterChip, because a table specimen with stubbed controls proves nothing about the review gate.

### 12.5 Revised sequencing and critical path

| Day | Work |
|---|---|
| 1, morning | W0a (types, tokens, `kit.css`, strict) |
| 1, afternoon | W1, W2, W3, and W4-headless all start; W0b runs alongside |
| 2–3 | W1, W2, W3 build out; W0b lands the hooks, `StateBlock`, and the gallery shell |
| 3–4 | W4 rendering half, once W1's controls have merged |
| 4 | Joint keyboard-and-both-themes pass across the full gallery |

**The critical path shortens from roughly five days to roughly four**, and the hard serialization point shrinks from a full foundation day to a half-day types-and-tokens drop. The saving comes from three places: the two token defects no longer need fixing, the base layer now supplies the focus ring, the 44px floor, `color-scheme`, and reduced motion so the kit's global sheet is two rules instead of a file, and the foundation components (`StateBlock`, `Skeleton`, hooks) turned out not to be blocking once the type files are separated from the implementations.

### 12.6 The shared contract no workstream may violate

1. **`src/kit/types.ts` and every `<Component>.types.ts` are frozen after W0a.** A change requires a note to all workstreams, because someone is compiling against it right now.
2. **No raw colour anywhere.** Every colour is `var(--token)` in a `.module.css`. New tokens go through `src/tokens/` and a regeneration; generated CSS is never hand-edited.
3. **Never remove or clip the focus ring.** `base.css` supplies it.
4. **44px minimum target in both axes, 8px rhythm from `--space-*`, nothing with text below 12px, border widths from `--border-*-width`.**
5. **No component reads `data-plane`, accepts a `plane` prop, or branches on a theme.** The only exception is `GroupedBarChart`'s `planeKey` repaint trigger, documented in code as a trigger and not a colour source.
6. **No component declares `font-family`.** Cormorant reaches the page only through `.museum-name`.
7. **No amber as chrome.** `--status-warning-tint` behind a badge label is the only amber-family value the kit may touch.
8. **Primary is near-black on light and near-white on dark; danger is `#DC2626` with white text on both planes; emerald is status, data, selection, and focus only.**
9. **Every state-bearing component takes one `state?: KitState`** and resolves conflicts through `resolveState`.
10. **Everything public is exported from `src/kit/index.ts`.** The gallery imports from there and nowhere else, which is what proves the kit's surface is usable by Phase 3 onward.
11. **Nothing under `admin-web/src/tokens/`, `src/styles/`, `src/preview/`, `src/audit/`, or `scripts/tokens.ts` is edited without coordinating with the Phase 1 owner.** The token additions in section 4 are the one planned exception and belong to W0a alone.
12. **Every specimen must be operable by keyboard alone, in both planes, before its pull request is opened.** Not a reviewer's job to discover.

---

## 13. Risks, ambiguities, and decisions

### 13.1 Resolved since first review

**R1 — component tokens frozen to the root plane. Resolved.** `componentsCss()` emits `:root, [data-plane] {`, so the component layer re-declares inside every plane container and `--panel-surface` re-resolves against the control values in a nested dark frame. Verified in `src/styles/components.css` and `scripts/tokens.ts`. The gallery's side-by-side layout is safe.

**R2 — `scopeBand.*` colliding with `scope.band.*`. Resolved.** Renamed to `scopeBand.content` and `scopeBand.edgeColor`, emitting `--scope-band-content` and `--scope-band-edge-color`. No self-referential declaration; `assertUniqueCssVars()` passes. A `scopeBand.edgeWidth` handle and a `border.scopeEdgeWidth` scale token were added alongside.

**R4 — no `tokens:build` script. Resolved.** `tokens:build`, `tokens:check`, and a `prebuild` hook running `--check` are all in `package.json`, so token CSS cannot drift from its source without failing the build.

**R10 — no `color-scheme` per plane. Resolved.** `base.css` sets `light` on `:root, [data-plane='tenant']` and `dark` on `[data-plane='control']`, which is what makes the native `<select>` decision safe.

**R18 — prototype leftovers. Resolved, with a changed consequence.** The prototype `App.css`, `src/index.css`, and `src/assets/` are gone, and `App.tsx` is now Phase 1's token review harness. **Phase 2 must not delete it.** The gallery mounts alongside it behind a hash switch (section 9.1).

### 13.2 Still open

**R3 — `strict` is not enabled.** `tsconfig.app.json` has `noUnusedLocals`, `noUnusedParameters`, `erasableSyntaxOnly`, and `noFallthroughCasesInSwitch`, but no `strict`. The task constraints require it, and Phase 1's token source is already written as if `exactOptionalPropertyTypes` were on. **Resolution:** W0a enables `"strict": true` and `"exactOptionalPropertyTypes": true`, and every props interface in this document uses `?:` with conditional object construction rather than `| undefined`. **Skip `noUncheckedIndexedAccess`** — the table's index arithmetic and the chart's parallel `categories` and `values` arrays would need dozens of non-null assertions for no safety the reviews will not already catch. If a later phase wants it, that is a Phase 10 call.

**R13 — nothing mechanically prevents a loose hex or a stray amber in component CSS.** The token guards cover the token layers only. **Resolution:** `scripts/check-token-usage.ts`, run as `npm run lint:tokens` and chained into `lint`. Three assertions: no `#`-hex, `rgb(`, `hsl(`, or CSS named colour in any file under `src/kit/` or `src/gallery/`; no `--amber-`, `--scope-`, or primitive `--red-`/`--emerald-`/`--zinc-` reference outside `src/tokens/` and `src/kit/kit.css`; no `font-family` declaration under `src/kit/`. Twenty minutes to write, and it makes three of the hard constraints unbreakable rather than merely reviewed.

**R5 — the specification names no hover, active, or row-hover token.** **Resolution:** five new semantic tokens plus one press-inset effect, all resolving to existing primitives (section 4). The locked primitive layer is untouched.

**R6 — `content.muted` on disabled controls is below 4.5:1.** `#71717A` on `#E4E4E7` measures 3.81:1 in the audit. **Resolution:** correct and intended. WCAG 1.4.3 exempts disabled controls, and section 5 explicitly allows `content.muted` for large text, icons, and disabled labels. Recorded so nobody "fixes" it by promoting disabled text to `content.secondary`, which would make disabled and enabled controls indistinguishable.

**R7 — grid semantics versus native table semantics.** **Decision:** native `<table>` semantics with sequential tab order through interactive cells. It satisfies "operate every component by keyboard alone", it cannot regress the way a hand-rolled focus manager can, and Phase 10's reader pass is the right place to revisit it with evidence.

**R8 — which components get an `unauthorized` state.** Section 8.5 says role-limited controls are "absent, not disabled", which appears to conflict with section 7 requiring an unauthorized state everywhere. **Resolution:** they operate at different levels. *Controls* — Button, Field, individual actions — are absent when a role forbids them. *Regions* — DataTable, PeekPanel, KpiCard, Chart, Panel — render an unauthorized state, because a region that vanishes leaves the user unable to tell whether the data is missing or forbidden. Each contract above says which side it is on.

**R9 — a component can be in two states at once.** **Resolution:** one `state` prop and the fixed `STATE_PRECEDENCE` order in `resolveState`, so no reviewer sees two components disagree.

**R11 — 44px targets versus dense tables.** **Resolution:** row min-height 44px (`--table-row-min-height` already resolves to `target.min`); cells take 12px vertical padding at comfortable density and 8px at compact, with the floor holding either way; the row checkbox paints at 16px inside a 44×44 padded `<label>`; icon action buttons are 44×44 with a 20px glyph. Density changes horizontal padding and the number of visible columns, never row height.

**R12 — peek panel modality.** **Decision:** `variant="overlay"` at 1024px and above is non-modal — no `aria-modal`, no `inert`, Tab may leave, Escape closes and returns focus to the originating row. `variant="sheet"` below 1024px is modal with a trap and a scrim. The caller resolves the viewport; the panel has no media query inside it.

**R14 — chart colours resolved before the stylesheet applies return empty strings,** producing black bars on first paint. **Resolution:** resolve in `useLayoutEffect` against the chart's own wrapper, re-resolve once after `document.fonts.ready`, and treat an empty resolved value as a hard error in development so it cannot ship silently.

**R15 — the specification's open questions** (operator-inside-tenant read-only versus read-write; multi-venue museums) are unresolved and due before Phase 7. **Resolution:** neither changes any Phase 2 API, and no kit component should encode an assumption about either. Keep `disabledReason` a free string rather than a `'role' | 'integration'` union, and keep `PeekPanelProps.museumName` a plain string rather than a scope object. If multi-venue turns out to be yes, a venue level slots in as another `museumName`-like field without touching a props interface.

**R16 — a native `<select>` cannot express a multi-select filter with a value summary.** **Decision:** native `<select>` for form fields — free keyboard, free type-ahead, free mobile picker, impossible to regress, and `color-scheme` already makes its chrome plane-correct — with a custom `role="listbox"` popover only inside the filter chip, which genuinely needs multi-select and a summary. Two patterns, each where it is correct.

**R17 — `react/only-export-components` warns on files mixing a component with a context or hook export.** **Resolution:** the Toast context lives in `toastContext.ts`, the hook in `useToast.ts`, the provider and region in their own component files. Same discipline anywhere else a context appears.

### 13.3 New, raised by the Phase 1 contrast audit

**R19 — the focus ring measures 2.97:1 against `surface.sunken` on the tenant plane** (`#059669` on `#E4E4E7`), a recorded failure against the 3:1 control-boundary requirement. The 2px offset mitigates it in most placements by exposing the parent surface between control and ring, but the mitigation is positional, not guaranteed. **Resolution — a kit rule: do not place an interactive control directly on `surface.sunken` on the tenant plane.** Where a sunken strip is unavoidable — a toolbar well, a read-only field, a disabled button — the control either sits on `surface.raised` within it or accepts the measured shortfall as a known, documented exception. Flag any new instance to Phase 10 rather than inventing a second ring colour, which would break the "one ring, both planes" rule.

**R20 — `feedback.warning` measures 2.90:1 against the light canvas**, a recorded failure. **Resolution — already designed around:** no warning-toned graphic is ever painted directly on a canvas. Warning appears only as a tint behind a label, where the marker inherits `status.warning.onTint` `#92400E`. The `currentColor` marker decision in section 6 is what enforces it. Do not add a `feedback.*`-coloured marker variant to `StatusBadge`.

---

## 14. Preconditions to confirm before starting

Phase 1 was still writing when this document was produced. Confirm each of these against disk before the first commit; if any has moved, adjust rather than assuming.

| # | Check | Expected | If it differs |
|---|---|---|---|
| 1 | `src/styles/components.css` opens with `:root,` then `[data-plane] {` | Present | Do not start the gallery until it is; the two-frame review is invalid without it |
| 2 | `src/styles/components.css` has no self-referential declaration, and contains `--scope-band-content` and `--scope-band-edge-color` | Present | Re-check `assertUniqueCssVars()` is running |
| 3 | `npm run tokens:check` exits zero | Clean | Regenerate before touching the token source |
| 4 | `npm run audit:contrast` exits and `docs/contrast-audit.md` regenerates unchanged | Clean | Investigate before adding the section 4.4 rows |
| 5 | `src/styles/base.css` still provides the global `:focus-visible` ring, the 44px `min-block-size` floor, `color-scheme` per plane, and the reduced-motion block | Present | If any moved, the kit must supply it in `kit.css` |
| 6 | `src/styles/typography.css` still exports `.text-*`, `.column-header`, `.numeric`, `.museum-name` | Present | Adjust the class names the kit composes with |
| 7 | `--border-hairline-width` and `--border-scope-edge-width` resolve | Present | Fall back to `--border-hairline-width` only |
| 8 | `.visually-hidden` still does not exist in Phase 1's stylesheets | Absent | If Phase 1 added it, use theirs and drop it from `kit.css` |
| 9 | `tsconfig.app.json` `strict` setting | Still absent | If Phase 1 enabled it, skip that part of W0a |
| 10 | `src/App.tsx` is Phase 1's review harness | Yes | **Do not delete it.** Add the hash switch instead, and coordinate |
| 11 | `scripts/` contains no token-usage checker | Absent | If one exists, extend it rather than adding a second |
| 12 | `package.json` has no `chart.js` or `react-chartjs-2` | Absent | If present, match the installed versions instead of installing |
| 13 | No router is installed | Absent | If Phase 3 has started early, coordinate the gallery mount before writing `useHashSection` |
| 14 | Phase 1 is finished, or its owner has confirmed the token files are stable | Confirmed | W0a edits `src/tokens/semantic.ts` and `src/tokens/components.ts`; do not race a live writer |

The single hardest precondition is 14. Everything else in this plan is additive to files Phase 2 owns; the token additions in section 4 and the `App.tsx` hash switch in section 9.1 are the only two places Phase 2 touches Phase 1's territory, and both should be explicitly handed over rather than assumed free.

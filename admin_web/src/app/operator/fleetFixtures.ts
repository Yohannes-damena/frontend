import type { StatusMarker, StatusTone } from '../../kit/index.ts'
import type { ApiSubscriptionStatus, ApiTier } from '../../api/types.ts'

/**
 * Shapes for the fleet screens, plus the demo fleet used when the console runs
 * without an API.
 *
 * `onboarding` has no server-side equivalent: the API knows only ACTIVE and
 * SUSPENDED. It is derived in the store for an active museum with nothing
 * authored yet, because that is the distinction an operator scanning the fleet
 * actually cares about.
 */

export type FleetStatus = 'active' | 'onboarding' | 'suspended'
export type FleetHealth = 'healthy' | 'watch' | 'critical'

export type ReadinessSegment = {
  readonly id: string
  readonly order: number
  readonly marker: StatusMarker
}

export type FleetMuseum = {
  readonly id: string
  readonly slug: string
  readonly name: string
  readonly region: string
  readonly status: FleetStatus
  readonly roomCount: number
  readonly itemCount: number
  readonly adminCount: number
  /** Narrated with at least one item. Kept so status can be re-derived locally. */
  readonly roomsReady: number
  /** Rooms the visitor route reaches by following nextRoomId. */
  readonly roomsInSequence: number
  /** One segment per room, grouped by readiness rather than in story order. */
  readonly readiness: readonly ReadinessSegment[]
  /** Collected revenue over the window the store asked for. Null when unavailable. */
  readonly spendEtb: number | null
  readonly tier: ApiTier
  readonly subscriptionStatus: ApiSubscriptionStatus
  readonly health: FleetHealth
  /** ISO timestamp of the last authoring edit, or null if nothing is authored. */
  readonly updatedAt: string | null
}

export const FLEET_STATUS_OPTIONS: readonly { value: FleetStatus; label: string }[] = [
  { value: 'active', label: 'Active' },
  { value: 'onboarding', label: 'Onboarding' },
  { value: 'suspended', label: 'Suspended' },
]

export function fleetStatusLabel(status: FleetStatus): string {
  if (status === 'onboarding') return 'Onboarding'
  if (status === 'suspended') return 'Suspended'
  return 'Active'
}

export function fleetStatusTone(status: FleetStatus): StatusTone {
  if (status === 'onboarding') return 'warning'
  if (status === 'suspended') return 'danger'
  return 'success'
}

export function fleetHealthLabel(health: FleetHealth): string {
  if (health === 'watch') return 'Watch'
  if (health === 'critical') return 'Critical'
  return 'Healthy'
}

export function fleetHealthTone(health: FleetHealth): StatusTone {
  if (health === 'watch') return 'warning'
  if (health === 'critical') return 'danger'
  return 'success'
}

/** Birr, not dollars: every amount the billing API returns is ETB. */
export function formatEtb(value: number | null): string {
  if (value === null) return '—'
  return new Intl.NumberFormat('en-ET', {
    style: 'currency',
    currency: 'ETB',
    maximumFractionDigits: 0,
  }).format(value)
}

const RELATIVE = new Intl.RelativeTimeFormat('en', { numeric: 'auto' })

const UNITS: readonly [Intl.RelativeTimeFormatUnit, number][] = [
  ['year', 365 * 24 * 60 * 60 * 1000],
  ['month', 30 * 24 * 60 * 60 * 1000],
  ['day', 24 * 60 * 60 * 1000],
  ['hour', 60 * 60 * 1000],
  ['minute', 60 * 1000],
]

/** "3 hours ago" from an ISO timestamp. Nothing authored yet reads as "never". */
export function formatRelative(iso: string | null): string {
  if (iso === null) return 'never'
  const then = Date.parse(iso)
  if (Number.isNaN(then)) return 'unknown'

  const elapsed = Date.now() - then
  for (const [unit, ms] of UNITS) {
    if (Math.abs(elapsed) >= ms) return RELATIVE.format(-Math.round(elapsed / ms), unit)
  }
  return 'just now'
}

/**
 * Builds the summary spine: ready rooms first, then narrated-but-empty, then
 * un-narrated. Position carries no story order — the fleet card has room for a
 * density read, and the per-room order lives on the tenant overview.
 */
export function readinessSegments(
  idPrefix: string,
  counts: { ready: number; incomplete: number; empty: number },
): readonly ReadinessSegment[] {
  const markers: StatusMarker[] = [
    ...Array.from<unknown, StatusMarker>({ length: Math.max(0, counts.ready) }, () => 'dot'),
    ...Array.from<unknown, StatusMarker>({ length: Math.max(0, counts.incomplete) }, () => 'ring'),
    ...Array.from<unknown, StatusMarker>({ length: Math.max(0, counts.empty) }, () => 'dash'),
  ]
  return markers.map((marker, index) => ({
    id: `${idPrefix}-${index + 1}`,
    order: index + 1,
    marker,
  }))
}

// -- Demo fleet ------------------------------------------------------------

type DemoSeed = {
  readonly name: string
  readonly region: string
  readonly status: FleetStatus
  readonly ready: number
  readonly incomplete: number
  readonly empty: number
  readonly spendEtb: number
  readonly tier: ApiTier
  readonly hoursAgo: number
}

const DEMO_SEEDS: readonly DemoSeed[] = [
  { name: 'Adwa Victory Memorial', region: 'Addis Ababa', status: 'active', ready: 6, incomplete: 1, empty: 1, spendEtb: 68000, tier: 'ENTERPRISE', hoursAgo: 2 },
  { name: 'Entoto Heritage Museum', region: 'Addis Ababa', status: 'active', ready: 8, incomplete: 2, empty: 1, spendEtb: 88000, tier: 'PRO', hoursAgo: 0.5 },
  { name: 'Harar Cultural Museum', region: 'Harar', status: 'suspended', ready: 0, incomplete: 0, empty: 6, spendEtb: 15000, tier: 'BASIC', hoursAgo: 120 },
  { name: 'Sheger Modern Museum', region: 'Addis Ababa', status: 'onboarding', ready: 0, incomplete: 1, empty: 3, spendEtb: 0, tier: 'BASIC', hoursAgo: 7 },
  { name: 'Axum Obelisk Gallery', region: 'Tigray', status: 'active', ready: 6, incomplete: 1, empty: 0, spendEtb: 54000, tier: 'PRO', hoursAgo: 24 },
  { name: 'Gondar Palace Archives', region: 'Amhara', status: 'active', ready: 8, incomplete: 1, empty: 0, spendEtb: 60000, tier: 'PRO', hoursAgo: 4 },
  { name: 'Lalibela Sacred Museum', region: 'Amhara', status: 'active', ready: 4, incomplete: 1, empty: 0, spendEtb: 48000, tier: 'BASIC', hoursAgo: 14 },
  { name: 'Bahir Dar Lake Museum', region: 'Amhara', status: 'active', ready: 9, incomplete: 1, empty: 0, spendEtb: 79000, tier: 'PRO', hoursAgo: 3 },
  { name: 'Jimma Coffee Heritage', region: 'Oromia', status: 'active', ready: 5, incomplete: 1, empty: 0, spendEtb: 42000, tier: 'BASIC', hoursAgo: 9 },
  { name: 'Mekelle History Center', region: 'Tigray', status: 'active', ready: 6, incomplete: 1, empty: 1, spendEtb: 62000, tier: 'PRO', hoursAgo: 1 },
  { name: 'Arba Minch Rift Gallery', region: 'SNNPR', status: 'onboarding', ready: 0, incomplete: 1, empty: 2, spendEtb: 0, tier: 'BASIC', hoursAgo: 6 },
  { name: 'Dire Dawa Rail Museum', region: 'Dire Dawa', status: 'active', ready: 6, incomplete: 1, empty: 0, spendEtb: 52000, tier: 'BASIC', hoursAgo: 18 },
]

function demoSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

function demoHealth(seed: DemoSeed): FleetHealth {
  if (seed.status === 'suspended') return 'critical'
  if (seed.incomplete + seed.empty > 0) return 'watch'
  return 'healthy'
}

export const FLEET_FIXTURES: readonly FleetMuseum[] = DEMO_SEEDS.map((seed) => {
  const slug = demoSlug(seed.name)
  const roomCount = seed.ready + seed.incomplete + seed.empty
  return {
    id: slug,
    slug,
    name: seed.name,
    region: seed.region,
    status: seed.status,
    roomCount,
    itemCount: seed.ready * 4,
    adminCount: 2,
    roomsReady: seed.ready,
    roomsInSequence: roomCount,
    readiness: readinessSegments(slug, seed),
    spendEtb: seed.spendEtb,
    tier: seed.tier,
    subscriptionStatus: seed.status === 'suspended' ? 'PAST_DUE' : 'ACTIVE',
    health: demoHealth(seed),
    updatedAt: new Date(Date.now() - seed.hoursAgo * 60 * 60 * 1000).toISOString(),
  }
})

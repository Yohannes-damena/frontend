import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactElement,
  type ReactNode,
} from 'react'

import { createMuseum, getSpend, listAllMuseumsWithStats, updateMuseum } from '../../api/adminApi.ts'
import { isLiveApi } from '../../api/config.ts'
import { isApiError, messageForCode } from '../../api/errors.ts'
import type {
  ApiMuseumStatus,
  ApiMuseumWithStats,
  ApiSpend,
  ApiSubscriptionStatus,
  SpendWindow,
} from '../../api/types.ts'
import {
  FLEET_FIXTURES,
  readinessSegments,
  type FleetHealth,
  type FleetMuseum,
  type FleetStatus,
} from './fleetFixtures.ts'

/**
 * The fleet is one list assembled from two operator-only reads: every museum
 * with its authoring counts, and collected revenue per museum. Spend is fetched
 * alongside rather than merged server-side because it is windowed and the
 * museum list is not — and because a billing outage should grey out one column,
 * not empty the screen.
 */

export type OnboardInput = {
  readonly name: string
  readonly slug: string
  readonly region: string
  readonly adminEmail: string
  readonly adminPassword: string
}

export type FleetMutationResult =
  | { readonly ok: true; readonly museumId: string }
  | {
      readonly ok: false
      readonly message: string
      readonly fieldErrors: Readonly<Record<string, string>>
    }

export type FleetView = 'gallery' | 'table'

export type FleetUiState = {
  readonly view: FleetView
  readonly search: string
  readonly statusFilter: FleetStatus | 'all'
  readonly scrollY: number
}

type FleetStoreValue = {
  readonly museums: readonly FleetMuseum[]
  readonly status: 'loading' | 'ready' | 'error' | 'demo'
  readonly loadError: string | null
  /** Set when the museum list loaded but the spend read did not. */
  readonly spendError: string | null
  readonly spendWindow: SpendWindow
  readonly setSpendWindow: (window: SpendWindow) => void
  readonly reload: () => void

  readonly fleetUi: FleetUiState
  readonly setFleetView: (view: FleetView) => void
  readonly setFleetSearch: (search: string) => void
  readonly setFleetStatusFilter: (statusFilter: FleetStatus | 'all') => void
  readonly setFleetScrollY: (scrollY: number) => void

  readonly onboardMuseum: (input: OnboardInput) => Promise<FleetMutationResult>
  readonly setMuseumStatus: (
    museumId: string,
    status: 'active' | 'suspended',
  ) => Promise<FleetMutationResult>
  readonly getMuseumById: (museumId: string) => FleetMuseum | undefined
}

const fleetStoreContext = createContext<FleetStoreValue | null>(null)

// -- Derivations -----------------------------------------------------------

type Derivable = {
  readonly apiStatus: ApiMuseumStatus
  readonly subscriptionStatus: ApiSubscriptionStatus
  readonly roomCount: number
  readonly roomsReady: number
  readonly roomsInSequence: number
}

/**
 * An active museum with nothing published yet is still being set up. The server
 * has no state for that, and showing it as "Active" beside a finished museum is
 * how a launch gets missed.
 */
function deriveStatus(input: Derivable): FleetStatus {
  if (input.apiStatus === 'SUSPENDED') return 'suspended'
  if (input.roomsReady === 0) return 'onboarding'
  return 'active'
}

function deriveHealth(input: Derivable): FleetHealth {
  if (input.apiStatus === 'SUSPENDED') return 'critical'
  if (input.subscriptionStatus !== 'ACTIVE') return 'critical'
  // A room the visitor route never reaches is invisible in production while
  // looking perfectly authored here, so it counts against health.
  if (input.roomCount > 0 && input.roomsInSequence < input.roomCount) return 'critical'
  if (input.roomsReady < input.roomCount || input.roomCount === 0) return 'watch'
  return 'healthy'
}

function toFleetMuseum(museum: ApiMuseumWithStats, spendEtb: number | null): FleetMuseum {
  const { roomCount, roomsReady, roomsMissingNarration, roomsInSequence } = museum.stats
  const derivable: Derivable = {
    apiStatus: museum.status,
    subscriptionStatus: museum.subscriptionStatus,
    roomCount,
    roomsReady,
    roomsInSequence,
  }

  return {
    id: museum.id,
    slug: museum.slug,
    name: museum.name,
    region: museum.cityCountry ?? 'Unassigned',
    status: deriveStatus(derivable),
    roomCount,
    itemCount: museum.stats.itemCount,
    adminCount: museum.stats.adminCount,
    roomsReady,
    roomsInSequence,
    readiness: readinessSegments(museum.id, {
      ready: roomsReady,
      // Narrated but with nothing to look at. The server reports the two
      // failing counts separately because a room can be in both.
      incomplete: Math.max(0, roomCount - roomsReady - roomsMissingNarration),
      empty: roomsMissingNarration,
    }),
    spendEtb,
    tier: museum.tier,
    subscriptionStatus: museum.subscriptionStatus,
    health: deriveHealth(derivable),
    updatedAt: museum.stats.lastEditedAt,
  }
}

function spendByMuseum(spend: ApiSpend | null): Map<string, number> {
  const totals = new Map<string, number>()
  if (spend === null) return totals
  for (const row of spend.rows) {
    const amount = Number.parseFloat(row.paidAmountEtb)
    totals.set(row.museumId, Number.isFinite(amount) ? amount : 0)
  }
  return totals
}

function toMutationFailure(error: unknown, fallback: string): FleetMutationResult {
  if (!isApiError(error)) return { ok: false, message: fallback, fieldErrors: {} }
  const fieldErrors: Record<string, string> = {}
  for (const [path, field] of Object.entries({
    name: 'name',
    slug: 'slug',
    cityCountry: 'region',
    adminEmail: 'adminEmail',
    adminPassword: 'adminPassword',
  })) {
    const message = error.fieldError(path)
    if (message !== undefined) fieldErrors[field] = message
  }
  return { ok: false, message: messageForCode(error), fieldErrors }
}

// -- Provider --------------------------------------------------------------

export function FleetStoreProvider({
  children,
  enabled = true,
}: {
  readonly children: ReactNode
  /** False for a museum administrator, whose token cannot read these routes. */
  readonly enabled?: boolean
}): ReactElement {
  const live = isLiveApi && enabled
  const [museums, setMuseums] = useState<readonly FleetMuseum[]>(live ? [] : FLEET_FIXTURES)
  const [status, setStatus] = useState<FleetStoreValue['status']>(live ? 'loading' : 'demo')
  const [loadError, setLoadError] = useState<string | null>(null)
  const [spendError, setSpendError] = useState<string | null>(null)
  const [spendWindow, setSpendWindow] = useState<SpendWindow>('30d')
  const [reloadToken, setReloadToken] = useState(0)

  const [fleetUi, setFleetUi] = useState<FleetUiState>({
    view: 'gallery',
    search: '',
    statusFilter: 'all',
    scrollY: 0,
  })

  const requestSeq = useRef(0)

  const reload = useCallback(() => setReloadToken((token) => token + 1), [])

  useEffect(() => {
    if (!live) return

    const seq = requestSeq.current + 1
    requestSeq.current = seq
    let cancelled = false

    setStatus('loading')
    setLoadError(null)
    setSpendError(null)

    async function load(): Promise<void> {
      // Spend is allowed to fail on its own: the fleet is still readable
      // without a revenue column, and losing the whole screen to a billing
      // hiccup is worse than an empty one.
      const [rows, spend] = await Promise.all([
        listAllMuseumsWithStats(),
        getSpend({ window: spendWindow }).catch((error: unknown) => {
          if (!cancelled && requestSeq.current === seq) {
            setSpendError(
              isApiError(error) ? messageForCode(error) : 'Spend figures are unavailable.',
            )
          }
          return null
        }),
      ])
      if (cancelled || requestSeq.current !== seq) return

      const totals = spendByMuseum(spend)
      setMuseums(rows.map((row) => toFleetMuseum(row, totals.get(row.id) ?? null)))
      setStatus('ready')
    }

    load().catch((error: unknown) => {
      if (cancelled || requestSeq.current !== seq) return
      setLoadError(isApiError(error) ? messageForCode(error) : 'Could not load the fleet.')
      setStatus('error')
    })

    return () => {
      cancelled = true
    }
  }, [live, reloadToken, spendWindow])

  const onboardMuseum = useCallback(
    async (input: OnboardInput): Promise<FleetMutationResult> => {
      const name = input.name.trim()
      const slug = input.slug.trim()

      if (!live) {
        const id = slug.length > 0 ? slug : name.toLowerCase().replace(/[^a-z0-9]+/g, '-')
        setMuseums((current) => [
          {
            id,
            slug: id,
            name,
            region: input.region.trim().length > 0 ? input.region.trim() : 'Unassigned',
            status: 'onboarding',
            roomCount: 0,
            itemCount: 0,
            adminCount: 1,
            roomsReady: 0,
            roomsInSequence: 0,
            readiness: [],
            spendEtb: 0,
            tier: 'BASIC',
            subscriptionStatus: 'ACTIVE',
            health: 'watch',
            updatedAt: new Date().toISOString(),
          },
          ...current,
        ])
        return { ok: true, museumId: id }
      }

      try {
        const created = await createMuseum({
          name,
          slug,
          ...(input.region.trim().length > 0 ? { cityCountry: input.region.trim() } : {}),
          adminEmail: input.adminEmail.trim().toLowerCase(),
          adminPassword: input.adminPassword,
        })
        // Re-reads rather than appending a locally-shaped row: the new museum
        // needs stats it cannot have until the server computes them.
        reload()
        return { ok: true, museumId: created.museum.id }
      } catch (error) {
        return toMutationFailure(error, 'The museum could not be created.')
      }
    },
    [live, reload],
  )

  const setMuseumStatus = useCallback(
    async (museumId: string, next: 'active' | 'suspended'): Promise<FleetMutationResult> => {
      const apiStatus = next === 'suspended' ? ('SUSPENDED' as const) : ('ACTIVE' as const)

      // Re-derives from the counts already held rather than re-reading the
      // fleet, so suspending one museum does not blank the whole screen.
      const applyLocally = (subscriptionStatus?: ApiSubscriptionStatus): void => {
        setMuseums((current) =>
          current.map((museum) => {
            if (museum.id !== museumId) return museum
            const derivable: Derivable = {
              apiStatus,
              subscriptionStatus: subscriptionStatus ?? museum.subscriptionStatus,
              roomCount: museum.roomCount,
              roomsReady: museum.roomsReady,
              roomsInSequence: museum.roomsInSequence,
            }
            return {
              ...museum,
              subscriptionStatus: derivable.subscriptionStatus,
              status: deriveStatus(derivable),
              health: deriveHealth(derivable),
            }
          }),
        )
      }

      if (!live) {
        applyLocally()
        return { ok: true, museumId }
      }

      try {
        const updated = await updateMuseum(museumId, { status: apiStatus })
        applyLocally(updated.subscriptionStatus)
        return { ok: true, museumId }
      } catch (error) {
        return toMutationFailure(error, 'The status change did not apply.')
      }
    },
    [live],
  )

  const value = useMemo<FleetStoreValue>(
    () => ({
      museums,
      status,
      loadError,
      spendError,
      spendWindow,
      setSpendWindow,
      reload,

      fleetUi,
      setFleetView: (view) => {
        setFleetUi((current) => (current.view === view ? current : { ...current, view }))
      },
      setFleetSearch: (search) => {
        setFleetUi((current) => (current.search === search ? current : { ...current, search }))
      },
      setFleetStatusFilter: (statusFilter) => {
        setFleetUi((current) =>
          current.statusFilter === statusFilter ? current : { ...current, statusFilter },
        )
      },
      setFleetScrollY: (scrollY) => {
        setFleetUi((current) => {
          const bounded = Number.isFinite(scrollY) ? Math.max(0, scrollY) : 0
          return current.scrollY === bounded ? current : { ...current, scrollY: bounded }
        })
      },

      onboardMuseum,
      setMuseumStatus,
      getMuseumById: (museumId) => museums.find((museum) => museum.id === museumId),
    }),
    [
      museums,
      status,
      loadError,
      spendError,
      spendWindow,
      reload,
      fleetUi,
      onboardMuseum,
      setMuseumStatus,
    ],
  )

  return <fleetStoreContext.Provider value={value}>{children}</fleetStoreContext.Provider>
}

export function useFleetStore(): FleetStoreValue {
  const context = useContext(fleetStoreContext)
  if (context === null) {
    throw new Error('Fleet store is unavailable.')
  }
  return context
}

import { useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactElement } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'

import {
  BulkActionBar,
  Button,
  ConfirmDialog,
  DataTable,
  Field,
  Modal,
  PeekPanel,
  Select,
  StateBlock,
  StatusBadge,
  StatusMarkerGlyph,
  TableToolbar,
  TextInput,
  useDataTable,
  useToast,
  type Column,
  type KitState,
  type StatusMarker,
} from '../../kit/index.ts'
import { useFleetStore } from './fleetStore.tsx'
import {
  FLEET_STATUS_OPTIONS,
  fleetHealthLabel,
  fleetHealthTone,
  fleetStatusLabel,
  fleetStatusTone,
  formatEtb,
  formatRelative,
  type FleetMuseum,
  type FleetStatus,
} from './fleetFixtures.ts'
import styles from './FleetPage.module.css'

type PendingStatusChange = {
  readonly museumId: string
  readonly nextStatus: 'active' | 'suspended'
}

/** Creating a museum also creates the account that can sign into it. */
type OnboardDraft = {
  readonly name: string
  readonly slug: string
  readonly region: string
  readonly adminEmail: string
  readonly adminPassword: string
}

const EMPTY_ONBOARD: OnboardDraft = {
  name: '',
  slug: '',
  region: '',
  adminEmail: '',
  adminPassword: '',
}

function slugify(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

function useSheetMode(): boolean {
  const [sheet, setSheet] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false
    return window.innerWidth < 1024
  })

  useEffect(() => {
    function onResize(): void {
      setSheet(window.innerWidth < 1024)
    }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  return sheet
}

function readinessAttentionCount(readiness: readonly { marker: StatusMarker }[]): number {
  return readiness.filter((segment) => segment.marker === 'ring' || segment.marker === 'cross').length
}

function markerClass(marker: StatusMarker): string {
  if (marker === 'dot') return styles.segmentSuccess
  if (marker === 'ring') return styles.segmentWarning
  if (marker === 'cross') return styles.segmentDanger
  return styles.segmentNeutral
}

function MiniReadinessSpine({ museum }: { readonly museum: FleetMuseum }): ReactElement {
  return (
    <ol className={styles.spine} aria-label={`${museum.name} readiness spine`}>
      {museum.readiness.map((segment) => (
        <li key={segment.id} className={`${styles.spineSegment} ${markerClass(segment.marker)}`}>
          <StatusMarkerGlyph marker={segment.marker} size={12} />
        </li>
      ))}
    </ol>
  )
}

export function FleetPage(): ReactElement {
  const {
    museums,
    status,
    loadError,
    spendError,
    spendWindow,
    setSpendWindow,
    reload,
    fleetUi,
    setFleetView,
    setFleetSearch,
    setFleetStatusFilter,
    setFleetScrollY,
    onboardMuseum,
    setMuseumStatus,
  } = useFleetStore()
  const navigate = useNavigate()
  const location = useLocation()
  const prefersSheet = useSheetMode()
  const { show } = useToast()

  const [selectedMuseumId, setSelectedMuseumId] = useState<string | null>(null)
  const [activePeekTabId, setActivePeekTabId] = useState('summary')
  const [onboardOpen, setOnboardOpen] = useState(false)
  const [onboardDraft, setOnboardDraft] = useState<OnboardDraft>(EMPTY_ONBOARD)
  const [onboardErrors, setOnboardErrors] = useState<Readonly<Record<string, string>>>({})
  const [onboardError, setOnboardError] = useState<string | null>(null)
  const [onboarding, setOnboarding] = useState(false)
  const [pendingStatusChange, setPendingStatusChange] = useState<PendingStatusChange | null>(null)
  const [changingStatus, setChangingStatus] = useState(false)
  const returnFocusTo = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (location.pathname.endsWith('/fleet/new')) {
      setOnboardOpen(true)
    }
  }, [location.pathname])

  useLayoutEffect(() => {
    if (typeof window === 'undefined') return
    window.scrollTo({ top: fleetUi.scrollY, behavior: 'auto' })
  }, [fleetUi.scrollY])

  useEffect(() => {
    if (typeof window === 'undefined') return
    const onScroll = (): void => {
      setFleetScrollY(window.scrollY)
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    onScroll()
    return () => window.removeEventListener('scroll', onScroll)
  }, [setFleetScrollY])

  const filteredMuseums = useMemo(() => {
    const needle = fleetUi.search.trim().toLowerCase()
    return museums.filter((museum) => {
      if (fleetUi.statusFilter !== 'all' && museum.status !== fleetUi.statusFilter) return false
      if (needle.length === 0) return true
      return `${museum.name} ${museum.region}`.toLowerCase().includes(needle)
    })
  }, [fleetUi.search, fleetUi.statusFilter, museums])

  const attentionCount = useMemo(
    () =>
      museums.filter(
        (museum) =>
          museum.status !== 'active' || museum.health !== 'healthy' || readinessAttentionCount(museum.readiness) > 0,
      ).length,
    [museums],
  )

  const columns = useMemo<readonly Column<FleetMuseum>[]>(
    () => [
      {
        id: 'museum',
        header: 'Museum',
        sortable: true,
        sortValue: (museum) => museum.name,
        cell: (museum) => (
          <div className={styles.tableName}>
            <span className="museum-name">{museum.name}</span>
            <span className={`text-caption ${styles.muted}`}>{museum.region}</span>
          </div>
        ),
      },
      {
        id: 'status',
        header: 'Status',
        sortable: true,
        sortValue: (museum) => fleetStatusLabel(museum.status),
        cell: (museum) => <StatusBadge tone={fleetStatusTone(museum.status)} label={fleetStatusLabel(museum.status)} />,
      },
      {
        id: 'readiness',
        header: 'Spine',
        sortable: true,
        sortValue: (museum) => readinessAttentionCount(museum.readiness),
        cell: (museum) => <MiniReadinessSpine museum={museum} />,
      },
      {
        id: 'spend',
        header: 'Collected',
        numeric: true,
        sortable: true,
        sortValue: (museum) => museum.spendEtb ?? -1,
        cell: (museum) => (
          <div className={styles.tableSpend}>
            <span className="numeric">{formatEtb(museum.spendEtb)}</span>
            <span className={`text-caption ${styles.muted}`}>Last {spendWindow}</span>
          </div>
        ),
      },
      {
        id: 'health',
        header: 'Health',
        sortable: true,
        sortValue: (museum) => fleetHealthLabel(museum.health),
        cell: (museum) => <StatusBadge tone={fleetHealthTone(museum.health)} label={fleetHealthLabel(museum.health)} />,
      },
      {
        id: 'updated',
        header: 'Last edited',
        sortable: true,
        sortValue: (museum) => museum.updatedAt ?? '',
        cell: (museum) => (
          <span className={`text-caption ${styles.muted}`}>{formatRelative(museum.updatedAt)}</span>
        ),
      },
    ],
    [spendWindow],
  )

  const table = useDataTable({
    rows: filteredMuseums,
    rowKey: (museum) => museum.id,
    columns,
    pageSize: 8,
    initialSort: { columnId: 'spend', direction: 'descending' },
  })

  const selectedMuseum = useMemo(
    () => museums.find((museum) => museum.id === selectedMuseumId) ?? null,
    [museums, selectedMuseumId],
  )

  function openPeek(museum: FleetMuseum, trigger: HTMLElement): void {
    returnFocusTo.current = trigger
    setSelectedMuseumId(museum.id)
    setActivePeekTabId('summary')
  }

  function openStatusChange(museum: FleetMuseum, trigger: HTMLElement): void {
    returnFocusTo.current = trigger
    setPendingStatusChange({
      museumId: museum.id,
      nextStatus: museum.status === 'suspended' ? 'active' : 'suspended',
    })
  }

  async function confirmStatusChange(): Promise<void> {
    if (pendingStatusChange === null) return
    const { museumId, nextStatus } = pendingStatusChange
    setChangingStatus(true)
    try {
      const result = await setMuseumStatus(museumId, nextStatus)
      show(
        result.ok
          ? {
              tone: 'success',
              message: nextStatus === 'suspended' ? 'Museum suspended.' : 'Museum reinstated.',
            }
          : { tone: 'danger', message: result.message },
      )
    } finally {
      setChangingStatus(false)
      setPendingStatusChange(null)
    }
  }

  async function submitOnboard(): Promise<void> {
    setOnboarding(true)
    setOnboardError(null)
    setOnboardErrors({})
    try {
      const result = await onboardMuseum({
        name: onboardDraft.name,
        slug: onboardDraft.slug.trim().length > 0 ? onboardDraft.slug : slugify(onboardDraft.name),
        region: onboardDraft.region,
        adminEmail: onboardDraft.adminEmail,
        adminPassword: onboardDraft.adminPassword,
      })
      if (!result.ok) {
        setOnboardErrors(result.fieldErrors)
        if (Object.keys(result.fieldErrors).length === 0) setOnboardError(result.message)
        return
      }
      show({ tone: 'success', message: `${onboardDraft.name.trim()} added to the fleet.` })
      setOnboardDraft(EMPTY_ONBOARD)
      setOnboardOpen(false)
      navigate('/operator/fleet')
    } finally {
      setOnboarding(false)
    }
  }

  function closeOnboard(): void {
    setOnboardOpen(false)
    setOnboardErrors({})
    setOnboardError(null)
    if (location.pathname.endsWith('/fleet/new')) navigate('/operator/fleet')
  }

  async function applyBulkStatus(
    keys: ReadonlySet<string>,
    nextStatus: 'active' | 'suspended',
  ): Promise<void> {
    // Sequential on purpose: each is an audited write, and a burst of parallel
    // PATCHes against the same operator token is the fastest way to a 429.
    const failures: string[] = []
    for (const museumId of keys) {
      const result = await setMuseumStatus(museumId, nextStatus)
      if (!result.ok) failures.push(museums.find((m) => m.id === museumId)?.name ?? museumId)
    }
    table.clearSelection()
    show(
      failures.length === 0
        ? {
            tone: 'success',
            message: `${keys.size} ${keys.size === 1 ? 'museum' : 'museums'} ${
              nextStatus === 'suspended' ? 'suspended' : 'reinstated'
            }.`,
          }
        : {
            tone: 'danger',
            message: `Could not update ${failures.length} of ${keys.size}.`,
            detail: failures.join(', '),
          },
    )
  }

  function enterTenant(museumId: string): void {
    if (typeof window !== 'undefined') {
      setFleetScrollY(window.scrollY)
    }
    navigate(`/operator/tenant/${museumId}/overview`)
  }

  const bulkActions = [
    {
      id: 'suspend-selected',
      label: 'Suspend selected',
      tone: 'danger' as const,
      confirm: {
        title: 'Suspend selected museums',
        consequence: 'will be suspended. Public content disappears until you reinstate.',
        confirmLabel: 'Suspend',
      },
      onAct: (keys: ReadonlySet<string>) => {
        void applyBulkStatus(keys, 'suspended')
      },
    },
    {
      id: 'reinstate-selected',
      label: 'Reinstate selected',
      onAct: (keys: ReadonlySet<string>) => {
        void applyBulkStatus(keys, 'active')
      },
    },
  ]

  const fleetState: KitState =
    status === 'loading'
      ? { kind: 'loading', label: 'fleet' }
      : status === 'error'
        ? {
            kind: 'failure',
            title: 'Could not load the fleet',
            body: loadError ?? 'The request failed.',
            retry: { label: 'Try again', onAct: reload },
          }
        : museums.length === 0
          ? {
              kind: 'empty',
              title: 'No museums yet',
              body: 'Onboard the first museum to give it rooms, narration, and an administrator.',
            }
          : { kind: 'ready' }

  return (
    <div className={styles.page}>
      <header className={styles.headerCard}>
        <div className={styles.headerTop}>
          <div>
            <h1 className="text-title">Fleet</h1>
            <p className={`text-body ${styles.muted}`}>
              {museums.length} museums. {attentionCount} need attention from readiness, status, or health.
            </p>
            {status === 'demo' ? (
              <p className={`text-caption ${styles.demoText}`}>
                Demo fleet. Connect an API to see real museums.
              </p>
            ) : null}
          </div>
          <div className={styles.headerActions}>
            <Button
              tone={fleetUi.view === 'gallery' ? 'primary' : 'secondary'}
              aria-pressed={fleetUi.view === 'gallery'}
              onClick={() => setFleetView('gallery')}
            >
              Gallery
            </Button>
            <Button
              tone={fleetUi.view === 'table' ? 'primary' : 'secondary'}
              aria-pressed={fleetUi.view === 'table'}
              onClick={() => setFleetView('table')}
            >
              Table
            </Button>
            <Button
              onClick={() => {
                setOnboardOpen(true)
                navigate('/operator/fleet/new')
              }}
            >
              Onboard museum
            </Button>
          </div>
        </div>

        <div className={styles.filtersRow}>
          <Field id="fleet-search" label="Search fleet">
            {(control) => (
              <TextInput
                {...control}
                type="search"
                value={fleetUi.search}
                onChange={setFleetSearch}
                placeholder="Search by museum or region"
                clearable
                shortcutHint="Ctrl+K"
              />
            )}
          </Field>
          <Field id="fleet-status-filter" label="Status filter">
            {(control) => (
              <Select
                {...control}
                value={fleetUi.statusFilter}
                onChange={(value) => setFleetStatusFilter(value as FleetStatus | 'all')}
                options={[{ value: 'all', label: 'All statuses' }, ...FLEET_STATUS_OPTIONS]}
              />
            )}
          </Field>
          <Field id="fleet-spend-window" label="Revenue window">
            {(control) => (
              <Select
                {...control}
                value={spendWindow}
                onChange={(value) => setSpendWindow(value as typeof spendWindow)}
                options={[
                  { value: '7d', label: 'Last 7 days' },
                  { value: '30d', label: 'Last 30 days' },
                  { value: '90d', label: 'Last 90 days' },
                ]}
              />
            )}
          </Field>
        </div>

        {spendError !== null ? (
          <StateBlock
            size="inline"
            state={{
              kind: 'failure',
              title: 'Revenue figures are unavailable',
              body: spendError,
              retry: { label: 'Try again', onAct: reload },
            }}
          />
        ) : null}
      </header>

      {fleetState.kind !== 'ready' ? (
        <StateBlock state={fleetState} size="region" />
      ) : fleetUi.view === 'gallery' ? (
        <section className={styles.gallery} aria-label="Fleet gallery wall">
          {filteredMuseums.map((museum) => (
            <article key={museum.id} className={styles.card}>
              <div className={styles.cardHeader}>
                <div>
                  <p className={`museum-name ${styles.museumName}`}>{museum.name}</p>
                  <p className={`text-caption ${styles.muted}`}>{museum.region}</p>
                </div>
                <StatusBadge tone={fleetStatusTone(museum.status)} label={fleetStatusLabel(museum.status)} />
              </div>

              <div className={styles.cardMeta}>
                <span className={styles.metric}>
                  <span className={`${styles.metricLabel} text-caption`}>Rooms</span>
                  <span className={`${styles.metricValue} text-body numeric`}>{museum.roomCount}</span>
                </span>
                <span className={styles.metric}>
                  <span className={`${styles.metricLabel} text-caption`}>Collected</span>
                  <span className={`${styles.metricValue} text-body numeric`}>{formatEtb(museum.spendEtb)}</span>
                </span>
                <span className={styles.metric}>
                  <span className={`${styles.metricLabel} text-caption`}>Health</span>
                  <span className={`${styles.metricValue} text-body`}>{fleetHealthLabel(museum.health)}</span>
                </span>
              </div>

              <MiniReadinessSpine museum={museum} />

              <div className={styles.cardActions}>
                <Button
                  tone="secondary"
                  compact
                  onClick={() => navigate(`/operator/fleet/${museum.id}`)}
                  aria-label={`Open tenant record for ${museum.name}`}
                >
                  Tenant record
                </Button>
                <Button
                  tone="ghost"
                  compact
                  onClick={() => enterTenant(museum.id)}
                  aria-label={`Enter tenant ${museum.name}`}
                >
                  Enter tenant
                </Button>
                <Button
                  tone="ghost"
                  compact
                  onClick={(event) => openPeek(museum, event.currentTarget)}
                  aria-label={`Peek ${museum.name}`}
                >
                  Peek
                </Button>
                <Button
                  tone={museum.status === 'suspended' ? 'secondary' : 'danger'}
                  compact
                  onClick={(event) => openStatusChange(museum, event.currentTarget)}
                  aria-label={`${museum.status === 'suspended' ? 'Reinstate' : 'Suspend'} ${museum.name}`}
                >
                  {museum.status === 'suspended' ? 'Reinstate' : 'Suspend'}
                </Button>
              </div>
            </article>
          ))}
        </section>
      ) : (
        <section className={styles.tableCard}>
          <DataTable
            caption="Fleet table"
            columns={columns}
            rows={table.pageRows}
            rowKey={(museum) => museum.id}
            sort={table.sort}
            onSortChange={table.setSort}
            pagination={table.pagination}
            selection={{
              selectedKeys: table.selectedKeys,
              onChange: table.setSelectedKeys,
              rowLabel: (museum) => museum.name,
            }}
            onRowActivate={(museum) => navigate(`/operator/fleet/${museum.id}`)}
            activeRowKey={selectedMuseumId}
            toolbar={
              <TableToolbar
                searchValue={fleetUi.search}
                onSearchChange={setFleetSearch}
                searchLabel="Search fleet"
                searchPlaceholder="Search by museum or region"
                actions={<p className="text-caption">{table.total} museums in current view</p>}
              />
            }
            rowActions={(museum) => (
              <div className={styles.rowActions}>
                <Button
                  tone="ghost"
                  compact
                  onClick={(event) => openPeek(museum, event.currentTarget)}
                  aria-label={`Open peek panel for ${museum.name}`}
                >
                  Open
                </Button>
                <Button tone="ghost" compact onClick={() => enterTenant(museum.id)}>
                  Enter
                </Button>
                <Button
                  tone={museum.status === 'suspended' ? 'secondary' : 'danger'}
                  compact
                  onClick={(event) => openStatusChange(museum, event.currentTarget)}
                >
                  {museum.status === 'suspended' ? 'Reinstate' : 'Suspend'}
                </Button>
              </div>
            )}
            stickyHeader
          />

          <BulkActionBar
            selectedKeys={table.selectedKeys}
            noun={{ one: 'museum', many: 'museums' }}
            actions={bulkActions}
            onClear={table.clearSelection}
          />
        </section>
      )}

      <PeekPanel
        open={selectedMuseum !== null}
        title="Museum"
        {...(selectedMuseum !== null ? { museumName: selectedMuseum.name } : {})}
        {...(selectedMuseum !== null
          ? { subtitle: `${selectedMuseum.region} • ${selectedMuseum.roomCount} rooms` }
          : {})}
        {...(selectedMuseum !== null
          ? { status: { tone: fleetStatusTone(selectedMuseum.status), label: fleetStatusLabel(selectedMuseum.status) } }
          : {})}
        tabs={[
          {
            id: 'summary',
            label: 'Summary',
            content:
              selectedMuseum !== null ? (
                <div className={styles.peekSummary}>
                  <p className="text-body">
                    {selectedMuseum.roomCount} rooms, {selectedMuseum.itemCount} items, and{' '}
                    {selectedMuseum.adminCount}{' '}
                    {selectedMuseum.adminCount === 1 ? 'administrator' : 'administrators'}. Last
                    edited {formatRelative(selectedMuseum.updatedAt)}.
                  </p>
                  <div className={styles.peekStats}>
                    <div className={styles.peekStat}>
                      <p className={`column-header ${styles.muted}`}>Collected</p>
                      <p className="text-subtitle numeric">{formatEtb(selectedMuseum.spendEtb)}</p>
                    </div>
                    <div className={styles.peekStat}>
                      <p className={`column-header ${styles.muted}`}>Health</p>
                      <p className="text-subtitle">{fleetHealthLabel(selectedMuseum.health)}</p>
                    </div>
                  </div>
                </div>
              ) : null,
          },
          {
            id: 'readiness',
            label: 'Readiness',
            content: selectedMuseum !== null ? <MiniReadinessSpine museum={selectedMuseum} /> : null,
          },
          {
            id: 'actions',
            label: 'Actions',
            content: (
              <p className="text-body">
                Use the footer actions to open the full tenant record, enter tenant routing, or update status.
              </p>
            ),
          },
        ]}
        activeTabId={activePeekTabId}
        onTabChange={setActivePeekTabId}
        footer={
          selectedMuseum !== null ? (
            <div className={styles.peekFooter}>
              <Button tone="secondary" onClick={() => navigate(`/operator/fleet/${selectedMuseum.id}`)}>
                Open tenant record
              </Button>
              <Button tone="ghost" onClick={() => enterTenant(selectedMuseum.id)}>
                Enter tenant
              </Button>
            </div>
          ) : undefined
        }
        onClose={() => setSelectedMuseumId(null)}
        returnFocusTo={returnFocusTo}
        variant={prefersSheet ? 'sheet' : 'overlay'}
      />

      <Modal
        open={onboardOpen}
        title="Onboard museum"
        description="Creates the museum and the first administrator account that can sign into it."
        onClose={closeOnboard}
        footer={
          <>
            <Button tone="secondary" onClick={closeOnboard} disabled={onboarding}>
              Cancel
            </Button>
            <Button
              onClick={() => void submitOnboard()}
              disabled={
                onboarding ||
                onboardDraft.name.trim().length === 0 ||
                onboardDraft.adminEmail.trim().length === 0 ||
                onboardDraft.adminPassword.length < 12
              }
            >
              {onboarding ? 'Creating…' : 'Add museum'}
            </Button>
          </>
        }
      >
        <div className={styles.page}>
          <Field
            id="onboard-name"
            label="Museum name"
            required
            {...(onboardErrors.name !== undefined ? { error: onboardErrors.name } : {})}
          >
            {(control) => (
              <TextInput
                {...control}
                value={onboardDraft.name}
                onChange={(next) => setOnboardDraft((draft) => ({ ...draft, name: next }))}
                placeholder="Museum name"
              />
            )}
          </Field>
          <Field
            id="onboard-slug"
            label="Public slug"
            hint="Left empty, it is derived from the name."
            {...(onboardErrors.slug !== undefined ? { error: onboardErrors.slug } : {})}
          >
            {(control) => (
              <TextInput
                {...control}
                value={onboardDraft.slug}
                onChange={(next) => setOnboardDraft((draft) => ({ ...draft, slug: next }))}
                placeholder={slugify(onboardDraft.name) || 'museum-slug'}
              />
            )}
          </Field>
          <Field
            id="onboard-region"
            label="City and country"
            {...(onboardErrors.region !== undefined ? { error: onboardErrors.region } : {})}
          >
            {(control) => (
              <TextInput
                {...control}
                value={onboardDraft.region}
                onChange={(next) => setOnboardDraft((draft) => ({ ...draft, region: next }))}
                placeholder="Addis Ababa, Ethiopia"
              />
            )}
          </Field>
          <Field
            id="onboard-admin-email"
            label="First administrator email"
            required
            {...(onboardErrors.adminEmail !== undefined ? { error: onboardErrors.adminEmail } : {})}
          >
            {(control) => (
              <TextInput
                {...control}
                type="email"
                autoComplete="off"
                value={onboardDraft.adminEmail}
                onChange={(next) => setOnboardDraft((draft) => ({ ...draft, adminEmail: next }))}
                placeholder="curator@museum.example"
              />
            )}
          </Field>
          <Field
            id="onboard-admin-password"
            label="Temporary password"
            required
            hint="At least 12 characters. Share it out of band; the account is prompted to change it."
            {...(onboardErrors.adminPassword !== undefined
              ? { error: onboardErrors.adminPassword }
              : {})}
          >
            {(control) => (
              <TextInput
                {...control}
                type="password"
                autoComplete="new-password"
                value={onboardDraft.adminPassword}
                onChange={(next) => setOnboardDraft((draft) => ({ ...draft, adminPassword: next }))}
              />
            )}
          </Field>

          {onboardError !== null ? (
            <StateBlock
              size="inline"
              state={{ kind: 'failure', title: 'Could not create the museum', body: onboardError }}
            />
          ) : null}
        </div>
      </Modal>

      <ConfirmDialog
        open={pendingStatusChange !== null}
        title={pendingStatusChange?.nextStatus === 'suspended' ? 'Suspend museum' : 'Reinstate museum'}
        entityName={museums.find((museum) => museum.id === pendingStatusChange?.museumId)?.name ?? 'Museum'}
        consequence={
          pendingStatusChange?.nextStatus === 'suspended'
            ? 'will be suspended. Visitors lose access and its administrators are signed out until it is reinstated.'
            : 'will be reinstated. Visitors and its administrators regain access immediately.'
        }
        confirmLabel={
          changingStatus
            ? 'Working…'
            : pendingStatusChange?.nextStatus === 'suspended'
              ? 'Suspend museum'
              : 'Reinstate museum'
        }
        tone={pendingStatusChange?.nextStatus === 'suspended' ? 'danger' : 'primary'}
        onConfirm={() => void confirmStatusChange()}
        onCancel={() => setPendingStatusChange(null)}
        returnFocusTo={returnFocusTo}
      />
    </div>
  )
}

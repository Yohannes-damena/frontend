import { useCallback, useEffect, useMemo, useRef, useState, type ReactElement } from 'react'

import {
  DataTable,
  Field,
  Panel,
  Select,
  StateBlock,
  StatusBadge,
  TableToolbar,
  useDataTable,
  type Column,
  type KitState,
} from '../../kit/index.ts'
import { getSpend } from '../../api/adminApi.ts'
import { isLiveApi } from '../../api/config.ts'
import { isApiError, messageForCode } from '../../api/errors.ts'
import type { ApiSpend, ApiSpendRow, SpendWindow } from '../../api/types.ts'
import { formatEtb } from './fleetFixtures.ts'
import styles from './OperatorPhase9Pages.module.css'

/**
 * Collected revenue, not projected billing: every figure here is the sum of
 * payments the provider actually settled inside the window, so a museum that
 * owes money shows zero rather than its plan price.
 */

const WINDOW_OPTIONS: readonly { value: SpendWindow; label: string }[] = [
  { value: '7d', label: 'Last 7 days' },
  { value: '30d', label: 'Last 30 days' },
  { value: '90d', label: 'Last 90 days' },
]

const STATUS_OPTIONS = [
  { value: 'all', label: 'All museums' },
  { value: 'ACTIVE', label: 'Active only' },
  { value: 'SUSPENDED', label: 'Suspended only' },
] as const

function amount(row: ApiSpendRow): number {
  const parsed = Number.parseFloat(row.paidAmountEtb)
  return Number.isFinite(parsed) ? parsed : 0
}

export function SpendPage(): ReactElement {
  const [windowKey, setWindowKey] = useState<SpendWindow>('30d')
  const [statusFilter, setStatusFilter] = useState<(typeof STATUS_OPTIONS)[number]['value']>('all')

  const [spend, setSpend] = useState<ApiSpend | null>(null)
  const [status, setStatus] = useState<'loading' | 'ready' | 'error' | 'unavailable'>(
    isLiveApi ? 'loading' : 'unavailable',
  )
  const [error, setError] = useState<string | null>(null)
  const requestSeq = useRef(0)

  const load = useCallback(async (): Promise<void> => {
    if (!isLiveApi) return
    const seq = requestSeq.current + 1
    requestSeq.current = seq
    setStatus('loading')
    try {
      const next = await getSpend({
        window: windowKey,
        ...(statusFilter === 'all' ? {} : { status: statusFilter }),
      })
      if (requestSeq.current !== seq) return
      setSpend(next)
      setStatus('ready')
      setError(null)
    } catch (caught) {
      if (requestSeq.current !== seq) return
      setError(isApiError(caught) ? messageForCode(caught) : 'Could not read collected revenue.')
      setStatus('error')
    }
  }, [statusFilter, windowKey])

  useEffect(() => {
    void load()
  }, [load])

  const rows = spend?.rows ?? []
  const total = useMemo(() => rows.reduce((sum, row) => sum + amount(row), 0), [rows])

  const columns = useMemo<readonly Column<ApiSpendRow>[]>(
    () => [
      {
        id: 'museum',
        header: 'Museum',
        sortable: true,
        sortValue: (row) => row.museumName,
        cell: (row) => (
          <div className={styles.rowMeta}>
            <span className="museum-name">{row.museumName}</span>
            <span className={`text-caption ${styles.muted}`}>{row.cityCountry ?? row.slug}</span>
          </div>
        ),
      },
      {
        id: 'plan',
        header: 'Plan',
        sortable: true,
        sortValue: (row) => row.tier,
        cell: (row) => (
          <div className={styles.rowMeta}>
            <span className="text-body">{row.tier}</span>
            <StatusBadge
              tone={
                row.subscriptionStatus === 'ACTIVE'
                  ? 'success'
                  : row.subscriptionStatus === 'PAST_DUE'
                    ? 'warning'
                    : 'danger'
              }
              label={
                row.subscriptionStatus === 'ACTIVE'
                  ? 'Subscription active'
                  : row.subscriptionStatus === 'PAST_DUE'
                    ? 'Past due'
                    : 'Canceled'
              }
            />
          </div>
        ),
      },
      {
        id: 'collected',
        header: 'Collected',
        sortable: true,
        numeric: true,
        sortValue: (row) => amount(row),
        cell: (row) => (
          <div className={styles.rowMeta}>
            <span className="text-body numeric">{formatEtb(amount(row))}</span>
            <span className={`text-caption ${styles.muted}`}>
              {row.paymentCount} {row.paymentCount === 1 ? 'payment' : 'payments'}
            </span>
          </div>
        ),
      },
      {
        id: 'share',
        header: 'Share',
        sortable: true,
        numeric: true,
        sortValue: (row) => amount(row),
        cell: (row) => {
          const share = total === 0 ? 0 : (amount(row) / total) * 100
          return <span className="text-body numeric">{share.toFixed(1)}%</span>
        },
      },
      {
        id: 'lastPaid',
        header: 'Last payment',
        sortable: true,
        sortValue: (row) => row.lastPaidAt ?? '',
        cell: (row) => (
          <span className={`text-caption ${styles.monoDate}`}>
            {row.lastPaidAt === null ? 'none in window' : new Date(row.lastPaidAt).toLocaleDateString()}
          </span>
        ),
      },
    ],
    [total],
  )

  const table = useDataTable({
    rows,
    rowKey: (row) => row.museumId,
    columns,
    pageSize: 8,
    searchFields: [(row) => row.museumName, (row) => row.cityCountry ?? '', (row) => row.slug],
    initialSort: { columnId: 'collected', direction: 'descending' },
  })

  const pageState: KitState =
    status === 'loading'
      ? { kind: 'loading', label: 'collected revenue' }
      : status === 'unavailable'
        ? {
            kind: 'integrationPending',
            dependency: 'Admin API',
            body: 'Revenue is summed from settled payments on the server, so it needs a configured API base URL.',
            stillUsable: 'The rest of the console runs against demo fixtures.',
          }
        : status === 'error'
          ? {
              kind: 'failure',
              title: 'Could not read collected revenue',
              body: error ?? 'The request failed.',
              retry: { label: 'Try again', onAct: () => void load() },
            }
          : rows.length === 0
            ? {
                kind: 'empty',
                title: 'No payments settled in this window',
                body: 'Widen the window, or check that the payment provider is configured on the health screen.',
              }
            : { kind: 'ready' }

  return (
    <div className={styles.page}>
      <header className={styles.headerCard}>
        <div className={styles.headerTop}>
          <div>
            <h1 className="text-title">Spend</h1>
            <p className={`text-body ${styles.muted}`}>
              Revenue collected per museum. Only payments the provider settled are counted, so this
              is money received rather than money invoiced.
            </p>
            {spend !== null ? (
              <p className={`text-caption ${styles.muted}`}>
                Since {new Date(spend.since).toLocaleDateString()}, in {spend.currency}.
              </p>
            ) : null}
          </div>
          <div>
            <p className={`column-header ${styles.muted}`}>Window total</p>
            <p className="text-subtitle numeric">{formatEtb(total)}</p>
          </div>
        </div>

        <div className={styles.filtersRow}>
          <Field id="spend-window" label="Time window">
            {(control) => (
              <Select
                {...control}
                value={windowKey}
                onChange={(value) => setWindowKey(value as SpendWindow)}
                options={WINDOW_OPTIONS}
              />
            )}
          </Field>
          <Field id="spend-status-filter" label="Museum status">
            {(control) => (
              <Select
                {...control}
                value={statusFilter}
                onChange={(value) => setStatusFilter(value as typeof statusFilter)}
                options={STATUS_OPTIONS}
              />
            )}
          </Field>
        </div>
      </header>

      {pageState.kind !== 'ready' ? (
        <StateBlock state={pageState} size="region" />
      ) : (
        <Panel>
          <DataTable
            caption="Collected revenue per museum"
            columns={columns}
            rows={table.pageRows}
            rowKey={(row) => row.museumId}
            sort={table.sort}
            onSortChange={table.setSort}
            pagination={table.pagination}
            toolbar={
              <TableToolbar
                searchValue={table.searchQuery}
                onSearchChange={table.setSearchQuery}
                searchLabel="Search museums"
                searchPlaceholder="Search by museum or location"
                actions={<p className="text-caption">{table.total} museums in this view</p>}
              />
            }
            stickyHeader
          />
        </Panel>
      )}
    </div>
  )
}

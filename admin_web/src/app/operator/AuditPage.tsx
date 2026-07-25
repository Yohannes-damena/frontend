import { useCallback, useEffect, useMemo, useRef, useState, type ReactElement } from 'react'
import { useSearchParams } from 'react-router-dom'

import {
  Button,
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
  type StatusTone,
} from '../../kit/index.ts'
import { listAuditLogs } from '../../api/adminApi.ts'
import { isLiveApi } from '../../api/config.ts'
import { isApiError, messageForCode } from '../../api/errors.ts'
import type { ApiAuditAction, ApiAuditEntry } from '../../api/types.ts'
import { useFleetStore } from './fleetStore.tsx'
import styles from './OperatorPhase9Pages.module.css'

/**
 * The write history the server keeps, newest first. The dropdown filters go to
 * the API rather than being applied in memory: this table is a window onto an
 * append-only log that outgrows any page, so filtering client-side would
 * quietly lie about what happened outside the loaded rows. The search box is
 * the exception — the API has no free-text search, so it narrows only what has
 * already been loaded, and says so.
 */

const PAGE_SIZE = 50

const ACTION_OPTIONS = [
  { value: 'all', label: 'All actions' },
  { value: 'CREATE', label: 'Created' },
  { value: 'UPDATE', label: 'Updated' },
  { value: 'DELETE', label: 'Deleted' },
] as const

const ENTITY_OPTIONS = [
  { value: 'all', label: 'All record types' },
  { value: 'Museum', label: 'Museum' },
  { value: 'Room', label: 'Room' },
  { value: 'Item', label: 'Item' },
  { value: 'AdminUser', label: 'Administrator' },
  { value: 'Payment', label: 'Payment' },
] as const

const WINDOW_OPTIONS = [
  { value: '24h', label: 'Past 24 hours' },
  { value: '7d', label: 'Past 7 days' },
  { value: '30d', label: 'Past 30 days' },
  { value: 'all', label: 'All time' },
] as const

type TimeWindow = (typeof WINDOW_OPTIONS)[number]['value']

const WINDOW_MS: Readonly<Record<Exclude<TimeWindow, 'all'>, number>> = {
  '24h': 24 * 60 * 60 * 1000,
  '7d': 7 * 24 * 60 * 60 * 1000,
  '30d': 30 * 24 * 60 * 60 * 1000,
}

const ACTION_LABEL: Readonly<Record<ApiAuditAction, string>> = {
  CREATE: 'Created',
  UPDATE: 'Updated',
  DELETE: 'Deleted',
}

const ACTION_TONE: Readonly<Record<ApiAuditAction, StatusTone>> = {
  CREATE: 'success',
  UPDATE: 'neutral',
  DELETE: 'danger',
}

/** Names the fields a write touched, which is what makes a row worth reading. */
function changedFields(entry: ApiAuditEntry): string {
  const after = entry.after
  if (typeof after !== 'object' || after === null || Array.isArray(after)) return ''
  const keys = Object.keys(after as Record<string, unknown>)
  if (keys.length === 0) return ''
  if (keys.length <= 4) return keys.join(', ')
  return `${keys.slice(0, 4).join(', ')} and ${keys.length - 4} more`
}

function actorName(entry: ApiAuditEntry): string {
  return entry.actorDisplayName ?? entry.actorEmail ?? 'System'
}

export function AuditPage(): ReactElement {
  const { museums } = useFleetStore()
  const [searchParams, setSearchParams] = useSearchParams()

  // A museum id in the URL is how the tenant record links here.
  const museumFilter = searchParams.get('museumId') ?? 'all'
  const [actionFilter, setActionFilter] = useState<ApiAuditAction | 'all'>('all')
  const [entityFilter, setEntityFilter] = useState<string>('all')
  const [windowFilter, setWindowFilter] = useState<TimeWindow>('7d')

  const [entries, setEntries] = useState<readonly ApiAuditEntry[]>([])
  const [nextCursor, setNextCursor] = useState<string | null>(null)
  const [status, setStatus] = useState<'loading' | 'ready' | 'error' | 'unavailable'>(
    isLiveApi ? 'loading' : 'unavailable',
  )
  const [error, setError] = useState<string | null>(null)
  const [loadingMore, setLoadingMore] = useState(false)
  const requestSeq = useRef(0)

  const filters = useMemo(
    () => ({
      ...(museumFilter === 'all' ? {} : { museumId: museumFilter }),
      ...(actionFilter === 'all' ? {} : { action: actionFilter }),
      ...(entityFilter === 'all' ? {} : { entityType: entityFilter }),
      ...(windowFilter === 'all'
        ? {}
        : { since: new Date(Date.now() - WINDOW_MS[windowFilter]).toISOString() }),
      limit: PAGE_SIZE,
    }),
    [actionFilter, entityFilter, museumFilter, windowFilter],
  )

  const load = useCallback(async (): Promise<void> => {
    if (!isLiveApi) return
    const seq = requestSeq.current + 1
    requestSeq.current = seq
    setStatus('loading')
    try {
      const page = await listAuditLogs(filters)
      if (requestSeq.current !== seq) return
      setEntries(page.data)
      setNextCursor(page.nextCursor)
      setStatus('ready')
      setError(null)
    } catch (caught) {
      if (requestSeq.current !== seq) return
      setError(isApiError(caught) ? messageForCode(caught) : 'Could not read the audit trail.')
      setStatus('error')
    }
  }, [filters])

  useEffect(() => {
    void load()
  }, [load])

  async function loadMore(): Promise<void> {
    if (nextCursor === null) return
    setLoadingMore(true)
    const seq = requestSeq.current
    try {
      const page = await listAuditLogs({ ...filters, cursor: nextCursor })
      // A filter change while this was in flight makes the page meaningless.
      if (requestSeq.current !== seq) return
      setEntries((current) => [...current, ...page.data])
      setNextCursor(page.nextCursor)
    } catch (caught) {
      setError(isApiError(caught) ? messageForCode(caught) : 'Could not read more entries.')
    } finally {
      setLoadingMore(false)
    }
  }

  const museumOptions = useMemo(
    () => [
      { value: 'all', label: 'All museums' },
      ...museums.map((museum) => ({ value: museum.id, label: museum.name })),
    ],
    [museums],
  )

  const columns = useMemo<readonly Column<ApiAuditEntry>[]>(
    () => [
      {
        id: 'time',
        header: 'When',
        sortable: true,
        sortValue: (entry) => entry.createdAt,
        cell: (entry) => (
          <span className={`text-caption ${styles.monoDate}`}>
            {new Date(entry.createdAt).toLocaleString()}
          </span>
        ),
      },
      {
        id: 'museum',
        header: 'Museum',
        sortable: true,
        sortValue: (entry) => entry.museumName ?? '',
        cell: (entry) => (
          <span className="museum-name">{entry.museumName ?? 'Platform-wide'}</span>
        ),
      },
      {
        id: 'actor',
        header: 'Actor',
        sortable: true,
        sortValue: (entry) => actorName(entry),
        cell: (entry) => (
          <div className={styles.rowMeta}>
            <span className="text-body">{actorName(entry)}</span>
            <span className={`text-caption ${styles.muted}`}>
              {entry.actorRole === 'SYSTEM_ADMIN'
                ? 'Platform operator'
                : entry.actorRole === 'MUSEUM_ADMIN'
                  ? 'Museum administrator'
                  : 'Automated'}
            </span>
          </div>
        ),
      },
      {
        id: 'action',
        header: 'Action',
        sortable: true,
        sortValue: (entry) => `${entry.entityType} ${entry.action}`,
        cell: (entry) => (
          <StatusBadge tone={ACTION_TONE[entry.action]} label={ACTION_LABEL[entry.action]} />
        ),
      },
      {
        id: 'target',
        header: 'Record',
        sortable: true,
        sortValue: (entry) => entry.entityLabel,
        cell: (entry) => (
          <div className={styles.rowMeta}>
            <span className="text-body">{entry.entityLabel}</span>
            <span className={`text-caption ${styles.muted}`}>{entry.entityType}</span>
          </div>
        ),
      },
      {
        id: 'fields',
        header: 'Fields touched',
        sortable: false,
        cell: (entry) => {
          const fields = changedFields(entry)
          return (
            <span className={`text-caption ${fields === '' ? styles.muted : ''}`}>
              {fields === '' ? '—' : fields}
            </span>
          )
        },
      },
    ],
    [],
  )

  const table = useDataTable({
    rows: entries,
    rowKey: (entry) => entry.id,
    columns,
    pageSize: 10,
    searchFields: [
      (entry) => entry.entityLabel,
      (entry) => actorName(entry),
      (entry) => entry.museumName ?? '',
      (entry) => entry.entityType,
    ],
    initialSort: { columnId: 'time', direction: 'descending' },
  })

  const pageState: KitState =
    status === 'loading'
      ? { kind: 'loading', label: 'audit trail' }
      : status === 'unavailable'
        ? {
            kind: 'integrationPending',
            dependency: 'Admin API',
            body: 'The audit trail is written by the backend on every change, so it needs a configured API base URL.',
            stillUsable: 'The rest of the console runs against demo fixtures.',
          }
        : status === 'error'
          ? {
              kind: 'failure',
              title: 'Could not read the audit trail',
              body: error ?? 'The request failed.',
              retry: { label: 'Try again', onAct: () => void load() },
            }
          : entries.length === 0
            ? {
                kind: 'empty',
                title: 'No changes match these filters',
                body: 'Widen the time window, or clear the museum and action filters.',
              }
            : { kind: 'ready' }

  return (
    <div className={styles.page}>
      <header className={styles.headerCard}>
        <h1 className="text-title">Audit</h1>
        <p className={`text-body ${styles.muted}`}>
          Every write the API accepted, across museums and operators, newest first.
        </p>
        <p className={`text-caption ${styles.muted}`}>
          Includes changes an operator made while scoped into a museum, attributed to the operator
          rather than to the museum's own administrators.
        </p>
      </header>

      <section className={styles.formCard}>
        <div className={styles.filtersRow}>
          <Field id="audit-museum-filter" label="Museum">
            {(control) => (
              <Select
                {...control}
                value={museumFilter}
                onChange={(value) => {
                  setSearchParams(value === 'all' ? {} : { museumId: value }, { replace: true })
                }}
                options={museumOptions}
              />
            )}
          </Field>
          <Field id="audit-action-filter" label="Action">
            {(control) => (
              <Select
                {...control}
                value={actionFilter}
                onChange={(value) => setActionFilter(value as ApiAuditAction | 'all')}
                options={ACTION_OPTIONS}
              />
            )}
          </Field>
          <Field id="audit-entity-filter" label="Record type">
            {(control) => (
              <Select
                {...control}
                value={entityFilter}
                onChange={setEntityFilter}
                options={ENTITY_OPTIONS}
              />
            )}
          </Field>
          <Field id="audit-window-filter" label="Time window">
            {(control) => (
              <Select
                {...control}
                value={windowFilter}
                onChange={(value) => setWindowFilter(value as TimeWindow)}
                options={WINDOW_OPTIONS}
              />
            )}
          </Field>
        </div>
      </section>

      {pageState.kind !== 'ready' ? (
        <StateBlock state={pageState} size="region" />
      ) : (
        <Panel>
          <DataTable
            caption="Cross-tenant audit history"
            columns={columns}
            rows={table.pageRows}
            rowKey={(entry) => entry.id}
            sort={table.sort}
            onSortChange={table.setSort}
            pagination={table.pagination}
            toolbar={
              <TableToolbar
                searchValue={table.searchQuery}
                onSearchChange={table.setSearchQuery}
                searchLabel="Search loaded entries"
                searchPlaceholder="Search record, actor, or museum"
                actions={
                  <p className="text-caption">
                    {table.total} of {entries.length} loaded entries
                  </p>
                }
              />
            }
            stickyHeader
          />

          {nextCursor !== null ? (
            <div className={styles.statusRow}>
              <Button tone="secondary" onClick={() => void loadMore()} disabled={loadingMore}>
                {loadingMore ? 'Loading…' : `Load ${PAGE_SIZE} older entries`}
              </Button>
              <p className={`text-caption ${styles.muted}`}>
                {entries.length} loaded. Older entries exist beyond this point.
              </p>
            </div>
          ) : null}
        </Panel>
      )}
    </div>
  )
}

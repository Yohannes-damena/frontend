import { useCallback, useEffect, useMemo, useRef, useState, type ReactElement } from 'react'

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
} from '../../kit/index.ts'
import { listAuditLogs } from '../../api/adminApi.ts'
import { isLiveApi } from '../../api/config.ts'
import { isApiError, messageForCode } from '../../api/errors.ts'
import type { ApiAuditAction, ApiAuditEntry } from '../../api/types.ts'
import { useScopedTenantContext } from '../operator/scopedTenantContext.tsx'
import { formatRelative } from '../operator/fleetFixtures.ts'
import { DEMO_RECENT_CHANGES } from '../overview/overviewFixtures.ts'
import styles from './ActivityPage.module.css'

/**
 * This museum's own change history. The API scopes the audit read by the
 * caller's token, so a museum administrator cannot widen it to another museum
 * even by asking — and an operator scoped into a tenant sees only that tenant.
 */

const PAGE_SIZE = 50

const ACTION_VERB: Readonly<Record<ApiAuditAction, string>> = {
  CREATE: 'Created',
  UPDATE: 'Updated',
  DELETE: 'Deleted',
}

const ENTITY_OPTIONS = [
  { value: 'all', label: 'Everything' },
  { value: 'Room', label: 'Rooms' },
  { value: 'Item', label: 'Items' },
  { value: 'Museum', label: 'Settings' },
  { value: 'AdminUser', label: 'Team' },
] as const

const WINDOW_OPTIONS = [
  { value: '7d', label: 'Past 7 days' },
  { value: '30d', label: 'Past 30 days' },
  { value: '90d', label: 'Past 90 days' },
  { value: 'all', label: 'All time' },
] as const

type TimeWindow = (typeof WINDOW_OPTIONS)[number]['value']

const WINDOW_MS: Readonly<Record<Exclude<TimeWindow, 'all'>, number>> = {
  '7d': 7 * 24 * 60 * 60 * 1000,
  '30d': 30 * 24 * 60 * 60 * 1000,
  '90d': 90 * 24 * 60 * 60 * 1000,
}

function actorName(entry: ApiAuditEntry): string {
  return entry.actorDisplayName ?? entry.actorEmail ?? 'Automated'
}

/** Names the fields a write touched, so a row says more than "updated". */
function changedFields(entry: ApiAuditEntry): string {
  const after = entry.after
  if (typeof after !== 'object' || after === null || Array.isArray(after)) return ''
  const keys = Object.keys(after as Record<string, unknown>)
  if (keys.length === 0) return ''
  if (keys.length <= 3) return keys.join(', ')
  return `${keys.slice(0, 3).join(', ')} and ${keys.length - 3} more`
}

export function ActivityPage(): ReactElement {
  const scoped = useScopedTenantContext()

  const [entityFilter, setEntityFilter] = useState<string>('all')
  const [windowFilter, setWindowFilter] = useState<TimeWindow>('30d')

  const [entries, setEntries] = useState<readonly ApiAuditEntry[]>(
    isLiveApi ? [] : DEMO_RECENT_CHANGES,
  )
  const [nextCursor, setNextCursor] = useState<string | null>(null)
  const [status, setStatus] = useState<'loading' | 'ready' | 'error' | 'demo'>(
    isLiveApi ? 'loading' : 'demo',
  )
  const [error, setError] = useState<string | null>(null)
  const [loadingMore, setLoadingMore] = useState(false)
  const requestSeq = useRef(0)

  const filters = useMemo(
    () => ({
      museumId: scoped.effectiveMuseumId,
      ...(entityFilter === 'all' ? {} : { entityType: entityFilter }),
      ...(windowFilter === 'all'
        ? {}
        : { since: new Date(Date.now() - WINDOW_MS[windowFilter]).toISOString() }),
      limit: PAGE_SIZE,
    }),
    [entityFilter, scoped.effectiveMuseumId, windowFilter],
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
      setError(isApiError(caught) ? messageForCode(caught) : 'Could not load this history.')
      setStatus('error')
    }
  }, [filters])

  useEffect(() => {
    void load()
  }, [load])

  async function loadMore(): Promise<void> {
    if (nextCursor === null) return
    const seq = requestSeq.current
    setLoadingMore(true)
    try {
      const page = await listAuditLogs({ ...filters, cursor: nextCursor })
      if (requestSeq.current !== seq) return
      setEntries((current) => [...current, ...page.data])
      setNextCursor(page.nextCursor)
    } catch (caught) {
      setError(isApiError(caught) ? messageForCode(caught) : 'Could not load older entries.')
    } finally {
      setLoadingMore(false)
    }
  }

  const columns = useMemo<readonly Column<ApiAuditEntry>[]>(
    () => [
      {
        id: 'when',
        header: 'When',
        sortable: true,
        sortValue: (entry) => entry.createdAt,
        cell: (entry) => (
          <div className={styles.actorCell}>
            <span className="text-body">{formatRelative(entry.createdAt)}</span>
            <span className={`text-caption ${styles.muted}`}>
              {new Date(entry.createdAt).toLocaleString()}
            </span>
          </div>
        ),
      },
      {
        id: 'actor',
        header: 'Actor',
        sortable: true,
        sortValue: (entry) => actorName(entry),
        cell: (entry) => (
          <span className={styles.actorCell}>
            <span className="text-body">{actorName(entry)}</span>
            {entry.actorRole === 'SYSTEM_ADMIN' ? (
              <StatusBadge tone="warning" label="Platform operator" marker="ring" />
            ) : null}
          </span>
        ),
      },
      {
        id: 'action',
        header: 'Change',
        sortable: true,
        sortValue: (entry) => `${entry.entityType} ${entry.action}`,
        cell: (entry) => (
          <span className="text-body">
            {ACTION_VERB[entry.action]} {entry.entityType.toLowerCase()}
          </span>
        ),
      },
      {
        id: 'target',
        header: 'Record',
        sortable: true,
        sortValue: (entry) => entry.entityLabel,
        cell: (entry) => (
          <div className={styles.actorCell}>
            <span className="text-body">{entry.entityLabel}</span>
            {changedFields(entry) === '' ? null : (
              <span className={`text-caption ${styles.muted}`}>{changedFields(entry)}</span>
            )}
          </div>
        ),
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
      (entry) => actorName(entry),
      (entry) => entry.entityLabel,
      (entry) => entry.entityType,
    ],
    initialSort: { columnId: 'when', direction: 'descending' },
  })

  const pageState: KitState =
    status === 'loading'
      ? { kind: 'loading', label: 'activity' }
      : status === 'error'
        ? {
            kind: 'failure',
            title: 'Could not load this history',
            body: error ?? 'The request failed.',
            retry: { label: 'Try again', onAct: () => void load() },
          }
        : entries.length === 0
          ? {
              kind: 'empty',
              title: 'Nothing has changed in this window',
              body: 'Widen the time window, or make an edit and it will appear here.',
            }
          : { kind: 'ready' }

  return (
    <div className={styles.page}>
      <header className={styles.headerCard}>
        <div>
          <h1 className="text-title">Activity</h1>
          <p className={`text-body ${styles.muted}`}>
            Every change recorded against this museum, newest first. Other museums never appear
            here.
          </p>
          {scoped.isScoped ? (
            <p className={`text-caption ${styles.muted}`}>
              You are scoped in as {scoped.operatorEmail}; your own writes are attributed to you as
              a platform operator.
            </p>
          ) : null}
        </div>

        <div className={styles.filtersRow}>
          <Field id="activity-entity-filter" label="Show">
            {(control) => (
              <Select
                {...control}
                value={entityFilter}
                onChange={setEntityFilter}
                options={ENTITY_OPTIONS}
              />
            )}
          </Field>
          <Field id="activity-window-filter" label="Time window">
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
      </header>

      {pageState.kind !== 'ready' ? (
        <StateBlock state={pageState} size="region" />
      ) : (
        <Panel>
          <DataTable
            caption="Museum activity history"
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
                searchLabel="Search loaded changes"
                searchPlaceholder="Search by actor or record"
                actions={
                  <p className="text-caption">
                    {table.total} of {entries.length} loaded changes
                  </p>
                }
              />
            }
            stickyHeader
          />

          {nextCursor !== null ? (
            <div className={styles.loadMoreRow}>
              <Button tone="secondary" onClick={() => void loadMore()} disabled={loadingMore}>
                {loadingMore ? 'Loading…' : 'Load older changes'}
              </Button>
            </div>
          ) : null}
        </Panel>
      )}
    </div>
  )
}

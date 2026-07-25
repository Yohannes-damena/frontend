import { useCallback, useEffect, useMemo, useRef, useState, type ReactElement } from 'react'

import {
  Button,
  DataTable,
  Panel,
  StateBlock,
  StatusBadge,
  type Column,
  type KitState,
  type StatusMarker,
  type StatusTone,
} from '../../kit/index.ts'
import { getSystemHealth } from '../../api/adminApi.ts'
import { isLiveApi } from '../../api/config.ts'
import { isApiError, messageForCode } from '../../api/errors.ts'
import type { ApiAdapterHealth, ApiSystemHealth } from '../../api/types.ts'
import styles from './OperatorPhase9Pages.module.css'

/**
 * Reports what the server has actually observed. There is no synthetic probe
 * behind this: an adapter nothing has called since the process started says so
 * rather than claiming to be healthy.
 */

const STATE_LABEL: Readonly<Record<ApiAdapterHealth['state'], string>> = {
  healthy: 'Healthy',
  degraded: 'Degraded',
  retrying: 'Retrying',
  breaker_open: 'Breaker open',
  unknown: 'Not exercised',
}

const STATE_TONE: Readonly<Record<ApiAdapterHealth['state'], StatusTone>> = {
  healthy: 'success',
  degraded: 'warning',
  retrying: 'warning',
  breaker_open: 'danger',
  unknown: 'neutral',
}

const STATE_MARKER: Readonly<Record<ApiAdapterHealth['state'], StatusMarker>> = {
  healthy: 'dot',
  degraded: 'ring',
  retrying: 'ring',
  breaker_open: 'cross',
  unknown: 'dash',
}

const MODE_LABEL: Readonly<Record<ApiAdapterHealth['mode'], string>> = {
  live: 'Live vendor',
  fake: 'In-process fake',
  unconfigured: 'Not configured',
}

function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86400)
  const hours = Math.floor((seconds % 86400) / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  if (days > 0) return `${days}d ${hours}h`
  if (hours > 0) return `${hours}h ${minutes}m`
  return `${minutes}m`
}

export function HealthPage(): ReactElement {
  const [health, setHealth] = useState<ApiSystemHealth | null>(null)
  const [status, setStatus] = useState<'loading' | 'ready' | 'error' | 'unavailable'>(
    isLiveApi ? 'loading' : 'unavailable',
  )
  const [error, setError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const requestSeq = useRef(0)

  const load = useCallback(async (): Promise<void> => {
    if (!isLiveApi) return
    const seq = requestSeq.current + 1
    requestSeq.current = seq
    try {
      const next = await getSystemHealth()
      if (requestSeq.current !== seq) return
      setHealth(next)
      setStatus('ready')
      setError(null)
    } catch (caught) {
      if (requestSeq.current !== seq) return
      setError(isApiError(caught) ? messageForCode(caught) : 'The health check did not answer.')
      setStatus('error')
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  async function refresh(): Promise<void> {
    setRefreshing(true)
    try {
      await load()
    } finally {
      setRefreshing(false)
    }
  }

  const columns = useMemo<readonly Column<ApiAdapterHealth>[]>(
    () => [
      {
        id: 'adapter',
        header: 'Adapter',
        sortable: true,
        sortValue: (entry) => entry.label,
        cell: (entry) => (
          <div className={styles.rowMeta}>
            <span className="text-body">{entry.label}</span>
            <span className={`text-caption ${styles.muted}`}>{entry.provider}</span>
          </div>
        ),
      },
      {
        id: 'mode',
        header: 'Mode',
        sortable: true,
        sortValue: (entry) => MODE_LABEL[entry.mode],
        cell: (entry) => (
          <StatusBadge
            tone={entry.mode === 'live' ? 'success' : entry.mode === 'fake' ? 'neutral' : 'warning'}
            marker={entry.mode === 'live' ? 'dot' : entry.mode === 'fake' ? 'dash' : 'ring'}
            label={MODE_LABEL[entry.mode]}
          />
        ),
      },
      {
        id: 'state',
        header: 'State',
        sortable: true,
        sortValue: (entry) => STATE_LABEL[entry.state],
        cell: (entry) => (
          <StatusBadge
            tone={STATE_TONE[entry.state]}
            marker={STATE_MARKER[entry.state]}
            label={STATE_LABEL[entry.state]}
          />
        ),
      },
      {
        id: 'failures',
        header: 'Consecutive failures',
        numeric: true,
        sortable: true,
        sortValue: (entry) => entry.consecutiveFailures,
        cell: (entry) => <span className="text-body numeric">{entry.consecutiveFailures}</span>,
      },
      {
        id: 'timeout',
        header: 'Timeout',
        numeric: true,
        sortable: true,
        sortValue: (entry) => entry.timeoutMs ?? 0,
        cell: (entry) => (
          <span className="text-body numeric">
            {entry.timeoutMs === null ? '—' : `${entry.timeoutMs} ms`}
          </span>
        ),
      },
      {
        id: 'note',
        header: 'What the server observed',
        sortable: false,
        cell: (entry) => (
          <div className={styles.rowMeta}>
            <span className="text-body">{entry.note}</span>
            {entry.breakerOpenedAt !== null ? (
              <span className={`text-caption ${styles.monoDate}`}>
                Opened {new Date(entry.breakerOpenedAt).toLocaleString()}
              </span>
            ) : null}
          </div>
        ),
      },
    ],
    [],
  )

  const pageState: KitState =
    status === 'loading'
      ? { kind: 'loading', label: 'system health' }
      : status === 'unavailable'
        ? {
            kind: 'integrationPending',
            dependency: 'Admin API',
            body: 'System health is read from the running backend, so it needs a configured API base URL.',
            stillUsable: 'The rest of the console runs against demo fixtures.',
          }
        : status === 'error'
          ? {
              kind: 'failure',
              title: 'Could not read system health',
              body: error ?? 'The request failed.',
              retry: { label: 'Try again', onAct: () => void load() },
            }
          : { kind: 'ready' }

  const breakerOpen = health?.adapters.filter((a) => a.state === 'breaker_open').length ?? 0
  const retrying = health?.adapters.filter((a) => a.state === 'retrying').length ?? 0
  const notLive = health?.adapters.filter((a) => a.mode !== 'live').length ?? 0

  return (
    <div className={styles.page}>
      <header className={styles.headerCard}>
        <div className={styles.headerTop}>
          <div>
            <h1 className="text-title">Health</h1>
            <p className={`text-body ${styles.muted}`}>
              Adapter state as observed by the backend's own circuit breakers. Nothing here pings a
              vendor on your behalf.
            </p>
            {health !== null ? (
              <p className={`text-caption ${styles.muted}`}>
                {health.environment} · version {health.version} · database {health.dbLatencyMs} ms ·
                up {formatUptime(health.uptimeSeconds)} · checked{' '}
                {new Date(health.checkedAt).toLocaleTimeString()}
              </p>
            ) : null}
          </div>
          <div className={styles.provenanceRow}>
            {health !== null ? (
              <StatusBadge
                tone={health.status === 'ok' ? 'success' : 'warning'}
                marker={health.status === 'ok' ? 'dot' : 'ring'}
                label={health.status === 'ok' ? 'All adapters live' : 'Degraded'}
              />
            ) : null}
            {retrying > 0 ? (
              <StatusBadge tone="warning" marker="ring" label={`${retrying} retrying`} />
            ) : null}
            {breakerOpen > 0 ? (
              <StatusBadge tone="danger" marker="cross" label={`${breakerOpen} breaker open`} />
            ) : null}
            {notLive > 0 ? (
              <StatusBadge tone="neutral" marker="dash" label={`${notLive} not live`} />
            ) : null}
            <Button
              tone="secondary"
              compact
              onClick={() => void refresh()}
              disabled={refreshing || !isLiveApi}
            >
              {refreshing ? 'Checking…' : 'Re-check'}
            </Button>
          </div>
        </div>
      </header>

      {pageState.kind !== 'ready' || health === null ? (
        <StateBlock state={pageState} size="region" />
      ) : (
        <>
          <Panel>
            <DataTable
              caption="Provider adapter health"
              columns={columns}
              rows={health.adapters}
              rowKey={(entry) => entry.id}
              stickyHeader
            />
          </Panel>

          <section className={styles.gridTwo}>
            <Panel
              title="What the states mean"
              description="These describe observed behaviour, not an uptime score."
            >
              <ul className={styles.list}>
                <li className="text-body">
                  <strong>Healthy:</strong> the last call to this vendor succeeded.
                </li>
                <li className="text-body">
                  <strong>Retrying:</strong> calls are failing and being retried with backoff.
                </li>
                <li className="text-body">
                  <strong>Breaker open:</strong> too many consecutive failures, so calls are refused
                  outright until the breaker half-opens.
                </li>
                <li className="text-body">
                  <strong>Degraded:</strong> answered, but by a fake or a partly configured adapter.
                </li>
                <li className="text-body">
                  <strong>Not exercised:</strong> nothing has called it since the server started, so
                  there is nothing to report.
                </li>
              </ul>
            </Panel>

            <Panel
              title="Modes"
              description="Whether a real vendor is behind the adapter at all."
            >
              <ul className={styles.list}>
                <li className="text-body">
                  <strong>Live vendor:</strong> configured with credentials and calling out.
                </li>
                <li className="text-body">
                  <strong>In-process fake:</strong> deliberately stubbed. Useful for development,
                  never correct in production.
                </li>
                <li className="text-body">
                  <strong>Not configured:</strong> the provider is selected but its credentials are
                  missing, so the feature behind it cannot work.
                </li>
              </ul>
            </Panel>
          </section>
        </>
      )}
    </div>
  )
}

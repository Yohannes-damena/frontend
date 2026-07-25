import { useCallback, useEffect, useMemo, useRef, useState, type ReactElement } from 'react'
import { Link } from 'react-router-dom'

import {
  IntegrationPendingPanel,
  KpiCard,
  Panel,
  StateBlock,
  StatusBadge,
  type KitState,
  type KpiCardProps,
} from '../../kit/index.ts'
import { getOverview, listAuditLogs } from '../../api/adminApi.ts'
import { isLiveApi } from '../../api/config.ts'
import { isApiError, messageForCode } from '../../api/errors.ts'
import type { ApiAuditEntry, ApiTenantOverview } from '../../api/types.ts'
import { useScopedTenantContext } from '../operator/scopedTenantContext.tsx'
import { formatRelative } from '../operator/fleetFixtures.ts'
import { ReadinessSpine } from './ReadinessSpine.tsx'
import {
  DEMO_OVERVIEW,
  DEMO_RECENT_CHANGES,
  roomBlockerText,
  roomMarker,
  roomStateLabel,
  roomTone,
} from './overviewFixtures.ts'
import styles from './TenantOverviewPage.module.css'

/**
 * What this museum's authoring actually looks like right now: how many rooms a
 * visitor could complete, what is blocking the rest, and who changed what.
 *
 * There is deliberately no visitor analytics here. The backend records no
 * visits, so every chart of them would be invented.
 */

const ACTION_VERB: Readonly<Record<ApiAuditEntry['action'], string>> = {
  CREATE: 'Created',
  UPDATE: 'Updated',
  DELETE: 'Deleted',
}

function limitCaption(used: number, limit: number | null, noun: string): string {
  if (limit === null) return `${used} ${noun}, no plan limit`
  return `${used} of ${limit} allowed by the plan`
}

export function TenantOverviewPage(): ReactElement {
  const { effectiveMuseumId, isScoped } = useScopedTenantContext()

  const [overview, setOverview] = useState<ApiTenantOverview | null>(isLiveApi ? null : DEMO_OVERVIEW)
  const [changes, setChanges] = useState<readonly ApiAuditEntry[]>(
    isLiveApi ? [] : DEMO_RECENT_CHANGES,
  )
  const [changesFailed, setChangesFailed] = useState(false)
  const [status, setStatus] = useState<'loading' | 'ready' | 'error' | 'demo'>(
    isLiveApi ? 'loading' : 'demo',
  )
  const [error, setError] = useState<string | null>(null)
  const requestSeq = useRef(0)

  const load = useCallback(async (): Promise<void> => {
    if (!isLiveApi) return
    const seq = requestSeq.current + 1
    requestSeq.current = seq
    setStatus('loading')

    try {
      // The audit read is secondary: losing recent activity should not cost the
      // readiness picture, which is the reason to open this page.
      const [next, recent] = await Promise.all([
        getOverview(effectiveMuseumId),
        listAuditLogs({ museumId: effectiveMuseumId, limit: 6 })
          .then((page) => page.data)
          .catch(() => {
            if (requestSeq.current === seq) setChangesFailed(true)
            return [] as readonly ApiAuditEntry[]
          }),
      ])
      if (requestSeq.current !== seq) return
      setOverview(next)
      setChanges(recent)
      setStatus('ready')
      setError(null)
    } catch (caught) {
      if (requestSeq.current !== seq) return
      setError(isApiError(caught) ? messageForCode(caught) : 'Could not load this museum.')
      setStatus('error')
    }
  }, [effectiveMuseumId])

  useEffect(() => {
    void load()
  }, [load])

  const counts = useMemo(() => {
    const rooms = overview?.rooms ?? []
    return {
      ready: rooms.filter((room) => room.inSequence && room.readiness === 'ready').length,
      incomplete: rooms.filter((room) => room.inSequence && room.readiness === 'incomplete').length,
      empty: rooms.filter((room) => room.inSequence && room.readiness === 'empty').length,
      unreachable: rooms.filter((room) => !room.inSequence).length,
      total: rooms.length,
    }
  }, [overview])

  const readinessPercent =
    counts.total === 0 ? 0 : Math.round((counts.ready / counts.total) * 100)

  const kpis = useMemo<readonly KpiCardProps[]>(() => {
    if (overview === null) return []
    const { stats, limits } = overview
    return [
      {
        label: 'Rooms a visitor can complete',
        value: String(counts.ready),
        unit: `/ ${stats.roomCount}`,
        caption: 'Narrated, populated, and reachable in sequence',
        provenance: isLiveApi ? 'live' : 'demo',
      },
      {
        label: 'Rooms needing work',
        value: String(counts.incomplete + counts.empty + counts.unreachable),
        caption:
          counts.unreachable > 0
            ? `${counts.unreachable} of them are unreachable from the visitor route`
            : 'Missing narration or items',
        provenance: isLiveApi ? 'live' : 'demo',
      },
      {
        label: 'Items across all rooms',
        value: String(stats.itemCount),
        caption: limitCaption(stats.itemCount, null, 'items'),
        provenance: isLiveApi ? 'live' : 'demo',
      },
      {
        label: 'Administrator seats',
        value: String(stats.adminCount),
        caption: limitCaption(stats.adminCount, limits.maxAdminUsers, 'seats'),
        provenance: isLiveApi ? 'live' : 'demo',
      },
    ]
  }, [counts, overview])

  const pageState: KitState =
    status === 'loading'
      ? { kind: 'loading', label: 'overview' }
      : status === 'error'
        ? {
            kind: 'failure',
            title: 'Could not load this museum',
            body: error ?? 'The request failed.',
            retry: { label: 'Try again', onAct: () => void load() },
          }
        : { kind: 'ready' }

  if (pageState.kind !== 'ready' || overview === null) {
    return (
      <div className={styles.page}>
        <StateBlock state={pageState} size="region" />
      </div>
    )
  }

  const atRoomLimit =
    overview.limits.maxRooms !== null && overview.stats.roomCount >= overview.limits.maxRooms

  return (
    <div className={styles.page}>
      <section className={styles.mainColumn} aria-labelledby="overview-heading">
        <header className={styles.header}>
          <p className={`${styles.museumName} museum-name`}>{overview.museumName}</p>
          <h1 id="overview-heading" className="text-title">
            Overview
          </h1>
        </header>

        {overview.subscriptionStatus !== 'ACTIVE' ? (
          <StateBlock
            size="inline"
            state={{
              kind: 'failure',
              title:
                overview.subscriptionStatus === 'PAST_DUE'
                  ? 'This subscription is past due'
                  : 'This subscription is canceled',
              body: 'Authoring still works, but the plan needs settling before the next renewal to avoid interruption.',
            }}
          />
        ) : null}

        <Panel padded={false}>
          <div className={styles.spinePanel}>
            <div className={styles.spineHeader}>
              <h2 className="text-subtitle">Readiness spine</h2>
              <StatusBadge
                tone={counts.unreachable > 0 ? 'danger' : readinessPercent === 100 ? 'success' : 'warning'}
                label={`${readinessPercent}% ready`}
              />
            </div>
            <p className={`${styles.spineNote} text-body`}>
              One marker per room in story order. A cross means the room exists but the visitor
              route never reaches it.
            </p>
            {overview.rooms.length === 0 ? (
              <StateBlock
                size="inline"
                state={{
                  kind: 'empty',
                  title: 'No rooms yet',
                  body: 'A museum needs at least one narrated room before the guide has anything to say.',
                }}
              />
            ) : (
              <ReadinessSpine rooms={overview.rooms} />
            )}
            <ul className={styles.spineLegend}>
              <li>
                <StatusBadge tone="success" label={`${counts.ready} ready`} detail="Narrated and populated" />
              </li>
              <li>
                <StatusBadge tone="warning" label={`${counts.incomplete} without items`} detail="Narrated but empty" />
              </li>
              <li>
                <StatusBadge tone="neutral" label={`${counts.empty} without narration`} detail="Nothing written yet" />
              </li>
              <li>
                <StatusBadge tone="danger" label={`${counts.unreachable} unreachable`} detail="Not on the visitor route" />
              </li>
            </ul>
          </div>
        </Panel>

        <section className={styles.kpiSection} aria-label="Museum authoring indicators">
          {kpis.map((kpi) => (
            <KpiCard key={kpi.label} {...kpi} />
          ))}
        </section>

        <IntegrationPendingPanel
          dependency="Visitor telemetry"
          body="The backend records no visits, dwell time, or completions, so there is nothing honest to chart here yet."
          stillUsable="Everything above is read from the authoring data the API does hold."
        />

        <Panel title="Room readiness detail">
          <div className={styles.roomListHeader}>
            <p className={`${styles.panelCopy} text-body`}>
              In story order, with what each unfinished room is waiting on.
            </p>
            {atRoomLimit ? (
              <StatusBadge tone="warning" label="At the plan's room limit" />
            ) : null}
          </div>
          <ol className={styles.roomList}>
            {overview.rooms.map((room) => (
              <li key={room.id} id={`room-${room.id}`} className={styles.roomRow}>
                <div className={styles.roomIdentity}>
                  <p className={`${styles.roomOrder} text-caption numeric`}>{room.storyOrder}</p>
                  <div>
                    <p className="text-body">{room.title}</p>
                    <p className={`${styles.roomMeta} text-caption`}>{roomBlockerText(room)}</p>
                  </div>
                </div>
                <div className={styles.roomStatus}>
                  <StatusBadge
                    tone={roomTone(room)}
                    label={roomStateLabel(room)}
                    marker={roomMarker(room)}
                    detail={`${room.title} readiness`}
                  />
                  <p className={`${styles.roomMeta} text-caption`}>
                    {room.itemCount} {room.itemCount === 1 ? 'item' : 'items'} · edited{' '}
                    {formatRelative(room.updatedAt)}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </Panel>

        <Panel title="Recent changes">
          <div className={styles.rowBetween}>
            <p className={`${styles.panelCopy} text-body`}>
              The last few writes recorded against this museum.
            </p>
          </div>
          {changesFailed ? (
            <StateBlock
              size="inline"
              state={{
                kind: 'failure',
                title: 'Recent activity is unavailable',
                body: 'The readiness figures above still loaded.',
                retry: { label: 'Try again', onAct: () => void load() },
              }}
            />
          ) : changes.length === 0 ? (
            <StateBlock
              size="inline"
              state={{ kind: 'empty', title: 'Nothing has been changed yet' }}
            />
          ) : (
            <ul className={styles.changeList}>
              {changes.map((entry) => (
                <li key={entry.id} className={styles.changeRow}>
                  <div>
                    <p className="text-body">
                      {ACTION_VERB[entry.action]} {entry.entityType.toLowerCase()} “{entry.entityLabel}”
                    </p>
                    <p className={`${styles.changeMeta} text-caption`}>
                      <span>{entry.actorDisplayName ?? entry.actorEmail ?? 'Automated'}</span>
                      {entry.actorRole === 'SYSTEM_ADMIN' ? (
                        <StatusBadge tone="warning" label="Platform operator" marker="ring" />
                      ) : null}
                    </p>
                  </div>
                  <div className={styles.changeWhen}>
                    <p className={`${styles.changeMeta} text-caption`}>
                      {formatRelative(entry.createdAt)}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
          <p className={`${styles.panelCopy} text-caption`}>
            <Link to={isScoped ? '../activity' : '/app/activity'}>See the full history</Link>
          </p>
        </Panel>
      </section>

      <aside className={styles.insightsRail} aria-label="Overview insights">
        <Panel title="Readiness gauge">
          <div className={styles.rowBetween}>
            <p className={`${styles.gaugeValue} text-display numeric`}>{readinessPercent}%</p>
          </div>
          <p className={`${styles.panelCopy} text-caption`}>
            {counts.ready} of {counts.total} rooms are narrated, populated, and reachable.
          </p>
        </Panel>

        <Panel title="Status breakdown">
          <div className={styles.rowBetween}>
            <div className={styles.breakdownBar} role="img" aria-label="Room readiness breakdown bar">
              <span
                className={`${styles.breakdownSegment} ${styles.breakdownSuccess}`}
                style={{ ['--segment-share' as string]: `${counts.ready / Math.max(1, counts.total)}` }}
              />
              <span
                className={`${styles.breakdownSegment} ${styles.breakdownWarning}`}
                style={{ ['--segment-share' as string]: `${counts.incomplete / Math.max(1, counts.total)}` }}
              />
              <span
                className={`${styles.breakdownSegment} ${styles.breakdownDanger}`}
                style={{ ['--segment-share' as string]: `${counts.unreachable / Math.max(1, counts.total)}` }}
              />
              <span
                className={`${styles.breakdownSegment} ${styles.breakdownNeutral}`}
                style={{ ['--segment-share' as string]: `${counts.empty / Math.max(1, counts.total)}` }}
              />
            </div>
          </div>
          <ul className={styles.insightList}>
            <li className={styles.insightItem}>
              <StatusBadge tone="success" label="Ready" />
              <span className={`${styles.insightValue} text-caption numeric`}>{counts.ready}</span>
            </li>
            <li className={styles.insightItem}>
              <StatusBadge tone="warning" label="No items" />
              <span className={`${styles.insightValue} text-caption numeric`}>{counts.incomplete}</span>
            </li>
            <li className={styles.insightItem}>
              <StatusBadge tone="neutral" label="No narration" />
              <span className={`${styles.insightValue} text-caption numeric`}>{counts.empty}</span>
            </li>
            <li className={styles.insightItem}>
              <StatusBadge tone="danger" label="Unreachable" />
              <span className={`${styles.insightValue} text-caption numeric`}>{counts.unreachable}</span>
            </li>
          </ul>
        </Panel>

        <Panel title="Plan">
          <div className={styles.rowBetween}>
            <p className="text-subtitle">{overview.tier}</p>
            <StatusBadge
              tone={overview.subscriptionStatus === 'ACTIVE' ? 'success' : 'danger'}
              label={overview.subscriptionStatus === 'ACTIVE' ? 'Active' : 'Needs attention'}
            />
          </div>
          <ul className={styles.miniGrid}>
            <li className={styles.miniKpi}>
              <p className="column-header">Rooms</p>
              <p className={`${styles.miniValue} text-lead numeric`}>
                {overview.stats.roomCount}
                {overview.limits.maxRooms === null ? '' : ` / ${overview.limits.maxRooms}`}
              </p>
            </li>
            <li className={styles.miniKpi}>
              <p className="column-header">Items per room</p>
              <p className={`${styles.miniValue} text-lead numeric`}>
                {overview.limits.maxItemsPerRoom ?? 'No limit'}
              </p>
            </li>
            <li className={styles.miniKpi}>
              <p className="column-header">Seats</p>
              <p className={`${styles.miniValue} text-lead numeric`}>
                {overview.stats.adminCount}
                {overview.limits.maxAdminUsers === null ? '' : ` / ${overview.limits.maxAdminUsers}`}
              </p>
            </li>
            <li className={styles.miniKpi}>
              <p className="column-header">Last edit</p>
              <p className={`${styles.miniValue} text-lead`}>
                {formatRelative(overview.stats.lastEditedAt)}
              </p>
            </li>
          </ul>
        </Panel>

        <Panel title="Rooms needing attention">
          {overview.rooms.filter((room) => !room.inSequence || room.readiness !== 'ready').length ===
          0 ? (
            <p className={`${styles.panelCopy} text-caption`}>
              Every room is narrated, populated, and reachable.
            </p>
          ) : (
            <ol className={styles.rankedList}>
              {overview.rooms
                .filter((room) => !room.inSequence || room.readiness !== 'ready')
                .slice(0, 5)
                .map((room) => (
                  <li key={room.id} className={styles.rankedRow}>
                    <a href={`#room-${room.id}`} className={styles.rankedLink}>
                      <span className="text-body">{room.title}</span>
                      <span className={`${styles.rankedValue} text-caption`}>
                        {roomStateLabel(room)}
                      </span>
                    </a>
                  </li>
                ))}
            </ol>
          )}
        </Panel>
      </aside>
    </div>
  )
}

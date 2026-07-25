import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { useState, type FormEvent, type ReactElement } from 'react'

import {
  Button,
  Field,
  Select,
  StateBlock,
  StatusBadge,
  TextArea,
  useToast,
} from '../../kit/index.ts'
import { setTierManually } from '../../api/adminApi.ts'
import { isLiveApi } from '../../api/config.ts'
import { isApiError, messageForCode } from '../../api/errors.ts'
import type { ApiSubscriptionStatus, ApiTier } from '../../api/types.ts'
import { useFleetStore } from './fleetStore.tsx'
import {
  fleetHealthLabel,
  fleetHealthTone,
  fleetStatusLabel,
  fleetStatusTone,
  formatEtb,
  formatRelative,
  type FleetMuseum,
} from './fleetFixtures.ts'
import styles from './FleetPage.module.css'

const MIN_REASON = 10

const TIER_OPTIONS = [
  { value: 'BASIC', label: 'Basic' },
  { value: 'PRO', label: 'Pro' },
  { value: 'ENTERPRISE', label: 'Enterprise' },
] as const

const SUBSCRIPTION_OPTIONS = [
  { value: 'unchanged', label: 'Leave as it is' },
  { value: 'ACTIVE', label: 'Active' },
  { value: 'PAST_DUE', label: 'Past due' },
  { value: 'CANCELED', label: 'Canceled' },
] as const

const RENEWAL_OPTIONS = [
  { value: 'unchanged', label: 'Leave the current date' },
  { value: '30', label: 'Set to 30 days from today' },
  { value: '90', label: 'Set to 90 days from today' },
] as const

const DAY_MS = 86_400_000

/**
 * Grants a plan without a payment. It exists for the cases money cannot fix in
 * time — a bank transfer settled off-platform, a museum wrongly downgraded by a
 * failed verify — so the reason is mandatory and lands in the audit trail
 * beside the before and after values.
 */
function TierOverridePanel({
  museum,
  onApplied,
}: {
  readonly museum: FleetMuseum
  readonly onApplied: () => void
}): ReactElement {
  const { show } = useToast()
  const [tier, setTier] = useState<ApiTier>(museum.tier)
  const [subscription, setSubscription] = useState<string>('unchanged')
  const [renewal, setRenewal] = useState<string>('unchanged')
  const [reason, setReason] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault()
    setSaving(true)
    setError(null)
    try {
      await setTierManually({
        museumId: museum.id,
        tier,
        ...(subscription === 'unchanged'
          ? {}
          : { subscriptionStatus: subscription as ApiSubscriptionStatus }),
        ...(renewal === 'unchanged'
          ? {}
          : {
              subscriptionRenewsAt: new Date(
                Date.now() + Number(renewal) * DAY_MS,
              ).toISOString(),
            }),
        reason: reason.trim(),
      })
      setReason('')
      show({ tone: 'success', message: `${museum.name} is now on ${tier}.` })
      onApplied()
    } catch (caught) {
      setError(isApiError(caught) ? messageForCode(caught) : 'The override did not apply.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form className={styles.panel} onSubmit={(event) => void submit(event)}>
      <p className={`column-header ${styles.muted}`}>Manual plan override</p>
      <p className={`text-body ${styles.muted}`}>
        Changes the plan with no payment taken. Currently {museum.tier}, subscription{' '}
        {museum.subscriptionStatus.toLowerCase().replace('_', ' ')}.
      </p>

      <div className={styles.overrideGrid}>
        <Field id="override-tier" label="Plan" required>
          {(control) => (
            <Select
              {...control}
              value={tier}
              onChange={(value) => setTier(value as ApiTier)}
              options={TIER_OPTIONS}
            />
          )}
        </Field>
        <Field id="override-subscription" label="Subscription status">
          {(control) => (
            <Select
              {...control}
              value={subscription}
              onChange={setSubscription}
              options={SUBSCRIPTION_OPTIONS}
            />
          )}
        </Field>
        <Field id="override-renewal" label="Renewal date">
          {(control) => (
            <Select
              {...control}
              value={renewal}
              onChange={setRenewal}
              options={RENEWAL_OPTIONS}
            />
          )}
        </Field>
      </div>

      <Field
        id="override-reason"
        label="Reason"
        required
        hint={`Recorded in the audit trail. At least ${MIN_REASON} characters.`}
        {...(error === null ? {} : { error })}
      >
        {(control) => (
          <TextArea
            {...control}
            value={reason}
            onChange={setReason}
            rows={2}
            maxLength={500}
            showCount
          />
        )}
      </Field>

      <div className={styles.headerActions}>
        <Button
          type="submit"
          tone="danger"
          disabled={!isLiveApi || saving || reason.trim().length < MIN_REASON}
          {...(isLiveApi ? {} : { disabledReason: 'No API is configured in demo mode.' })}
        >
          {saving ? 'Applying…' : 'Apply override'}
        </Button>
      </div>
    </form>
  )
}

export function TenantRecordPage(): ReactElement {
  const { museumId } = useParams()
  const { museums, status, loadError, reload, spendWindow, setFleetScrollY } = useFleetStore()
  const navigate = useNavigate()

  // The fleet has to arrive before "no such museum" can mean anything.
  if (status === 'loading') {
    return <StateBlock state={{ kind: 'loading', label: 'tenant record' }} size="region" />
  }
  if (status === 'error') {
    return (
      <StateBlock
        size="region"
        state={{
          kind: 'failure',
          title: 'Could not load the fleet',
          body: loadError ?? 'The request failed.',
          retry: { label: 'Try again', onAct: reload },
        }}
      />
    )
  }

  const museum = museums.find((entry) => entry.id === museumId)
  if (museum === undefined) return <Navigate to="/operator/fleet" replace />

  return (
    <div className={styles.recordPage}>
      <header className={styles.headerCard}>
        <div className={styles.headerTop}>
          <div>
            <p className={`museum-name ${styles.museumName}`}>{museum.name}</p>
            <h1 className="text-title">Tenant record</h1>
            <p className={`text-body ${styles.muted}`}>
              Control-plane record: status, authoring readiness, collected revenue, and operator actions.
            </p>
          </div>
          <div className={styles.headerActions}>
            <Button tone="secondary" onClick={() => navigate('/operator/fleet')}>
              Back to fleet
            </Button>
            <Button
              tone="ghost"
              onClick={() => {
                if (typeof window !== 'undefined') setFleetScrollY(window.scrollY)
                navigate(`/operator/tenant/${museum.id}/overview`)
              }}
            >
              Enter tenant
            </Button>
          </div>
        </div>
      </header>

      <section className={styles.recordGrid}>
        <article className={styles.panel}>
          <p className={`column-header ${styles.muted}`}>Status and readiness</p>
          <StatusBadge tone={fleetStatusTone(museum.status)} label={fleetStatusLabel(museum.status)} />
          <p className="text-body">
            {museum.roomsReady} of {museum.roomCount} rooms are narrated and populated.
          </p>
          <p className="text-body">
            {museum.roomsInSequence === museum.roomCount
              ? 'Every room is reachable from the visitor route.'
              : `${museum.roomCount - museum.roomsInSequence} rooms are unreachable from the visitor route.`}
          </p>
          <p className={`text-caption ${styles.muted}`}>
            {museum.itemCount} items, {museum.adminCount}{' '}
            {museum.adminCount === 1 ? 'administrator' : 'administrators'}.
          </p>
        </article>

        <article className={styles.panel}>
          <p className={`column-header ${styles.muted}`}>Revenue and health</p>
          <p className="text-subtitle numeric">{formatEtb(museum.spendEtb)}</p>
          <p className={`text-caption ${styles.muted}`}>
            Collected in the last {spendWindow} on the {museum.tier.toLowerCase()} plan.
          </p>
          <StatusBadge tone={fleetHealthTone(museum.health)} label={fleetHealthLabel(museum.health)} />
          <p className={`text-caption ${styles.muted}`}>
            Last edited {formatRelative(museum.updatedAt)}.
          </p>
        </article>
      </section>

      <TierOverridePanel museum={museum} onApplied={reload} />

      <section className={styles.panel}>
        <p className={`column-header ${styles.muted}`}>Related screens</p>
        <p className="text-body">
          Seats for this museum are on the admins screen, its write history is on the audit screen, and
          its revenue detail is on the spend screen — all filterable to this tenant.
        </p>
        <div className={styles.headerActions}>
          <Button tone="secondary" onClick={() => navigate(`/operator/admins?museumId=${museum.id}`)}>
            Administrators
          </Button>
          <Button tone="secondary" onClick={() => navigate(`/operator/audit?museumId=${museum.id}`)}>
            Audit trail
          </Button>
          <Button tone="secondary" onClick={() => navigate('/operator/spend')}>
            Spend
          </Button>
        </div>
      </section>
    </div>
  )
}

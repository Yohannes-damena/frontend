import { useCallback, useEffect, useMemo, useRef, useState, type ReactElement } from 'react'
import { Link } from 'react-router-dom'

import {
  Button,
  ConfirmDialog,
  Panel,
  StateBlock,
  StatusBadge,
  type KitState,
  type StatusTone,
} from '../../kit/index.ts'
import { getBillingStatus, listPlans, startCheckout } from '../../api/adminApi.ts'
import { isLiveApi } from '../../api/config.ts'
import { isApiError, messageForCode } from '../../api/errors.ts'
import type {
  ApiBillingStatus,
  ApiPayment,
  ApiPlan,
  ApiSubscriptionStatus,
  ApiTier,
} from '../../api/types.ts'
import { useScopedTenantContext } from '../operator/scopedTenantContext.tsx'
import { DEMO_BILLING_STATUS, DEMO_PLANS } from './billingFixtures.ts'
import { formatEtbAmount } from './money.ts'
import { rememberPendingCheckout } from './pendingCheckout.ts'
import styles from './PlanPage.module.css'

/**
 * The museum's own subscription: what it is on, what that allows, and what it
 * has paid. Changing plan hands off to the payment provider and comes back
 * through /billing/return, which is where the upgrade is actually confirmed —
 * nothing here grants a tier on its own.
 */

const TIER_RANK: Readonly<Record<ApiTier, number>> = { BASIC: 0, PRO: 1, ENTERPRISE: 2 }

const SUBSCRIPTION_LABEL: Readonly<Record<ApiSubscriptionStatus, string>> = {
  ACTIVE: 'Active',
  PAST_DUE: 'Past due',
  CANCELED: 'Canceled',
}

const SUBSCRIPTION_TONE: Readonly<Record<ApiSubscriptionStatus, StatusTone>> = {
  ACTIVE: 'success',
  PAST_DUE: 'warning',
  CANCELED: 'danger',
}

const PAYMENT_LABEL: Readonly<Record<ApiPayment['status'], string>> = {
  PENDING: 'Awaiting payment',
  PAID: 'Paid',
  FAILED: 'Failed',
  EXPIRED: 'Expired',
}

const PAYMENT_TONE: Readonly<Record<ApiPayment['status'], StatusTone>> = {
  PENDING: 'warning',
  PAID: 'success',
  FAILED: 'danger',
  EXPIRED: 'neutral',
}

function limitText(limit: number | null, noun: string): string {
  if (limit === null) return `Unlimited ${noun}`
  return `${limit} ${limit === 1 ? noun.replace(/s$/, '') : noun}`
}

function usageText(used: number, limit: number | null, noun: string): string {
  if (limit === null) return `${used} ${noun} in use, no ceiling`
  return `${used} of ${limit} ${noun} in use`
}

function renewalText(status: ApiBillingStatus): string {
  if (status.subscriptionRenewsAt === null) return 'No renewal date on record.'
  const when = new Date(status.subscriptionRenewsAt).toLocaleDateString()
  if (status.daysUntilRenewal === null) return `Renews on ${when}.`
  if (status.daysUntilRenewal < 0) {
    return `The period ended on ${when}, ${Math.abs(status.daysUntilRenewal)} days ago.`
  }
  if (status.daysUntilRenewal === 0) return `The current period ends today, ${when}.`
  return `Renews on ${when}, in ${status.daysUntilRenewal} days.`
}

export function PlanPage(): ReactElement {
  const scoped = useScopedTenantContext()
  const museumId = scoped.effectiveMuseumId
  const isOperator = scoped.role === 'SYSTEM_ADMIN'

  const [plans, setPlans] = useState<readonly ApiPlan[]>(isLiveApi ? [] : DEMO_PLANS)
  const [billing, setBilling] = useState<ApiBillingStatus | null>(
    isLiveApi ? null : DEMO_BILLING_STATUS,
  )
  const [status, setStatus] = useState<'loading' | 'ready' | 'error' | 'demo'>(
    isLiveApi ? 'loading' : 'demo',
  )
  const [error, setError] = useState<string | null>(null)
  const requestSeq = useRef(0)

  const [pendingPlan, setPendingPlan] = useState<ApiPlan | null>(null)
  const [checkoutError, setCheckoutError] = useState<string | null>(null)
  const [redirecting, setRedirecting] = useState(false)
  const returnFocusTo = useRef<HTMLElement | null>(null)

  const load = useCallback(async (): Promise<void> => {
    if (!isLiveApi) return
    const seq = requestSeq.current + 1
    requestSeq.current = seq
    setStatus('loading')
    try {
      const [planList, current] = await Promise.all([
        listPlans(),
        getBillingStatus({ museumId, limit: 20 }),
      ])
      if (requestSeq.current !== seq) return
      setPlans(planList.plans)
      setBilling(current)
      setStatus('ready')
      setError(null)
    } catch (caught) {
      if (requestSeq.current !== seq) return
      setError(isApiError(caught) ? messageForCode(caught) : 'Could not load the subscription.')
      setStatus('error')
    }
  }, [museumId])

  useEffect(() => {
    void load()
  }, [load])

  const openPayment = useMemo(
    () => billing?.payments.find((payment) => payment.status === 'PENDING') ?? null,
    [billing],
  )

  async function beginCheckout(): Promise<void> {
    if (pendingPlan === null) return
    setRedirecting(true)
    setCheckoutError(null)
    try {
      const checkout = await startCheckout({ tier: pendingPlan.tier, museumId })
      // Chapa is expected to send the reference back on the return URL, but
      // that is the provider's promise rather than ours — keeping it here means
      // the return page can still identify the payment if it does not.
      rememberPendingCheckout(checkout.txRef)
      window.location.assign(checkout.checkoutUrl)
    } catch (caught) {
      setCheckoutError(
        isApiError(caught) ? messageForCode(caught) : 'The checkout could not be started.',
      )
      setRedirecting(false)
      setPendingPlan(null)
    }
  }

  const pageState: KitState =
    status === 'loading'
      ? { kind: 'loading', label: 'the subscription' }
      : status === 'error'
        ? {
            kind: 'failure',
            title: 'Could not load the subscription',
            body: error ?? 'The request failed.',
            retry: { label: 'Try again', onAct: () => void load() },
          }
        : { kind: 'ready' }

  if (pageState.kind !== 'ready' || billing === null) {
    return (
      <div className={styles.page}>
        <StateBlock state={pageState} size="region" />
      </div>
    )
  }

  const currentRank = TIER_RANK[billing.tier]

  return (
    <div className={styles.page}>
      <header className={styles.headerCard}>
        <div>
          <h1 className="text-title">Plan</h1>
          <p className={`text-body ${styles.muted}`}>
            What this museum is subscribed to, what the plan allows, and every payment it has made.
          </p>
        </div>
        <div className={styles.headerStatus}>
          <StatusBadge
            tone={SUBSCRIPTION_TONE[billing.subscriptionStatus]}
            label={SUBSCRIPTION_LABEL[billing.subscriptionStatus]}
          />
        </div>
      </header>

      {billing.subscriptionStatus !== 'ACTIVE' ? (
        <StateBlock
          size="inline"
          state={{
            kind: 'failure',
            title:
              billing.subscriptionStatus === 'PAST_DUE'
                ? 'This subscription is past due'
                : 'This subscription is canceled',
            body: 'Existing content is untouched and still readable, but new rooms and items are refused until a payment settles.',
          }}
        />
      ) : null}

      <Panel title="Current plan">
        <div className={styles.currentGrid}>
          <div>
            <p className="column-header">Plan</p>
            <p className="text-lead">{billing.tier}</p>
            <p className={`text-caption ${styles.muted}`}>{renewalText(billing)}</p>
          </div>
          <div>
            <p className="column-header">Rooms</p>
            <p className="text-lead numeric">
              {billing.usage.rooms}
              {billing.limits.maxRooms === null ? '' : ` / ${billing.limits.maxRooms}`}
            </p>
            <p className={`text-caption ${styles.muted}`}>
              {usageText(billing.usage.rooms, billing.limits.maxRooms, 'rooms')}
            </p>
          </div>
          <div>
            <p className="column-header">Staff accounts</p>
            <p className="text-lead numeric">
              {billing.usage.adminUsers}
              {billing.limits.maxAdminUsers === null ? '' : ` / ${billing.limits.maxAdminUsers}`}
            </p>
            <p className={`text-caption ${styles.muted}`}>
              {usageText(billing.usage.adminUsers, billing.limits.maxAdminUsers, 'seats')}
            </p>
          </div>
          <div>
            <p className="column-header">Items per room</p>
            <p className="text-lead numeric">{billing.limits.maxItemsPerRoom ?? 'No limit'}</p>
            <p className={`text-caption ${styles.muted}`}>Counted per room, not across the museum.</p>
          </div>
        </div>
      </Panel>

      {openPayment !== null ? (
        <Panel title="A payment is still open">
          <p className={`text-body ${styles.muted}`}>
            {formatEtbAmount(openPayment.amountEtb)} for the {openPayment.tier} plan, started{' '}
            {new Date(openPayment.createdAt).toLocaleString()}. Finish it, or wait for it to expire,
            before starting another.
          </p>
          <p className="text-caption">
            <Link to={`/billing/return?tx_ref=${encodeURIComponent(openPayment.txRef)}`}>
              Check whether it has cleared
            </Link>
          </p>
        </Panel>
      ) : null}

      {checkoutError !== null ? (
        <StateBlock
          size="inline"
          state={{ kind: 'failure', title: 'Could not start the checkout', body: checkoutError }}
        />
      ) : null}

      <section className={styles.planGrid} aria-label="Available plans">
        {plans.map((plan) => {
          const isCurrent = plan.tier === billing.tier
          const rank = TIER_RANK[plan.tier]
          const actionLabel =
            isCurrent && billing.subscriptionStatus === 'ACTIVE'
              ? 'Renew early'
              : isCurrent
                ? 'Settle this plan'
                : rank > currentRank
                  ? `Upgrade to ${plan.displayName}`
                  : `Move to ${plan.displayName}`

          return (
            <article
              key={plan.tier}
              className={`${styles.planCard} ${isCurrent ? styles.planCardCurrent : ''}`}
            >
              <header className={styles.planHeader}>
                <p className="text-subtitle">{plan.displayName}</p>
                {isCurrent ? <StatusBadge tone="success" label="Current plan" /> : null}
              </header>

              <p className={`text-display numeric ${styles.price}`}>
                {formatEtbAmount(plan.amountEtb)}
              </p>
              <p className={`text-caption ${styles.muted}`}>
                every {plan.periodDays} days
              </p>

              {plan.description !== null ? (
                <p className={`text-body ${styles.muted}`}>{plan.description}</p>
              ) : null}

              <ul className={styles.limitList}>
                <li className="text-caption">{limitText(plan.limits.maxRooms, 'rooms')}</li>
                <li className="text-caption">
                  {limitText(plan.limits.maxItemsPerRoom, 'items')} per room
                </li>
                <li className="text-caption">{limitText(plan.limits.maxAdminUsers, 'seats')}</li>
              </ul>

              {isOperator ? null : (
                <Button
                  tone={isCurrent ? 'secondary' : 'primary'}
                  disabled={!isLiveApi || redirecting || openPayment !== null}
                  onClick={(event) => {
                    returnFocusTo.current = event.currentTarget
                    setPendingPlan(plan)
                  }}
                >
                  {actionLabel}
                </Button>
              )}
            </article>
          )
        })}
      </section>

      {isOperator ? (
        <p className={`text-caption ${styles.muted}`}>
          You are viewing this as a platform operator. Paying is the museum's own action; to correct
          a tier without a payment, use the manual override on the museum's fleet record.
        </p>
      ) : !isLiveApi ? (
        <p className={`text-caption ${styles.muted}`}>
          Checkout is unavailable in demo mode — there is no payment provider to hand off to.
        </p>
      ) : null}

      <Panel title="Payment history" description="Newest first, including attempts that never completed.">
        {billing.payments.length === 0 ? (
          <StateBlock
            size="inline"
            state={{
              kind: 'empty',
              title: 'No payments yet',
              body: 'Nothing has been charged for this museum.',
            }}
          />
        ) : (
          <ul className={styles.paymentList}>
            {billing.payments.map((payment) => (
              <li key={payment.id} className={styles.paymentRow}>
                <div>
                  <p className="text-body">
                    {payment.tier} · {formatEtbAmount(payment.amountEtb)}
                  </p>
                  <p className={`text-caption ${styles.muted}`}>
                    {payment.paidAt === null
                      ? `Started ${new Date(payment.createdAt).toLocaleString()}`
                      : `Paid ${new Date(payment.paidAt).toLocaleString()}`}
                    {payment.chapaReference === null ? '' : ` · ref ${payment.chapaReference}`}
                  </p>
                </div>
                <StatusBadge
                  tone={PAYMENT_TONE[payment.status]}
                  label={PAYMENT_LABEL[payment.status]}
                />
              </li>
            ))}
          </ul>
        )}
        {billing.nextCursor !== null ? (
          <p className={`text-caption ${styles.muted}`}>
            Older payments exist beyond the most recent twenty shown here.
          </p>
        ) : null}
      </Panel>

      <ConfirmDialog
        open={pendingPlan !== null}
        title="Continue to payment"
        entityName={pendingPlan === null ? 'Plan' : `${pendingPlan.displayName} plan`}
        consequence={
          pendingPlan === null
            ? ''
            : `costs ${formatEtbAmount(pendingPlan.amountEtb)} for ${pendingPlan.periodDays} days. You will leave the console for the payment provider, and the plan changes only once the payment clears.`
        }
        confirmLabel={redirecting ? 'Opening…' : 'Continue to payment'}
        onConfirm={() => void beginCheckout()}
        onCancel={() => setPendingPlan(null)}
        returnFocusTo={returnFocusTo}
      />
    </div>
  )
}

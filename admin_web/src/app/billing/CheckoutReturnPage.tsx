import { useCallback, useEffect, useRef, useState, type ReactElement } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'

import { Button, Panel, StateBlock, StatusBadge, type KitState } from '../../kit/index.ts'
import { getPaymentStatus } from '../../api/adminApi.ts'
import { isApiError, messageForCode } from '../../api/errors.ts'
import type { ApiPaymentStatus } from '../../api/types.ts'
import { clearPendingCheckout, readPendingCheckout } from './pendingCheckout.ts'
import { formatEtbAmount } from './money.ts'
import styles from './PlanPage.module.css'

/**
 * Where the payment provider sends the museum back to.
 *
 * Nothing is granted here: the poll asks the API, which re-verifies with the
 * provider and applies the tier itself. A payment that is still pending after
 * the last attempt is not a failure — the reconciler will settle it — so this
 * page says so plainly rather than implying the money was lost.
 */

const POLL_INTERVAL_MS = 3000
const MAX_ATTEMPTS = 8

/** Chapa uses trx_ref; the other spellings cost nothing to accept. */
function txRefFromQuery(params: URLSearchParams): string | null {
  for (const key of ['trx_ref', 'tx_ref', 'txRef', 'reference']) {
    const value = params.get(key)
    if (value !== null && value.trim().length > 0) return value.trim()
  }
  return null
}

export function CheckoutReturnPage(): ReactElement {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const txRef = txRefFromQuery(searchParams) ?? readPendingCheckout()

  const [payment, setPayment] = useState<ApiPaymentStatus | null>(null)
  const [status, setStatus] = useState<'polling' | 'settled' | 'pending' | 'error'>('polling')
  const [error, setError] = useState<string | null>(null)
  const [attempts, setAttempts] = useState(0)
  const cancelled = useRef(false)

  const poll = useCallback(
    async (reference: string, attempt: number): Promise<void> => {
      try {
        const next = await getPaymentStatus(reference)
        if (cancelled.current) return
        setPayment(next)
        setAttempts(attempt)

        if (next.status === 'PAID') {
          clearPendingCheckout()
          setStatus('settled')
          return
        }
        if (next.status === 'FAILED' || next.status === 'EXPIRED') {
          clearPendingCheckout()
          setStatus('settled')
          return
        }
        if (attempt >= MAX_ATTEMPTS) {
          setStatus('pending')
          return
        }
        window.setTimeout(() => {
          if (!cancelled.current) void poll(reference, attempt + 1)
        }, POLL_INTERVAL_MS)
      } catch (caught) {
        if (cancelled.current) return
        setError(isApiError(caught) ? messageForCode(caught) : 'Could not read the payment.')
        setStatus('error')
      }
    },
    [],
  )

  useEffect(() => {
    cancelled.current = false
    if (txRef === null) {
      setStatus('error')
      setError(null)
      return
    }
    void poll(txRef, 1)
    return () => {
      cancelled.current = true
    }
  }, [poll, txRef])

  if (txRef === null) {
    const missing: KitState = {
      kind: 'failure',
      title: 'No payment reference',
      body: 'This page needs the reference the payment provider returns. Open the plan page to see the payment’s current state.',
    }
    return (
      <div className={styles.returnPage}>
        <StateBlock state={missing} size="region" />
        <p className="text-caption">
          <Link to="/app/plan">Back to the plan</Link>
        </p>
      </div>
    )
  }

  return (
    <div className={styles.returnPage}>
      <Panel title="Payment">
        {status === 'error' ? (
          <StateBlock
            size="inline"
            state={{
              kind: 'failure',
              title: 'Could not read the payment',
              body: error ?? 'The request failed.',
              retry: {
                label: 'Try again',
                onAct: () => {
                  setStatus('polling')
                  setError(null)
                  void poll(txRef, 1)
                },
              },
            }}
          />
        ) : payment === null ? (
          <StateBlock size="inline" state={{ kind: 'loading', label: 'the payment' }} />
        ) : (
          <>
            <div className={styles.returnHeader}>
              <p className="text-lead">
                {payment.tier} · {formatEtbAmount(payment.amountEtb)}
              </p>
              <StatusBadge
                tone={
                  payment.status === 'PAID'
                    ? 'success'
                    : payment.status === 'PENDING'
                      ? 'warning'
                      : 'danger'
                }
                label={
                  payment.status === 'PAID'
                    ? 'Paid'
                    : payment.status === 'PENDING'
                      ? 'Not confirmed yet'
                      : payment.status === 'FAILED'
                        ? 'Failed'
                        : 'Expired'
                }
              />
            </div>

            {payment.status === 'PAID' ? (
              <p className="text-body">
                The payment cleared{payment.paidAt === null ? '' : ` on ${new Date(payment.paidAt).toLocaleString()}`}
                {payment.museumTier === null ? '' : `, and the museum is now on ${payment.museumTier}`}
                {payment.subscriptionRenewsAt === null
                  ? '.'
                  : ` until ${new Date(payment.subscriptionRenewsAt).toLocaleDateString()}.`}
              </p>
            ) : payment.status === 'PENDING' && status === 'polling' ? (
              <p className="text-body">
                Waiting for the provider to confirm. Checked {attempts}{' '}
                {attempts === 1 ? 'time' : 'times'} so far — this usually takes a few seconds.
              </p>
            ) : payment.status === 'PENDING' ? (
              <p className="text-body">
                The provider has not confirmed this payment yet. Nothing is lost: the museum's
                records are reconciled automatically, and the plan applies as soon as the payment
                clears. Come back to this page, or the plan page, in a few minutes.
              </p>
            ) : payment.status === 'FAILED' ? (
              <p className="text-body">
                The payment did not go through, so the plan is unchanged. You can start a new
                checkout from the plan page.
              </p>
            ) : (
              <p className="text-body">
                This checkout expired before it was paid, so the plan is unchanged. Start a new one
                from the plan page.
              </p>
            )}

            <p className={`text-caption ${styles.muted}`}>Reference {payment.txRef}</p>

            <div className={styles.returnActions}>
              <Button onClick={() => navigate('/app/plan')}>Back to the plan</Button>
              {payment.status === 'PENDING' && status !== 'polling' ? (
                <Button
                  tone="secondary"
                  onClick={() => {
                    setStatus('polling')
                    setAttempts(0)
                    void poll(txRef, 1)
                  }}
                >
                  Check again
                </Button>
              ) : null}
            </div>
          </>
        )}
      </Panel>
    </div>
  )
}

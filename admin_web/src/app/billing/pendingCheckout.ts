/**
 * The transaction reference of a checkout this tab handed off to the payment
 * provider.
 *
 * The provider is expected to append the reference to the return URL, but a
 * payment that cannot be identified on the way back is a payment the museum
 * cannot see the result of — so the reference is also kept here, in session
 * storage, where it dies with the tab rather than outliving the attempt.
 */

const KEY = 'adwa.billing.pendingTxRef'

export function rememberPendingCheckout(txRef: string): void {
  try {
    window.sessionStorage.setItem(KEY, txRef)
  } catch {
    // Private browsing modes can refuse storage. The return URL's own
    // parameter remains the primary path, so this is not worth failing over.
  }
}

export function readPendingCheckout(): string | null {
  try {
    const value = window.sessionStorage.getItem(KEY)
    return value !== null && value.length > 0 ? value : null
  } catch {
    return null
  }
}

export function clearPendingCheckout(): void {
  try {
    window.sessionStorage.removeItem(KEY)
  } catch {
    // Nothing to do: an unreadable store is also an unwritable one.
  }
}

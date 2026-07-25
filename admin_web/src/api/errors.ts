/**
 * The error vocabulary the API returns, plus the two failures that happen before
 * a response exists.
 *
 * FORBIDDEN and CROSS_TENANT_ACCESS are kept apart on purpose. The first is a
 * role or field rule — a museum admin touching its own `status`. The second is a
 * tenant boundary — museum A reaching museum B. They read the same to a careless
 * client and mean very different things to a user.
 */
export type ApiErrorCode =
  | 'VALIDATION_ERROR'
  | 'INVALID_CREDENTIALS'
  | 'UNAUTHENTICATED'
  | 'FORBIDDEN'
  | 'CROSS_TENANT_ACCESS'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'ROOM_REFERENCED'
  | 'INVALID_ROOM_SEQUENCE'
  | 'RATE_LIMITED'
  | 'INTERNAL_ERROR'
  | 'UPSTREAM_FAILURE'
  | 'UPSTREAM_UNAVAILABLE'
  // Billing and ticketing.
  | 'TIER_LIMIT_EXCEEDED'
  | 'SUBSCRIPTION_INACTIVE'
  | 'PAYMENT_ALREADY_PENDING'
  | 'PAYMENT_NOT_FOUND'
  | 'TICKET_URL_INVALID'
  // Never sent by the server: these describe a failure before a response existed.
  | 'NETWORK_ERROR'
  | 'TIMEOUT'
  | 'UNKNOWN'

/**
 * `path` matches the server's key exactly. It was once spelled `field` here,
 * which meant fieldError() silently found nothing and every server-side field
 * message was swallowed in favour of a generic banner.
 *
 * For a validation error it names the offending field. TIER_LIMIT_EXCEEDED
 * reuses the same array as a small payload — `limit`, `tier`, `allowed`, and
 * `current` — which is why detailValue() exists alongside fieldError().
 */
export type ApiErrorDetail = {
  readonly path?: string
  readonly message?: string
}

export class ApiError extends Error {
  readonly code: ApiErrorCode
  readonly status: number
  /**
   * Present on any response that reached the server. The API generates it so a
   * report can be traced to a log line, so show it in error UI.
   */
  readonly requestId: string | null
  readonly details: readonly ApiErrorDetail[]

  constructor(init: {
    message: string
    code: ApiErrorCode
    status: number
    requestId?: string | null
    details?: readonly ApiErrorDetail[]
  }) {
    super(init.message)
    this.name = 'ApiError'
    this.code = init.code
    this.status = init.status
    this.requestId = init.requestId ?? null
    this.details = init.details ?? []
  }

  /** The message for a named form field, when the server said which one failed. */
  fieldError(field: string): string | undefined {
    return this.details.find((detail) => detail.path === field)?.message
  }

  /** Reads one entry out of a non-validation details payload, e.g. a tier limit. */
  detailValue(key: string): string | undefined {
    return this.details.find((detail) => detail.path === key)?.message
  }
}

/** The plan ceiling a TIER_LIMIT_EXCEEDED refers to, for an upgrade prompt. */
export type TierLimitInfo = {
  readonly limit: string
  readonly tier: string
  readonly allowed: string
  readonly current: string
}

export function readTierLimit(error: unknown): TierLimitInfo | null {
  if (!isApiError(error) || error.code !== 'TIER_LIMIT_EXCEEDED') return null
  return {
    limit: error.detailValue('limit') ?? 'records',
    tier: error.detailValue('tier') ?? 'current',
    allowed: error.detailValue('allowed') ?? 'unlimited',
    current: error.detailValue('current') ?? '0',
  }
}

export function isApiError(value: unknown): value is ApiError {
  return value instanceof ApiError
}

/**
 * Whether the caller's session is over. Both codes mean the stored token can no
 * longer be used, so the app should return to the door rather than retry.
 */
export function isSessionExpired(error: unknown): boolean {
  return isApiError(error) && error.code === 'UNAUTHENTICATED'
}

/** Copy for the cases a user can act on. Anything else falls back to the server message. */
export function messageForCode(error: ApiError): string {
  switch (error.code) {
    case 'NETWORK_ERROR':
      return 'Could not reach the server. Check your connection and try again.'
    case 'TIMEOUT':
      return 'The server took too long to respond. It may be waking up — try again in a moment.'
    case 'RATE_LIMITED':
      return 'Too many attempts. Wait a few minutes before trying again.'
    case 'CROSS_TENANT_ACCESS':
      return 'That content belongs to a different museum.'
    case 'FORBIDDEN':
      return 'Your role does not allow that change.'
    case 'ROOM_REFERENCED':
      return 'Another room points at this one. Remove the link or delete it anyway.'
    case 'INVALID_ROOM_SEQUENCE':
      return 'That next-room link would break the room sequence.'
    case 'TIER_LIMIT_EXCEEDED': {
      const info = readTierLimit(error)
      if (info === null) return error.message
      return `The ${info.tier} plan allows ${info.allowed} ${info.limit}, and ${info.current} are in use. Upgrade to add more.`
    }
    case 'SUBSCRIPTION_INACTIVE':
      return 'This museum’s subscription is not active. Renew it to add new content.'
    case 'PAYMENT_ALREADY_PENDING':
      return 'A checkout for this plan is already open. Finish or cancel it first.'
    case 'PAYMENT_NOT_FOUND':
      return 'That payment could not be found.'
    case 'TICKET_URL_INVALID':
      return 'The ticket validation URL was rejected. Check the address and try again.'
    case 'UPSTREAM_FAILURE':
      // The gateway named a reason — a rejected key, a refused amount — and
      // burying it under "try again shortly" only sends the admin in circles
      // on a failure that retrying will never clear.
      return error.message.trim().length > 0
        ? error.message
        : 'An upstream service rejected the request.'
    case 'UPSTREAM_UNAVAILABLE':
      return 'An upstream service is not responding. Try again shortly.'
    case 'INTERNAL_ERROR':
      return 'Something went wrong on the server. The request ID below will identify it in the logs.'
    default:
      return error.message
  }
}

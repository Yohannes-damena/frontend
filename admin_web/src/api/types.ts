/**
 * Wire types for the admin API.
 *
 * These mirror the Zod schemas under `ai-tour-guide/backend/src/modules/*\/
 * schemas.ts`, which generate `backend/openapi/openapi.yaml`. That spec is the
 * contract; this file is a hand-maintained view of it, and
 * src/api/contract.test.ts keeps the room and item write shapes honest against
 * the Postman collection the backend publishes alongside it.
 */

export type ApiRole = 'MUSEUM_ADMIN' | 'SYSTEM_ADMIN'

/** No ONBOARDING server-side, and no delete route — suspension replaces it. */
export type ApiMuseumStatus = 'ACTIVE' | 'SUSPENDED'

export type ApiGateMode = 'TICKET_CODE' | 'STAFF_ASSISTED'
export type ApiGuideStyleTone = 'FORMAL' | 'CONVERSATIONAL' | 'SCHOLARLY'
export type ApiTier = 'BASIC' | 'PRO' | 'ENTERPRISE'
export type ApiSubscriptionStatus = 'ACTIVE' | 'PAST_DUE' | 'CANCELED'
export type ApiAdminStatus = 'ACTIVE' | 'INVITED' | 'SUSPENDED'

export type LoginRequest = {
  readonly email: string
  readonly password: string
}

export type LoginResponse = {
  readonly token: string
  readonly role: ApiRole
  /** Null for a system admin, who belongs to no museum. */
  readonly museumId: string | null
  readonly expiresAt: string
}

// -- Museums ---------------------------------------------------------------

export type ApiMuseum = {
  readonly id: string
  readonly name: string
  readonly slug: string
  readonly status: ApiMuseumStatus
  readonly cityCountry: string | null

  readonly ticketValidationUrl: string | null
  readonly gateMode: ApiGateMode
  readonly allowedTicketPrefix: string | null
  readonly graceWindowMinutes: number

  /** The grounding policy sent to the guide model. */
  readonly systemPrompt: string | null
  readonly personaName: string | null
  readonly guideStyleTone: ApiGuideStyleTone

  readonly defaultVoiceId: string | null
  /** Multiplier on the provider default. 1 is normal pace. */
  readonly speakingRate: number
  readonly pronunciationHints: string | null

  readonly tier: ApiTier
  readonly subscriptionStatus: ApiSubscriptionStatus
  readonly subscriptionRenewsAt: string | null

  readonly createdAt: string
  readonly updatedAt: string
}

/** Only present when a read asked for `withStats`. */
export type ApiMuseumStats = {
  readonly roomCount: number
  readonly itemCount: number
  readonly adminCount: number
  readonly roomsMissingNarration: number
  readonly roomsWithoutItems: number
  /** Narrated and non-empty. Not `roomCount` minus the two counts above: they overlap. */
  readonly roomsReady: number
  /** Rooms reachable by following nextRoomId from the first room. */
  readonly roomsInSequence: number
  readonly lastEditedAt: string | null
}

export type ApiMuseumWithStats = ApiMuseum & { readonly stats: ApiMuseumStats }

export type CreateMuseumRequest = {
  readonly name: string
  readonly slug: string
  readonly cityCountry?: string
  readonly adminEmail: string
  readonly adminPassword: string
}

/** The museum and its first admin are created in one transaction. */
export type CreateMuseumResponse = {
  readonly museum: ApiMuseum
  readonly admin: {
    readonly id: string
    readonly email: string
    readonly role: ApiRole
    readonly museumId: string
  }
}

/**
 * A museum admin may send every field here except `status`, which is
 * operator-only and answers 403 otherwise.
 *
 * The server rejects unknown keys rather than stripping them, so adding a
 * field here without adding it to the backend schema is a 400, not a silent
 * no-op. That is deliberate — the reverse used to happen and cost a rename.
 */
export type UpdateMuseumRequest = {
  readonly name?: string
  readonly slug?: string
  readonly status?: ApiMuseumStatus
  readonly cityCountry?: string | null

  readonly ticketValidationUrl?: string | null
  readonly gateMode?: ApiGateMode
  readonly allowedTicketPrefix?: string | null
  readonly graceWindowMinutes?: number

  readonly systemPrompt?: string | null
  readonly personaName?: string | null
  readonly guideStyleTone?: ApiGuideStyleTone

  readonly defaultVoiceId?: string | null
  readonly speakingRate?: number
  readonly pronunciationHints?: string | null
}

// -- Rooms and items -------------------------------------------------------

export type ApiRoom = {
  readonly id: string
  readonly legacyId: string | null
  readonly museumId: string
  readonly title: string
  readonly storyOrder: number
  readonly roomOverviewText: string
  readonly narrationScript: string
  readonly roomAudioUrl: string | null
  readonly nextRoomId: string | null
  readonly createdAt: string
  readonly updatedAt: string
  /** Only present on GET /admin/rooms/:id, which embeds the room's items. */
  readonly items?: readonly ApiItem[]
}

export type ApiItem = {
  readonly id: string
  readonly legacyId: string | null
  readonly roomId: string
  readonly name: string
  readonly shortDescription: string
  readonly detailText: string
  readonly imageUrl: string | null
  readonly displayOrder: number
  readonly createdAt: string
  readonly updatedAt: string
}

/**
 * `museumId` is required for a system admin, whose token names no tenant, and
 * ignored for a museum admin, whose token does. Passing the session's museumId
 * is correct either way.
 */
export type CreateRoomRequest = {
  readonly museumId?: string
  readonly title: string
  readonly storyOrder: number
  readonly roomOverviewText: string
  readonly narrationScript: string
  readonly nextRoomId?: string | null
}

/** museumId is not updatable: a room cannot change museums. */
export type UpdateRoomRequest = Omit<Partial<CreateRoomRequest>, 'museumId'>

export type CreateItemRequest = {
  readonly roomId: string
  readonly name: string
  readonly shortDescription: string
  readonly detailText: string
  /** Must be a valid absolute URL or null. An empty string is a 400. */
  readonly imageUrl?: string | null
  /** Omit to append to the end of the room. */
  readonly displayOrder?: number
}

export type UpdateItemRequest = {
  readonly name?: string
  readonly shortDescription?: string
  readonly detailText?: string
  /** Send null to clear the image. */
  readonly imageUrl?: string | null
  readonly displayOrder?: number
}

// -- Admin users -----------------------------------------------------------

export type ApiAdminUser = {
  readonly id: string
  readonly email: string
  readonly displayName: string | null
  readonly role: ApiRole
  readonly status: ApiAdminStatus
  readonly museumId: string | null
  readonly museumName: string | null
  readonly lastLoginAt: string | null
  readonly createdAt: string
}

export type CreateAdminRequest = {
  readonly email: string
  readonly password: string
  readonly displayName?: string
  readonly role: ApiRole
  /** Required when role is MUSEUM_ADMIN. */
  readonly museumId?: string
}

/** Role is intentionally absent — move a seat by deleting and re-creating it. */
export type UpdateAdminRequest = {
  readonly displayName?: string | null
  readonly status?: ApiAdminStatus
  readonly password?: string
}

// -- Audit -----------------------------------------------------------------

export type ApiAuditAction = 'CREATE' | 'UPDATE' | 'DELETE'

export type ApiAuditEntry = {
  readonly id: string
  readonly action: ApiAuditAction
  readonly entityType: string
  readonly entityId: string
  /** Best-effort human name, lifted from the before/after snapshot. */
  readonly entityLabel: string

  readonly museumId: string | null
  readonly museumName: string | null

  /** Null when the actor was the payment reconciler rather than a person. */
  readonly actorId: string | null
  readonly actorEmail: string | null
  readonly actorDisplayName: string | null
  readonly actorRole: ApiRole | null

  readonly before: unknown
  readonly after: unknown
  readonly createdAt: string
}

export type AuditLogFilters = {
  readonly museumId?: string | null
  readonly entityType?: string
  readonly action?: ApiAuditAction
  readonly actorId?: string
  readonly since?: string
  readonly until?: string
  readonly limit?: number
}

// -- Overview and health ---------------------------------------------------

export type ApiRoomReadiness = {
  readonly id: string
  readonly storyOrder: number
  readonly title: string
  readonly readiness: 'ready' | 'incomplete' | 'empty'
  readonly itemCount: number
  readonly narrationChars: number
  readonly hasAudio: boolean
  readonly inSequence: boolean
  readonly updatedAt: string
}

export type ApiTierLimits = {
  readonly maxRooms: number | null
  readonly maxItemsPerRoom: number | null
  readonly maxAdminUsers: number | null
}

export type ApiTenantOverview = {
  readonly museumId: string
  readonly museumName: string
  readonly stats: ApiMuseumStats
  readonly rooms: readonly ApiRoomReadiness[]
  readonly tier: ApiTier
  readonly subscriptionStatus: ApiSubscriptionStatus
  readonly limits: ApiTierLimits
}

export type ApiAdapterHealth = {
  readonly id: string
  readonly label: string
  readonly provider: string
  /** `fake` means an in-process stub answered, not a real vendor. */
  readonly mode: 'live' | 'fake' | 'unconfigured'
  readonly state: 'healthy' | 'degraded' | 'retrying' | 'breaker_open' | 'unknown'
  readonly consecutiveFailures: number
  readonly breakerOpenedAt: string | null
  readonly timeoutMs: number | null
  readonly note: string
}

export type ApiSystemHealth = {
  readonly status: 'ok' | 'degraded'
  readonly version: string
  readonly environment: string
  readonly dbLatencyMs: number
  readonly uptimeSeconds: number
  readonly adapters: readonly ApiAdapterHealth[]
  readonly checkedAt: string
}

export type HealthResponse = {
  readonly status?: string
  readonly dbLatencyMs?: number
  readonly version?: string
}

// -- Billing ---------------------------------------------------------------

export type ApiPlan = {
  readonly tier: ApiTier
  readonly displayName: string
  readonly description: string | null
  /** Fixed to two decimal places, as a string — never parse it into a float for display. */
  readonly amountEtb: string
  readonly currency: string
  readonly periodDays: number
  readonly limits: ApiTierLimits
}

export type ApiPayment = {
  readonly id: string
  readonly txRef: string
  readonly tier: ApiTier
  readonly amountEtb: string
  readonly status: 'PENDING' | 'PAID' | 'FAILED' | 'EXPIRED'
  readonly paidAt: string | null
  readonly chapaReference: string | null
  readonly createdAt: string
}

export type ApiBillingStatus = {
  readonly museumId: string
  readonly tier: ApiTier
  readonly subscriptionStatus: ApiSubscriptionStatus
  readonly subscriptionRenewsAt: string | null
  readonly daysUntilRenewal: number | null
  readonly limits: ApiTierLimits
  readonly usage: { readonly rooms: number; readonly adminUsers: number }
  readonly payments: readonly ApiPayment[]
  readonly nextCursor: string | null
}

export type ApiCheckout = {
  readonly txRef: string
  readonly checkoutUrl: string
  readonly tier: ApiTier
  readonly amountEtb: string
  readonly currency: string
  readonly expiresHint: string
}

export type ApiPaymentStatus = {
  readonly txRef: string
  readonly status: ApiPayment['status']
  readonly tier: ApiTier
  readonly amountEtb: string
  readonly paidAt: string | null
  readonly chapaReference: string | null
  readonly museumTier: ApiTier | null
  readonly subscriptionRenewsAt: string | null
}

export type SpendWindow = '7d' | '30d' | '90d'

export type ApiSpendRow = {
  readonly museumId: string
  readonly museumName: string
  readonly slug: string
  readonly cityCountry: string | null
  readonly status: ApiMuseumStatus
  readonly tier: ApiTier
  readonly subscriptionStatus: ApiSubscriptionStatus
  readonly paidAmountEtb: string
  readonly paymentCount: number
  readonly lastPaidAt: string | null
}

export type ApiSpend = {
  readonly window: SpendWindow
  readonly since: string
  readonly currency: string
  readonly totalEtb: string
  readonly rows: readonly ApiSpendRow[]
}

export type ManualTierRequest = {
  readonly museumId: string
  readonly tier: ApiTier
  readonly subscriptionStatus?: ApiSubscriptionStatus
  readonly subscriptionRenewsAt?: string
  /** At least 10 characters — it is the audit trail's explanation. */
  readonly reason: string
}

// -- Tickets ---------------------------------------------------------------

export type ValidateTicketRequest = {
  readonly museumId: string
  readonly ticketCode: string
}

export type ValidateTicketResponse = {
  readonly valid: boolean
  /** False means this museum has no gate configured, so `valid` is vacuously true. */
  readonly ticketRequired: boolean
}

// -- Shared ----------------------------------------------------------------

export type Paginated<T> = {
  readonly data: readonly T[]
  readonly nextCursor: string | null
}

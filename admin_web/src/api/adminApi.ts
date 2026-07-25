/**
 * Every admin API route, typed.
 *
 * One function per route, named for what it does rather than for its verb, so a
 * call site reads as intent. Nothing here holds state: the bearer token lives in
 * the client, and the caller owns loading and error handling.
 */

import { apiRequest } from './client.ts'
import type {
  ApiAdminUser,
  ApiAuditEntry,
  ApiBillingStatus,
  ApiCheckout,
  ApiItem,
  ApiMuseum,
  ApiMuseumWithStats,
  ApiPaymentStatus,
  ApiPlan,
  ApiRoom,
  ApiSpend,
  ApiSystemHealth,
  ApiTenantOverview,
  ApiTier,
  AuditLogFilters,
  CreateAdminRequest,
  CreateItemRequest,
  CreateMuseumRequest,
  CreateMuseumResponse,
  CreateRoomRequest,
  HealthResponse,
  LoginRequest,
  LoginResponse,
  ManualTierRequest,
  Paginated,
  SpendWindow,
  UpdateAdminRequest,
  UpdateItemRequest,
  UpdateMuseumRequest,
  UpdateRoomRequest,
  ValidateTicketRequest,
  ValidateTicketResponse,
} from './types.ts'

/**
 * Follows `nextCursor` until the server stops offering one.
 *
 * Every list route pages at 50 by default, and the console's screens are all
 * "show me everything in this museum" — so a room with 51 items used to lose
 * its tail silently. The cap is a guard against an unbounded loop, not a
 * product limit; hitting it means a screen needs real pagination rather than
 * a bigger number here.
 */
async function collectPages<T>(
  fetchPage: (cursor: string | undefined) => Promise<Paginated<T>>,
  maxPages = 40,
): Promise<T[]> {
  const all: T[] = []
  let cursor: string | undefined

  for (let page = 0; page < maxPages; page += 1) {
    const result = await fetchPage(cursor)
    all.push(...result.data)
    if (result.nextCursor === null || result.nextCursor === undefined) return all
    cursor = result.nextCursor
  }
  return all
}

/**
 * The API rejects an empty string where it expects a URL, which is what a
 * cleared text input produces. Null is how you say "no value" on the wire.
 */
export function urlOrNull(value: string | null | undefined): string | null {
  if (value === null || value === undefined) return null
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

/** Same idea for any nullable free-text column. */
export function textOrNull(value: string | null | undefined): string | null {
  if (value === null || value === undefined) return null
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

// -- Service ---------------------------------------------------------------

/** Unauthenticated. Also the cheapest way to wake a sleeping Render service. */
export function checkHealth(): Promise<HealthResponse> {
  return apiRequest<HealthResponse>('/health', { token: null })
}

/** Operator-only. Names the vendors and reports circuit-breaker state. */
export function getSystemHealth(): Promise<ApiSystemHealth> {
  return apiRequest<ApiSystemHealth>('/admin/system/health')
}

// -- Auth ------------------------------------------------------------------

/**
 * Rate limited to 10 attempts per IP per 15 minutes, so a 429 here is the
 * limiter working rather than a bug.
 */
export function signIn(credentials: LoginRequest): Promise<LoginResponse> {
  return apiRequest<LoginResponse>('/admin/login', {
    method: 'POST',
    body: credentials,
    token: null,
  })
}

// -- Museums ---------------------------------------------------------------

/** System admin only; a museum admin receives 403 FORBIDDEN. */
export function listMuseums(
  options: { limit?: number; cursor?: string; status?: string; search?: string } = {},
): Promise<Paginated<ApiMuseum>> {
  return apiRequest<Paginated<ApiMuseum>>('/admin/museums', {
    query: {
      limit: options.limit,
      cursor: options.cursor,
      status: options.status,
      search: options.search,
    },
  })
}

/** Every museum, following pagination. Includes per-museum counts for the fleet table. */
export function listAllMuseumsWithStats(
  options: { status?: string; search?: string } = {},
): Promise<ApiMuseumWithStats[]> {
  return collectPages<ApiMuseumWithStats>((cursor) =>
    apiRequest<Paginated<ApiMuseumWithStats>>('/admin/museums', {
      query: {
        withStats: 'true',
        limit: 100,
        cursor,
        status: options.status,
        search: options.search,
      },
    }),
  )
}

export function getMuseum(museumId: string): Promise<ApiMuseum> {
  return apiRequest<ApiMuseum>(`/admin/museums/${encodeURIComponent(museumId)}`)
}

export function getMuseumWithStats(museumId: string): Promise<ApiMuseumWithStats> {
  return apiRequest<ApiMuseumWithStats>(`/admin/museums/${encodeURIComponent(museumId)}`, {
    query: { withStats: 'true' },
  })
}

/** Creates the museum and its first administrator together. */
export function createMuseum(input: CreateMuseumRequest): Promise<CreateMuseumResponse> {
  return apiRequest<CreateMuseumResponse>('/admin/museums', { method: 'POST', body: input })
}

/** A museum admin may change its own settings, but `status` is operator-only. */
export function updateMuseum(museumId: string, input: UpdateMuseumRequest): Promise<ApiMuseum> {
  return apiRequest<ApiMuseum>(`/admin/museums/${encodeURIComponent(museumId)}`, {
    method: 'PATCH',
    body: input,
  })
}

/** System admin only. The new account starts INVITED until its first sign-in. */
export function addMuseumAdmin(
  museumId: string,
  input: { email: string; password: string; displayName?: string },
): Promise<{ id: string; email: string; role: string; museumId: string }> {
  return apiRequest(`/admin/museums/${encodeURIComponent(museumId)}/admins`, {
    method: 'POST',
    body: input,
  })
}

// -- Admin users -----------------------------------------------------------

/**
 * Scope comes from the token: a museum admin sees only its own museum's seats,
 * and never an operator account, whatever `museumId` says.
 */
export function listAdmins(
  options: {
    museumId?: string | null | undefined
    role?: string | undefined
    status?: string | undefined
    search?: string | undefined
    limit?: number | undefined
    cursor?: string | undefined
  } = {},
): Promise<Paginated<ApiAdminUser>> {
  return apiRequest<Paginated<ApiAdminUser>>('/admin/admins', {
    query: {
      museumId: options.museumId,
      role: options.role,
      status: options.status,
      search: options.search,
      limit: options.limit,
      cursor: options.cursor,
    },
  })
}

export function listAllAdmins(
  options: { museumId?: string | null; role?: string } = {},
): Promise<ApiAdminUser[]> {
  return collectPages<ApiAdminUser>((cursor) =>
    listAdmins({ ...options, limit: 100, cursor }),
  )
}

/** System admin only. Use `addMuseumAdmin` for a seat inside a known museum. */
export function createAdmin(input: CreateAdminRequest): Promise<ApiAdminUser> {
  return apiRequest<ApiAdminUser>('/admin/admins', { method: 'POST', body: input })
}

/** Role is not editable here; delete and re-create to move a seat. */
export function updateAdmin(adminId: string, input: UpdateAdminRequest): Promise<ApiAdminUser> {
  return apiRequest<ApiAdminUser>(`/admin/admins/${encodeURIComponent(adminId)}`, {
    method: 'PATCH',
    body: input,
  })
}

/** 409s on your own account, and on a museum's last active administrator. */
export function deleteAdmin(adminId: string): Promise<void> {
  return apiRequest<void>(`/admin/admins/${encodeURIComponent(adminId)}`, { method: 'DELETE' })
}

// -- Rooms -----------------------------------------------------------------

/**
 * `museumId` is required for a system admin, whose token names no tenant, and
 * ignored for a museum admin, whose token does. Pass the session's museumId and
 * it is correct either way.
 */
export function listRooms(
  options: {
    museumId?: string | null | undefined
    limit?: number | undefined
    cursor?: string | undefined
  } = {},
): Promise<Paginated<ApiRoom>> {
  return apiRequest<Paginated<ApiRoom>>('/admin/rooms', {
    query: { museumId: options.museumId, limit: options.limit, cursor: options.cursor },
  })
}

/** Every room in the museum, following pagination. */
export function listAllRooms(museumId: string | null): Promise<ApiRoom[]> {
  return collectPages<ApiRoom>((cursor) => listRooms({ museumId, limit: 100, cursor }))
}

/** Embeds the room's items, so listing them separately is unnecessary. */
export function getRoom(roomId: string): Promise<ApiRoom> {
  return apiRequest<ApiRoom>(`/admin/rooms/${encodeURIComponent(roomId)}`)
}

export function createRoom(input: CreateRoomRequest): Promise<ApiRoom> {
  return apiRequest<ApiRoom>('/admin/rooms', { method: 'POST', body: input })
}

export function updateRoom(roomId: string, input: UpdateRoomRequest): Promise<ApiRoom> {
  return apiRequest<ApiRoom>(`/admin/rooms/${encodeURIComponent(roomId)}`, {
    method: 'PATCH',
    body: input,
  })
}

/**
 * Deleting a room another room points at fails with 409 ROOM_REFERENCED unless
 * forced, which nulls the dangling pointer.
 *
 * `force` must be the literal string 'true' or 'false'. It was once parsed with
 * `z.coerce.boolean()`, where `Boolean('false')` is `true`, so a UI sending a
 * checkbox state silently destroyed sequence links. Sending a real boolean or a
 * `0` is now a 400, and this signature is what keeps that from coming back.
 */
export function deleteRoom(roomId: string, options: { force?: boolean } = {}): Promise<void> {
  return apiRequest<void>(`/admin/rooms/${encodeURIComponent(roomId)}`, {
    method: 'DELETE',
    query: { force: options.force === true ? 'true' : 'false' },
  })
}

// -- Items -----------------------------------------------------------------

export function listItems(
  roomId: string,
  options: { limit?: number | undefined; cursor?: string | undefined } = {},
): Promise<Paginated<ApiItem>> {
  return apiRequest<Paginated<ApiItem>>('/admin/items', {
    query: { roomId, limit: options.limit, cursor: options.cursor },
  })
}

/** Every item in the room, following pagination. */
export function listAllItems(roomId: string): Promise<ApiItem[]> {
  return collectPages<ApiItem>((cursor) => listItems(roomId, { limit: 100, cursor }))
}

export function createItem(input: CreateItemRequest): Promise<ApiItem> {
  return apiRequest<ApiItem>('/admin/items', { method: 'POST', body: input })
}

export function updateItem(itemId: string, input: UpdateItemRequest): Promise<ApiItem> {
  return apiRequest<ApiItem>(`/admin/items/${encodeURIComponent(itemId)}`, {
    method: 'PATCH',
    body: input,
  })
}

export function deleteItem(itemId: string): Promise<void> {
  return apiRequest<void>(`/admin/items/${encodeURIComponent(itemId)}`, { method: 'DELETE' })
}

/**
 * Rewrites displayOrder to a dense 0,1,2… in the order given. The list must be
 * complete: a partial set is rejected outright rather than partially applied.
 */
export function reorderRoomItems(roomId: string, itemIds: readonly string[]): Promise<void> {
  return apiRequest<void>(`/admin/rooms/${encodeURIComponent(roomId)}/items/order`, {
    method: 'PATCH',
    body: { itemIds },
  })
}

// -- Overview --------------------------------------------------------------

/** `museumId` is required for a system admin and ignored for a museum admin. */
export function getOverview(museumId: string | null): Promise<ApiTenantOverview> {
  return apiRequest<ApiTenantOverview>('/admin/overview', { query: { museumId } })
}

// -- Audit -----------------------------------------------------------------

/** Newest first. A museum admin only ever sees its own museum's rows. */
export function listAuditLogs(
  filters: AuditLogFilters & { cursor?: string } = {},
): Promise<Paginated<ApiAuditEntry>> {
  return apiRequest<Paginated<ApiAuditEntry>>('/admin/audit-logs', {
    query: {
      museumId: filters.museumId,
      entityType: filters.entityType,
      action: filters.action,
      actorId: filters.actorId,
      since: filters.since,
      until: filters.until,
      limit: filters.limit,
      cursor: filters.cursor,
    },
  })
}

// -- Billing ---------------------------------------------------------------

export function listPlans(): Promise<{ plans: readonly ApiPlan[] }> {
  return apiRequest<{ plans: readonly ApiPlan[] }>('/admin/billing/plans')
}

export function getBillingStatus(
  options: { museumId?: string | null; limit?: number; cursor?: string } = {},
): Promise<ApiBillingStatus> {
  return apiRequest<ApiBillingStatus>('/admin/billing/status', {
    query: { museumId: options.museumId, limit: options.limit, cursor: options.cursor },
  })
}

/** Returns a provider URL the caller must redirect to. Nothing is paid until they do. */
export function startCheckout(input: {
  tier: ApiTier
  museumId?: string | null
}): Promise<ApiCheckout> {
  return apiRequest<ApiCheckout>('/admin/billing/checkout', {
    method: 'POST',
    body: { tier: input.tier, ...(input.museumId ? { museumId: input.museumId } : {}) },
  })
}

/**
 * Polled by the return page. The server re-verifies with the provider on any
 * non-PAID status older than a few seconds, so this is what actually settles a
 * payment rather than waiting for the reconciler.
 */
export function getPaymentStatus(txRef: string): Promise<ApiPaymentStatus> {
  return apiRequest<ApiPaymentStatus>(`/admin/billing/payments/${encodeURIComponent(txRef)}`)
}

/** Operator-only: collected revenue per museum over a rolling window. */
export function getSpend(
  options: { window?: SpendWindow; status?: string } = {},
): Promise<ApiSpend> {
  return apiRequest<ApiSpend>('/admin/billing/spend', {
    query: { window: options.window, status: options.status },
  })
}

/** Operator-only escape hatch. `reason` must be at least 10 characters. */
export function setTierManually(input: ManualTierRequest): Promise<{ success: true }> {
  return apiRequest<{ success: true }>('/admin/billing/tier', { method: 'POST', body: input })
}

// -- Tickets ---------------------------------------------------------------

/**
 * Visitor-facing and unauthenticated, so it is mounted at the root rather than
 * under /admin. The console calls it to let an operator test a museum's gate
 * configuration without a real visitor.
 */
export function validateTicket(input: ValidateTicketRequest): Promise<ValidateTicketResponse> {
  return apiRequest<ValidateTicketResponse>('/tickets/validate', {
    method: 'POST',
    body: input,
    token: null,
  })
}

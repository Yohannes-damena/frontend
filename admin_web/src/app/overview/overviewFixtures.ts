import type { StatusMarker, StatusTone } from '../../kit/types.ts'
import type { ApiAuditEntry, ApiRoomReadiness, ApiTenantOverview } from '../../api/types.ts'

/**
 * Demo data for the tenant overview, in exactly the shapes the API returns, so
 * the page has one rendering path rather than two.
 *
 * The readiness vocabulary is the server's: a room is `ready` when it is
 * narrated and has at least one item, `incomplete` when it is narrated but
 * empty, and `empty` when there is no narration worth reading yet.
 */

/**
 * Reachability outranks authoring state. A polished room the visitor route
 * never reaches is worse than an unfinished one that is wired in, and it is
 * invisible from the rooms list alone.
 */
export function roomMarker(room: ApiRoomReadiness): StatusMarker {
  if (!room.inSequence) return 'cross'
  if (room.readiness === 'ready') return 'dot'
  if (room.readiness === 'incomplete') return 'ring'
  return 'dash'
}

export function roomTone(room: ApiRoomReadiness): StatusTone {
  if (!room.inSequence) return 'danger'
  if (room.readiness === 'ready') return 'success'
  if (room.readiness === 'incomplete') return 'warning'
  return 'neutral'
}

export function roomStateLabel(room: ApiRoomReadiness): string {
  if (!room.inSequence) return 'Unreachable'
  if (room.readiness === 'ready') return 'Ready'
  if (room.readiness === 'incomplete') return 'No items'
  return 'No narration'
}

/** Why the room is not ready, in the order an author would fix it. */
export function roomBlockerText(room: ApiRoomReadiness): string {
  const blockers: string[] = []
  if (!room.inSequence) blockers.push('not reachable from the visitor route')
  if (room.readiness === 'empty') blockers.push('narration is empty')
  if (room.itemCount === 0) blockers.push('no items')
  if (!room.hasAudio) blockers.push('no synthesised audio')
  if (blockers.length === 0) return `${room.narrationChars} characters of narration, audio ready`
  return `Needs: ${blockers.join(', ')}.`
}

const DEMO_ROOMS: readonly ApiRoomReadiness[] = [
  ['Road to Adwa', 'ready', 6, 1840, true, true],
  ['Voices of Command', 'ready', 4, 1520, true, true],
  ['March and Supply', 'incomplete', 0, 980, false, true],
  ['Battlefront', 'ready', 8, 2210, true, true],
  ['Regimental Histories', 'empty', 0, 0, false, true],
  ['Foreign Correspondence', 'ready', 5, 1610, true, true],
  ['Aftermath and Legacy', 'ready', 3, 1120, false, false],
  ['Reflection Hall', 'ready', 2, 940, true, true],
].map(([title, readiness, itemCount, narrationChars, hasAudio, inSequence], index) => ({
  id: `demo-room-${index + 1}`,
  storyOrder: index + 1,
  title: title as string,
  readiness: readiness as ApiRoomReadiness['readiness'],
  itemCount: itemCount as number,
  narrationChars: narrationChars as number,
  hasAudio: hasAudio as boolean,
  inSequence: inSequence as boolean,
  updatedAt: new Date(Date.now() - (index + 1) * 7 * 60 * 60 * 1000).toISOString(),
}))

export const DEMO_OVERVIEW: ApiTenantOverview = {
  museumId: 'demo-museum',
  museumName: 'Adwa Victory Memorial',
  stats: {
    roomCount: DEMO_ROOMS.length,
    itemCount: DEMO_ROOMS.reduce((sum, room) => sum + room.itemCount, 0),
    adminCount: 3,
    roomsMissingNarration: DEMO_ROOMS.filter((room) => room.readiness === 'empty').length,
    roomsWithoutItems: DEMO_ROOMS.filter((room) => room.itemCount === 0).length,
    roomsReady: DEMO_ROOMS.filter((room) => room.readiness === 'ready').length,
    roomsInSequence: DEMO_ROOMS.filter((room) => room.inSequence).length,
    lastEditedAt: DEMO_ROOMS[0]?.updatedAt ?? null,
  },
  rooms: DEMO_ROOMS,
  tier: 'PRO',
  subscriptionStatus: 'ACTIVE',
  limits: { maxRooms: 10, maxItemsPerRoom: 25, maxAdminUsers: 5 },
}

export const DEMO_RECENT_CHANGES: readonly ApiAuditEntry[] = [
  ['UPDATE', 'Room', 'Battlefront', 'aster@adwa.local', 'Aster Melesse', 'MUSEUM_ADMIN', 2],
  ['UPDATE', 'Room', 'March and Supply', 'operator@adwa.local', null, 'SYSTEM_ADMIN', 5],
  ['CREATE', 'Item', 'Formation Sketch', 'aster@adwa.local', 'Aster Melesse', 'MUSEUM_ADMIN', 27],
  ['UPDATE', 'Museum', 'Adwa Victory Memorial', 'aster@adwa.local', 'Aster Melesse', 'MUSEUM_ADMIN', 30],
].map(([action, entityType, label, email, displayName, role, hoursAgo], index) => ({
  id: `demo-audit-${index + 1}`,
  action: action as ApiAuditEntry['action'],
  entityType: entityType as string,
  entityId: `demo-entity-${index + 1}`,
  entityLabel: label as string,
  museumId: 'demo-museum',
  museumName: 'Adwa Victory Memorial',
  actorId: `demo-actor-${index + 1}`,
  actorEmail: email as string,
  actorDisplayName: displayName as string | null,
  actorRole: role as ApiAuditEntry['actorRole'],
  before: null,
  after: { title: label },
  createdAt: new Date(Date.now() - (hoursAgo as number) * 60 * 60 * 1000).toISOString(),
}))

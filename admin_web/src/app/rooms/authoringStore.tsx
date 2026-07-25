import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactElement,
  type ReactNode,
} from 'react'

import {
  createItem as apiCreateItem,
  createRoom as apiCreateRoom,
  deleteItem as apiDeleteItem,
  deleteRoom as apiDeleteRoom,
  listAllItems,
  listAllRooms,
  updateItem as apiUpdateItem,
  updateRoom as apiUpdateRoom,
  urlOrNull,
} from '../../api/adminApi.ts'
import { isLiveApi } from '../../api/config.ts'
import { isApiError, messageForCode, type ApiError } from '../../api/errors.ts'
import type { ApiItem, ApiRoom } from '../../api/types.ts'
import type { StatusTone } from '../../kit/index.ts'

/**
 * Rooms and items, backed by the admin API.
 *
 * Two things are worth knowing before changing anything here.
 *
 * First, display order is 1-based in this store and 0-based on the wire. A
 * curator numbers exhibits from one, and the API stores a dense 0,1,2… that its
 * bulk-reorder route also produces. Converting in one place is less surprising
 * than either side bending: `fromApiItem` adds one, `toApiDisplayOrder` takes it
 * away, and nothing else in the app should touch the raw value.
 *
 * Second, when no API base URL is configured the whole store falls back to the
 * seeded fixtures below and never makes a request. That is the demo mode the
 * landing page advertises, not a stub left behind — `isLiveApi` is the switch.
 */

/**
 * Derived from the room's own columns rather than stored: there is no narration
 * status in the data model. `revision` is therefore unreachable against a real
 * API and only ever appears in demo mode.
 */
export type NarrationStatus = 'ready' | 'generating' | 'revision' | 'not_started'

export type RoomRecord = {
  readonly id: string
  readonly museumId: string
  readonly title: string
  readonly storyOrder: number
  readonly roomOverviewText: string
  readonly narrationScript: string
  readonly nextRoomId: string | null
  readonly narrationStatus: NarrationStatus
  readonly lastEditedAt: string
}

export type ItemRecord = {
  readonly id: string
  readonly museumId: string
  readonly roomId: string
  readonly name: string
  readonly shortDescription: string
  readonly detailText: string
  readonly imageUrl: string
  /** 1-based for display. The API stores this 0-based; see the file comment. */
  readonly displayOrder: number
  readonly lastEditedAt: string
}

export type RoomDraft = {
  readonly title: string
  readonly storyOrder: string
  readonly roomOverviewText: string
  readonly narrationScript: string
  readonly nextRoomId: string
}

export type ItemDraft = {
  readonly name: string
  readonly shortDescription: string
  readonly detailText: string
  readonly imageUrl: string
  readonly displayOrder: string
}

export type RoomDraftErrors = {
  readonly title?: string
  readonly storyOrder?: string
  readonly roomOverviewText?: string
  readonly narrationScript?: string
  readonly nextRoomId?: string
}

export type ItemDraftErrors = {
  readonly name?: string
  readonly shortDescription?: string
  readonly detailText?: string
  readonly imageUrl?: string
  readonly displayOrder?: string
}

/** `message` carries anything the server said that no single field owns. */
export type RoomMutation =
  | { readonly ok: true; readonly roomId: string }
  | { readonly ok: false; readonly errors: RoomDraftErrors; readonly message?: string }

export type ItemMutation =
  | { readonly ok: true; readonly itemId: string }
  | { readonly ok: false; readonly errors: ItemDraftErrors; readonly message?: string }

export type DeleteOutcome =
  | { readonly ok: true }
  | { readonly ok: false; readonly message: string; readonly code?: string }

type AuthoringState = {
  readonly rooms: readonly RoomRecord[]
  readonly items: readonly ItemRecord[]
}

export type AuthoringStore = {
  readonly rooms: readonly RoomRecord[]
  readonly items: readonly ItemRecord[]
  /** 'demo' means no API is configured and these are fixtures. */
  readonly status: 'loading' | 'ready' | 'error' | 'demo'
  readonly loadError: string | null
  readonly reload: () => void
  readonly findRoom: (roomId: string) => RoomRecord | undefined
  readonly findItem: (itemId: string) => ItemRecord | undefined
  readonly listRoomItems: (roomId: string) => readonly ItemRecord[]
  readonly validateRoom: (draft: RoomDraft, editingRoomId: string | null) => RoomDraftErrors
  readonly validateItem: (
    draft: ItemDraft,
    editingItemId: string | null,
    roomId: string,
  ) => ItemDraftErrors
  readonly createRoom: (draft: RoomDraft) => Promise<RoomMutation>
  readonly updateRoom: (roomId: string, draft: RoomDraft) => Promise<RoomMutation>
  /** Pass `force` to null out other rooms' links instead of failing with ROOM_REFERENCED. */
  readonly deleteRoom: (roomId: string, options?: { force?: boolean }) => Promise<DeleteOutcome>
  readonly createItem: (roomId: string, draft: ItemDraft) => Promise<ItemMutation>
  readonly updateItem: (itemId: string, roomId: string, draft: ItemDraft) => Promise<ItemMutation>
  readonly deleteItem: (itemId: string) => Promise<DeleteOutcome>
}

const DEFAULT_MUSEUM_ID = 'museum-adwa'

const BASE_ROOMS: readonly Omit<RoomRecord, 'museumId'>[] = [
  {
    id: 'r-beginning',
    title: 'Origins of Adwa',
    storyOrder: 1,
    roomOverviewText:
      'Introduces the historic context before the campaign and sets grounding context for AI guide prompts.',
    narrationScript:
      'Welcome to the opening room. We begin by tracing the political and social conditions that shaped Adwa.',
    nextRoomId: 'r-mobilization',
    narrationStatus: 'ready',
    lastEditedAt: '2026-07-24T14:23:00.000Z',
  },
  {
    id: 'r-mobilization',
    title: 'Mobilization and Strategy',
    storyOrder: 2,
    roomOverviewText:
      'Covers force assembly, supply corridors, and the strategic decisions that positioned the Ethiopian coalition.',
    narrationScript:
      'In this room, visitors encounter the planning phase: logistics, alliances, and strategic geography.',
    nextRoomId: 'r-battlefield',
    narrationStatus: 'generating',
    lastEditedAt: '2026-07-24T16:08:00.000Z',
  },
  {
    id: 'r-battlefield',
    title: 'Battlefield at Adwa',
    storyOrder: 3,
    roomOverviewText:
      'Primary encounter room. Grounding notes include timeline anchors and unit movement context.',
    narrationScript: 'Pending script refinement for voice cadence and historical cross-check.',
    nextRoomId: 'r-legacy',
    narrationStatus: 'revision',
    lastEditedAt: '2026-07-25T09:42:00.000Z',
  },
  {
    id: 'r-legacy',
    title: 'Legacy and Memory',
    storyOrder: 4,
    roomOverviewText:
      'Explains long-tail effects of Adwa in regional politics and collective memory narratives.',
    narrationScript: '',
    nextRoomId: null,
    narrationStatus: 'not_started',
    lastEditedAt: '2026-07-25T10:19:00.000Z',
  },
]

const BASE_ITEMS: readonly Omit<ItemRecord, 'museumId'>[] = [
  {
    id: 'i-map-1896',
    roomId: 'r-beginning',
    name: 'Horn of Africa Map, 1896',
    shortDescription: 'Annotated map showing political boundaries before the campaign.',
    detailText: 'Used by guide model for place-name disambiguation and pre-war geography context.',
    imageUrl: 'https://images.unsplash.com/photo-1461360370896-922624d12aa1?auto=format&w=1200',
    displayOrder: 1,
    lastEditedAt: '2026-07-24T14:36:00.000Z',
  },
  {
    id: 'i-royal-letter',
    roomId: 'r-beginning',
    name: 'Royal Correspondence Excerpt',
    shortDescription: 'Diplomatic letter excerpt highlighting shifting alliances.',
    detailText: 'Used as citation source for pre-battle diplomatic narrative.',
    imageUrl: 'https://images.unsplash.com/photo-1455390582262-044cdead277a?auto=format&w=1200',
    displayOrder: 2,
    lastEditedAt: '2026-07-24T14:39:00.000Z',
  },
  {
    id: 'i-supply-ledger',
    roomId: 'r-mobilization',
    name: 'Supply Ledger',
    shortDescription: 'Ledger tracing grain and ammunition movement across routes.',
    detailText: 'Supports timeline sections about logistics and constraints.',
    imageUrl: 'https://images.unsplash.com/photo-1450101499163-c8848c66ca85?auto=format&w=1200',
    displayOrder: 1,
    lastEditedAt: '2026-07-24T16:22:00.000Z',
  },
  {
    id: 'i-formation-sketch',
    roomId: 'r-battlefield',
    name: 'Formation Sketch',
    shortDescription: 'Field sketch of troop positions at first engagement.',
    detailText: 'Grounding for sequence of tactical descriptions in narration.',
    imageUrl: 'https://images.unsplash.com/photo-1469474968028-56623f02e42e?auto=format&w=1200',
    displayOrder: 1,
    lastEditedAt: '2026-07-25T09:58:00.000Z',
  },
  {
    id: 'i-commemorative-plaque',
    roomId: 'r-legacy',
    name: 'Commemorative Plaque',
    shortDescription: 'Modern plaque commemorating the battle and its symbolism.',
    detailText: 'Used for interpretation layer around memory and public history.',
    imageUrl: 'https://images.unsplash.com/photo-1473186578172-c141e6798cf4?auto=format&w=1200',
    displayOrder: 1,
    lastEditedAt: '2026-07-25T10:21:00.000Z',
  },
]

const storeContext = createContext<AuthoringStore | null>(null)

function museumStateFromSeed(museumId: string): AuthoringState {
  return {
    rooms: BASE_ROOMS.map((room) => ({ ...room, museumId })),
    items: BASE_ITEMS.map((item) => ({ ...item, museumId })),
  }
}

function nowIso(): string {
  return new Date().toISOString()
}

function createRoomId(title: string): string {
  const slug = title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
  return `r-${slug || 'room'}-${Date.now().toString(36)}`
}

function createItemId(name: string): string {
  const slug = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
  return `i-${slug || 'item'}-${Date.now().toString(36)}`
}

// -- API translation -------------------------------------------------------

/**
 * A script with no audio behind it is genuinely mid-pipeline, so `generating`
 * is the accurate word for it rather than a placeholder.
 */
function narrationStatusFor(room: ApiRoom): NarrationStatus {
  if (room.narrationScript.trim().length === 0) return 'not_started'
  return room.roomAudioUrl === null ? 'generating' : 'ready'
}

function fromApiRoom(room: ApiRoom): RoomRecord {
  return {
    id: room.id,
    museumId: room.museumId,
    title: room.title,
    storyOrder: room.storyOrder,
    roomOverviewText: room.roomOverviewText,
    narrationScript: room.narrationScript,
    nextRoomId: room.nextRoomId,
    narrationStatus: narrationStatusFor(room),
    lastEditedAt: room.updatedAt,
  }
}

function fromApiItem(item: ApiItem, museumId: string): ItemRecord {
  return {
    id: item.id,
    museumId,
    roomId: item.roomId,
    name: item.name,
    shortDescription: item.shortDescription,
    detailText: item.detailText,
    imageUrl: item.imageUrl ?? '',
    displayOrder: item.displayOrder + 1,
    lastEditedAt: item.updatedAt,
  }
}

function toApiDisplayOrder(oneBased: number): number {
  return Math.max(0, oneBased - 1)
}

/**
 * Turns a server rejection back into per-field messages so it lands under the
 * input that caused it. Anything the server did not attribute to a field comes
 * back as `message` for the form-level banner.
 */
function mapServerErrors<K extends string>(
  error: ApiError,
  fields: readonly K[],
): { errors: Partial<Record<K, string>>; message: string } {
  const errors: Partial<Record<K, string>> = {}
  for (const field of fields) {
    const fieldMessage = error.fieldError(field)
    if (fieldMessage !== undefined) errors[field] = fieldMessage
  }
  return { errors, message: messageForCode(error) }
}

const ROOM_FIELDS = [
  'title',
  'storyOrder',
  'roomOverviewText',
  'narrationScript',
  'nextRoomId',
] as const

const ITEM_FIELDS = [
  'name',
  'shortDescription',
  'detailText',
  'imageUrl',
  'displayOrder',
] as const

function failedRoom(error: unknown): RoomMutation {
  if (isApiError(error)) {
    const mapped = mapServerErrors(error, ROOM_FIELDS)
    return { ok: false, errors: mapped.errors, message: mapped.message }
  }
  throw error
}

function failedItem(error: unknown): ItemMutation {
  if (isApiError(error)) {
    const mapped = mapServerErrors(error, ITEM_FIELDS)
    return { ok: false, errors: mapped.errors, message: mapped.message }
  }
  throw error
}

function failedDelete(error: unknown): DeleteOutcome {
  if (isApiError(error)) {
    return { ok: false, message: messageForCode(error), code: error.code }
  }
  throw error
}

// -- Sorting and validation ------------------------------------------------

function sortRooms(rooms: readonly RoomRecord[]): readonly RoomRecord[] {
  return [...rooms].sort((left, right) => {
    if (left.storyOrder !== right.storyOrder) return left.storyOrder - right.storyOrder
    return left.title.localeCompare(right.title, undefined, { sensitivity: 'base' })
  })
}

function sortItems(items: readonly ItemRecord[]): readonly ItemRecord[] {
  return [...items].sort((left, right) => {
    if (left.displayOrder !== right.displayOrder) return left.displayOrder - right.displayOrder
    return left.name.localeCompare(right.name, undefined, { sensitivity: 'base' })
  })
}

function parsePositiveInteger(input: string): number | null {
  const value = Number.parseInt(input.trim(), 10)
  if (!Number.isFinite(value) || value < 1) return null
  return value
}

function detectRoomCycle(rooms: readonly RoomRecord[]): boolean {
  const byId = new Map<string, RoomRecord>(rooms.map((room) => [room.id, room]))
  const active = new Set<string>()
  const done = new Set<string>()

  function walk(roomId: string): boolean {
    if (active.has(roomId)) return true
    if (done.has(roomId)) return false
    const room = byId.get(roomId)
    if (room === undefined) return false
    active.add(roomId)
    const nextId = room.nextRoomId
    if (nextId !== null && byId.has(nextId) && walk(nextId)) return true
    active.delete(roomId)
    done.add(roomId)
    return false
  }

  for (const room of rooms) {
    if (walk(room.id)) return true
  }
  return false
}

function validateRoomDraftAgainst(
  state: AuthoringState,
  museumId: string,
  draft: RoomDraft,
  editingRoomId: string | null,
): RoomDraftErrors {
  const errors: {
    title?: string
    storyOrder?: string
    roomOverviewText?: string
    narrationScript?: string
    nextRoomId?: string
  } = {}
  const title = draft.title.trim()
  const storyOrder = parsePositiveInteger(draft.storyOrder)
  const nextRoomId = draft.nextRoomId.length > 0 ? draft.nextRoomId : null
  const museumRooms = state.rooms.filter((room) => room.museumId === museumId)

  if (title.length === 0) {
    errors.title = 'Enter a room title.'
  }

  // Both are required by the API, and both are load-bearing for the visitor
  // experience: the overview grounds chat, the script is what gets spoken.
  // Catching them here turns a 400 into an inline message.
  if (draft.roomOverviewText.trim().length === 0) {
    errors.roomOverviewText = 'Enter grounding context for this room.'
  }
  if (draft.narrationScript.trim().length === 0) {
    errors.narrationScript = 'Enter a narration script.'
  }

  if (storyOrder === null) {
    errors.storyOrder = 'Story order must be a positive number.'
  } else {
    const duplicate = museumRooms.find(
      (room) => room.storyOrder === storyOrder && room.id !== editingRoomId,
    )
    if (duplicate !== undefined) {
      errors.storyOrder = `Story order ${storyOrder} is already used by "${duplicate.title}".`
    }
  }

  if (nextRoomId !== null) {
    if (editingRoomId !== null && nextRoomId === editingRoomId) {
      errors.nextRoomId = 'A room cannot point to itself as next room.'
    } else {
      const exists = museumRooms.some((room) => room.id === nextRoomId)
      if (!exists) errors.nextRoomId = 'Next room must be another room in this museum.'
    }
  }

  if (storyOrder !== null) {
    const editedRoomId = editingRoomId ?? 'new-room-candidate'
    const candidate: RoomRecord = {
      id: editedRoomId,
      museumId,
      title,
      storyOrder,
      roomOverviewText: draft.roomOverviewText,
      narrationScript: draft.narrationScript,
      nextRoomId,
      narrationStatus:
        editingRoomId === null ? 'not_started' : (museumRooms[0]?.narrationStatus ?? 'not_started'),
      lastEditedAt: nowIso(),
    }

    const mergedRooms =
      editingRoomId === null
        ? [...museumRooms, candidate]
        : museumRooms.map((room) => (room.id === editingRoomId ? candidate : room))

    if (detectRoomCycle(mergedRooms)) {
      errors.nextRoomId =
        'Next-room links create a cycle. Update selections so the room sequence ends naturally.'
    }
  }

  return errors
}

function validateItemDraftAgainst(
  state: AuthoringState,
  museumId: string,
  roomId: string,
  draft: ItemDraft,
  editingItemId: string | null,
): ItemDraftErrors {
  const errors: {
    name?: string
    shortDescription?: string
    detailText?: string
    imageUrl?: string
    displayOrder?: string
  } = {}

  if (draft.name.trim().length === 0) errors.name = 'Enter an item name.'
  if (draft.shortDescription.trim().length === 0) {
    errors.shortDescription = 'Enter a short description.'
  }
  if (draft.detailText.trim().length === 0) {
    errors.detailText = 'Enter the grounding detail for this item.'
  }

  // An empty field means "no image" and is sent as null. Anything else has to
  // be a real absolute URL, because that is what the API stores.
  const imageUrl = draft.imageUrl.trim()
  if (imageUrl.length > 0 && !isAbsoluteUrl(imageUrl)) {
    errors.imageUrl = 'Enter a full image URL, including https://, or leave it empty.'
  }

  const displayOrder = parsePositiveInteger(draft.displayOrder)
  if (displayOrder === null) {
    errors.displayOrder = 'Display order must be a positive number.'
  } else {
    const duplicate = state.items.find(
      (item) =>
        item.museumId === museumId &&
        item.roomId === roomId &&
        item.displayOrder === displayOrder &&
        item.id !== editingItemId,
    )
    if (duplicate !== undefined) {
      errors.displayOrder = `Display order ${displayOrder} is already used by "${duplicate.name}".`
    }
  }
  return errors
}

function isAbsoluteUrl(value: string): boolean {
  try {
    const parsed = new URL(value)
    return parsed.protocol === 'http:' || parsed.protocol === 'https:'
  } catch {
    return false
  }
}

// -- Display helpers -------------------------------------------------------

export function narrationTone(status: NarrationStatus): StatusTone {
  if (status === 'ready') return 'success'
  if (status === 'generating') return 'warning'
  if (status === 'revision') return 'danger'
  return 'neutral'
}

export function narrationLabel(status: NarrationStatus): string {
  if (status === 'ready') return 'Ready'
  if (status === 'generating') return 'Generating'
  if (status === 'revision') return 'Needs revision'
  return 'Not started'
}

export function formatRelativeTime(iso: string): string {
  const deltaMs = Date.now() - new Date(iso).getTime()
  const deltaMinutes = Math.round(deltaMs / 60000)
  if (deltaMinutes < 1) return 'Edited just now'
  if (deltaMinutes < 60) return `Edited ${deltaMinutes}m ago`
  const deltaHours = Math.round(deltaMinutes / 60)
  if (deltaHours < 24) return `Edited ${deltaHours}h ago`
  const deltaDays = Math.round(deltaHours / 24)
  return `Edited ${deltaDays}d ago`
}

export function toRoomDraft(room: RoomRecord): RoomDraft {
  return {
    title: room.title,
    storyOrder: String(room.storyOrder),
    roomOverviewText: room.roomOverviewText,
    narrationScript: room.narrationScript,
    nextRoomId: room.nextRoomId ?? '',
  }
}

export function toItemDraft(item: ItemRecord): ItemDraft {
  return {
    name: item.name,
    shortDescription: item.shortDescription,
    detailText: item.detailText,
    imageUrl: item.imageUrl,
    displayOrder: String(item.displayOrder),
  }
}

const EMPTY_ROOM_DRAFT: RoomDraft = {
  title: '',
  storyOrder: '',
  roomOverviewText: '',
  narrationScript: '',
  nextRoomId: '',
}

const EMPTY_ITEM_DRAFT: ItemDraft = {
  name: '',
  shortDescription: '',
  detailText: '',
  imageUrl: '',
  displayOrder: '',
}

export function createEmptyRoomDraft(): RoomDraft {
  return { ...EMPTY_ROOM_DRAFT }
}

export function createEmptyItemDraft(): ItemDraft {
  return { ...EMPTY_ITEM_DRAFT }
}

// -- Provider --------------------------------------------------------------

export function AuthoringStoreProvider({
  children,
  museumId,
}: {
  readonly children: ReactNode
  readonly museumId: string | null
}): ReactElement {
  const resolvedMuseumId = museumId ?? DEFAULT_MUSEUM_ID

  const [state, setState] = useState<AuthoringState>(() =>
    isLiveApi ? { rooms: [], items: [] } : museumStateFromSeed(resolvedMuseumId),
  )
  const [status, setStatus] = useState<AuthoringStore['status']>(isLiveApi ? 'loading' : 'demo')
  const [loadError, setLoadError] = useState<string | null>(null)
  const [reloadToken, setReloadToken] = useState(0)

  // Guards against a slower response for a museum the operator has already
  // navigated away from overwriting the one now on screen.
  const requestSeq = useRef(0)

  const reload = useCallback(() => {
    setReloadToken((token) => token + 1)
  }, [])

  useEffect(() => {
    if (!isLiveApi) {
      setState(museumStateFromSeed(resolvedMuseumId))
      setStatus('demo')
      return
    }

    const seq = requestSeq.current + 1
    requestSeq.current = seq
    let cancelled = false

    setStatus('loading')
    setLoadError(null)

    async function load(): Promise<void> {
      try {
        // A system admin browsing a tenant passes the museum id explicitly; a
        // museum admin's token already names it, and the server ignores what
        // is sent. Passing it is correct in both cases.
        const rooms = await listAllRooms(museumId)
        // Items are per-room, so this is one request per room. Rooms are a
        // handful per museum by design, and doing it up front keeps every
        // authoring screen working off one consistent snapshot.
        const itemLists = await Promise.all(rooms.map((room) => listAllItems(room.id)))

        if (cancelled || requestSeq.current !== seq) return

        setState({
          rooms: rooms.map(fromApiRoom),
          items: itemLists
            .flat()
            .map((item) => fromApiItem(item, rooms[0]?.museumId ?? resolvedMuseumId)),
        })
        setStatus('ready')
      } catch (error) {
        if (cancelled || requestSeq.current !== seq) return
        setLoadError(
          isApiError(error) ? messageForCode(error) : 'Could not load rooms for this museum.',
        )
        setStatus('error')
      }
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [museumId, resolvedMuseumId, reloadToken])

  const value = useMemo<AuthoringStore>(() => {
    const rooms = sortRooms(state.rooms)
    const items = sortItems(state.items)

    /** Demo mode keeps the old in-memory behaviour so the app is usable offline. */
    function mutateLocal(update: (current: AuthoringState) => AuthoringState): void {
      setState(update)
    }

    return {
      rooms,
      items,
      status,
      loadError,
      reload,
      findRoom: (roomId) => rooms.find((room) => room.id === roomId),
      findItem: (itemId) => items.find((item) => item.id === itemId),
      listRoomItems: (roomId) => items.filter((item) => item.roomId === roomId),
      validateRoom: (draft, editingRoomId) =>
        validateRoomDraftAgainst(state, resolvedMuseumId, draft, editingRoomId),
      validateItem: (draft, editingItemId, roomId) =>
        validateItemDraftAgainst(state, resolvedMuseumId, roomId, draft, editingItemId),

      async createRoom(draft) {
        const errors = validateRoomDraftAgainst(state, resolvedMuseumId, draft, null)
        if (Object.keys(errors).length > 0) return { ok: false, errors }
        const storyOrder = parsePositiveInteger(draft.storyOrder)
        if (storyOrder === null) {
          return { ok: false, errors: { storyOrder: 'Story order must be a positive number.' } }
        }
        const nextRoomId = draft.nextRoomId.trim().length > 0 ? draft.nextRoomId.trim() : null

        if (!isLiveApi) {
          const roomId = createRoomId(draft.title)
          mutateLocal((current) => ({
            ...current,
            rooms: [
              ...current.rooms,
              {
                id: roomId,
                museumId: resolvedMuseumId,
                title: draft.title.trim(),
                storyOrder,
                roomOverviewText: draft.roomOverviewText.trim(),
                narrationScript: draft.narrationScript.trim(),
                nextRoomId,
                narrationStatus: 'not_started',
                lastEditedAt: nowIso(),
              },
            ],
          }))
          return { ok: true, roomId }
        }

        try {
          const created = await apiCreateRoom({
            ...(museumId !== null ? { museumId } : {}),
            title: draft.title.trim(),
            storyOrder,
            roomOverviewText: draft.roomOverviewText.trim(),
            narrationScript: draft.narrationScript.trim(),
            nextRoomId,
          })
          const record = fromApiRoom(created)
          mutateLocal((current) => ({ ...current, rooms: [...current.rooms, record] }))
          return { ok: true, roomId: record.id }
        } catch (error) {
          return failedRoom(error)
        }
      },

      async updateRoom(roomId, draft) {
        const errors = validateRoomDraftAgainst(state, resolvedMuseumId, draft, roomId)
        if (Object.keys(errors).length > 0) return { ok: false, errors }
        const storyOrder = parsePositiveInteger(draft.storyOrder)
        if (storyOrder === null) {
          return { ok: false, errors: { storyOrder: 'Story order must be a positive number.' } }
        }
        const nextRoomId = draft.nextRoomId.trim().length > 0 ? draft.nextRoomId.trim() : null

        if (!isLiveApi) {
          mutateLocal((current) => ({
            ...current,
            rooms: current.rooms.map((room) =>
              room.id === roomId
                ? {
                    ...room,
                    title: draft.title.trim(),
                    storyOrder,
                    roomOverviewText: draft.roomOverviewText.trim(),
                    narrationScript: draft.narrationScript.trim(),
                    nextRoomId,
                    lastEditedAt: nowIso(),
                  }
                : room,
            ),
          }))
          return { ok: true, roomId }
        }

        try {
          const updated = await apiUpdateRoom(roomId, {
            title: draft.title.trim(),
            storyOrder,
            roomOverviewText: draft.roomOverviewText.trim(),
            narrationScript: draft.narrationScript.trim(),
            nextRoomId,
          })
          const record = fromApiRoom(updated)
          mutateLocal((current) => ({
            ...current,
            rooms: current.rooms.map((room) => (room.id === roomId ? record : room)),
          }))
          return { ok: true, roomId }
        } catch (error) {
          return failedRoom(error)
        }
      },

      async deleteRoom(roomId, options = {}) {
        if (!isLiveApi) {
          mutateLocal((current) => ({
            rooms: current.rooms.filter((room) => room.id !== roomId),
            items: current.items.filter((item) => item.roomId !== roomId),
          }))
          return { ok: true }
        }

        try {
          await apiDeleteRoom(roomId, { force: options.force === true })
          mutateLocal((current) => ({
            // Items cascade server-side, so dropping them here keeps the two
            // in step without a refetch.
            rooms: current.rooms.filter((room) => room.id !== roomId),
            items: current.items.filter((item) => item.roomId !== roomId),
          }))
          // A forced delete nulls other rooms' nextRoomId, which this snapshot
          // cannot know about, so the sequence is re-read rather than guessed.
          if (options.force === true) reload()
          return { ok: true }
        } catch (error) {
          return failedDelete(error)
        }
      },

      async createItem(roomId, draft) {
        const errors = validateItemDraftAgainst(state, resolvedMuseumId, roomId, draft, null)
        if (Object.keys(errors).length > 0) return { ok: false, errors }
        const displayOrder = parsePositiveInteger(draft.displayOrder)
        if (displayOrder === null) {
          return { ok: false, errors: { displayOrder: 'Display order must be a positive number.' } }
        }

        if (!isLiveApi) {
          const itemId = createItemId(draft.name)
          mutateLocal((current) => ({
            ...current,
            items: [
              ...current.items,
              {
                id: itemId,
                museumId: resolvedMuseumId,
                roomId,
                name: draft.name.trim(),
                shortDescription: draft.shortDescription.trim(),
                detailText: draft.detailText.trim(),
                imageUrl: draft.imageUrl.trim(),
                displayOrder,
                lastEditedAt: nowIso(),
              },
            ],
          }))
          return { ok: true, itemId }
        }

        try {
          const created = await apiCreateItem({
            roomId,
            name: draft.name.trim(),
            shortDescription: draft.shortDescription.trim(),
            detailText: draft.detailText.trim(),
            imageUrl: urlOrNull(draft.imageUrl),
            displayOrder: toApiDisplayOrder(displayOrder),
          })
          const record = fromApiItem(created, resolvedMuseumId)
          mutateLocal((current) => ({ ...current, items: [...current.items, record] }))
          return { ok: true, itemId: record.id }
        } catch (error) {
          return failedItem(error)
        }
      },

      async updateItem(itemId, roomId, draft) {
        const errors = validateItemDraftAgainst(state, resolvedMuseumId, roomId, draft, itemId)
        if (Object.keys(errors).length > 0) return { ok: false, errors }
        const displayOrder = parsePositiveInteger(draft.displayOrder)
        if (displayOrder === null) {
          return { ok: false, errors: { displayOrder: 'Display order must be a positive number.' } }
        }

        if (!isLiveApi) {
          mutateLocal((current) => ({
            ...current,
            items: current.items.map((item) =>
              item.id === itemId
                ? {
                    ...item,
                    roomId,
                    name: draft.name.trim(),
                    shortDescription: draft.shortDescription.trim(),
                    detailText: draft.detailText.trim(),
                    imageUrl: draft.imageUrl.trim(),
                    displayOrder,
                    lastEditedAt: nowIso(),
                  }
                : item,
            ),
          }))
          return { ok: true, itemId }
        }

        try {
          const updated = await apiUpdateItem(itemId, {
            name: draft.name.trim(),
            shortDescription: draft.shortDescription.trim(),
            detailText: draft.detailText.trim(),
            imageUrl: urlOrNull(draft.imageUrl),
            displayOrder: toApiDisplayOrder(displayOrder),
          })
          const record = fromApiItem(updated, resolvedMuseumId)
          mutateLocal((current) => ({
            ...current,
            items: current.items.map((item) => (item.id === itemId ? record : item)),
          }))
          return { ok: true, itemId }
        } catch (error) {
          return failedItem(error)
        }
      },

      async deleteItem(itemId) {
        if (!isLiveApi) {
          mutateLocal((current) => ({
            ...current,
            items: current.items.filter((item) => item.id !== itemId),
          }))
          return { ok: true }
        }

        try {
          await apiDeleteItem(itemId)
          mutateLocal((current) => ({
            ...current,
            items: current.items.filter((item) => item.id !== itemId),
          }))
          return { ok: true }
        } catch (error) {
          return failedDelete(error)
        }
      },
    }
  }, [state, status, loadError, reload, resolvedMuseumId, museumId])

  return <storeContext.Provider value={value}>{children}</storeContext.Provider>
}

export function useAuthoringStore(): AuthoringStore {
  const context = useContext(storeContext)
  if (context === null) {
    throw new Error('Rooms and items store context is unavailable.')
  }
  return context
}

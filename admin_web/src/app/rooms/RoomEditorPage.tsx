import { useMemo, useState, type ReactElement } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

import {
  Button,
  ConfirmDialog,
  Field,
  Select,
  StateBlock,
  TextArea,
  TextInput,
  useToast,
} from '../../kit/index.ts'
import {
  createEmptyRoomDraft,
  toRoomDraft,
  useAuthoringStore,
  type RoomDraft,
  type RoomDraftErrors,
} from './authoringStore.tsx'
import { useUnsavedChangesGuard } from './useUnsavedChangesGuard.ts'
import styles from './roomsAuthoring.module.css'

type RoomEditorMode = 'create' | 'edit'

const EMPTY_ROOM_ERRORS: RoomDraftErrors = {}

function roomDraftEquals(left: RoomDraft, right: RoomDraft): boolean {
  return JSON.stringify(left) === JSON.stringify(right)
}

export function RoomEditorPage({ mode }: { readonly mode: RoomEditorMode }): ReactElement {
  const navigate = useNavigate()
  const { roomId = '' } = useParams()
  const { show } = useToast()
  const {
    rooms,
    listRoomItems,
    findRoom,
    createRoom,
    updateRoom,
    deleteRoom,
    status,
    loadError,
    reload,
  } = useAuthoringStore()

  const room = mode === 'edit' ? findRoom(roomId) : undefined
  // Only "missing" once the rooms have actually arrived — otherwise the first
  // render of a deep link would claim the room does not exist.
  const isMissing = mode === 'edit' && room === undefined && status !== 'loading'
  const baseline = useMemo(() => {
    if (mode === 'create') return createEmptyRoomDraft()
    if (room !== undefined) return toRoomDraft(room)
    return createEmptyRoomDraft()
  }, [mode, room])

  const [draft, setDraft] = useState<RoomDraft>(baseline)
  const [errors, setErrors] = useState<RoomDraftErrors>(EMPTY_ROOM_ERRORS)
  const [formError, setFormError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [discardModalOpen, setDiscardModalOpen] = useState(false)
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  // A room another room points at is refused until the operator says to break
  // the link, so the second confirmation is a distinct decision from the first.
  const [forceDeleteOpen, setForceDeleteOpen] = useState(false)

  const dirty = !roomDraftEquals(draft, baseline)
  const unsavedGuard = useUnsavedChangesGuard(dirty)

  const roomOptions = [
    { value: '', label: 'End of sequence' },
    ...rooms
      .filter((candidate) => candidate.id !== room?.id)
      .map((candidate) => ({ value: candidate.id, label: `${candidate.storyOrder}. ${candidate.title}` })),
  ]

  const itemSummary = room === undefined ? 'Items can be added after the room is created.' : undefined
  const roomItems = room === undefined ? [] : listRoomItems(room.id)

  if (status === 'loading') {
    return (
      <div className={styles.page}>
        <StateBlock state={{ kind: 'loading', label: 'room' }} size="page" />
      </div>
    )
  }

  if (status === 'error') {
    return (
      <div className={styles.page}>
        <StateBlock
          size="page"
          state={{
            kind: 'failure',
            title: 'Could not load this room',
            body: loadError ?? 'The request failed.',
            retry: { label: 'Try again', onAct: reload },
          }}
        />
      </div>
    )
  }

  if (isMissing) {
    return (
      <div className={styles.page}>
        <section className={styles.panelCard}>
          <h1 className="text-title">Room not found</h1>
          <p className={`text-body ${styles.muted}`}>
            This room no longer exists. Return to the rooms list.
          </p>
          <Button tone="secondary" onClick={() => navigate('..')}>
            Back to rooms
          </Button>
        </section>
      </div>
    )
  }

  function setField<Key extends keyof RoomDraft>(key: Key, value: RoomDraft[Key]): void {
    setDraft((current) => ({ ...current, [key]: value }))
    setFormError(null)
    if (errors[key as keyof RoomDraftErrors] !== undefined) {
      setErrors((current) => ({ ...current, [key]: undefined }))
    }
  }

  async function commitSave(): Promise<void> {
    setSaving(true)
    setFormError(null)
    try {
      const result =
        mode === 'create' ? await createRoom(draft) : await updateRoom(roomId, draft)

      if (!result.ok) {
        setErrors(result.errors)
        // Only surfaced when the server rejected the request without naming a
        // field; otherwise the inline messages already say what is wrong.
        setFormError(Object.keys(result.errors).length === 0 ? (result.message ?? null) : null)
        return
      }

      setErrors(EMPTY_ROOM_ERRORS)
      if (mode === 'create') {
        show({ tone: 'success', message: 'Room created.' })
        unsavedGuard.allowNextNavigation()
        navigate(`../${result.roomId}`, { replace: true })
        return
      }
      show({ tone: 'success', message: 'Room saved.' })
    } finally {
      setSaving(false)
    }
  }

  function resetDraft(): void {
    setDraft(baseline)
    setErrors(EMPTY_ROOM_ERRORS)
    setFormError(null)
    setDiscardModalOpen(false)
  }

  function attemptDiscard(): void {
    if (!dirty) {
      resetDraft()
      return
    }
    setDiscardModalOpen(true)
  }

  async function runDelete(force: boolean): Promise<void> {
    if (mode !== 'edit' || room === undefined) return
    setSaving(true)
    try {
      const result = await deleteRoom(room.id, { force })
      if (!result.ok) {
        setDeleteModalOpen(false)
        if (result.code === 'ROOM_REFERENCED') {
          setForceDeleteOpen(true)
          return
        }
        show({ tone: 'danger', message: result.message })
        return
      }
      show({ tone: 'success', message: 'Room deleted.' })
      unsavedGuard.allowNextNavigation()
      navigate('..', { replace: true })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className={styles.page}>
      <header className={styles.headerCard}>
        <div>
          <p className="museum-name">Adwa Memorial Museum</p>
          <h1 className="text-title">{mode === 'create' ? 'Create room' : `Edit room - ${room?.title}`}</h1>
          <p className={`text-body ${styles.muted}`}>
            Author AI grounding context, narration script, and room sequencing.
          </p>
        </div>
        <Button tone="secondary" onClick={() => navigate('..')}>
          Back to rooms
        </Button>
      </header>

      <section className={styles.editorCard}>
        <div className={styles.formGrid}>
          <Field
            id="room-title"
            label="Title"
            required
            {...(errors.title !== undefined ? { error: errors.title } : {})}
          >
            {(control) => (
              <TextInput
                {...control}
                value={draft.title}
                onChange={(value) => setField('title', value)}
                placeholder="Room title"
              />
            )}
          </Field>

          <Field
            id="room-story-order"
            label="Story order"
            required
            {...(errors.storyOrder !== undefined ? { error: errors.storyOrder } : {})}
          >
            {(control) => (
              <TextInput
                {...control}
                value={draft.storyOrder}
                onChange={(value) => setField('storyOrder', value)}
                inputMode="numeric"
                placeholder="1"
              />
            )}
          </Field>

          <Field
            id="room-next-room"
            label="Next room"
            hint="Select the next room in sequence. Leave blank to end the sequence."
            {...(errors.nextRoomId !== undefined ? { error: errors.nextRoomId } : {})}
          >
            {(control) => (
              <Select
                {...control}
                value={draft.nextRoomId}
                onChange={(value) => setField('nextRoomId', value)}
                options={roomOptions}
              />
            )}
          </Field>

          <Field
            id="room-overview"
            label="Overview text (AI grounding)"
            required
            {...(errors.roomOverviewText !== undefined ? { error: errors.roomOverviewText } : {})}
          >
            {(control) => (
              <TextArea
                {...control}
                value={draft.roomOverviewText}
                onChange={(value) => setField('roomOverviewText', value)}
                rows={5}
                maxLength={700}
                showCount
              />
            )}
          </Field>

          <Field
            id="room-narration-script"
            label="Narration script"
            required
            {...(errors.narrationScript !== undefined ? { error: errors.narrationScript } : {})}
          >
            {(control) => (
              <TextArea
                {...control}
                value={draft.narrationScript}
                onChange={(value) => setField('narrationScript', value)}
                rows={8}
                maxLength={3000}
                showCount
              />
            )}
          </Field>
        </div>

        {formError !== null ? (
          <StateBlock
            size="inline"
            state={{ kind: 'failure', title: 'Could not save this room', body: formError }}
          />
        ) : null}

        <section className={styles.itemSummaryPanel} aria-label="Item summary">
          <h2 className="text-subtitle">Item summary</h2>
          {itemSummary !== undefined ? (
            <p className={`text-body ${styles.muted}`}>{itemSummary}</p>
          ) : roomItems.length === 0 ? (
            <p className={`text-body ${styles.muted}`}>No items yet in this room.</p>
          ) : (
            <ol className={styles.itemSummaryList}>
              {roomItems.map((item) => (
                <li key={item.id} className={styles.itemSummaryRow}>
                  <span className="text-body">{item.name}</span>
                  <span className={`text-caption ${styles.muted}`}>Display order {item.displayOrder}</span>
                </li>
              ))}
            </ol>
          )}
          {room !== undefined ? (
            <Button tone="ghost" onClick={() => navigate('items')}>
              Manage room items
            </Button>
          ) : null}
        </section>
      </section>

      <div className={styles.stickySaveBar} role="region" aria-label="Room editor actions">
        <p className={`text-caption ${styles.dirtyText}`}>{dirty ? 'Unsaved changes' : 'All changes saved'}</p>
        <div className={styles.saveActions}>
          <Button tone="secondary" onClick={attemptDiscard} disabled={saving}>
            Discard
          </Button>
          {mode === 'edit' ? (
            <Button tone="danger" onClick={() => setDeleteModalOpen(true)} disabled={saving}>
              Delete room
            </Button>
          ) : null}
          <Button onClick={() => void commitSave()} disabled={saving}>
            {saving ? 'Saving…' : 'Save room'}
          </Button>
        </div>
      </div>

      <ConfirmDialog
        open={discardModalOpen}
        title="Discard unsaved room edits?"
        entityName={draft.title.trim().length > 0 ? draft.title : 'Untitled room'}
        consequence="has unsaved changes that will be lost."
        confirmLabel="Discard edits"
        tone="danger"
        onCancel={() => setDiscardModalOpen(false)}
        onConfirm={resetDraft}
      />

      <ConfirmDialog
        open={unsavedGuard.navigationConfirmOpen}
        title="Leave with unsaved edits?"
        entityName={draft.title.trim().length > 0 ? draft.title : 'This room'}
        consequence="has unsaved changes that will be lost."
        confirmLabel="Leave page"
        tone="danger"
        onCancel={unsavedGuard.stayOnPage}
        onConfirm={unsavedGuard.leavePage}
      />

      <ConfirmDialog
        open={deleteModalOpen}
        title="Delete room?"
        entityName={room?.title ?? 'Room'}
        consequence="and every item in it will be permanently deleted."
        confirmLabel="Delete room"
        tone="danger"
        onCancel={() => setDeleteModalOpen(false)}
        onConfirm={() => void runDelete(false)}
      />

      <ConfirmDialog
        open={forceDeleteOpen}
        title="Another room points to this one"
        entityName={room?.title ?? 'Room'}
        consequence="is the next room in another room's sequence. Deleting it will clear that link, leaving the earlier room ending the tour."
        confirmLabel="Delete and clear the link"
        tone="danger"
        onCancel={() => setForceDeleteOpen(false)}
        onConfirm={() => void runDelete(true)}
      />
    </div>
  )
}

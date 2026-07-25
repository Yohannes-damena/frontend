import { useMemo, useState, type ReactElement } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

import {
  Button,
  ConfirmDialog,
  Field,
  StateBlock,
  TextArea,
  TextInput,
  useToast,
} from '../../kit/index.ts'
import {
  createEmptyItemDraft,
  toItemDraft,
  useAuthoringStore,
  type ItemDraft,
  type ItemDraftErrors,
} from '../rooms/authoringStore.tsx'
import { useUnsavedChangesGuard } from '../rooms/useUnsavedChangesGuard.ts'
import styles from '../rooms/roomsAuthoring.module.css'

const EMPTY_ITEM_ERRORS: ItemDraftErrors = {}

function itemDraftEquals(left: ItemDraft, right: ItemDraft): boolean {
  return JSON.stringify(left) === JSON.stringify(right)
}

export function ItemEditorPage(): ReactElement {
  const navigate = useNavigate()
  const { roomId = '', itemId = '' } = useParams()
  const creating = itemId === 'new'
  const { show } = useToast()
  const { findRoom, findItem, createItem, updateItem, deleteItem, status, loadError, reload } =
    useAuthoringStore()

  const room = findRoom(roomId)
  const existingItem = creating ? undefined : findItem(itemId)
  // Nothing is "missing" until the museum's content has arrived; a deep link
  // renders before the first response otherwise.
  const missing =
    status !== 'loading' && (room === undefined || (!creating && existingItem === undefined))

  const baseline = useMemo(() => {
    if (existingItem === undefined) return createEmptyItemDraft()
    return toItemDraft(existingItem)
  }, [existingItem])

  const [draft, setDraft] = useState<ItemDraft>(baseline)
  const [errors, setErrors] = useState<ItemDraftErrors>(EMPTY_ITEM_ERRORS)
  const [formError, setFormError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [discardModalOpen, setDiscardModalOpen] = useState(false)
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)

  const dirty = !itemDraftEquals(draft, baseline)
  const unsavedGuard = useUnsavedChangesGuard(dirty)

  if (status === 'loading') {
    return (
      <div className={styles.page}>
        <StateBlock state={{ kind: 'loading', label: 'item' }} size="page" />
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
            title: 'Could not load this item',
            body: loadError ?? 'The request failed.',
            retry: { label: 'Try again', onAct: reload },
          }}
        />
      </div>
    )
  }

  if (missing) {
    return (
      <div className={styles.page}>
        <section className={styles.panelCard}>
          <h1 className="text-title">Item not found</h1>
          <p className={`text-body ${styles.muted}`}>
            This room or item no longer exists. Return to the room items table.
          </p>
          <Button tone="secondary" onClick={() => navigate('..')}>
            Back to room items
          </Button>
        </section>
      </div>
    )
  }

  function setField<Key extends keyof ItemDraft>(key: Key, value: ItemDraft[Key]): void {
    setDraft((current) => ({ ...current, [key]: value }))
    setFormError(null)
    if (errors[key as keyof ItemDraftErrors] !== undefined) {
      setErrors((current) => ({ ...current, [key]: undefined }))
    }
  }

  async function commitSave(): Promise<void> {
    if (room === undefined) return
    setSaving(true)
    setFormError(null)
    try {
      const result = creating
        ? await createItem(room.id, draft)
        : await updateItem(itemId, room.id, draft)

      if (!result.ok) {
        setErrors(result.errors)
        setFormError(Object.keys(result.errors).length === 0 ? (result.message ?? null) : null)
        return
      }

      setErrors(EMPTY_ITEM_ERRORS)
      if (creating) {
        show({ tone: 'success', message: 'Item created.' })
        unsavedGuard.allowNextNavigation()
        navigate(`../${result.itemId}`, { replace: true })
        return
      }
      show({ tone: 'success', message: 'Item saved.' })
    } finally {
      setSaving(false)
    }
  }

  function resetDraft(): void {
    setDraft(baseline)
    setErrors(EMPTY_ITEM_ERRORS)
    setFormError(null)
    setDiscardModalOpen(false)
  }

  async function attemptDelete(): Promise<void> {
    if (existingItem === undefined) return
    setSaving(true)
    try {
      const result = await deleteItem(existingItem.id)
      setDeleteModalOpen(false)
      if (!result.ok) {
        show({ tone: 'danger', message: result.message })
        return
      }
      show({ tone: 'success', message: 'Item deleted.' })
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
          <h1 className="text-title">
            {creating ? `Create item in ${room?.title}` : `Edit item - ${existingItem?.name}`}
          </h1>
          <p className={`text-body ${styles.muted}`}>
            Visitor-facing copy and grounding details stay in room context.
          </p>
        </div>
        <Button tone="secondary" onClick={() => navigate('..')}>
          Back to items
        </Button>
      </header>

      <section className={styles.editorCard}>
        <div className={styles.formGrid}>
          <Field
            id="item-name"
            label="Name"
            required
            {...(errors.name !== undefined ? { error: errors.name } : {})}
          >
            {(control) => (
              <TextInput
                {...control}
                value={draft.name}
                onChange={(value) => setField('name', value)}
                placeholder="Item name"
              />
            )}
          </Field>

          <Field
            id="item-display-order"
            label="Display order"
            required
            {...(errors.displayOrder !== undefined ? { error: errors.displayOrder } : {})}
          >
            {(control) => (
              <TextInput
                {...control}
                value={draft.displayOrder}
                onChange={(value) => setField('displayOrder', value)}
                inputMode="numeric"
                placeholder="1"
              />
            )}
          </Field>

          <Field
            id="item-visitor-description"
            label="Visitor-facing description"
            required
            {...(errors.shortDescription !== undefined ? { error: errors.shortDescription } : {})}
          >
            {(control) => (
              <TextArea
                {...control}
                value={draft.shortDescription}
                onChange={(value) => setField('shortDescription', value)}
                rows={4}
                maxLength={700}
                showCount
              />
            )}
          </Field>

          <Field
            id="item-grounding-detail"
            label="Grounding detail"
            required
            {...(errors.detailText !== undefined ? { error: errors.detailText } : {})}
          >
            {(control) => (
              <TextArea
                {...control}
                value={draft.detailText}
                onChange={(value) => setField('detailText', value)}
                rows={4}
                maxLength={1200}
                showCount
              />
            )}
          </Field>

          <Field
            id="item-image-url"
            label="Image URL"
            hint="Leave empty for no image."
            {...(errors.imageUrl !== undefined ? { error: errors.imageUrl } : {})}
          >
            {(control) => (
              <TextInput
                {...control}
                value={draft.imageUrl}
                onChange={(value) => setField('imageUrl', value)}
                type="url"
                inputMode="url"
                placeholder="https://..."
              />
            )}
          </Field>
        </div>

        {formError !== null ? (
          <StateBlock
            size="inline"
            state={{ kind: 'failure', title: 'Could not save this item', body: formError }}
          />
        ) : null}

        <section className={styles.mediaPanel} aria-label="Image preview">
          <h2 className="text-subtitle">Image preview</h2>
          {draft.imageUrl.trim().length > 0 ? (
            <img className={styles.imagePreview} src={draft.imageUrl} alt={`Preview for ${draft.name || 'item'}`} />
          ) : (
            <div className={styles.mediaPlaceholder}>
              <p className={`text-body ${styles.muted}`}>No image linked yet.</p>
            </div>
          )}
          <Button tone="ghost" disabled disabledReason="Upload integration arrives in a later phase.">
            Upload image (integration pending)
          </Button>
        </section>
      </section>

      <div className={styles.stickySaveBar} role="region" aria-label="Item editor actions">
        <p className={`text-caption ${styles.dirtyText}`}>{dirty ? 'Unsaved changes' : 'All changes saved'}</p>
        <div className={styles.saveActions}>
          <Button
            tone="secondary"
            disabled={saving}
            onClick={() => (dirty ? setDiscardModalOpen(true) : resetDraft())}
          >
            Discard
          </Button>
          {!creating ? (
            <Button tone="danger" onClick={() => setDeleteModalOpen(true)} disabled={saving}>
              Delete item
            </Button>
          ) : null}
          <Button onClick={() => void commitSave()} disabled={saving}>
            {saving ? 'Saving…' : 'Save item'}
          </Button>
        </div>
      </div>

      <ConfirmDialog
        open={discardModalOpen}
        title="Discard unsaved item edits?"
        entityName={draft.name.trim().length > 0 ? draft.name : 'Untitled item'}
        consequence="has unsaved changes that will be lost."
        confirmLabel="Discard edits"
        tone="danger"
        onCancel={() => setDiscardModalOpen(false)}
        onConfirm={resetDraft}
      />

      <ConfirmDialog
        open={unsavedGuard.navigationConfirmOpen}
        title="Leave with unsaved edits?"
        entityName={draft.name.trim().length > 0 ? draft.name : 'This item'}
        consequence="has unsaved changes that will be lost."
        confirmLabel="Leave page"
        tone="danger"
        onCancel={unsavedGuard.stayOnPage}
        onConfirm={unsavedGuard.leavePage}
      />

      <ConfirmDialog
        open={deleteModalOpen}
        title="Delete item?"
        entityName={existingItem?.name ?? 'Item'}
        consequence="will be permanently removed from this room."
        confirmLabel="Delete item"
        tone="danger"
        onCancel={() => setDeleteModalOpen(false)}
        onConfirm={() => void attemptDelete()}
      />
    </div>
  )
}

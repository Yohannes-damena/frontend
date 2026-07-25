import { useCallback, useEffect, useState } from 'react'

import { useToast } from '../../kit/index.ts'
import type { SettingsSaveResult } from './settingsStore.ts'

/**
 * The editing half of one settings tab: a local draft, a save that reports
 * per-field failures, and a dirty flag.
 *
 * All four tabs behave identically here, so they share this rather than each
 * growing its own copy that drifts. The store owns loading and the wire format;
 * this owns only what the form needs.
 */
export function useSettingsSection<T extends object>(
  loaded: T,
  save: (next: T) => Promise<SettingsSaveResult>,
  successMessage: string,
): {
  readonly draft: T
  readonly setField: <K extends keyof T>(key: K, value: T[K]) => void
  readonly saving: boolean
  readonly dirty: boolean
  readonly fieldErrors: Readonly<Record<string, string>>
  readonly formError: string | null
  readonly submit: () => Promise<void>
  readonly reset: () => void
} {
  const { show } = useToast()
  const [draft, setDraft] = useState<T>(loaded)
  const [saving, setSaving] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<Readonly<Record<string, string>>>({})
  const [formError, setFormError] = useState<string | null>(null)

  // Re-seeds when the museum's settings arrive, or after a save returns the
  // server's normalised version. An in-progress edit is not protected here:
  // these forms are short and saving is explicit, so the alternative — keeping
  // a stale draft over fresher server state — is the worse failure.
  useEffect(() => {
    setDraft(loaded)
    setFieldErrors({})
    setFormError(null)
  }, [loaded])

  const setField = useCallback(<K extends keyof T>(key: K, value: T[K]): void => {
    setDraft((current) => ({ ...current, [key]: value }))
    setFormError(null)
    setFieldErrors((current) => {
      if (!(String(key) in current)) return current
      const next = { ...current }
      delete next[String(key)]
      return next
    })
  }, [])

  const submit = useCallback(async (): Promise<void> => {
    setSaving(true)
    setFormError(null)
    setFieldErrors({})
    try {
      const result = await save(draft)
      if (result.ok) {
        show({ tone: 'success', message: successMessage })
        return
      }
      setFieldErrors(result.fieldErrors)
      // Only when nothing landed on a field, so the banner never repeats an
      // inline message the user is already looking at.
      if (Object.keys(result.fieldErrors).length === 0) setFormError(result.message)
    } finally {
      setSaving(false)
    }
  }, [draft, save, show, successMessage])

  const reset = useCallback(() => {
    setDraft(loaded)
    setFieldErrors({})
    setFormError(null)
  }, [loaded])

  return {
    draft,
    setField,
    saving,
    dirty: JSON.stringify(draft) !== JSON.stringify(loaded),
    fieldErrors,
    formError,
    submit,
    reset,
  }
}

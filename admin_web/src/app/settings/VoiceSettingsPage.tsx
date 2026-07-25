import { useMemo, type ReactElement } from 'react'

import {
  Button,
  Field,
  IntegrationPendingPanel,
  Select,
  StateBlock,
  TextArea,
  TextInput,
} from '../../kit/index.ts'
import { TenantSettingsLayout } from './TenantSettingsLayout.tsx'
import { useTenantSettingsStore } from './settingsStore.ts'
import { useSettingsSection } from './useSettingsSection.ts'
import { useSettingsSectionState } from './useSettingsSectionState.ts'
import styles from './TenantSettingsLayout.module.css'

const VOICE_OPTIONS = [
  { value: '', label: 'Provider default' },
  { value: 'voice-ethiopic-clarity', label: 'Ethiopic Clarity' },
  { value: 'voice-heritage-guide', label: 'Heritage Guide' },
  { value: 'voice-museum-warm', label: 'Museum Warm' },
] as const

export function VoiceSettingsPage(): ReactElement {
  const store = useTenantSettingsStore()
  const sectionState = useSettingsSectionState(store)
  const form = useSettingsSection(store.value.voice, store.saveVoice, 'Voice settings saved.')

  // A voice id set outside this screen (seed data, a provider change) must stay
  // selectable, or opening the tab and saving would silently discard it.
  const voiceOptions = useMemo(() => {
    const known = VOICE_OPTIONS.some((option) => option.value === form.draft.defaultVoiceId)
    if (known) return VOICE_OPTIONS
    return [...VOICE_OPTIONS, { value: form.draft.defaultVoiceId, label: form.draft.defaultVoiceId }]
  }, [form.draft.defaultVoiceId])

  return (
    <TenantSettingsLayout
      section="voice"
      title="Default voice"
      description="Narration voice used when a room does not specify one of its own."
      museumName={store.value.museum.museumName}
      state={sectionState}
    >
      <div className={styles.formGrid}>
        <Field
          id="settings-voice-default"
          label="Default voice"
          {...(form.fieldErrors.defaultVoiceId !== undefined
            ? { error: form.fieldErrors.defaultVoiceId }
            : {})}
        >
          {(control) => (
            <Select
              {...control}
              value={form.draft.defaultVoiceId}
              onChange={(value) => form.setField('defaultVoiceId', value)}
              options={voiceOptions}
            />
          )}
        </Field>

        <Field
          id="settings-voice-rate"
          label="Speaking rate"
          hint="Multiplier on the provider's own pace. 1.00 is unchanged; range 0.50–2.00."
          {...(form.fieldErrors.speakingRate !== undefined
            ? { error: form.fieldErrors.speakingRate }
            : {})}
        >
          {(control) => (
            <TextInput
              {...control}
              value={form.draft.speakingRate}
              onChange={(value) => form.setField('speakingRate', value)}
              inputMode="numeric"
            />
          )}
        </Field>

        <Field
          id="settings-voice-pronunciation"
          label="Pronunciation hints"
          markOptional
          hint="Names the synthesiser gets wrong. One per line or separated by semicolons."
          {...(form.fieldErrors.pronunciationHints !== undefined
            ? { error: form.fieldErrors.pronunciationHints }
            : {})}
        >
          {(control) => (
            <TextArea
              {...control}
              rows={4}
              value={form.draft.pronunciationHints}
              onChange={(value) => form.setField('pronunciationHints', value)}
              maxLength={2000}
            />
          )}
        </Field>

        <IntegrationPendingPanel
          dependency="Voice preview endpoint"
          body="The backend synthesises narration during publishing but exposes no preview route, so sampling a voice from here is not possible yet."
          stillUsable="The default voice and speaking rate below are saved and applied to new narration."
          variant="inline"
        />

        <Button
          tone="secondary"
          disabled
          disabledReason="Integration pending: no preview endpoint exists on the API."
        >
          Preview default voice
        </Button>
      </div>

      {form.formError !== null ? (
        <StateBlock
          size="inline"
          state={{ kind: 'failure', title: 'Could not save these settings', body: form.formError }}
        />
      ) : null}

      <div className={styles.rowActions}>
        <Button onClick={() => void form.submit()} disabled={form.saving || !form.dirty}>
          {form.saving ? 'Saving…' : 'Save voice settings'}
        </Button>
      </div>
    </TenantSettingsLayout>
  )
}

import type { ReactElement } from 'react'

import { Button, Field, Select, StateBlock, TextArea, TextInput } from '../../kit/index.ts'
import { TenantSettingsLayout } from './TenantSettingsLayout.tsx'
import { useTenantSettingsStore } from './settingsStore.ts'
import { useSettingsSection } from './useSettingsSection.ts'
import { useSettingsSectionState } from './useSettingsSectionState.ts'
import styles from './TenantSettingsLayout.module.css'

const GUIDE_STYLE_OPTIONS = [
  { value: 'formal', label: 'Formal' },
  { value: 'conversational', label: 'Conversational' },
  { value: 'scholarly', label: 'Scholarly' },
] as const

export function GuideSettingsPage(): ReactElement {
  const store = useTenantSettingsStore()
  const sectionState = useSettingsSectionState(store)
  const form = useSettingsSection(store.value.guide, store.saveGuide, 'Guide persona settings saved.')

  return (
    <TenantSettingsLayout
      section="guide"
      title="AI guide persona"
      description="Tone and grounding policy applied to every answer this museum's guide gives."
      museumName={store.value.museum.museumName}
      state={sectionState}
    >
      <div className={styles.formGrid}>
        <Field
          id="settings-guide-name"
          label="Persona name"
          markOptional
          {...(form.fieldErrors.personaName !== undefined
            ? { error: form.fieldErrors.personaName }
            : {})}
        >
          {(control) => (
            <TextInput
              {...control}
              value={form.draft.personaName}
              onChange={(value) => form.setField('personaName', value)}
              maxLength={120}
            />
          )}
        </Field>

        <Field
          id="settings-guide-style"
          label="Style tone"
          {...(form.fieldErrors.styleTone !== undefined
            ? { error: form.fieldErrors.styleTone }
            : {})}
        >
          {(control) => (
            <Select
              {...control}
              value={form.draft.styleTone}
              onChange={(value) =>
                form.setField('styleTone', value as typeof form.draft.styleTone)
              }
              options={GUIDE_STYLE_OPTIONS}
            />
          )}
        </Field>

        <Field
          id="settings-guide-policy"
          label="Grounding policy"
          hint="Prepended to every guide request. Use it to bound what the guide may claim."
          {...(form.fieldErrors.groundingPolicy !== undefined
            ? { error: form.fieldErrors.groundingPolicy }
            : {})}
        >
          {(control) => (
            <TextArea
              {...control}
              rows={7}
              value={form.draft.groundingPolicy}
              onChange={(value) => form.setField('groundingPolicy', value)}
              maxLength={4000}
              showCount
            />
          )}
        </Field>
      </div>

      {form.formError !== null ? (
        <StateBlock
          size="inline"
          state={{ kind: 'failure', title: 'Could not save these settings', body: form.formError }}
        />
      ) : null}

      <div className={styles.rowActions}>
        <Button onClick={() => void form.submit()} disabled={form.saving || !form.dirty}>
          {form.saving ? 'Saving…' : 'Save guide settings'}
        </Button>
      </div>
    </TenantSettingsLayout>
  )
}

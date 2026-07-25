import type { ReactElement } from 'react'

import { Button, Checkbox, Field, StateBlock, TextInput } from '../../kit/index.ts'
import { TenantSettingsLayout } from './TenantSettingsLayout.tsx'
import { useTenantSettingsStore } from './settingsStore.ts'
import { useSettingsSection } from './useSettingsSection.ts'
import { useSettingsSectionState } from './useSettingsSectionState.ts'
import styles from './TenantSettingsLayout.module.css'

export function MuseumSettingsPage(): ReactElement {
  const store = useTenantSettingsStore()
  const sectionState = useSettingsSectionState(store)
  const form = useSettingsSection(store.value.museum, store.saveMuseum, 'Museum settings saved.')

  return (
    <TenantSettingsLayout
      section="museum"
      title="Museum identity and activation"
      description="Name, location, and the public slug visitors reach this museum by."
      museumName={store.value.museum.museumName}
      state={sectionState}
    >
      <div className={styles.formGrid}>
        <Field
          id="settings-museum-name"
          label="Museum name"
          required
          {...(form.fieldErrors.museumName !== undefined
            ? { error: form.fieldErrors.museumName }
            : {})}
        >
          {(control) => (
            <TextInput
              {...control}
              value={form.draft.museumName}
              onChange={(value) => form.setField('museumName', value)}
            />
          )}
        </Field>

        <Field
          id="settings-museum-location"
          label="City and country"
          {...(form.fieldErrors.cityCountry !== undefined
            ? { error: form.fieldErrors.cityCountry }
            : {})}
        >
          {(control) => (
            <TextInput
              {...control}
              value={form.draft.cityCountry}
              onChange={(value) => form.setField('cityCountry', value)}
            />
          )}
        </Field>

        <Field
          id="settings-museum-slug"
          label="Public slug"
          required
          hint="Lowercase letters, numbers, and hyphens. Used in visitor-facing links."
          {...(form.fieldErrors.publicSlug !== undefined
            ? { error: form.fieldErrors.publicSlug }
            : {})}
        >
          {(control) => (
            <TextInput
              {...control}
              value={form.draft.publicSlug}
              onChange={(value) => form.setField('publicSlug', value)}
            />
          )}
        </Field>

        <Field
          id="settings-museum-active"
          label="Activation"
          disabled={!store.canChangeActivation}
          {...(store.canChangeActivation
            ? {}
            : {
                disabledReason:
                  'Suspending a museum is a system administrator action.',
              })}
          {...(form.fieldErrors.isActive !== undefined
            ? { error: form.fieldErrors.isActive }
            : {})}
        >
          {(control) => (
            <Checkbox
              id={control.id}
              disabled={control.disabled}
              {...(control['aria-describedby'] !== undefined
                ? { 'aria-describedby': control['aria-describedby'] }
                : {})}
              checked={form.draft.isActive}
              onChange={(checked) => form.setField('isActive', checked)}
              label="Visitors can reach this museum"
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
          {form.saving ? 'Saving…' : 'Save museum settings'}
        </Button>
      </div>
    </TenantSettingsLayout>
  )
}

import { useState, type ReactElement } from 'react'

import { Button, Field, Select, StateBlock, TextInput, useToast } from '../../kit/index.ts'
import { validateTicket } from '../../api/adminApi.ts'
import { isLiveApi } from '../../api/config.ts'
import { isApiError, messageForCode } from '../../api/errors.ts'
import { TenantSettingsLayout } from './TenantSettingsLayout.tsx'
import { useTenantSettingsStore } from './settingsStore.ts'
import { useSettingsSection } from './useSettingsSection.ts'
import { useSettingsSectionState } from './useSettingsSectionState.ts'
import styles from './TenantSettingsLayout.module.css'

const GATE_MODE_OPTIONS = [
  { value: 'ticket_code', label: 'Ticket code scan' },
  { value: 'staff_assisted', label: 'Staff-assisted check-in' },
] as const

export function GateSettingsPage(): ReactElement {
  const { show } = useToast()
  const store = useTenantSettingsStore()
  const sectionState = useSettingsSectionState(store)
  const form = useSettingsSection(store.value.gate, store.saveGate, 'Ticket gate settings saved.')

  const [probeCode, setProbeCode] = useState('')
  const [probing, setProbing] = useState(false)

  /**
   * Runs the real gate the visitor app runs, against the saved configuration —
   * so it deliberately ignores unsaved edits rather than pretending to test them.
   */
  async function testTicket(): Promise<void> {
    if (store.museumId === null) return
    setProbing(true)
    try {
      const result = await validateTicket({
        museumId: store.museumId,
        ticketCode: probeCode.trim(),
      })
      if (!result.ticketRequired) {
        show({
          tone: 'neutral',
          message: 'This museum has no gate configured, so every visitor is admitted.',
        })
        return
      }
      show(
        result.valid
          ? { tone: 'success', message: 'Ticket accepted by the gate.' }
          : { tone: 'danger', message: 'Ticket rejected by the gate.' },
      )
    } catch (error) {
      show({
        tone: 'danger',
        message: isApiError(error) ? messageForCode(error) : 'The gate check could not run.',
      })
    } finally {
      setProbing(false)
    }
  }

  return (
    <TenantSettingsLayout
      section="gate"
      title="Ticket gate configuration"
      description="How this museum checks that a visitor has paid before the guide unlocks."
      museumName={store.value.museum.museumName}
      state={sectionState}
    >
      <div className={styles.formGrid}>
        <Field
          id="settings-gate-mode"
          label="Gate mode"
          hint="Staff-assisted skips the code check and relies on front-desk verification."
          {...(form.fieldErrors.gateMode !== undefined
            ? { error: form.fieldErrors.gateMode }
            : {})}
        >
          {(control) => (
            <Select
              {...control}
              value={form.draft.gateMode}
              onChange={(value) =>
                form.setField('gateMode', value as typeof form.draft.gateMode)
              }
              options={GATE_MODE_OPTIONS}
            />
          )}
        </Field>

        <Field
          id="settings-gate-url"
          label="Ticket validation endpoint"
          hint="The vendor URL called to verify a code. Leave empty to accept any visitor."
          {...(form.fieldErrors.ticketValidationUrl !== undefined
            ? { error: form.fieldErrors.ticketValidationUrl }
            : {})}
        >
          {(control) => (
            <TextInput
              {...control}
              value={form.draft.ticketValidationUrl}
              onChange={(value) => form.setField('ticketValidationUrl', value)}
              inputMode="url"
              placeholder="https://tickets.example.org/verify"
            />
          )}
        </Field>

        <Field
          id="settings-gate-prefix"
          label="Allowed ticket prefix"
          hint="Codes not starting with this are rejected before the vendor is called."
          {...(form.fieldErrors.allowedTicketPrefix !== undefined
            ? { error: form.fieldErrors.allowedTicketPrefix }
            : {})}
        >
          {(control) => (
            <TextInput
              {...control}
              value={form.draft.allowedTicketPrefix}
              onChange={(value) => form.setField('allowedTicketPrefix', value)}
            />
          )}
        </Field>

        <Field
          id="settings-gate-window"
          label="Grace window (minutes)"
          hint="How long after entry a session stays valid."
          {...(form.fieldErrors.graceWindowMinutes !== undefined
            ? { error: form.fieldErrors.graceWindowMinutes }
            : {})}
        >
          {(control) => (
            <TextInput
              {...control}
              value={form.draft.graceWindowMinutes}
              onChange={(value) => form.setField('graceWindowMinutes', value)}
              inputMode="numeric"
            />
          )}
        </Field>

        <Field
          id="settings-gate-probe"
          label="Test a ticket code"
          hint="Checks a code against the saved configuration, not unsaved edits."
        >
          {(control) => (
            <TextInput
              {...control}
              value={probeCode}
              onChange={setProbeCode}
              placeholder="ADWA-000123"
            />
          )}
        </Field>

        <Button
          tone="secondary"
          onClick={() => void testTicket()}
          disabled={probing || probeCode.trim() === '' || !isLiveApi}
          {...(isLiveApi
            ? {}
            : { disabledReason: 'Ticket checks need a live API connection.' })}
        >
          {probing ? 'Checking…' : 'Test ticket validation'}
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
          {form.saving ? 'Saving…' : 'Save gate settings'}
        </Button>
      </div>
    </TenantSettingsLayout>
  )
}

import type { KitState } from '../../kit/index.ts'
import type { TenantSettingsStore } from './settingsStore.ts'

/**
 * Turns the store's load status into the state the settings layout renders in
 * place of the form. Every tab needs the same three cases, so they share this
 * rather than each spelling out the same ternary.
 */
export function useSettingsSectionState(store: TenantSettingsStore): KitState {
  if (store.status === 'loading') return { kind: 'loading', label: 'settings' }
  if (store.status === 'error') {
    return {
      kind: 'failure',
      title: 'Could not load these settings',
      body: store.loadError ?? 'The request failed.',
      retry: { label: 'Try again', onAct: store.reload },
    }
  }
  return { kind: 'ready' }
}

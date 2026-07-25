import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { getMuseum, textOrNull, updateMuseum, urlOrNull } from '../../api/adminApi.ts'
import { isLiveApi } from '../../api/config.ts'
import { isApiError, messageForCode } from '../../api/errors.ts'
import type { ApiMuseum, UpdateMuseumRequest } from '../../api/types.ts'
import { useScopedTenantContext } from '../operator/scopedTenantContext.tsx'

/**
 * The four settings tabs are four views of one Museum row, so they load once
 * and each saves a PATCH containing only its own fields. Sending the whole
 * bundle from every tab would let a stale tab silently revert another's work.
 *
 * Forms hold strings because inputs do. Parsing and the lowercase-to-enum
 * mapping happen at the edge, in `toPatch`, rather than being spread across
 * four pages.
 */

export type MuseumSettingsForm = {
  museumName: string
  cityCountry: string
  publicSlug: string
  isActive: boolean
}

export type GateSettingsForm = {
  gateMode: 'ticket_code' | 'staff_assisted'
  allowedTicketPrefix: string
  graceWindowMinutes: string
  /** The museum's ticket vendor endpoint. Empty means no gate at all. */
  ticketValidationUrl: string
}

export type GuideSettingsForm = {
  personaName: string
  styleTone: 'formal' | 'conversational' | 'scholarly'
  groundingPolicy: string
}

export type VoiceSettingsForm = {
  defaultVoiceId: string
  speakingRate: string
  pronunciationHints: string
}

export type TenantSettingsBundle = {
  museum: MuseumSettingsForm
  gate: GateSettingsForm
  guide: GuideSettingsForm
  voice: VoiceSettingsForm
}

export type SettingsSaveResult =
  | { readonly ok: true }
  | {
      readonly ok: false
      readonly message: string
      /** Keyed by form field name, when the server named one. */
      readonly fieldErrors: Readonly<Record<string, string>>
    }

export type TenantSettingsStore = {
  readonly museumId: string | null
  readonly value: TenantSettingsBundle
  readonly status: 'loading' | 'ready' | 'error' | 'demo'
  readonly loadError: string | null
  readonly reload: () => void
  /** Activation is a system-admin decision; the checkbox is read-only otherwise. */
  readonly canChangeActivation: boolean
  readonly saveMuseum: (next: MuseumSettingsForm) => Promise<SettingsSaveResult>
  readonly saveGate: (next: GateSettingsForm) => Promise<SettingsSaveResult>
  readonly saveGuide: (next: GuideSettingsForm) => Promise<SettingsSaveResult>
  readonly saveVoice: (next: VoiceSettingsForm) => Promise<SettingsSaveResult>
}

const STORAGE_KEY = 'adwa.admin.phase6.settings.byMuseum'
const DEFAULT_MUSEUM_ID = 'museum-adwa'

function createDefaultBundle(): TenantSettingsBundle {
  return {
    museum: {
      museumName: 'Adwa Memorial Museum',
      cityCountry: 'Adwa, Ethiopia',
      publicSlug: 'adwa-memorial',
      isActive: true,
    },
    gate: {
      gateMode: 'ticket_code',
      allowedTicketPrefix: 'ADWA-',
      graceWindowMinutes: '30',
      ticketValidationUrl: '',
    },
    guide: {
      personaName: 'Adwa Historical Guide',
      styleTone: 'scholarly',
      groundingPolicy:
        'Prioritize room-approved grounding text and item references. Explicitly state uncertainty when citation support is missing.',
    },
    voice: {
      defaultVoiceId: 'voice-ethiopic-clarity',
      speakingRate: '1.0',
      pronunciationHints: 'Menelik II; Ras Alula; Tigray',
    },
  }
}

// -- Wire translation ------------------------------------------------------

function fromApiMuseum(museum: ApiMuseum): TenantSettingsBundle {
  return {
    museum: {
      museumName: museum.name,
      cityCountry: museum.cityCountry ?? '',
      publicSlug: museum.slug,
      isActive: museum.status === 'ACTIVE',
    },
    gate: {
      gateMode: museum.gateMode === 'STAFF_ASSISTED' ? 'staff_assisted' : 'ticket_code',
      allowedTicketPrefix: museum.allowedTicketPrefix ?? '',
      graceWindowMinutes: String(museum.graceWindowMinutes),
      ticketValidationUrl: museum.ticketValidationUrl ?? '',
    },
    guide: {
      personaName: museum.personaName ?? '',
      styleTone:
        museum.guideStyleTone === 'FORMAL'
          ? 'formal'
          : museum.guideStyleTone === 'SCHOLARLY'
            ? 'scholarly'
            : 'conversational',
      groundingPolicy: museum.systemPrompt ?? '',
    },
    voice: {
      defaultVoiceId: museum.defaultVoiceId ?? '',
      speakingRate: String(museum.speakingRate),
      pronunciationHints: museum.pronunciationHints ?? '',
    },
  }
}

/** Maps a server `details[].path` back to the form field that produced it. */
const FIELD_BY_PATH: Readonly<Record<string, string>> = {
  name: 'museumName',
  slug: 'publicSlug',
  cityCountry: 'cityCountry',
  status: 'isActive',
  gateMode: 'gateMode',
  allowedTicketPrefix: 'allowedTicketPrefix',
  graceWindowMinutes: 'graceWindowMinutes',
  ticketValidationUrl: 'ticketValidationUrl',
  personaName: 'personaName',
  guideStyleTone: 'styleTone',
  systemPrompt: 'groundingPolicy',
  defaultVoiceId: 'defaultVoiceId',
  speakingRate: 'speakingRate',
  pronunciationHints: 'pronunciationHints',
}

function toSaveFailure(error: unknown): SettingsSaveResult {
  if (!isApiError(error)) throw error
  const fieldErrors: Record<string, string> = {}
  for (const [path, field] of Object.entries(FIELD_BY_PATH)) {
    const message = error.fieldError(path)
    if (message !== undefined) fieldErrors[field] = message
  }
  return { ok: false, message: messageForCode(error), fieldErrors }
}

// -- Demo-mode persistence -------------------------------------------------

function readStoredByMuseum(): Record<string, TenantSettingsBundle> {
  if (typeof window === 'undefined') return {}
  const raw = window.localStorage.getItem(STORAGE_KEY)
  if (raw === null) return {}
  try {
    const parsed = JSON.parse(raw) as Record<string, Partial<TenantSettingsBundle>>
    const next: Record<string, TenantSettingsBundle> = {}
    for (const [museumId, partial] of Object.entries(parsed)) {
      const defaults = createDefaultBundle()
      next[museumId] = {
        museum: { ...defaults.museum, ...(partial.museum ?? {}) },
        gate: { ...defaults.gate, ...(partial.gate ?? {}) },
        guide: { ...defaults.guide, ...(partial.guide ?? {}) },
        voice: { ...defaults.voice, ...(partial.voice ?? {}) },
      }
    }
    return next
  } catch {
    return {}
  }
}

function writeStoredByMuseum(state: Record<string, TenantSettingsBundle>): void {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
}

// -- Hook ------------------------------------------------------------------

export function useTenantSettingsStore(): TenantSettingsStore {
  const { effectiveMuseumId, role } = useScopedTenantContext()
  const museumId = effectiveMuseumId

  const [bundle, setBundle] = useState<TenantSettingsBundle>(createDefaultBundle)
  const [status, setStatus] = useState<TenantSettingsStore['status']>(
    isLiveApi ? 'loading' : 'demo',
  )
  const [loadError, setLoadError] = useState<string | null>(null)
  const [reloadToken, setReloadToken] = useState(0)

  const requestSeq = useRef(0)

  const reload = useCallback(() => setReloadToken((token) => token + 1), [])

  useEffect(() => {
    if (!isLiveApi) {
      const stored = readStoredByMuseum()
      setBundle(stored[museumId ?? DEFAULT_MUSEUM_ID] ?? createDefaultBundle())
      setStatus('demo')
      return
    }

    if (museumId === null) {
      setLoadError('No museum is selected for this session.')
      setStatus('error')
      return
    }

    const seq = requestSeq.current + 1
    requestSeq.current = seq
    let cancelled = false

    setStatus('loading')
    setLoadError(null)

    getMuseum(museumId)
      .then((museum) => {
        if (cancelled || requestSeq.current !== seq) return
        setBundle(fromApiMuseum(museum))
        setStatus('ready')
      })
      .catch((error: unknown) => {
        if (cancelled || requestSeq.current !== seq) return
        setLoadError(isApiError(error) ? messageForCode(error) : 'Could not load these settings.')
        setStatus('error')
      })

    return () => {
      cancelled = true
    }
  }, [museumId, reloadToken])

  const persistDemo = useCallback(
    (next: TenantSettingsBundle) => {
      setBundle(next)
      const stored = readStoredByMuseum()
      writeStoredByMuseum({ ...stored, [museumId ?? DEFAULT_MUSEUM_ID]: next })
    },
    [museumId],
  )

  /**
   * One PATCH per tab. The response is authoritative: re-deriving the whole
   * bundle from it means a server-side normalisation (a trimmed slug, a
   * clamped rate) shows up immediately rather than on the next reload.
   */
  const save = useCallback(
    async (
      patch: UpdateMuseumRequest,
      optimistic: (current: TenantSettingsBundle) => TenantSettingsBundle,
    ): Promise<SettingsSaveResult> => {
      if (!isLiveApi) {
        persistDemo(optimistic(bundle))
        return { ok: true }
      }
      if (museumId === null) {
        return {
          ok: false,
          message: 'No museum is selected for this session.',
          fieldErrors: {},
        }
      }
      try {
        const updated = await updateMuseum(museumId, patch)
        setBundle(fromApiMuseum(updated))
        return { ok: true }
      } catch (error) {
        return toSaveFailure(error)
      }
    },
    [bundle, museumId, persistDemo],
  )

  const canChangeActivation = role === 'SYSTEM_ADMIN'

  return useMemo<TenantSettingsStore>(
    () => ({
      museumId,
      value: bundle,
      status,
      loadError,
      reload,
      canChangeActivation,

      saveMuseum: (next) =>
        save(
          {
            name: next.museumName.trim(),
            slug: next.publicSlug.trim(),
            cityCountry: textOrNull(next.cityCountry),
            // Sending `status` at all is a 403 for a museum admin, so it only
            // goes on the wire when the caller is allowed to change it.
            ...(canChangeActivation
              ? { status: next.isActive ? ('ACTIVE' as const) : ('SUSPENDED' as const) }
              : {}),
          },
          (current) => ({ ...current, museum: next }),
        ),

      saveGate: (next) =>
        save(
          {
            gateMode: next.gateMode === 'staff_assisted' ? 'STAFF_ASSISTED' : 'TICKET_CODE',
            allowedTicketPrefix: textOrNull(next.allowedTicketPrefix),
            // An unparseable box means "leave it alone" rather than "set it to
            // NaN", which the API would reject with an unhelpful message.
            ...(Number.isFinite(Number.parseInt(next.graceWindowMinutes, 10))
              ? { graceWindowMinutes: Number.parseInt(next.graceWindowMinutes, 10) }
              : {}),
            ticketValidationUrl: urlOrNull(next.ticketValidationUrl),
          },
          (current) => ({ ...current, gate: next }),
        ),

      saveGuide: (next) =>
        save(
          {
            personaName: textOrNull(next.personaName),
            guideStyleTone:
              next.styleTone === 'formal'
                ? 'FORMAL'
                : next.styleTone === 'scholarly'
                  ? 'SCHOLARLY'
                  : 'CONVERSATIONAL',
            systemPrompt: textOrNull(next.groundingPolicy),
          },
          (current) => ({ ...current, guide: next }),
        ),

      saveVoice: (next) =>
        save(
          {
            defaultVoiceId: textOrNull(next.defaultVoiceId),
            ...(Number.isFinite(Number.parseFloat(next.speakingRate))
              ? { speakingRate: Number.parseFloat(next.speakingRate) }
              : {}),
            pronunciationHints: textOrNull(next.pronunciationHints),
          },
          (current) => ({ ...current, voice: next }),
        ),
    }),
    [museumId, bundle, status, loadError, reload, canChangeActivation, save],
  )
}

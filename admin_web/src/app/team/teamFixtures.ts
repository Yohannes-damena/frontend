import type { ApiAdminUser } from '../../api/types.ts'

/**
 * Demo seats, shaped exactly like the API's rows so the Team screen renders
 * the same way with or without a backend. Only used when no API base URL is
 * configured.
 */
export const DEMO_TEAM: readonly ApiAdminUser[] = [
  {
    id: 'tm-aster',
    email: 'aster@adwa.local',
    displayName: 'Aster Melesse',
    role: 'MUSEUM_ADMIN',
    status: 'ACTIVE',
    museumId: 'adwa',
    museumName: 'Adwa Memorial Museum',
    lastLoginAt: '2026-07-25T14:40:00.000Z',
    createdAt: '2026-01-12T09:00:00.000Z',
  },
  {
    id: 'tm-dawit',
    email: 'dawit.curator@adwa.local',
    displayName: 'Dawit Gebru',
    role: 'MUSEUM_ADMIN',
    status: 'ACTIVE',
    museumId: 'adwa',
    museumName: 'Adwa Memorial Museum',
    lastLoginAt: '2026-07-25T10:12:00.000Z',
    createdAt: '2026-02-03T09:00:00.000Z',
  },
  {
    id: 'tm-selam',
    email: 'selam.editor@adwa.local',
    displayName: 'Selam Tadesse',
    role: 'MUSEUM_ADMIN',
    status: 'INVITED',
    museumId: 'adwa',
    museumName: 'Adwa Memorial Museum',
    lastLoginAt: null,
    createdAt: '2026-07-20T09:00:00.000Z',
  },
] as const

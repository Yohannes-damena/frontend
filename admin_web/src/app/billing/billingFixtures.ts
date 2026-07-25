import type { ApiBillingStatus, ApiPlan } from '../../api/types.ts'

/**
 * Demo plans and subscription state, shaped exactly like the API's responses.
 * Only used when no API base URL is configured; checkout is disabled in that
 * mode, since there is no payment provider to send anyone to.
 */

export const DEMO_PLANS: readonly ApiPlan[] = [
  {
    tier: 'BASIC',
    displayName: 'Basic',
    description: 'One narrated room, for a single exhibition or a pilot.',
    amountEtb: '1500.00',
    currency: 'ETB',
    periodDays: 30,
    limits: { maxRooms: 1, maxItemsPerRoom: 20, maxAdminUsers: 1 },
  },
  {
    tier: 'PRO',
    displayName: 'Pro',
    description: 'A full permanent collection with a working team.',
    amountEtb: '4500.00',
    currency: 'ETB',
    periodDays: 30,
    limits: { maxRooms: 3, maxItemsPerRoom: 50, maxAdminUsers: 5 },
  },
  {
    tier: 'ENTERPRISE',
    displayName: 'Enterprise',
    description: 'No ceilings on rooms, items, or staff accounts.',
    amountEtb: '12000.00',
    currency: 'ETB',
    periodDays: 30,
    limits: { maxRooms: null, maxItemsPerRoom: null, maxAdminUsers: null },
  },
] as const

export const DEMO_BILLING_STATUS: ApiBillingStatus = {
  museumId: 'adwa',
  tier: 'PRO',
  subscriptionStatus: 'ACTIVE',
  subscriptionRenewsAt: '2026-08-18T00:00:00.000Z',
  daysUntilRenewal: 23,
  limits: { maxRooms: 3, maxItemsPerRoom: 50, maxAdminUsers: 5 },
  usage: { rooms: 3, adminUsers: 3 },
  payments: [
    {
      id: 'pay-003',
      txRef: 'adwa-adwa-PRO-01J4K0DEMO3',
      tier: 'PRO',
      amountEtb: '4500.00',
      status: 'PAID',
      paidAt: '2026-07-19T08:14:00.000Z',
      chapaReference: 'CHAPA-DEMO-8831',
      createdAt: '2026-07-19T08:12:00.000Z',
    },
    {
      id: 'pay-002',
      txRef: 'adwa-adwa-PRO-01J4K0DEMO2',
      tier: 'PRO',
      amountEtb: '4500.00',
      status: 'PAID',
      paidAt: '2026-06-19T09:02:00.000Z',
      chapaReference: 'CHAPA-DEMO-7714',
      createdAt: '2026-06-19T09:00:00.000Z',
    },
    {
      id: 'pay-001',
      txRef: 'adwa-adwa-BASIC-01J4K0DEMO1',
      tier: 'BASIC',
      amountEtb: '1500.00',
      status: 'EXPIRED',
      paidAt: null,
      chapaReference: null,
      createdAt: '2026-05-18T11:40:00.000Z',
    },
  ],
  nextCursor: null,
}

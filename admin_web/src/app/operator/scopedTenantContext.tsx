import { createContext, useContext } from 'react'

export type ScopedTenantContextValue = {
  /** True when an operator is working inside a tenant via /operator/tenant/:id. */
  readonly isScoped: boolean
  /** The museum named by the route. Null under /app, where the token names it. */
  readonly museumId: string | null
  readonly museumName: string | null
  readonly operatorEmail: string | null
  /** Whoever is signed in, operator or museum administrator. */
  readonly viewerEmail: string | null
  /**
   * The museum every tenant screen should actually read and write.
   *
   * For a museum administrator this is their own museum, taken from the
   * session; for an operator it is the one they scoped into. Pages want this
   * one, not `museumId` — which is null under /app and would otherwise have
   * each page re-deriving the same fallback and getting it subtly wrong.
   */
  readonly effectiveMuseumId: string | null
  readonly role: 'MUSEUM_ADMIN' | 'SYSTEM_ADMIN' | null
}

export const scopedTenantContext = createContext<ScopedTenantContextValue>({
  isScoped: false,
  museumId: null,
  museumName: null,
  operatorEmail: null,
  viewerEmail: null,
  effectiveMuseumId: null,
  role: null,
})

export function useScopedTenantContext(): ScopedTenantContextValue {
  return useContext(scopedTenantContext)
}

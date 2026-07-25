import {
  createContext,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useState,
  type FormEvent,
  type ReactElement,
  type ReactNode,
  type SVGProps,
} from 'react'
import {
  BrowserRouter,
  NavLink,
  Navigate,
  Outlet,
  Route,
  Routes,
  useLocation,
  useNavigate,
  useParams,
} from 'react-router-dom'

import { Button, Field, Select, TextInput, ToastProvider } from './kit/index.ts'
import { ItemEditorPage } from './app/items/ItemEditorPage.tsx'
import { RoomItemsListPage } from './app/items/RoomItemsListPage.tsx'
import { NarrationPage } from './app/narration/NarrationPage.tsx'
import { ActivityPage } from './app/activity/ActivityPage.tsx'
import { TenantOverviewPage } from './app/overview/TenantOverviewPage.tsx'
import { AuthoringStoreProvider } from './app/rooms/authoringStore.tsx'
import { RoomEditorPage } from './app/rooms/RoomEditorPage.tsx'
import { RoomsListPage } from './app/rooms/RoomsListPage.tsx'
import { GuideSettingsPage } from './app/settings/GuideSettingsPage.tsx'
import { GateSettingsPage } from './app/settings/GateSettingsPage.tsx'
import { MuseumSettingsPage } from './app/settings/MuseumSettingsPage.tsx'
import { VoiceSettingsPage } from './app/settings/VoiceSettingsPage.tsx'
import { TeamPage } from './app/team/TeamPage.tsx'
import { FleetPage } from './app/operator/FleetPage.tsx'
import { FleetStoreProvider, useFleetStore } from './app/operator/fleetStore.tsx'
import { scopedTenantContext } from './app/operator/scopedTenantContext.tsx'
import { TenantRecordPage } from './app/operator/TenantRecordPage.tsx'
import { HealthPage } from './app/operator/HealthPage.tsx'
import { SpendPage } from './app/operator/SpendPage.tsx'
import { AuditPage } from './app/operator/AuditPage.tsx'
import { AdminsPage } from './app/operator/AdminsPage.tsx'
import { TokenHarnessPage } from './preview/TokenHarnessPage.tsx'
import styles from './app/Phase3App.module.css'

type Role = 'MUSEUM_ADMIN' | 'SYSTEM_ADMIN'

type Session = {
  readonly email: string
  readonly role: Role
}

type SignInInput = {
  readonly email: string
  readonly password: string
  readonly role: Role
}

type AuthContextValue = {
  readonly session: Session | null
  readonly signIn: (input: SignInInput) => { ok: true } | { ok: false; message: string }
  readonly signOut: () => void
}

type NavItemConfig = {
  readonly id: string
  readonly label: string
  readonly icon: ReactElement
  readonly suffix?: number
  readonly path: string
}

type RouteStub = {
  readonly path: string
  readonly title: string
  readonly body: string
}

type ViewportMode = 'wide' | 'desktop' | 'drawer'

const SESSION_KEY = 'adwa.admin.phase3.session'
const SIDEBAR_KEY_PREFIX = 'adwa.admin.phase3.sidebar'
const DEMO_PASSWORD = 'demo123'

const DEMO_ACCOUNTS = [
  { email: 'curator@adwa.local', role: 'MUSEUM_ADMIN' },
  { email: 'operator@adwa.local', role: 'SYSTEM_ADMIN' },
] as const satisfies readonly { email: string; role: Role }[]

const tenantRouteStubs: readonly RouteStub[] = [
  {
    path: 'overview',
    title: 'Overview',
    body: 'Phase 3 placeholder. Tenant overview content lands in Phase 4.',
  },
  {
    path: 'rooms',
    title: 'Rooms',
    body: 'Phase 3 placeholder. Rooms table and editing arrive in Phase 5.',
  },
  {
    path: 'rooms/new',
    title: 'New room',
    body: 'Phase 3 placeholder for room creation routing.',
  },
  {
    path: 'rooms/:roomId',
    title: 'Room detail',
    body: 'Phase 3 placeholder for room detail routing.',
  },
  {
    path: 'rooms/:roomId/items',
    title: 'Room items',
    body: 'Phase 3 placeholder for room-scoped items.',
  },
  {
    path: 'rooms/:roomId/items/:itemId',
    title: 'Item detail',
    body: 'Phase 3 placeholder for item detail routing.',
  },
  {
    path: 'narration',
    title: 'Narration',
    body: 'Phase 3 placeholder. Narration workflows arrive in Phase 6.',
  },
  {
    path: 'team',
    title: 'Team',
    body: 'Phase 3 placeholder. Team management arrives in Phase 6.',
  },
  {
    path: 'activity',
    title: 'Activity',
    body: 'Phase 3 placeholder. Activity feed arrives in Phase 6.',
  },
  {
    path: 'settings/museum',
    title: 'Settings · Museum',
    body: 'Phase 3 placeholder for museum settings routing.',
  },
  {
    path: 'settings/gate',
    title: 'Settings · Gate',
    body: 'Phase 3 placeholder for gate settings routing.',
  },
  {
    path: 'settings/guide',
    title: 'Settings · Guide',
    body: 'Phase 3 placeholder for guide settings routing.',
  },
  {
    path: 'settings/voice',
    title: 'Settings · Voice',
    body: 'Phase 3 placeholder for voice settings routing.',
  },
]

const authContext = createContext<AuthContextValue | null>(null)

function getLandingPath(role: Role): string {
  return role === 'SYSTEM_ADMIN' ? '/operator/fleet' : '/app/overview'
}

function readSession(): Session | null {
  if (typeof window === 'undefined') return null
  const raw = window.localStorage.getItem(SESSION_KEY)
  if (raw === null) return null
  try {
    const parsed = JSON.parse(raw) as { email?: unknown; role?: unknown }
    if (
      typeof parsed.email === 'string' &&
      (parsed.role === 'MUSEUM_ADMIN' || parsed.role === 'SYSTEM_ADMIN')
    ) {
      return { email: parsed.email, role: parsed.role }
    }
  } catch {
    return null
  }
  return null
}

function readSidebarPreference(session: Session | null): boolean | null {
  if (session === null || typeof window === 'undefined') return null
  const key = `${SIDEBAR_KEY_PREFIX}.${session.email}`
  const raw = window.localStorage.getItem(key)
  if (raw === 'collapsed') return true
  if (raw === 'expanded') return false
  return null
}

function writeSidebarPreference(session: Session, collapsed: boolean): void {
  if (typeof window === 'undefined') return
  const key = `${SIDEBAR_KEY_PREFIX}.${session.email}`
  window.localStorage.setItem(key, collapsed ? 'collapsed' : 'expanded')
}

function getViewportMode(width: number): ViewportMode {
  if (width >= 1280) return 'wide'
  if (width >= 1024) return 'desktop'
  return 'drawer'
}

function useViewportMode(): ViewportMode {
  const [mode, setMode] = useState<ViewportMode>(() => {
    if (typeof window === 'undefined') return 'wide'
    return getViewportMode(window.innerWidth)
  })

  useEffect(() => {
    function onResize(): void {
      setMode(getViewportMode(window.innerWidth))
    }

    window.addEventListener('resize', onResize)
    return () => {
      window.removeEventListener('resize', onResize)
    }
  }, [])

  return mode
}

function AuthProvider({ children }: { children: ReactNode }): ReactElement {
  const [session, setSession] = useState<Session | null>(() => readSession())

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      signIn: ({ email, password, role }) => {
        const normalizedEmail = email.trim().toLowerCase()
        const account = DEMO_ACCOUNTS.find((candidate) => candidate.email === normalizedEmail)
        if (password !== DEMO_PASSWORD || account === undefined || account.role !== role) {
          return { ok: false, message: 'Invalid credentials for the selected role.' }
        }
        const next: Session = { email: normalizedEmail, role }
        setSession(next)
        if (typeof window !== 'undefined') {
          window.localStorage.setItem(SESSION_KEY, JSON.stringify(next))
        }
        return { ok: true }
      },
      signOut: () => {
        setSession(null)
        if (typeof window !== 'undefined') {
          window.localStorage.removeItem(SESSION_KEY)
        }
      },
    }),
    [session],
  )

  return <authContext.Provider value={value}>{children}</authContext.Provider>
}

function useAuth(): AuthContextValue {
  const context = useContext(authContext)
  if (context === null) {
    throw new Error('Auth context is unavailable.')
  }
  return context
}

function AppRouter(): ReactElement {
  function renderTenantRoute(stub: RouteStub): ReactElement {
    if (stub.path === 'overview') return <TenantOverviewPage />
    if (stub.path === 'rooms') return <RoomsListPage />
    if (stub.path === 'rooms/new') return <RoomEditorPage mode="create" />
    if (stub.path === 'rooms/:roomId') return <RoomEditorPage mode="edit" />
    if (stub.path === 'rooms/:roomId/items') return <RoomItemsListPage />
    if (stub.path === 'rooms/:roomId/items/:itemId') return <ItemEditorPage />
    if (stub.path === 'narration') return <NarrationPage />
    if (stub.path === 'team') return <TeamPage />
    if (stub.path === 'activity') return <ActivityPage />
    if (stub.path === 'settings/museum') return <MuseumSettingsPage />
    if (stub.path === 'settings/gate') return <GateSettingsPage />
    if (stub.path === 'settings/guide') return <GuideSettingsPage />
    if (stub.path === 'settings/voice') return <VoiceSettingsPage />
    return <PlaceholderPage title={stub.title} body={stub.body} />
  }

  return (
    <Routes>
      <Route path="/" element={<RootRoute />} />
      <Route path="/sign-in" element={<SignInPage />} />
      <Route path="/sign-out" element={<SignOutRoute />} />
      <Route path="/dev/tokens" element={<TokenHarnessPage />} />

      <Route element={<RequireAuth />}>
        <Route element={<FleetStoreBoundary />}>
          <Route path="/app" element={<TenantShell scopedMuseumId={null} />}>
            <Route index element={<Navigate to="overview" replace />} />
            {tenantRouteStubs.map((stub) => (
              <Route key={`tenant-${stub.path}`} path={stub.path} element={renderTenantRoute(stub)} />
            ))}
            <Route path="*" element={<NotFoundPage />} />
          </Route>

          <Route path="/operator" element={<OperatorRoleGuard />}>
            <Route path="tenant/:museumId" element={<TenantShell scopedMuseumId="fromRoute" />}>
              <Route index element={<Navigate to="overview" replace />} />
              {tenantRouteStubs.map((stub) => (
                <Route
                  key={`scoped-tenant-${stub.path}`}
                  path={stub.path}
                  element={renderTenantRoute(stub)}
                />
              ))}
              <Route
                path="*"
                element={
                  <PlaceholderPage
                    title="Scoped tenant route"
                    body="Phase 3 placeholder under /operator/tenant/:museumId/*."
                  />
                }
              />
            </Route>

            <Route element={<OperatorShell />}>
              <Route index element={<Navigate to="fleet" replace />} />
              <Route path="fleet" element={<FleetPage />} />
              <Route path="fleet/new" element={<FleetPage />} />
              <Route path="fleet/:museumId" element={<TenantRecordPage />} />
              <Route path="health" element={<HealthPage />} />
              <Route path="spend" element={<SpendPage />} />
              <Route path="audit" element={<AuditPage />} />
              <Route path="admins" element={<AdminsPage />} />
              <Route
                path="*"
                element={
                  <PlaceholderPage
                    title="Operator route not found"
                    body="This control-plane route is not available in the current phase."
                  />
                }
              />
            </Route>
          </Route>
        </Route>
      </Route>

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}

function RootRoute(): ReactElement {
  const { session } = useAuth()
  if (session === null) return <Navigate to="/sign-in" replace />
  return <Navigate to={getLandingPath(session.role)} replace />
}

function RequireAuth(): ReactElement {
  const { session } = useAuth()
  const location = useLocation()

  if (session === null) {
    return <Navigate to="/sign-in" replace state={{ from: location.pathname }} />
  }
  return <Outlet />
}

function FleetStoreBoundary(): ReactElement {
  return (
    <FleetStoreProvider>
      <Outlet />
    </FleetStoreProvider>
  )
}

function OperatorRoleGuard(): ReactElement {
  const { session } = useAuth()
  if (session?.role === 'MUSEUM_ADMIN') return <NotFoundPage />
  return <Outlet />
}

function SignOutRoute(): ReactElement {
  const { session, signOut } = useAuth()

  useLayoutEffect(() => {
    if (session !== null) {
      signOut()
    }
  }, [session, signOut])

  if (session !== null) {
    return <div className={styles.signInPage} data-plane="tenant" aria-hidden="true" />
  }

  return <Navigate to="/sign-in" replace />
}

function SignInPage(): ReactElement {
  const { session, signIn, signOut } = useAuth()
  const navigate = useNavigate()

  const [email, setEmail] = useState<string>(DEMO_ACCOUNTS[0].email)
  const [password, setPassword] = useState(DEMO_PASSWORD)
  const [role, setRole] = useState<Role>('MUSEUM_ADMIN')
  const [error, setError] = useState<string | null>(null)

  if (session !== null) {
    return (
      <section className={styles.signInPage} data-plane="tenant">
        <div className={styles.signInPanel}>
          <header className={styles.signInHeader}>
            <div className={styles.signInTitleRow}>
              <span className={styles.brandMark} aria-hidden="true">
                A
              </span>
              <p className={`column-header ${styles.muted}`}>Adwa admin web</p>
            </div>
            <h1 className="text-title">Already signed in</h1>
            <p className={`text-body ${styles.muted}`}>
              You are signed in as <strong>{session.email}</strong> ({session.role.replace('_', ' ').toLowerCase()}).
            </p>
          </header>
          <div className={styles.roleButtons}>
            <Button onClick={() => navigate(getLandingPath(session.role), { replace: true })}>
              Continue to dashboard
            </Button>
            <Button
              tone="secondary"
              onClick={() => {
                signOut()
              }}
            >
              Sign out and switch account
            </Button>
          </div>
        </div>
      </section>
    )
  }

  function applyFixture(nextRole: Role): void {
    const account = DEMO_ACCOUNTS.find((candidate) => candidate.role === nextRole)
    if (account !== undefined) {
      setRole(nextRole)
      setEmail(account.email)
      setPassword(DEMO_PASSWORD)
      setError(null)
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault()
    const result = signIn({ email, password, role })
    if (result.ok) {
      navigate(getLandingPath(role), { replace: true })
      return
    }
    setError(result.message)
  }

  return (
    <section className={styles.signInPage} data-plane="tenant">
      <form className={styles.signInPanel} onSubmit={handleSubmit}>
        <header className={styles.signInHeader}>
          <div className={styles.signInTitleRow}>
            <span className={styles.brandMark} aria-hidden="true">
              A
            </span>
            <p className={`column-header ${styles.muted}`}>Adwa admin web</p>
          </div>
          <h1 className="text-title">Sign in</h1>
          <p className={`text-body ${styles.muted}`}>
            Use the demo credentials below. Password for both roles: <strong>{DEMO_PASSWORD}</strong>
          </p>
        </header>

        <div className={styles.roleButtons}>
          <Button tone="secondary" onClick={() => applyFixture('MUSEUM_ADMIN')}>
            Use museum admin
          </Button>
          <Button tone="secondary" onClick={() => applyFixture('SYSTEM_ADMIN')}>
            Use system admin
          </Button>
        </div>

        <div className={styles.fieldStack}>
          <Field id="sign-in-role" label="Role" required>
            {(control) => (
              <Select
                {...control}
                value={role}
                onChange={(nextValue) => setRole(nextValue as Role)}
                options={[
                  { value: 'MUSEUM_ADMIN', label: 'Museum admin' },
                  { value: 'SYSTEM_ADMIN', label: 'System admin' },
                ]}
              />
            )}
          </Field>

          <Field id="sign-in-email" label="Email" required>
            {(control) => (
              <TextInput
                {...control}
                value={email}
                onChange={setEmail}
                autoComplete="email"
                inputMode="email"
                type="email"
              />
            )}
          </Field>

          <Field id="sign-in-password" label="Password" required>
            {(control) => (
              <TextInput
                {...control}
                value={password}
                onChange={setPassword}
                autoComplete="current-password"
                type="password"
              />
            )}
          </Field>
        </div>

        {error !== null ? (
          <p className={`text-caption ${styles.errorText}`} role="alert">
            {error}
          </p>
        ) : null}

        <Button type="submit">Continue</Button>
      </form>
    </section>
  )
}

function PlaceholderPage({ title, body }: { title: string; body: string }): ReactElement {
  return (
    <div className={styles.pageContent}>
      <section className={styles.placeholderCard}>
        <h1 className="text-title">{title}</h1>
        <p className="text-body">{body}</p>
      </section>
    </div>
  )
}

function NotFoundPage(): ReactElement {
  return (
    <div className={styles.notFound} data-plane="tenant">
      <section className={`${styles.placeholderCard} ${styles.notFoundCard}`}>
        <h1 className="text-title">Page not found</h1>
        <p className="text-body">
          This route does not exist in the current admin surface. Use the sidebar or sign in again.
        </p>
      </section>
    </div>
  )
}

function OperatorShell(): ReactElement {
  const { session, signOut } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const viewport = useViewportMode()

  const [search, setSearch] = useState('')
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [accountMenuOpen, setAccountMenuOpen] = useState(false)
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    const pref = readSidebarPreference(session)
    if (pref !== null) return pref
    if (typeof window === 'undefined') return false
    return getViewportMode(window.innerWidth) === 'desktop'
  })

  useEffect(() => {
    if (viewport === 'drawer') {
      setDrawerOpen(false)
      return
    }
    const pref = readSidebarPreference(session)
    if (pref !== null) {
      setCollapsed(pref)
      return
    }
    setCollapsed(viewport === 'desktop')
  }, [session, viewport])

  useEffect(() => {
    if (viewport === 'drawer') {
      setDrawerOpen(false)
      setAccountMenuOpen(false)
    }
  }, [location.pathname, viewport])

  if (session === null) return <Navigate to="/sign-in" replace />

  const isDrawer = viewport === 'drawer'
  const showCollapsedRail = !isDrawer && collapsed
  const primaryItems: readonly NavItemConfig[] = [
    { id: 'fleet', label: 'Fleet', icon: <FleetIcon />, suffix: 42, path: '/operator/fleet' },
    { id: 'health', label: 'Health', icon: <HealthIcon />, suffix: 3, path: '/operator/health' },
    { id: 'spend', label: 'Spend', icon: <SpendIcon />, path: '/operator/spend' },
    { id: 'audit', label: 'Audit', icon: <AuditIcon />, path: '/operator/audit' },
    { id: 'admins', label: 'Admins', icon: <AdminsIcon />, path: '/operator/admins' },
  ]
  const secondaryItems: readonly NavItemConfig[] = [
    { id: 'notices', label: 'Notices', icon: <NoticeIcon />, suffix: 5, path: '/operator/fleet' },
    { id: 'help', label: 'Help', icon: <HelpIcon />, path: '/operator/fleet' },
    { id: 'settings', label: 'Settings', icon: <SettingsIcon />, path: '/operator/fleet' },
  ]

  function toggleCollapse(): void {
    if (session === null) return
    const next = !collapsed
    setCollapsed(next)
    writeSidebarPreference(session, next)
  }

  function handleSignOut(): void {
    signOut()
    navigate('/sign-in', { replace: true })
  }

  const sidebarContent = (
    <aside
      className={`${styles.sidebar} ${showCollapsedRail ? styles.sidebarCollapsed : ''}`}
      aria-label="Control navigation"
    >
      <div className={styles.sidebarHeader}>
        <div className={styles.sidebarBrand}>
          <span className={styles.brandMark} aria-hidden="true">
            A
          </span>
          {!showCollapsedRail ? (
            <strong className={`${styles.sidebarBrandLabel} text-body`}>ADWA OPS</strong>
          ) : null}
        </div>
        {!isDrawer ? (
          <Button
            tone="ghost"
            iconOnly
            compact
            label={showCollapsedRail ? 'Expand sidebar' : 'Collapse sidebar'}
            icon={showCollapsedRail ? <ChevronRightIcon /> : <ChevronLeftIcon />}
            className={styles.collapseButton}
            onClick={toggleCollapse}
          />
        ) : (
          <Button
            tone="ghost"
            iconOnly
            compact
            label="Close drawer"
            icon={<CloseIcon />}
            className={styles.collapseButton}
            onClick={() => setDrawerOpen(false)}
          />
        )}
      </div>

      <div className={showCollapsedRail ? styles.collapsedHidden : ''}>
        <Field id="operator-shell-search" label="Search" labelHidden>
          {(control) => (
            <TextInput
              {...control}
              value={search}
              onChange={setSearch}
              type="search"
              placeholder="Search"
              shortcutHint="Ctrl+K"
              clearable
            />
          )}
        </Field>
      </div>

      <nav className={styles.navGroup}>
        {primaryItems.map((item) => (
          <NavLink
            key={item.id}
            to={item.path}
            className={({ isActive }) => `${styles.navItem} ${isActive ? styles.navItemActive : ''}`}
            title={showCollapsedRail ? item.label : undefined}
          >
            <span className={styles.navItemStart}>
              <span className={styles.iconWrap} aria-hidden="true">
                {item.icon}
              </span>
              {!showCollapsedRail ? <span className={styles.label}>{item.label}</span> : null}
            </span>
            {item.suffix !== undefined ? <span className={styles.countBadge}>{item.suffix}</span> : null}
          </NavLink>
        ))}
      </nav>

      <div className={styles.divider} />

      <nav className={styles.navGroup}>
        {secondaryItems.map((item) => (
          <NavLink
            key={item.id}
            to={item.path}
            className={({ isActive }) => `${styles.navItem} ${isActive ? styles.navItemActive : ''}`}
            title={showCollapsedRail ? item.label : undefined}
          >
            <span className={styles.navItemStart}>
              <span className={styles.iconWrap} aria-hidden="true">
                {item.icon}
              </span>
              {!showCollapsedRail ? <span className={styles.label}>{item.label}</span> : null}
            </span>
            {item.suffix !== undefined ? <span className={styles.countBadge}>{item.suffix}</span> : null}
          </NavLink>
        ))}
      </nav>

      <div className={styles.sidebarFooter}>
        <Button
          tone="ghost"
          className={styles.accountButton}
          aria-expanded={accountMenuOpen}
          aria-haspopup="menu"
          onClick={() => setAccountMenuOpen((open) => !open)}
        >
          <span className={styles.avatar} aria-hidden="true">
            {session.email.slice(0, 2).toUpperCase()}
          </span>
          {!showCollapsedRail ? (
            <span className={styles.accountIdentity}>
              <span className="text-body">{session.email}</span>
              <span className={`text-caption ${styles.muted}`}>{session.role}</span>
            </span>
          ) : null}
        </Button>
        {accountMenuOpen ? (
          <div className={styles.accountMenu} role="menu">
            <p className="text-body">{session.email}</p>
            <p className={`text-caption ${styles.muted}`}>{session.role}</p>
            <Button tone="secondary" onClick={handleSignOut}>
              Sign out
            </Button>
          </div>
        ) : null}
      </div>
    </aside>
  )

  return (
    <div className={styles.tenantShell} data-plane="control">
      {isDrawer ? (
        <>
          {drawerOpen ? <button className={styles.drawerScrim} onClick={() => setDrawerOpen(false)} /> : null}
          {drawerOpen ? <div className={styles.drawerSidebar}>{sidebarContent}</div> : null}
        </>
      ) : (
        sidebarContent
      )}

      <main className={styles.contentRegion}>
        {isDrawer ? (
          <header className={styles.mobileBar}>
            <Button
              tone="ghost"
              iconOnly
              compact
              label="Open menu"
              icon={<MenuIcon />}
              className={styles.menuButton}
              onClick={() => setDrawerOpen(true)}
            />
            <p className="text-body">Control shell</p>
            <span className={styles.collapsedOnly}> </span>
          </header>
        ) : null}
        <Outlet />
      </main>
    </div>
  )
}

function TenantShell({
  scopedMuseumId,
}: {
  scopedMuseumId: 'fromRoute' | null
}): ReactElement {
  const { session, signOut } = useAuth()
  const { getMuseumById } = useFleetStore()
  const navigate = useNavigate()
  const location = useLocation()
  const params = useParams()
  const viewport = useViewportMode()

  const [search, setSearch] = useState('')
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [accountMenuOpen, setAccountMenuOpen] = useState(false)
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    const pref = readSidebarPreference(session)
    if (pref !== null) return pref
    if (typeof window === 'undefined') return false
    return getViewportMode(window.innerWidth) === 'desktop'
  })

  useEffect(() => {
    if (viewport === 'drawer') {
      setDrawerOpen(false)
      return
    }
    const pref = readSidebarPreference(session)
    if (pref !== null) {
      setCollapsed(pref)
      return
    }
    setCollapsed(viewport === 'desktop')
  }, [session, viewport])

  useEffect(() => {
    if (viewport === 'drawer') {
      setDrawerOpen(false)
      setAccountMenuOpen(false)
    }
  }, [location.pathname, viewport])

  const museumId = scopedMuseumId === 'fromRoute' ? (params.museumId ?? null) : null
  const scopedMuseum = museumId === null ? undefined : getMuseumById(museumId)
  const museumName = scopedMuseum?.name ?? (museumId !== null ? museumId : null)
  const isScoped = museumId !== null
  const operatorEmail = isScoped && session !== null ? session.email : null
  const scopedContext = useMemo(
    () => ({
      isScoped,
      museumId,
      museumName,
      operatorEmail,
    }),
    [isScoped, museumId, museumName, operatorEmail],
  )

  if (session === null) return <Navigate to="/sign-in" replace />

  const base = museumId === null ? '/app' : `/operator/tenant/${museumId}`
  const isDrawer = viewport === 'drawer'
  const showCollapsedRail = !isDrawer && collapsed

  const primaryItems: readonly NavItemConfig[] = [
    { id: 'overview', label: 'Overview', icon: <OverviewIcon />, path: `${base}/overview` },
    { id: 'rooms', label: 'Rooms', icon: <RoomsIcon />, suffix: 4, path: `${base}/rooms` },
    { id: 'narration', label: 'Narration', icon: <NarrationIcon />, suffix: 2, path: `${base}/narration` },
    { id: 'team', label: 'Team', icon: <TeamIcon />, path: `${base}/team` },
    { id: 'activity', label: 'Activity', icon: <ActivityIcon />, path: `${base}/activity` },
    { id: 'settings', label: 'Settings', icon: <SettingsIcon />, path: `${base}/settings/museum` },
  ]

  const secondaryItems: readonly NavItemConfig[] = [
    { id: 'notices', label: 'Notices', icon: <NoticeIcon />, suffix: 7, path: `${base}/activity` },
    { id: 'help', label: 'Help', icon: <HelpIcon />, path: `${base}/overview` },
    { id: 'prefs', label: 'Preferences', icon: <SettingsIcon />, path: `${base}/settings/guide` },
  ]

  function toggleCollapse(): void {
    if (session === null) return
    const next = !collapsed
    setCollapsed(next)
    writeSidebarPreference(session, next)
  }

  function handleSignOut(): void {
    signOut()
    navigate('/sign-in', { replace: true })
  }

  const sidebarContent = (
    <aside
      className={`${styles.sidebar} ${showCollapsedRail ? styles.sidebarCollapsed : ''}`}
      aria-label="Tenant navigation"
    >
      <div className={styles.sidebarHeader}>
        <div className={styles.sidebarBrand}>
          <span className={styles.brandMark} aria-hidden="true">
            A
          </span>
          {!showCollapsedRail ? (
            <strong className={`${styles.sidebarBrandLabel} text-body`}>ADWA</strong>
          ) : null}
        </div>
        {!isDrawer ? (
          <Button
            tone="ghost"
            iconOnly
            compact
            label={showCollapsedRail ? 'Expand sidebar' : 'Collapse sidebar'}
            icon={showCollapsedRail ? <ChevronRightIcon /> : <ChevronLeftIcon />}
            className={styles.collapseButton}
            onClick={toggleCollapse}
          />
        ) : (
          <Button
            tone="ghost"
            iconOnly
            compact
            label="Close drawer"
            icon={<CloseIcon />}
            className={styles.collapseButton}
            onClick={() => setDrawerOpen(false)}
          />
        )}
      </div>

      <div className={showCollapsedRail ? styles.collapsedHidden : ''}>
        <Field id="tenant-shell-search" label="Search" labelHidden>
          {(control) => (
            <TextInput
              {...control}
              value={search}
              onChange={setSearch}
              type="search"
              placeholder="Search"
              shortcutHint="Ctrl+K"
              clearable
            />
          )}
        </Field>
      </div>

      <nav className={styles.navGroup}>
        {primaryItems.map((item) => (
          <NavLink
            key={item.id}
            to={item.path}
            className={({ isActive }) => `${styles.navItem} ${isActive ? styles.navItemActive : ''}`}
            end={item.id === 'overview'}
            title={showCollapsedRail ? item.label : undefined}
          >
            <span className={styles.navItemStart}>
              <span className={styles.iconWrap} aria-hidden="true">
                {item.icon}
              </span>
              {!showCollapsedRail ? <span className={styles.label}>{item.label}</span> : null}
            </span>
            {item.suffix !== undefined ? <span className={styles.countBadge}>{item.suffix}</span> : null}
          </NavLink>
        ))}
      </nav>

      <div className={styles.divider} />

      <nav className={styles.navGroup}>
        {secondaryItems.map((item) => (
          <NavLink
            key={item.id}
            to={item.path}
            className={({ isActive }) => `${styles.navItem} ${isActive ? styles.navItemActive : ''}`}
            title={showCollapsedRail ? item.label : undefined}
          >
            <span className={styles.navItemStart}>
              <span className={styles.iconWrap} aria-hidden="true">
                {item.icon}
              </span>
              {!showCollapsedRail ? <span className={styles.label}>{item.label}</span> : null}
            </span>
            {item.suffix !== undefined ? <span className={styles.countBadge}>{item.suffix}</span> : null}
          </NavLink>
        ))}
      </nav>

      <div className={styles.sidebarFooter}>
        <Button
          tone="ghost"
          className={styles.accountButton}
          aria-expanded={accountMenuOpen}
          aria-haspopup="menu"
          onClick={() => setAccountMenuOpen((open) => !open)}
        >
          <span className={styles.avatar} aria-hidden="true">
            {session.email.slice(0, 2).toUpperCase()}
          </span>
          {!showCollapsedRail ? (
            <span className={styles.accountIdentity}>
              <span className="text-body">{session.email}</span>
              <span className={`text-caption ${styles.muted}`}>{session.role}</span>
            </span>
          ) : null}
        </Button>
        {accountMenuOpen ? (
          <div className={styles.accountMenu} role="menu">
            <p className="text-body">{session.email}</p>
            <p className={`text-caption ${styles.muted}`}>{session.role}</p>
            <Button tone="secondary" onClick={handleSignOut}>
              Sign out
            </Button>
          </div>
        ) : null}
      </div>
    </aside>
  )

  return (
    <scopedTenantContext.Provider value={scopedContext}>
      <AuthoringStoreProvider museumId={museumId ?? null}>
        <div className={styles.tenantShellFrame} data-plane="tenant">
          {isScoped ? (
            <header className={styles.scopeBand}>
              <div className={styles.scopeBandCopy}>
                <p className="text-body">
                  Scoped into <span className="museum-name">{museumName}</span>. You are editing tenant data as a
                  platform operator ({session.email}).
                </p>
              </div>
              <Button tone="secondary" compact onClick={() => navigate('/operator/fleet')}>
                Leave tenant
              </Button>
            </header>
          ) : null}

          <div className={styles.tenantShell}>
            {isDrawer ? (
              <>
                {drawerOpen ? <button className={styles.drawerScrim} onClick={() => setDrawerOpen(false)} /> : null}
                {drawerOpen ? (
                  <div className={`${styles.drawerSidebar} ${isScoped ? styles.scopedDrawerSidebar : ''}`}>
                    {sidebarContent}
                  </div>
                ) : null}
              </>
            ) : (
              sidebarContent
            )}

            <main className={styles.contentRegion}>
              {isDrawer ? (
                <header className={styles.mobileBar}>
                  <Button
                    tone="ghost"
                    iconOnly
                    compact
                    label="Open menu"
                    icon={<MenuIcon />}
                    className={styles.menuButton}
                    onClick={() => setDrawerOpen(true)}
                  />
                  <p className="text-body">Tenant shell</p>
                  <span className={styles.collapsedOnly}> </span>
                </header>
              ) : null}
              <Outlet />
            </main>
          </div>
        </div>
      </AuthoringStoreProvider>
    </scopedTenantContext.Provider>
  )
}

function iconBase(props: SVGProps<SVGSVGElement>): ReactElement {
  return (
    <svg
      viewBox="0 0 24 24"
      width="18"
      height="18"
      aria-hidden="true"
      focusable="false"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    />
  )
}

function MenuIcon(): ReactElement {
  return iconBase({
    children: (
      <>
        <path d="M4 7h16" />
        <path d="M4 12h16" />
        <path d="M4 17h16" />
      </>
    ),
  })
}

function CloseIcon(): ReactElement {
  return iconBase({
    children: (
      <>
        <path d="M6 6l12 12" />
        <path d="M18 6l-12 12" />
      </>
    ),
  })
}

function ChevronLeftIcon(): ReactElement {
  return iconBase({ children: <path d="M15 6l-6 6 6 6" /> })
}

function ChevronRightIcon(): ReactElement {
  return iconBase({ children: <path d="M9 6l6 6-6 6" /> })
}

function OverviewIcon(): ReactElement {
  return iconBase({
    children: (
      <>
        <path d="M4 4h7v7H4z" />
        <path d="M13 4h7v4h-7z" />
        <path d="M13 10h7v10h-7z" />
        <path d="M4 13h7v7H4z" />
      </>
    ),
  })
}

function FleetIcon(): ReactElement {
  return iconBase({
    children: (
      <>
        <path d="M4 8h16" />
        <path d="M4 14h16" />
        <path d="M7 5v14" />
        <path d="M17 5v14" />
      </>
    ),
  })
}

function HealthIcon(): ReactElement {
  return iconBase({
    children: (
      <>
        <path d="M4 12h4l2.4-4 3.2 8 2.2-4H20" />
      </>
    ),
  })
}

function SpendIcon(): ReactElement {
  return iconBase({
    children: (
      <>
        <path d="M12 4v16" />
        <path d="M16 8.5c0-1.7-1.8-3-4-3s-4 1.3-4 3 1.8 3 4 3 4 1.3 4 3-1.8 3-4 3-4-1.3-4-3" />
      </>
    ),
  })
}

function AuditIcon(): ReactElement {
  return iconBase({
    children: (
      <>
        <path d="M5 4h14v16H5z" />
        <path d="M8 8h8" />
        <path d="M8 12h8" />
        <path d="M8 16h5" />
      </>
    ),
  })
}

function AdminsIcon(): ReactElement {
  return iconBase({
    children: (
      <>
        <circle cx="9" cy="10" r="2.5" />
        <circle cx="16" cy="9" r="2" />
        <path d="M5.5 18a3.5 3.5 0 0 1 7 0" />
        <path d="M13.5 18a2.8 2.8 0 0 1 5.2-1.4" />
      </>
    ),
  })
}

function RoomsIcon(): ReactElement {
  return iconBase({
    children: (
      <>
        <path d="M4 20h16V4H4z" />
        <path d="M10 4v16" />
      </>
    ),
  })
}

function NarrationIcon(): ReactElement {
  return iconBase({
    children: (
      <>
        <path d="M5 8h14" />
        <path d="M5 12h10" />
        <path d="M5 16h8" />
      </>
    ),
  })
}

function TeamIcon(): ReactElement {
  return iconBase({
    children: (
      <>
        <path d="M16 19a4 4 0 0 0-8 0" />
        <circle cx="12" cy="10" r="3" />
      </>
    ),
  })
}

function ActivityIcon(): ReactElement {
  return iconBase({
    children: (
      <>
        <path d="M4 12h4l2-4 4 8 2-4h4" />
      </>
    ),
  })
}

function SettingsIcon(): ReactElement {
  return iconBase({
    children: (
      <>
        <circle cx="12" cy="12" r="3" />
        <path d="M19 12a7 7 0 0 0-.1-1l2-1.6-2-3.4-2.4 1a8 8 0 0 0-1.8-1L14.3 3h-4.6l-.4 2.9a8 8 0 0 0-1.8 1l-2.4-1-2 3.4L5.1 11a7 7 0 0 0 0 2l-2 1.6 2 3.4 2.4-1a8 8 0 0 0 1.8 1l.4 2.9h4.6l.4-2.9a8 8 0 0 0 1.8-1l2.4 1 2-3.4-2-1.6c.1-.3.1-.7.1-1Z" />
      </>
    ),
  })
}

function NoticeIcon(): ReactElement {
  return iconBase({
    children: (
      <>
        <path d="M12 5a5 5 0 0 0-5 5v3l-2 3h14l-2-3v-3a5 5 0 0 0-5-5Z" />
        <path d="M10 19a2 2 0 0 0 4 0" />
      </>
    ),
  })
}

function HelpIcon(): ReactElement {
  return iconBase({
    children: (
      <>
        <circle cx="12" cy="12" r="8" />
        <path d="M9.5 9.5a2.5 2.5 0 0 1 5 0c0 1.8-2.5 2-2.5 4" />
        <path d="M12 17h.01" />
      </>
    ),
  })
}

function App(): ReactElement {
  return (
    <div className={styles.appRoot}>
      <AuthProvider>
        <ToastProvider>
          <BrowserRouter>
            <AppRouter />
          </BrowserRouter>
        </ToastProvider>
      </AuthProvider>
    </div>
  )
}

export default App

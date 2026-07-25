import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type ReactElement,
} from 'react'
import { useSearchParams } from 'react-router-dom'

import {
  Button,
  ConfirmDialog,
  DataTable,
  Field,
  Panel,
  Select,
  StateBlock,
  StatusBadge,
  TableToolbar,
  TextInput,
  useDataTable,
  useToast,
  type Column,
  type KitState,
  type StatusTone,
} from '../../kit/index.ts'
import { createAdmin, deleteAdmin, listAllAdmins, updateAdmin } from '../../api/adminApi.ts'
import { isLiveApi } from '../../api/config.ts'
import { isApiError, messageForCode } from '../../api/errors.ts'
import type { ApiAdminStatus, ApiAdminUser } from '../../api/types.ts'
import { useFleetStore } from './fleetStore.tsx'
import styles from './OperatorPhase9Pages.module.css'

/**
 * Every administrator account, split by the only distinction that matters
 * operationally: platform operators, who can reach any museum, and museum
 * seats, who cannot leave their own.
 *
 * Role is not editable. Moving somebody between the two planes means deleting
 * the seat and issuing a new one, which is a decision worth making deliberately
 * rather than by changing a dropdown.
 */

const STATUS_LABEL: Readonly<Record<ApiAdminStatus, string>> = {
  ACTIVE: 'Active',
  INVITED: 'Invited',
  SUSPENDED: 'Suspended',
}

const STATUS_TONE: Readonly<Record<ApiAdminStatus, StatusTone>> = {
  ACTIVE: 'success',
  INVITED: 'warning',
  SUSPENDED: 'danger',
}

const MIN_PASSWORD = 12

type OperatorDraft = { readonly displayName: string; readonly email: string; readonly password: string }
type SeatDraft = OperatorDraft & { readonly museumId: string }

const EMPTY_OPERATOR: OperatorDraft = { displayName: '', email: '', password: '' }
const EMPTY_SEAT: SeatDraft = { displayName: '', email: '', password: '', museumId: '' }

function lastSeen(admin: ApiAdminUser): string {
  if (admin.lastLoginAt === null) return 'never signed in'
  return new Date(admin.lastLoginAt).toLocaleString()
}

export function AdminsPage(): ReactElement {
  const { show } = useToast()
  const { museums } = useFleetStore()
  const [searchParams, setSearchParams] = useSearchParams()

  const [admins, setAdmins] = useState<readonly ApiAdminUser[]>([])
  const [status, setStatus] = useState<'loading' | 'ready' | 'error' | 'unavailable'>(
    isLiveApi ? 'loading' : 'unavailable',
  )
  const [error, setError] = useState<string | null>(null)
  const requestSeq = useRef(0)

  const [operatorDraft, setOperatorDraft] = useState<OperatorDraft>(EMPTY_OPERATOR)
  const [seatDraft, setSeatDraft] = useState<SeatDraft>(EMPTY_SEAT)
  const [operatorError, setOperatorError] = useState<string | null>(null)
  const [seatError, setSeatError] = useState<string | null>(null)
  const [creatingOperator, setCreatingOperator] = useState(false)
  const [creatingSeat, setCreatingSeat] = useState(false)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [pendingDelete, setPendingDelete] = useState<ApiAdminUser | null>(null)
  const returnFocusTo = useRef<HTMLElement | null>(null)

  const museumFilter = searchParams.get('museumId') ?? 'all'
  const [seatStatusFilter, setSeatStatusFilter] = useState<ApiAdminStatus | 'all'>('all')

  const load = useCallback(async (): Promise<void> => {
    if (!isLiveApi) return
    const seq = requestSeq.current + 1
    requestSeq.current = seq
    setStatus('loading')
    try {
      const rows = await listAllAdmins()
      if (requestSeq.current !== seq) return
      setAdmins(rows)
      setStatus('ready')
      setError(null)
    } catch (caught) {
      if (requestSeq.current !== seq) return
      setError(isApiError(caught) ? messageForCode(caught) : 'Could not read administrators.')
      setStatus('error')
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const operators = useMemo(
    () => admins.filter((admin) => admin.role === 'SYSTEM_ADMIN'),
    [admins],
  )

  const seats = useMemo(
    () =>
      admins.filter((admin) => {
        if (admin.role !== 'MUSEUM_ADMIN') return false
        if (museumFilter !== 'all' && admin.museumId !== museumFilter) return false
        if (seatStatusFilter !== 'all' && admin.status !== seatStatusFilter) return false
        return true
      }),
    [admins, museumFilter, seatStatusFilter],
  )

  function replaceAdmin(updated: ApiAdminUser): void {
    setAdmins((current) => current.map((row) => (row.id === updated.id ? updated : row)))
  }

  async function changeStatus(admin: ApiAdminUser, next: ApiAdminStatus): Promise<void> {
    setBusyId(admin.id)
    try {
      replaceAdmin(await updateAdmin(admin.id, { status: next }))
      show({
        tone: 'success',
        message:
          next === 'SUSPENDED'
            ? `${admin.email} can no longer sign in.`
            : `${admin.email} can sign in again.`,
      })
    } catch (caught) {
      show({
        tone: 'danger',
        message: isApiError(caught) ? messageForCode(caught) : 'The change did not apply.',
      })
    } finally {
      setBusyId(null)
    }
  }

  async function confirmDelete(): Promise<void> {
    if (pendingDelete === null) return
    const target = pendingDelete
    setBusyId(target.id)
    try {
      await deleteAdmin(target.id)
      setAdmins((current) => current.filter((row) => row.id !== target.id))
      show({ tone: 'success', message: `${target.email} was removed.` })
    } catch (caught) {
      show({
        tone: 'danger',
        // The server refuses to remove a museum's last active administrator or
        // your own account; both arrive here as a 409 worth reading verbatim.
        message: isApiError(caught) ? messageForCode(caught) : 'The account was not removed.',
      })
    } finally {
      setBusyId(null)
      setPendingDelete(null)
    }
  }

  async function submitOperator(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault()
    setCreatingOperator(true)
    setOperatorError(null)
    try {
      const created = await createAdmin({
        email: operatorDraft.email.trim().toLowerCase(),
        password: operatorDraft.password,
        ...(operatorDraft.displayName.trim().length > 0
          ? { displayName: operatorDraft.displayName.trim() }
          : {}),
        role: 'SYSTEM_ADMIN',
      })
      setAdmins((current) => [created, ...current])
      setOperatorDraft(EMPTY_OPERATOR)
      show({ tone: 'success', message: `${created.email} can now sign in as an operator.` })
    } catch (caught) {
      setOperatorError(
        isApiError(caught) ? messageForCode(caught) : 'The operator account was not created.',
      )
    } finally {
      setCreatingOperator(false)
    }
  }

  async function submitSeat(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault()
    setCreatingSeat(true)
    setSeatError(null)
    try {
      const created = await createAdmin({
        email: seatDraft.email.trim().toLowerCase(),
        password: seatDraft.password,
        ...(seatDraft.displayName.trim().length > 0
          ? { displayName: seatDraft.displayName.trim() }
          : {}),
        role: 'MUSEUM_ADMIN',
        museumId: seatDraft.museumId,
      })
      setAdmins((current) => [created, ...current])
      setSeatDraft({ ...EMPTY_SEAT, museumId: seatDraft.museumId })
      show({ tone: 'success', message: `${created.email} was invited to ${created.museumName}.` })
    } catch (caught) {
      setSeatError(isApiError(caught) ? messageForCode(caught) : 'The seat was not created.')
    } finally {
      setCreatingSeat(false)
    }
  }

  const identityColumn: Column<ApiAdminUser> = {
    id: 'identity',
    header: 'Account',
    sortable: true,
    sortValue: (row) => row.displayName ?? row.email,
    cell: (row) => (
      <div className={styles.rowMeta}>
        <span className="text-body">{row.displayName ?? row.email}</span>
        {row.displayName !== null ? (
          <span className={`text-caption ${styles.muted}`}>{row.email}</span>
        ) : null}
      </div>
    ),
  }

  const statusColumn: Column<ApiAdminUser> = {
    id: 'status',
    header: 'Status',
    sortable: true,
    sortValue: (row) => STATUS_LABEL[row.status],
    cell: (row) => <StatusBadge tone={STATUS_TONE[row.status]} label={STATUS_LABEL[row.status]} />,
  }

  const lastSeenColumn: Column<ApiAdminUser> = {
    id: 'lastSeen',
    header: 'Last sign-in',
    sortable: true,
    sortValue: (row) => row.lastLoginAt ?? '',
    cell: (row) => <span className={`text-caption ${styles.monoDate}`}>{lastSeen(row)}</span>,
  }

  const operatorColumns = useMemo<readonly Column<ApiAdminUser>[]>(
    () => [identityColumn, statusColumn, lastSeenColumn],
    // These cells read only from their row, so they never need rebuilding.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  )

  const seatColumns = useMemo<readonly Column<ApiAdminUser>[]>(
    () => [
      {
        id: 'museum',
        header: 'Museum',
        sortable: true,
        sortValue: (row) => row.museumName ?? '',
        cell: (row) => <span className="museum-name">{row.museumName ?? 'Unassigned'}</span>,
      },
      identityColumn,
      statusColumn,
      lastSeenColumn,
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  )

  const operatorTable = useDataTable({
    rows: operators,
    rowKey: (row) => row.id,
    columns: operatorColumns,
    pageSize: 6,
    searchFields: [(row) => row.displayName ?? '', (row) => row.email],
    initialSort: { columnId: 'identity', direction: 'ascending' },
  })

  const seatTable = useDataTable({
    rows: seats,
    rowKey: (row) => row.id,
    columns: seatColumns,
    pageSize: 8,
    searchFields: [(row) => row.museumName ?? '', (row) => row.displayName ?? '', (row) => row.email],
    initialSort: { columnId: 'museum', direction: 'ascending' },
  })

  const pageState: KitState =
    status === 'loading'
      ? { kind: 'loading', label: 'administrators' }
      : status === 'unavailable'
        ? {
            kind: 'integrationPending',
            dependency: 'Admin API',
            body: 'Accounts live in the backend, so managing them needs a configured API base URL.',
            stillUsable: 'The rest of the console runs against demo fixtures.',
          }
        : status === 'error'
          ? {
              kind: 'failure',
              title: 'Could not read administrators',
              body: error ?? 'The request failed.',
              retry: { label: 'Try again', onAct: () => void load() },
            }
          : { kind: 'ready' }

  function rowActions(row: ApiAdminUser): ReactElement {
    return (
      <div className={styles.rowActions}>
        {row.status === 'SUSPENDED' ? (
          <Button
            tone="secondary"
            compact
            disabled={busyId === row.id}
            onClick={() => void changeStatus(row, 'ACTIVE')}
          >
            Reinstate
          </Button>
        ) : (
          <Button
            tone="danger"
            compact
            disabled={busyId === row.id}
            onClick={() => void changeStatus(row, 'SUSPENDED')}
          >
            Suspend
          </Button>
        )}
        <Button
          tone="ghost"
          compact
          disabled={busyId === row.id}
          onClick={(event) => {
            returnFocusTo.current = event.currentTarget
            setPendingDelete(row)
          }}
        >
          Remove
        </Button>
      </div>
    )
  }

  return (
    <div className={styles.page}>
      <header className={styles.headerCard}>
        <h1 className="text-title">Admins</h1>
        <p className={`text-body ${styles.muted}`}>
          Platform operators and museum seats. Suspending an account refuses its next sign-in and
          invalidates the session it is holding.
        </p>
        <p className={`text-caption ${styles.muted}`}>
          A new account is created with a password you set and share out of band — there is no
          invitation email in this system.
        </p>
      </header>

      {pageState.kind !== 'ready' ? (
        <StateBlock state={pageState} size="region" />
      ) : (
        <>
          <section className={styles.gridTwo}>
            <form className={styles.formCard} onSubmit={(event) => void submitOperator(event)}>
              <p className="text-subtitle">Create operator account</p>
              <p className={`text-caption ${styles.muted}`}>
                Operators can read and change every museum. Keep this list short.
              </p>
              <div className={styles.formGrid}>
                <Field id="operator-create-name" label="Name" markOptional>
                  {(control) => (
                    <TextInput
                      {...control}
                      value={operatorDraft.displayName}
                      onChange={(value) =>
                        setOperatorDraft((current) => ({ ...current, displayName: value }))
                      }
                      placeholder="Operator name"
                    />
                  )}
                </Field>
                <Field id="operator-create-email" label="Email" required>
                  {(control) => (
                    <TextInput
                      {...control}
                      type="email"
                      autoComplete="off"
                      value={operatorDraft.email}
                      onChange={(value) =>
                        setOperatorDraft((current) => ({ ...current, email: value }))
                      }
                      placeholder="operator@adwa.local"
                    />
                  )}
                </Field>
                <Field
                  id="operator-create-password"
                  label="Temporary password"
                  required
                  hint={`At least ${MIN_PASSWORD} characters.`}
                >
                  {(control) => (
                    <TextInput
                      {...control}
                      type="password"
                      autoComplete="new-password"
                      value={operatorDraft.password}
                      onChange={(value) =>
                        setOperatorDraft((current) => ({ ...current, password: value }))
                      }
                    />
                  )}
                </Field>

                {operatorError !== null ? (
                  <StateBlock
                    size="inline"
                    state={{
                      kind: 'failure',
                      title: 'Could not create the operator',
                      body: operatorError,
                    }}
                  />
                ) : null}

                <div className={styles.statusRow}>
                  <Button
                    type="submit"
                    disabled={
                      creatingOperator ||
                      operatorDraft.email.trim().length === 0 ||
                      operatorDraft.password.length < MIN_PASSWORD
                    }
                  >
                    {creatingOperator ? 'Creating…' : 'Create operator'}
                  </Button>
                </div>
              </div>
            </form>

            <form className={styles.formCard} onSubmit={(event) => void submitSeat(event)}>
              <p className="text-subtitle">Create museum-admin seat</p>
              <p className={`text-caption ${styles.muted}`}>
                A seat can only ever reach the museum it belongs to.
              </p>
              <div className={styles.formGrid}>
                <Field id="seat-create-museum" label="Museum" required>
                  {(control) => (
                    <Select
                      {...control}
                      value={seatDraft.museumId}
                      onChange={(value) =>
                        setSeatDraft((current) => ({ ...current, museumId: value }))
                      }
                      placeholder="Select a museum"
                      options={museums.map((museum) => ({
                        value: museum.id,
                        label: museum.name,
                      }))}
                    />
                  )}
                </Field>
                <Field id="seat-create-name" label="Name" markOptional>
                  {(control) => (
                    <TextInput
                      {...control}
                      value={seatDraft.displayName}
                      onChange={(value) =>
                        setSeatDraft((current) => ({ ...current, displayName: value }))
                      }
                      placeholder="Administrator name"
                    />
                  )}
                </Field>
                <Field id="seat-create-email" label="Email" required>
                  {(control) => (
                    <TextInput
                      {...control}
                      type="email"
                      autoComplete="off"
                      value={seatDraft.email}
                      onChange={(value) => setSeatDraft((current) => ({ ...current, email: value }))}
                      placeholder="curator@museum.example"
                    />
                  )}
                </Field>
                <Field
                  id="seat-create-password"
                  label="Temporary password"
                  required
                  hint={`At least ${MIN_PASSWORD} characters.`}
                >
                  {(control) => (
                    <TextInput
                      {...control}
                      type="password"
                      autoComplete="new-password"
                      value={seatDraft.password}
                      onChange={(value) =>
                        setSeatDraft((current) => ({ ...current, password: value }))
                      }
                    />
                  )}
                </Field>

                {seatError !== null ? (
                  <StateBlock
                    size="inline"
                    state={{ kind: 'failure', title: 'Could not create the seat', body: seatError }}
                  />
                ) : null}

                <div className={styles.statusRow}>
                  <Button
                    type="submit"
                    disabled={
                      creatingSeat ||
                      seatDraft.museumId === '' ||
                      seatDraft.email.trim().length === 0 ||
                      seatDraft.password.length < MIN_PASSWORD
                    }
                  >
                    {creatingSeat ? 'Creating…' : 'Create seat'}
                  </Button>
                </div>
              </div>
            </form>
          </section>

          <Panel title="Operator accounts" description="Full access to every museum in the fleet.">
            <DataTable
              caption="Operator account list"
              columns={operatorColumns}
              rows={operatorTable.pageRows}
              rowKey={(row) => row.id}
              sort={operatorTable.sort}
              onSortChange={operatorTable.setSort}
              pagination={operatorTable.pagination}
              toolbar={
                <TableToolbar
                  searchValue={operatorTable.searchQuery}
                  onSearchChange={operatorTable.setSearchQuery}
                  searchLabel="Search operators"
                  searchPlaceholder="Search by name or email"
                  actions={<p className="text-caption">{operatorTable.total} operator accounts</p>}
                />
              }
              rowActions={rowActions}
              stickyHeader
            />
          </Panel>

          <Panel
            title="Museum-admin seats"
            description="Each seat is scoped to one museum and cannot see any other."
          >
            <div className={styles.filtersRow}>
              <Field id="seat-museum-filter" label="Museum">
                {(control) => (
                  <Select
                    {...control}
                    value={museumFilter}
                    onChange={(value) =>
                      setSearchParams(value === 'all' ? {} : { museumId: value }, { replace: true })
                    }
                    options={[
                      { value: 'all', label: 'All museums' },
                      ...museums.map((museum) => ({ value: museum.id, label: museum.name })),
                    ]}
                  />
                )}
              </Field>
              <Field id="seat-status-filter" label="Seat status">
                {(control) => (
                  <Select
                    {...control}
                    value={seatStatusFilter}
                    onChange={(value) => setSeatStatusFilter(value as ApiAdminStatus | 'all')}
                    options={[
                      { value: 'all', label: 'All seat statuses' },
                      { value: 'ACTIVE', label: 'Active' },
                      { value: 'INVITED', label: 'Invited' },
                      { value: 'SUSPENDED', label: 'Suspended' },
                    ]}
                  />
                )}
              </Field>
            </div>
            <DataTable
              caption="Museum admin seats"
              columns={seatColumns}
              rows={seatTable.pageRows}
              rowKey={(row) => row.id}
              sort={seatTable.sort}
              onSortChange={seatTable.setSort}
              pagination={seatTable.pagination}
              toolbar={
                <TableToolbar
                  searchValue={seatTable.searchQuery}
                  onSearchChange={seatTable.setSearchQuery}
                  searchLabel="Search seats"
                  searchPlaceholder="Search museum, name, or email"
                  actions={<p className="text-caption">{seatTable.total} seats in current view</p>}
                />
              }
              rowActions={rowActions}
              stickyHeader
            />
          </Panel>
        </>
      )}

      <ConfirmDialog
        open={pendingDelete !== null}
        title="Remove administrator"
        entityName={pendingDelete?.email ?? 'Account'}
        consequence="will be deleted. Their audit history stays, but the account cannot be restored — issue a new one instead."
        confirmLabel={busyId !== null && pendingDelete !== null ? 'Removing…' : 'Remove account'}
        tone="danger"
        onConfirm={() => void confirmDelete()}
        onCancel={() => setPendingDelete(null)}
        returnFocusTo={returnFocusTo}
      />
    </div>
  )
}

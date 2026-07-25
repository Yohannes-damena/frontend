import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type ReactElement,
} from 'react'

import {
  Button,
  ConfirmDialog,
  DataTable,
  Field,
  Panel,
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
import { addMuseumAdmin, deleteAdmin, listAllAdmins, updateAdmin } from '../../api/adminApi.ts'
import { isLiveApi } from '../../api/config.ts'
import { isApiError, messageForCode } from '../../api/errors.ts'
import type { ApiAdminStatus, ApiAdminUser } from '../../api/types.ts'
import { useScopedTenantContext } from '../operator/scopedTenantContext.tsx'
import { DEMO_TEAM } from './teamFixtures.ts'
import styles from './TeamPage.module.css'

/**
 * This museum's own administrators. Every seat here has the same rights —
 * there is one role inside a museum, and pretending otherwise with curator or
 * editor labels would promise access control the backend does not implement.
 *
 * A new seat is created with a password set here and shared out of band; there
 * is no invitation email in this system.
 */

const MIN_PASSWORD = 12

const STATUS_LABEL: Readonly<Record<ApiAdminStatus, string>> = {
  ACTIVE: 'Active',
  INVITED: 'Invited, never signed in',
  SUSPENDED: 'Suspended',
}

const STATUS_TONE: Readonly<Record<ApiAdminStatus, StatusTone>> = {
  ACTIVE: 'success',
  INVITED: 'warning',
  SUSPENDED: 'danger',
}

type InviteDraft = {
  readonly displayName: string
  readonly email: string
  readonly password: string
}

const EMPTY_INVITE: InviteDraft = { displayName: '', email: '', password: '' }

function lastSeen(member: ApiAdminUser): string {
  if (member.lastLoginAt === null) return 'Never'
  return new Date(member.lastLoginAt).toLocaleString()
}

export function TeamPage(): ReactElement {
  const { show } = useToast()
  const scoped = useScopedTenantContext()
  const museumId = scoped.effectiveMuseumId

  const [members, setMembers] = useState<readonly ApiAdminUser[]>(isLiveApi ? [] : DEMO_TEAM)
  const [status, setStatus] = useState<'loading' | 'ready' | 'error' | 'demo'>(
    isLiveApi ? 'loading' : 'demo',
  )
  const [error, setError] = useState<string | null>(null)
  const requestSeq = useRef(0)

  const [draft, setDraft] = useState<InviteDraft>(EMPTY_INVITE)
  const [inviteError, setInviteError] = useState<string | null>(null)
  const [inviting, setInviting] = useState(false)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [pendingRemove, setPendingRemove] = useState<ApiAdminUser | null>(null)
  const returnFocusTo = useRef<HTMLElement | null>(null)

  const load = useCallback(async (): Promise<void> => {
    if (!isLiveApi) return
    const seq = requestSeq.current + 1
    requestSeq.current = seq
    setStatus('loading')
    try {
      // The token scopes this to one museum; museumId is only meaningful when
      // an operator is scoped into a tenant.
      const rows = await listAllAdmins({ museumId })
      if (requestSeq.current !== seq) return
      setMembers(rows)
      setStatus('ready')
      setError(null)
    } catch (caught) {
      if (requestSeq.current !== seq) return
      setError(isApiError(caught) ? messageForCode(caught) : 'Could not read the team.')
      setStatus('error')
    }
  }, [museumId])

  useEffect(() => {
    void load()
  }, [load])

  const activeCount = useMemo(
    () => members.filter((member) => member.status === 'ACTIVE').length,
    [members],
  )

  async function changeStatus(member: ApiAdminUser, next: ApiAdminStatus): Promise<void> {
    setBusyId(member.id)
    try {
      const updated = await updateAdmin(member.id, { status: next })
      setMembers((current) => current.map((row) => (row.id === updated.id ? updated : row)))
      show({
        tone: 'success',
        message:
          next === 'SUSPENDED'
            ? `${member.email} can no longer sign in.`
            : `${member.email} can sign in again.`,
      })
    } catch (caught) {
      show({
        tone: 'danger',
        // A 409 here is usually "this is the last active administrator", which
        // is worth showing verbatim rather than paraphrasing.
        message: isApiError(caught) ? messageForCode(caught) : 'The change did not apply.',
      })
    } finally {
      setBusyId(null)
    }
  }

  async function confirmRemove(): Promise<void> {
    if (pendingRemove === null) return
    const target = pendingRemove
    setBusyId(target.id)
    try {
      await deleteAdmin(target.id)
      setMembers((current) => current.filter((row) => row.id !== target.id))
      show({ tone: 'success', message: `${target.email} was removed from the team.` })
    } catch (caught) {
      show({
        tone: 'danger',
        message: isApiError(caught) ? messageForCode(caught) : 'The account was not removed.',
      })
    } finally {
      setBusyId(null)
      setPendingRemove(null)
    }
  }

  async function submitInvite(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault()
    if (museumId === null) return
    setInviting(true)
    setInviteError(null)
    try {
      await addMuseumAdmin(museumId, {
        email: draft.email.trim().toLowerCase(),
        password: draft.password,
        ...(draft.displayName.trim().length > 0 ? { displayName: draft.displayName.trim() } : {}),
      })
      setDraft(EMPTY_INVITE)
      show({ tone: 'success', message: `${draft.email.trim()} can now sign in to this museum.` })
      // The create response is a thin summary rather than a full row, so the
      // list is re-read instead of being patched with a half-shaped record.
      await load()
    } catch (caught) {
      setInviteError(isApiError(caught) ? messageForCode(caught) : 'The account was not created.')
    } finally {
      setInviting(false)
    }
  }

  const columns = useMemo<readonly Column<ApiAdminUser>[]>(
    () => [
      {
        id: 'name',
        header: 'Staff',
        sortable: true,
        sortValue: (member) => member.displayName ?? member.email,
        cell: (member) => (
          <div className={styles.identityCell}>
            <p className="text-body">{member.displayName ?? member.email}</p>
            {member.displayName !== null ? (
              <p className={`text-caption ${styles.muted}`}>{member.email}</p>
            ) : null}
          </div>
        ),
      },
      {
        id: 'status',
        header: 'Status',
        sortable: true,
        sortValue: (member) => member.status,
        cell: (member) => (
          <StatusBadge tone={STATUS_TONE[member.status]} label={STATUS_LABEL[member.status]} />
        ),
      },
      {
        id: 'added',
        header: 'Added',
        sortable: true,
        sortValue: (member) => member.createdAt,
        cell: (member) => (
          <span className={`text-caption ${styles.muted}`}>
            {new Date(member.createdAt).toLocaleDateString()}
          </span>
        ),
      },
      {
        id: 'lastActive',
        header: 'Last sign-in',
        sortable: true,
        sortValue: (member) => member.lastLoginAt ?? '',
        cell: (member) => <span className={`text-caption ${styles.muted}`}>{lastSeen(member)}</span>,
      },
    ],
    [],
  )

  const table = useDataTable({
    rows: members,
    rowKey: (member) => member.id,
    columns,
    pageSize: 8,
    searchFields: [(member) => member.displayName ?? '', (member) => member.email],
    initialSort: { columnId: 'name', direction: 'ascending' },
  })

  const pageState: KitState =
    status === 'loading'
      ? { kind: 'loading', label: 'the team' }
      : status === 'error'
        ? {
            kind: 'failure',
            title: 'Could not read the team',
            body: error ?? 'The request failed.',
            retry: { label: 'Try again', onAct: () => void load() },
          }
        : { kind: 'ready' }

  function rowActions(member: ApiAdminUser): ReactElement | null {
    // Your own row has no actions: the server refuses to let you suspend or
    // delete yourself, so offering the buttons would only produce an error.
    if (scoped.viewerEmail !== null && member.email === scoped.viewerEmail) {
      return <span className={`text-caption ${styles.muted}`}>You</span>
    }
    return (
      <div className={styles.rowActions}>
        {member.status === 'SUSPENDED' ? (
          <Button
            tone="secondary"
            compact
            disabled={busyId === member.id}
            onClick={() => void changeStatus(member, 'ACTIVE')}
          >
            Reinstate
          </Button>
        ) : (
          <Button
            tone="danger"
            compact
            disabled={busyId === member.id}
            onClick={() => void changeStatus(member, 'SUSPENDED')}
          >
            Suspend
          </Button>
        )}
        <Button
          tone="ghost"
          compact
          disabled={busyId === member.id}
          onClick={(event) => {
            returnFocusTo.current = event.currentTarget
            setPendingRemove(member)
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
        <div>
          <h1 className="text-title">Team</h1>
          <p className={`text-body ${styles.muted}`}>
            Everyone who can sign in to this museum. {activeCount} of {members.length}{' '}
            {members.length === 1 ? 'account is' : 'accounts are'} active. Every seat has the same
            rights inside the museum and none can reach another.
          </p>
          {scoped.isScoped ? (
            <p className={`text-caption ${styles.muted}`}>
              You are scoped in as {scoped.operatorEmail}; your operator account is not a seat here
              and does not appear below.
            </p>
          ) : null}
        </div>
      </header>

      {pageState.kind !== 'ready' ? (
        <StateBlock state={pageState} size="region" />
      ) : (
        <>
          <Panel
            title="Add a team member"
            description="Set a temporary password and pass it on yourself — nothing is emailed."
          >
            <form className={styles.inviteForm} onSubmit={(event) => void submitInvite(event)}>
              <Field id="team-invite-name" label="Name" markOptional>
                {(control) => (
                  <TextInput
                    {...control}
                    value={draft.displayName}
                    onChange={(value) => setDraft((current) => ({ ...current, displayName: value }))}
                    placeholder="Full name"
                  />
                )}
              </Field>
              <Field id="team-invite-email" label="Email" required>
                {(control) => (
                  <TextInput
                    {...control}
                    type="email"
                    autoComplete="off"
                    value={draft.email}
                    onChange={(value) => setDraft((current) => ({ ...current, email: value }))}
                    placeholder="curator@museum.example"
                  />
                )}
              </Field>
              <Field
                id="team-invite-password"
                label="Temporary password"
                required
                hint={`At least ${MIN_PASSWORD} characters.`}
              >
                {(control) => (
                  <TextInput
                    {...control}
                    type="password"
                    autoComplete="new-password"
                    value={draft.password}
                    onChange={(value) => setDraft((current) => ({ ...current, password: value }))}
                  />
                )}
              </Field>

              {inviteError !== null ? (
                <StateBlock
                  size="inline"
                  state={{
                    kind: 'failure',
                    title: 'Could not add this person',
                    body: inviteError,
                  }}
                />
              ) : null}

              <div className={styles.inviteActions}>
                <Button
                  type="submit"
                  disabled={
                    inviting ||
                    museumId === null ||
                    draft.email.trim().length === 0 ||
                    draft.password.length < MIN_PASSWORD
                  }
                >
                  {inviting ? 'Adding…' : 'Add to team'}
                </Button>
              </div>
            </form>
          </Panel>

          <Panel>
            <DataTable
              caption="Museum team"
              columns={columns}
              rows={table.pageRows}
              rowKey={(member) => member.id}
              sort={table.sort}
              onSortChange={table.setSort}
              pagination={table.pagination}
              toolbar={
                <TableToolbar
                  searchValue={table.searchQuery}
                  onSearchChange={table.setSearchQuery}
                  searchLabel="Search team members"
                  searchPlaceholder="Search by name or email"
                  actions={<p className="text-caption">{table.total} staff accounts</p>}
                />
              }
              rowActions={rowActions}
              stickyHeader
            />
          </Panel>
        </>
      )}

      <ConfirmDialog
        open={pendingRemove !== null}
        title="Remove team member"
        entityName={pendingRemove?.email ?? 'Account'}
        consequence="will lose access immediately. The changes they already made stay in the activity history, but the account cannot be restored — add a new one instead."
        confirmLabel={busyId !== null && pendingRemove !== null ? 'Removing…' : 'Remove account'}
        tone="danger"
        onConfirm={() => void confirmRemove()}
        onCancel={() => setPendingRemove(null)}
        returnFocusTo={returnFocusTo}
      />
    </div>
  )
}

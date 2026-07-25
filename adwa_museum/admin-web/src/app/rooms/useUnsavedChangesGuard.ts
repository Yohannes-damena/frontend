import { useEffect, useMemo, useState } from 'react'
import { useBlocker } from 'react-router-dom'

type UnsavedGuardResult = {
  readonly navigationConfirmOpen: boolean
  readonly stayOnPage: () => void
  readonly leavePage: () => void
}

/**
 * Blocks in-app route transitions while dirty and exposes modal controls.
 * Also wires a browser unload prompt for tab close / hard reload.
 */
export function useUnsavedChangesGuard(isDirty: boolean): UnsavedGuardResult {
  const blocker = useBlocker(
    useMemo(
      () =>
        ({ currentLocation, nextLocation }) =>
          isDirty && currentLocation.pathname !== nextLocation.pathname,
      [isDirty],
    ),
  )
  const [navigationConfirmOpen, setNavigationConfirmOpen] = useState(false)

  useEffect(() => {
    if (blocker.state === 'blocked') {
      setNavigationConfirmOpen(true)
    }
  }, [blocker.state])

  useEffect(() => {
    if (!isDirty || typeof window === 'undefined') return
    const onBeforeUnload = (event: BeforeUnloadEvent): void => {
      event.preventDefault()
      event.returnValue = ''
    }
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => {
      window.removeEventListener('beforeunload', onBeforeUnload)
    }
  }, [isDirty])

  function stayOnPage(): void {
    setNavigationConfirmOpen(false)
    if (blocker.state === 'blocked') blocker.reset()
  }

  function leavePage(): void {
    setNavigationConfirmOpen(false)
    if (blocker.state === 'blocked') blocker.proceed()
  }

  return { navigationConfirmOpen, stayOnPage, leavePage }
}

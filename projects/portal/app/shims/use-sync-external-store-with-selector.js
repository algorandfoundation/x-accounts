import { useRef, useSyncExternalStore } from 'react'

export function useSyncExternalStoreWithSelector(subscribe, getSnapshot, getServerSnapshot, selector, isEqual) {
  const selectorRef = useRef(selector)
  const isEqualRef = useRef(isEqual)
  const prevRef = useRef(undefined)
  const prevSnapshotRef = useRef(undefined)
  const serverRef = useRef(undefined)
  const serverSnapshotRef = useRef(undefined)
  selectorRef.current = selector
  isEqualRef.current = isEqual

  function getSelection() {
    const snapshot = getSnapshot()
    if (snapshot === prevSnapshotRef.current && prevRef.current !== undefined) return prevRef.current
    const next = selectorRef.current(snapshot)
    if (prevRef.current !== undefined && isEqualRef.current && isEqualRef.current(prevRef.current, next))
      return prevRef.current
    prevSnapshotRef.current = snapshot
    prevRef.current = next
    return next
  }

  function getServerSelection() {
    const snapshot = getServerSnapshot()
    if (snapshot === serverSnapshotRef.current && serverRef.current !== undefined) return serverRef.current
    const next = selectorRef.current(snapshot)
    serverSnapshotRef.current = snapshot
    serverRef.current = next
    return next
  }

  return useSyncExternalStore(subscribe, getSelection, getServerSnapshot ? getServerSelection : undefined)
}

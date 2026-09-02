import { useEffect } from 'react'

export type GraphStepDirection = 'previous' | 'next'

export interface GraphKeyboardCommands {
  onHorizontalStep?: (direction: GraphStepDirection, event: KeyboardEvent) => boolean | void
  onVerticalStep?: (direction: GraphStepDirection, event: KeyboardEvent) => boolean | void
}

function isEditableTarget(target: EventTarget | null) {
  return target instanceof HTMLElement && Boolean(target.closest('input, textarea, select, [contenteditable="true"]'))
}

/**
 * Maps the shared graph navigation axes to a graph's own state transitions.
 * The hook is intentionally graph-agnostic so future visualizations can opt in
 * without sharing commute-specific quantity or mode assumptions.
 */
export function useGraphKeyboard({
  enabled = true,
  onHorizontalStep,
  onVerticalStep,
}: GraphKeyboardCommands & { enabled?: boolean }) {
  useEffect(() => {
    if (!enabled) return

    function onKeyDown(event: KeyboardEvent) {
      if (event.metaKey || event.ctrlKey || event.altKey || isEditableTarget(event.target)) return
      const direction = event.key === 'ArrowLeft' || event.key === 'ArrowUp' ? 'previous' : 'next'
      const handler = event.key === 'ArrowLeft' || event.key === 'ArrowRight'
        ? onHorizontalStep
        : event.key === 'ArrowUp' || event.key === 'ArrowDown'
          ? onVerticalStep
          : undefined
      if (!handler) return
      if (handler(direction, event) === false) return
      event.preventDefault()
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [enabled, onHorizontalStep, onVerticalStep])
}

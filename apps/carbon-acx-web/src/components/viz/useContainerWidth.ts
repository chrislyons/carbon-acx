'use client'

import { useEffect, useRef, useState, type RefObject } from 'react'

export function useContainerWidth<T extends HTMLElement>(): { ref: RefObject<T | null>; width: number } {
  const ref = useRef<T | null>(null)
  const [width, setWidth] = useState(0)

  useEffect(() => {
    const element = ref.current
    if (!element) return

    const readWidth = () => {
      setWidth(Math.max(0, element.getBoundingClientRect().width))
    }

    readWidth()
    if (typeof ResizeObserver !== 'undefined') {
      const observer = new ResizeObserver(([entry]) => {
        setWidth(Math.max(0, entry?.contentRect.width ?? 0))
      })
      observer.observe(element)
      return () => observer.disconnect()
    }

    window.addEventListener('resize', readWidth)
    return () => window.removeEventListener('resize', readWidth)
  }, [])

  return { ref, width }
}

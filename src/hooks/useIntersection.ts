import { useEffect, useState, RefObject } from 'react'

export function useIntersection(
  ref: RefObject<HTMLElement>,
  options?: IntersectionObserverInit
): IntersectionObserverEntry | null {
  const [entry, setEntry] = useState<IntersectionObserverEntry | null>(null)

  useEffect(() => {
    const element = ref.current
    if (!element || typeof IntersectionObserver !== 'object') {
      return
    }

    const observer = new IntersectionObserver(([entry]) => {
      setEntry(entry)
    }, options)

    observer.observe(element)

    return () => {
      setEntry(null)
      observer.disconnect()
    }
  }, [ref, options])

  return entry
}
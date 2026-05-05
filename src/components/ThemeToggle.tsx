import React, { useEffect, useMemo, useRef, useState } from 'react'
import {
  type ThemeName,
  type UserTheme,
  useThemeStore,
} from '../stores/themeStore'

const THEME_META: Record<
  ThemeName,
  { icon: string; label: 'CREAM' | 'NAVY' | 'FOREST' }
> = {
  light: { icon: '☀', label: 'CREAM' },
  'dark-navy': { icon: '◗', label: 'NAVY' },
  'dark-forest': { icon: '❋', label: 'FOREST' },
}

const OPTIONS: { value: UserTheme; label: string }[] = [
  { value: 'auto', label: 'AUTO' },
  { value: 'light', label: 'CREAM' },
  { value: 'dark-navy', label: 'NAVY' },
  { value: 'dark-forest', label: 'FOREST' },
]

const ThemeToggle: React.FC = () => {
  const { userTheme, effectiveTheme, cycleTheme, setUserTheme } = useThemeStore(
    (state) => ({
      userTheme: state.userTheme,
      effectiveTheme: state.effectiveTheme,
      cycleTheme: state.cycleTheme,
      setUserTheme: state.setUserTheme,
    })
  )
  const [open, setOpen] = useState(false)
  const longPressRef = useRef<number | null>(null)
  const didLongPressRef = useRef(false)
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const close = (event: MouseEvent) => {
      if (rootRef.current?.contains(event.target as Node)) return
      setOpen(false)
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [])

  const activeMeta = THEME_META[effectiveTheme]
  const title = useMemo(() => {
    const next = {
      auto: 'cream',
      light: 'navy',
      'dark-navy': 'forest',
      'dark-forest': 'auto',
    }[userTheme]
    return `Theme: ${userTheme.toUpperCase()} · click to cycle to ${next}`
  }, [userTheme])

  const clearLongPress = () => {
    if (longPressRef.current !== null) {
      window.clearTimeout(longPressRef.current)
      longPressRef.current = null
    }
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => {
          if (didLongPressRef.current) {
            didLongPressRef.current = false
            return
          }
          cycleTheme()
        }}
        onContextMenu={(event) => {
          event.preventDefault()
          setOpen((prev) => !prev)
        }}
        onPointerDown={() => {
          clearLongPress()
          didLongPressRef.current = false
          longPressRef.current = window.setTimeout(() => {
            didLongPressRef.current = true
            setOpen(true)
          }, 360)
        }}
        onPointerUp={clearLongPress}
        onPointerLeave={clearLongPress}
        onPointerCancel={clearLongPress}
        className="relative flex h-10 w-10 items-center justify-center border-[3px] border-ink text-[20px] leading-none"
        style={{
          background: 'var(--accent-yellow)',
          color: 'var(--ink-fixed)',
          boxShadow: '4px 4px 0 var(--shadow)',
        }}
        title={title}
        aria-label="Toggle theme"
      >
        <span aria-hidden="true">{activeMeta.icon}</span>
        {userTheme === 'auto' && (
          <span
            className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center border-2 border-ink bg-accent px-[3px] font-display text-[8px] leading-none text-white"
            style={{ boxShadow: '2px 2px 0 var(--shadow)' }}
          >
            A
          </span>
        )}
      </button>

      {open && (
        <div
          className="absolute right-0 top-[calc(100%+8px)] z-[220] flex w-44 flex-col gap-2 border-[3px] border-ink bg-paper p-2"
          style={{ boxShadow: '6px 6px 0 var(--shadow)' }}
        >
          {OPTIONS.map((option) => {
            const isActive = userTheme === option.value
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  setUserTheme(option.value)
                  setOpen(false)
                }}
                className="brutal-btn flex items-center justify-between px-3 py-2 font-display text-[10px] tracking-[0.12em]"
                style={{
                  background: isActive ? 'var(--accent)' : 'var(--paper-2)',
                  color: isActive ? '#fff' : 'var(--ink)',
                }}
              >
                <span>{option.label}</span>
                <span>
                  {option.value === 'auto'
                    ? `A ${THEME_META[effectiveTheme].icon}`
                    : THEME_META[option.value].icon}
                </span>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default ThemeToggle

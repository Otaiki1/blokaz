import { create } from 'zustand'

export type ThemeName = 'light' | 'dark-navy' | 'dark-forest'
export type UserTheme = 'auto' | ThemeName
export type ThemeMode =
  | 'lobby'
  | 'classic'
  | 'tournaments'
  | 'tournament-play'
  | 'leaderboard'
  | 'payouts'
  | 'admin'

const STORAGE_KEY = 'blokaz:theme'
const TRANSITION_MS = 180

// When userTheme is 'auto', all pages use the same base theme derived from
// the OS preference — no per-page theme switching. Light OS → light,
// dark OS → dark-navy. Users who want a specific look pick it in Settings.
const getOsTheme = (): ThemeName => {
  if (typeof window === 'undefined') return 'light'
  return window.matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark-navy'
    : 'light'
}

const CYCLE_ORDER: UserTheme[] = ['auto', 'light', 'dark-navy', 'dark-forest']

const isUserTheme = (value: string | null): value is UserTheme =>
  value === 'auto' ||
  value === 'light' ||
  value === 'dark-navy' ||
  value === 'dark-forest'

const computeInitialUserTheme = (): UserTheme => {
  if (typeof window === 'undefined') return 'auto'
  const stored = window.localStorage.getItem(STORAGE_KEY)
  if (isUserTheme(stored)) return stored
  return 'auto'
}

// Mode theme is now always the OS theme — page navigation no longer
// changes the active theme when the user is on 'auto'.
const getModeTheme = (_mode: ThemeMode): ThemeName => getOsTheme()

const getEffectiveTheme = (userTheme: UserTheme, modeTheme: ThemeName) =>
  userTheme === 'auto' ? modeTheme : userTheme

const applyTheme = (
  effectiveTheme: ThemeName,
  userTheme: UserTheme,
  modeTheme: ThemeName
) => {
  if (typeof window === 'undefined') return
  const html = document.documentElement
  html.classList.add('theme-transitioning')
  html.dataset.theme = effectiveTheme
  window.localStorage.setItem(STORAGE_KEY, userTheme)
  window.dispatchEvent(
    new CustomEvent('themechange', {
      detail: { theme: effectiveTheme, userTheme, modeTheme },
    })
  )
  window.setTimeout(
    () => html.classList.remove('theme-transitioning'),
    TRANSITION_MS
  )
}

interface ThemeState {
  userTheme: UserTheme
  mode: ThemeMode
  modeTheme: ThemeName
  effectiveTheme: ThemeName
  initialized: boolean
  initialize: (mode?: ThemeMode) => void
  setUserTheme: (theme: UserTheme) => void
  cycleTheme: () => void
  setMode: (mode: ThemeMode) => void
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  userTheme: 'auto',
  mode: 'lobby',
  modeTheme: getModeTheme('lobby'),
  effectiveTheme: 'light',
  initialized: false,

  initialize: (mode = 'lobby') => {
    const userTheme = computeInitialUserTheme()
    const modeTheme = getModeTheme(mode)
    const effectiveTheme = getEffectiveTheme(userTheme, modeTheme)
    set({
      userTheme,
      mode,
      modeTheme,
      effectiveTheme,
      initialized: true,
    })
    applyTheme(effectiveTheme, userTheme, modeTheme)

    // Keep 'auto' in sync if the user changes their OS dark/light preference
    if (typeof window !== 'undefined') {
      window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
        const { userTheme: current, mode: currentMode } = useThemeStore.getState()
        if (current === 'auto') {
          const newModeTheme = getModeTheme(currentMode)
          const newEffective = getEffectiveTheme('auto', newModeTheme)
          set({ modeTheme: newModeTheme, effectiveTheme: newEffective })
          applyTheme(newEffective, 'auto', newModeTheme)
        }
      })
    }
  },

  setUserTheme: (userTheme) => {
    const { modeTheme } = get()
    const effectiveTheme = getEffectiveTheme(userTheme, modeTheme)
    set({ userTheme, effectiveTheme })
    applyTheme(effectiveTheme, userTheme, modeTheme)
  },

  cycleTheme: () => {
    const { userTheme, setUserTheme } = get()
    const currentIndex = CYCLE_ORDER.indexOf(userTheme)
    const nextTheme = CYCLE_ORDER[(currentIndex + 1) % CYCLE_ORDER.length]
    setUserTheme(nextTheme)
  },

  setMode: (mode) => {
    const { userTheme } = get()
    const modeTheme = getModeTheme(mode)
    const effectiveTheme = getEffectiveTheme(userTheme, modeTheme)
    set({ mode, modeTheme, effectiveTheme })
    applyTheme(effectiveTheme, userTheme, modeTheme)
  },
}))

export const initializeThemeStore = (mode?: ThemeMode) => {
  const state = useThemeStore.getState()
  if (state.initialized) return
  state.initialize(mode)
}

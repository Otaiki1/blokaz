import { useThemeStore } from '../stores/themeStore'

export function useTheme() {
  return useThemeStore((state) => ({
    userTheme: state.userTheme,
    modeTheme: state.modeTheme,
    effectiveTheme: state.effectiveTheme,
    isDark: state.effectiveTheme !== 'light',
    setUserTheme: state.setUserTheme,
    cycleTheme: state.cycleTheme,
    setMode: state.setMode,
  }))
}

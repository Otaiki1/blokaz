import { IS_MINIPAY } from '../utils/miniPay'

const vibrate = (pattern: number | number[]) => {
  if (IS_MINIPAY && typeof navigator !== 'undefined' && navigator.vibrate) {
    navigator.vibrate(pattern)
  }
}

export function hapticSelection(): void {
  vibrate(10)
}

export function hapticImpact(): void {
  vibrate(20)
}

export function hapticNotification(): void {
  vibrate([20, 10, 20])
}

export function hapticError(): void {
  vibrate([30, 15, 30, 15, 30])
}

// Power-up activation haptics — each one communicates the feel of the power
export function hapticPowerUp(type: 'scoreBoost' | 'shield' | 'bomb' | 'rotatePass'): void {
  switch (type) {
    case 'scoreBoost': vibrate([20, 10, 20, 10, 60]);              break // charge-up pulse
    case 'shield':     vibrate([90]);                               break // heavy solid thud
    case 'bomb':       vibrate([10, 8, 15, 10, 30, 15, 100]);      break // building to explosion
    case 'rotatePass': vibrate([18, 10, 18, 10, 18]);              break // three mechanical clicks
  }
}

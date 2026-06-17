import { create } from 'zustand'

export type PowerUpId = 'scoreBoost' | 'shield' | 'bomb' | 'rotatePass'

export const POWER_UP_META: Record<PowerUpId | 'revivalBundle', {
  label: string
  icon: string
  description: string
  shortDesc: string
}> = {
  revivalBundle: {
    label: 'REVIVAL BUNDLE',
    icon: '❤️',
    description: 'Stack 3 extra revival credits. Use them anytime you hit game over to keep your run alive.',
    shortDesc: '+3 extra lives',
  },
  scoreBoost: {
    label: 'SCORE BOOST',
    icon: '⚡',
    description: 'Activates ×2 base points for every piece you place — for one full game.',
    shortDesc: '×2 base pts / game',
  },
  shield: {
    label: 'SHIELD',
    icon: '🛡️',
    description: 'Prevents one game-over. Auto-triggers, clears your 3 most-blocked columns, deals fresh pieces, and preserves your combo streak.',
    shortDesc: 'Clear 3 cols + keep combo',
  },
  bomb: {
    label: 'BOMB',
    icon: '💣',
    description: 'Tap any cell to blast the entire row and column simultaneously. 5 pts per cell, feeds your combo. Use with Score Boost for ×3 cell points.',
    shortDesc: 'Full cross blast + combo',
  },
  rotatePass: {
    label: 'ROTATE PASS',
    icon: '🔄',
    description: 'Unlock piece rotation for one session. Rotate any piece up to 3 times before placing.',
    shortDesc: 'Rotate pieces this session',
  },
}

export interface Inventory {
  revivalBundle: number
  scoreBoost: number
  shield: number
  bomb: number
  rotatePass: number
}

export interface FreeTries {
  scoreBoost: number
  shield: number
  bomb: number
  rotatePass: number
}

// What's active in the current game
export interface ActivePowerUps {
  scoreBoost: boolean
  shieldCount: number    // shields remaining this game
  bombCount: number      // bombs remaining this game
  rotatePassActive: boolean
}

const FREE_TRIES_INITIAL: FreeTries = { scoreBoost: 3, shield: 3, bomb: 3, rotatePass: 3 }
const INVENTORY_INITIAL: Inventory = { revivalBundle: 0, scoreBoost: 0, shield: 0, bomb: 0, rotatePass: 0 }
const ACTIVE_INITIAL: ActivePowerUps = { scoreBoost: false, shieldCount: 0, bombCount: 0, rotatePassActive: false }

const freeTryKey = (addr: string) => `blokaz:ft:${addr.toLowerCase()}`
const inventoryKey = (addr: string) => `blokaz:inv:${addr.toLowerCase()}`

function loadFreeTries(address: string): FreeTries {
  try {
    const raw = localStorage.getItem(freeTryKey(address))
    if (!raw) return { ...FREE_TRIES_INITIAL }
    return { ...FREE_TRIES_INITIAL, ...JSON.parse(raw) }
  } catch { return { ...FREE_TRIES_INITIAL } }
}

function saveFreeTries(address: string, ft: FreeTries) {
  try { localStorage.setItem(freeTryKey(address), JSON.stringify(ft)) } catch {}
}

function loadInventory(address: string): Inventory {
  try {
    const raw = localStorage.getItem(inventoryKey(address))
    if (!raw) return { ...INVENTORY_INITIAL }
    return { ...INVENTORY_INITIAL, ...JSON.parse(raw) }
  } catch { return { ...INVENTORY_INITIAL } }
}

function saveInventory(address: string, inv: Inventory) {
  try { localStorage.setItem(inventoryKey(address), JSON.stringify(inv)) } catch {}
}

interface PowerUpState {
  freeTries: FreeTries
  inventory: Inventory
  active: ActivePowerUps
  bombModeActive: boolean       // true while player is targeting a bomb zone
  currentAddress: string | null

  // Lifecycle
  loadForAddress: (address: string) => void
  resetActive: () => void

  // Charges = freeTries[id] + inventory[id] for power-ups; inventory.revivalBundle for revivals
  getCharges: (id: PowerUpId | 'revivalBundle') => number

  // Deduct one charge (freeTries first, then inventory). Returns false if none available.
  consumeCharge: (id: PowerUpId | 'revivalBundle') => boolean

  // Called after a successful purchase
  addInventory: (id: PowerUpId | 'revivalBundle', qty: number) => void

  // In-game activation
  activateScoreBoost: () => boolean
  activateShield: () => boolean
  activateBomb: () => boolean
  activateRotatePass: () => boolean
  enterBombMode: () => void
  exitBombMode: () => void
  exitRotateMode: () => void

  // Called by the game engine when shield auto-triggers on game-over
  triggerShield: () => boolean

  // Called after bomb fires
  consumeBomb: () => void
}

export const usePowerUpStore = create<PowerUpState>((set, get) => ({
  freeTries: { ...FREE_TRIES_INITIAL },
  inventory: { ...INVENTORY_INITIAL },
  active: { ...ACTIVE_INITIAL },
  bombModeActive: false,
  currentAddress: null,

  loadForAddress: (address) => {
    const ft = loadFreeTries(address)
    const inv = loadInventory(address)
    set({ freeTries: ft, inventory: inv, currentAddress: address, active: { ...ACTIVE_INITIAL }, bombModeActive: false })
  },

  resetActive: () => set({ active: { ...ACTIVE_INITIAL }, bombModeActive: false }),

  getCharges: (id) => {
    const { freeTries, inventory } = get()
    if (id === 'revivalBundle') return inventory.revivalBundle
    return freeTries[id as PowerUpId] + inventory[id as PowerUpId]
  },

  consumeCharge: (id) => {
    const { freeTries, inventory, currentAddress } = get()
    if (!currentAddress) return false
    if (id === 'revivalBundle') {
      if (inventory.revivalBundle <= 0) return false
      const newInv = { ...inventory, revivalBundle: inventory.revivalBundle - 1 }
      saveInventory(currentAddress, newInv)
      set({ inventory: newInv })
      return true
    }
    const pid = id as PowerUpId
    if (freeTries[pid] > 0) {
      const newFt = { ...freeTries, [pid]: freeTries[pid] - 1 }
      saveFreeTries(currentAddress, newFt)
      set({ freeTries: newFt })
      return true
    }
    if (inventory[pid] > 0) {
      const newInv = { ...inventory, [pid]: inventory[pid] - 1 }
      saveInventory(currentAddress, newInv)
      set({ inventory: newInv })
      return true
    }
    return false
  },

  addInventory: (id, qty) => {
    const { inventory, currentAddress } = get()
    if (!currentAddress) return
    const newInv = { ...inventory, [id]: (inventory[id as keyof Inventory] ?? 0) + qty }
    saveInventory(currentAddress, newInv)
    set({ inventory: newInv })
  },

  activateScoreBoost: () => {
    const { active, consumeCharge } = get()
    if (active.scoreBoost) return false   // already active
    if (!consumeCharge('scoreBoost')) return false
    set({ active: { ...active, scoreBoost: true } })
    return true
  },

  activateShield: () => {
    const { active, consumeCharge } = get()
    if (!consumeCharge('shield')) return false
    set({ active: { ...active, shieldCount: active.shieldCount + 1 } })
    return true
  },

  activateBomb: () => {
    const { active, consumeCharge } = get()
    if (!consumeCharge('bomb')) return false
    set({ active: { ...active, bombCount: active.bombCount + 1 }, bombModeActive: true })
    return true
  },

  activateRotatePass: () => {
    const { active, getCharges } = get()
    if (active.rotatePassActive) return false
    if (getCharges('rotatePass') <= 0) return false
    // Charge is consumed per-rotation in handleRotatePiece, not here
    set({ active: { ...active, rotatePassActive: true } })
    return true
  },

  enterBombMode: () => set({ bombModeActive: true }),
  exitBombMode: () => set({ bombModeActive: false }),
  exitRotateMode: () => {
    const { active } = get()
    set({ active: { ...active, rotatePassActive: false } })
  },

  triggerShield: () => {
    const { active } = get()
    if (active.shieldCount <= 0) return false
    set({ active: { ...active, shieldCount: active.shieldCount - 1 } })
    return true
  },

  consumeBomb: () => {
    const { active } = get()
    set({ active: { ...active, bombCount: Math.max(0, active.bombCount - 1) }, bombModeActive: false })
  },
}))

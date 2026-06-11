import React from 'react'

interface Props {
  count: number
  onOpen: () => void
  onDismiss: () => void
}

const RewardsMiniBar: React.FC<Props> = ({ count, onOpen, onDismiss }) => {
  return (
    <div
      style={{
        position: 'fixed',
        bottom: 88,
        right: 16,
        zIndex: 999,
        display: 'flex',
        alignItems: 'center',
        gap: 0,
      }}
    >
      {/* Main bar */}
      <button
        onClick={onOpen}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          background: '#f5c518',
          border: '3px solid #111',
          borderRight: 'none',
          padding: '10px 14px',
          boxShadow: '4px 4px 0 #111',
          cursor: 'pointer',
          fontFamily: 'var(--font-display, "Archivo Black", sans-serif)',
          fontSize: 13,
          fontWeight: 900,
          color: '#111',
          textTransform: 'uppercase' as const,
          letterSpacing: '0.12em',
          whiteSpace: 'nowrap' as const,
        }}
      >
        <span style={{ fontSize: 20, lineHeight: 1 }}>🏆</span>
        <span>CLAIM REWARD</span>
        <span
          style={{
            background: '#111',
            color: '#f5c518',
            fontFamily: 'var(--font-display, "Archivo Black", sans-serif)',
            fontSize: 11,
            fontWeight: 900,
            padding: '2px 7px',
            minWidth: 22,
            textAlign: 'center' as const,
            display: 'inline-block',
          }}
        >
          {count}
        </span>
      </button>

      {/* Dismiss button */}
      <button
        onClick={onDismiss}
        style={{
          background: '#111',
          border: '3px solid #111',
          borderLeft: '2px solid #333',
          padding: '10px 10px',
          boxShadow: '4px 4px 0 #111',
          cursor: 'pointer',
          fontFamily: 'var(--font-display, "Archivo Black", sans-serif)',
          fontSize: 12,
          fontWeight: 900,
          color: '#f5c518',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%',
        }}
      >
        ✕
      </button>
    </div>
  )
}

export default RewardsMiniBar

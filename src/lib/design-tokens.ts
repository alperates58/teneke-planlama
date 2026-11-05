/**
 * ALPER DESIGN OS — Canonical Design Tokens & System Constants
 * Doğrudan `alper-design-os/design-core` spesifikasyonundan aktarılmıştır.
 */

export const ALPER_TOKENS = {
  colors: {
    brand: {
      primary: '#0284c7', // Sky-600
      primaryHover: '#0369a1',
      primarySubtle: '#0c4a6e', // Sky-950/80
      primaryText: '#38bdf8',
    },
    surface: {
      base: '#090d16',      // Base workbench canvas
      layer1: '#111827',    // Sidebar, panels, headers
      layer2: '#1f2937',    // Cards, inputs, table hovers
      layer3: '#374151',    // Dropdown popovers, active highlights
      border: '#374151',    // Structural separator border
      borderSubtle: '#1f2937',
    },
    status: {
      scheduled: '#10b981', // Emerald - on-time / normal scheduled
      scheduledBg: 'rgba(16, 185, 129, 0.12)',
      delayed: '#f59e0b',   // Amber - warning / delayed
      delayedBg: 'rgba(245, 158, 11, 0.12)',
      violation: '#ef4444', // Rose - constraint violation / overload
      violationBg: 'rgba(239, 68, 68, 0.15)',
      frozen: '#6366f1',    // Indigo - locked / reference snapshot
      frozenBg: 'rgba(99, 102, 241, 0.12)',
      neutral: '#94a3b8',
      neutralBg: 'rgba(148, 163, 184, 0.10)',
    },
    text: {
      primary: '#f8fafc',
      secondary: '#94a3b8',
      muted: '#64748b',
      inverse: '#090d16',
    },
  },
  typography: {
    fontMono: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
    fontSans: 'Inter, system-ui, -apple-system, Segoe UI, Roboto, sans-serif',
  },
  radius: {
    sm: '0.25rem', // 4px
    md: '0.375rem', // 6px
    lg: '0.5rem', // 8px
  },
  limits: {
    maxUniqueColors: 6,
    defaultMinPrintSheets: 1250,
  }
} as const;

import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        workbench: {
          base: '#090d16',
          'layer-1': '#111827',
          'layer-2': '#1f2937',
          border: '#374151',
          'border-subtle': '#1f2937',
        },
        brand: {
          primary: '#0284c7',
          'primary-hover': '#0369a1',
          'primary-subtle': '#e0f2fe',
        },
        status: {
          scheduled: '#10b981',
          delayed: '#f59e0b',
          violation: '#ef4444',
          frozen: '#6366f1',
        },
      },
      fontFamily: {
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
        sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
    },
  },
  plugins: [],
};

export default config;

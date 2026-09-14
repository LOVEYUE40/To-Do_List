/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ['class'],
  content: ['./src/renderer/index.html', './src/renderer/src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        accent: 'rgb(var(--accent-rgb) / <alpha-value>)',
        accent2: 'rgb(var(--accent-2-rgb) / <alpha-value>)',
        glow: 'rgb(var(--glow-rgb) / <alpha-value>)',
        surface: 'rgb(var(--surface-rgb) / <alpha-value>)',
        ink: 'rgb(var(--ink-rgb) / <alpha-value>)',
        muted: 'rgb(var(--muted-rgb) / <alpha-value>)',
        subtle: 'rgb(var(--subtle-rgb) / <alpha-value>)',
        line: 'rgb(var(--line-rgb) / <alpha-value>)'
      },
      borderRadius: {
        widget: '22px',
        card: '16px',
        pill: '999px'
      },
      boxShadow: {
        glass: '0 18px 60px -24px rgba(0,0,0,0.55), 0 2px 0 0 rgba(255,255,255,0.06) inset',
        soft: '0 10px 30px -18px rgba(0,0,0,0.5)',
        glow: '0 0 0 1px rgb(var(--accent-rgb) / 0.35), 0 12px 40px -18px rgb(var(--accent-rgb) / 0.7)'
      },
      // 补全 0-100 的不透明度档位，保证 bg-line/8、border-line/12 等写法稳定生效
      opacity: Object.fromEntries(Array.from({ length: 101 }, (_, index) => [String(index), String(index / 100)])),
      keyframes: {
        'fade-in': {
          from: { opacity: '0', transform: 'translateY(4px)' },
          to: { opacity: '1', transform: 'translateY(0)' }
        },
        'pop-in': {
          from: { opacity: '0', transform: 'scale(0.96)' },
          to: { opacity: '1', transform: 'scale(1)' }
        },
        breathe: {
          '0%, 100%': { boxShadow: '0 0 0 1px rgb(var(--accent-rgb) / 0.45)' },
          '50%': { boxShadow: '0 0 0 5px rgb(var(--accent-rgb) / 0.12)' }
        },
        drift: {
          '0%, 100%': { transform: 'translate3d(0,0,0) scale(1)' },
          '50%': { transform: 'translate3d(2%, -3%, 0) scale(1.08)' }
        }
      },
      animation: {
        'fade-in': 'fade-in 220ms ease-out both',
        'pop-in': 'pop-in 140ms ease-out both',
        breathe: 'breathe 2.4s ease-in-out infinite',
        drift: 'drift 18s ease-in-out infinite'
      }
    }
  },
  plugins: [require('tailwindcss-animate')]
}

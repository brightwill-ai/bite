/** @type {import('tailwindcss').Config} */
module.exports = {
  theme: {
    extend: {
      colors: {
        bg: '#EDECEA',
        surface: '#F5F4F1',
        surface2: '#FFFFFF',
        border: '#E0DDD9',
        ink: '#1A1816',
        muted: '#6B6760',
        faint: '#A8A49F',
        popular: '#D4622A',
        success: '#3A7D52',
        error: '#C0392B',
      },
      fontFamily: {
        display: ['Fraunces', 'serif'],
        sans: ['DM Sans', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      borderRadius: {
        DEFAULT: '12px',
        sm: '8px',
        lg: '16px',
        xl: '20px',
        full: '9999px',
      },
    },
  },
}

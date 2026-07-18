/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Primary SRHR Teal
        'srhr': {
          DEFAULT: '#2A9D8F',
          dark: '#0F766E',
          light: '#5FC8BA',
        },
        // Cool Gray Scale - Warm, eye-friendly tones
        'cool': {
          50: '#F5F5F0',   // Warm background - easier on eyes
          100: '#EDE9E0',   // Subtle warm backgrounds
          200: '#E2DFD8',   // Borders/Dividers
          300: '#CBC7C1',   // Disabled states
          400: '#9E9A94',   // Placeholder text
          500: '#6B6864',   // Secondary text
          600: '#4A4744',   // Muted text
          700: '#3D3B38',   // Primary text
          800: '#292725',   // Strong text
          900: '#1A1917',   // Headlines
          950: '#0D0C0B',   // Darkest
        },
        // Status indicators (exceptions - keep these)
        'status': {
          online: '#22C55E',
          away: '#F59E0B',
          offline: '#EF4444',
        }
      },
      fontFamily: {
        sans: ['Poppins', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      fontSize: {
        'xs': ['0.75rem', { lineHeight: '1rem' }],
        'sm': ['0.875rem', { lineHeight: '1.25rem' }],
        'base': ['0.9375rem', { lineHeight: '1.5rem' }],
        'lg': ['1.0625rem', { lineHeight: '1.625rem' }],
        'xl': ['1.25rem', { lineHeight: '1.875rem' }],
        '2xl': ['1.5rem', { lineHeight: '2rem' }],
      },
      borderRadius: {
        '2xl': '16px',
      },
      boxShadow: {
        'soft': '0 2px 8px rgba(15, 23, 42, 0.08)',
        'card': '0 2px 12px rgba(15, 23, 42, 0.06)',
      }
    },
  },
  plugins: [],
}

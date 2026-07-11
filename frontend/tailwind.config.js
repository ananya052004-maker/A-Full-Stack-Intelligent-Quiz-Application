/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}', './public/index.html'],
  theme: {
    extend: {
      colors: {
        // Quorum brand — keeps the original dark-slate identity,
        // adds an indigo accent for a more modern, live feel.
        slateink: {
          DEFAULT: '#282c34', // original navbar/footer color
          700: '#2f3542',
          800: '#22262d',
          900: '#181b21',
        },
        quorum: {
          50: '#eef0ff',
          100: '#e0e3ff',
          400: '#818cf8',
          500: '#6366f1', // primary accent
          600: '#4f46e5',
          700: '#4338ca',
        },
      },
      fontFamily: {
        sans: ['Segoe UI', 'system-ui', 'Avenir', 'Helvetica', 'Arial', 'sans-serif'],
      },
      boxShadow: {
        card: '0 4px 20px rgba(40, 44, 52, 0.08)',
      },
      keyframes: {
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        'fade-up': 'fade-up 0.5s ease-out both',
      },
    },
  },
  plugins: [],
};

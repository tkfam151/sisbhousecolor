/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './admin/index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', '"SF Pro Text"', 'Inter', '"Helvetica Neue"', 'Arial', 'sans-serif'],
        display: ['-apple-system', 'BlinkMacSystemFont', '"SF Pro Display"', 'Inter', '"Helvetica Neue"', 'Arial', 'sans-serif'],
      },
      colors: {
        paper: '#F5F5F7',
        ink: '#1D1D1F',
        mute: '#6E6E73',
        accent: { DEFAULT: '#0071E3', hover: '#0077ED' },
        navy: { DEFAULT: '#1D1D1F', light: '#333336' },
      },
      boxShadow: {
        card: '0 1px 2px rgba(0,0,0,0.04), 0 6px 24px rgba(0,0,0,0.05)',
        float: '0 12px 40px rgba(0,0,0,0.14)',
      },
      borderRadius: {
        card: '22px',
      },
      keyframes: {
        'toast-in': {
          '0%': { opacity: '0', transform: 'translate(-50%, -24px) scale(0.92)' },
          '100%': { opacity: '1', transform: 'translate(-50%, 0) scale(1)' },
        },
        'pop': {
          '0%': { transform: 'scale(1)' },
          '40%': { transform: 'scale(1.12)' },
          '100%': { transform: 'scale(1)' },
        },
        'slide-in-right': {
          '0%': { transform: 'translateX(100%)' },
          '100%': { transform: 'translateX(0)' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'stripes': {
          '0%': { backgroundPosition: '0 0' },
          '100%': { backgroundPosition: '40px 0' },
        },
      },
      animation: {
        'toast-in': 'toast-in 420ms cubic-bezier(.2,.9,.3,1.3) both',
        'pop': 'pop 600ms ease-out',
        'slide-in-right': 'slide-in-right 260ms ease-out both',
        'fade-in': 'fade-in 200ms ease-out both',
        'stripes': 'stripes 1.2s linear infinite',
      },
    },
  },
  plugins: [],
};

import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: ['class'],
  content: [
    './src/**/*.{ts,tsx}',
  ],
  theme: {
    container: {
      center: true,
      padding: '1rem',
      screens: {
        '2xl': '1024px',
      },
    },
    extend: {
      fontFamily: {
        display: ['Poppins', 'sans-serif'],
        body: ['Roboto', 'system-ui', 'sans-serif'],
        logo: ['Fraunces', 'Georgia', 'serif'],
      },
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        // Brand palette from cardapio-1. Extra aliases below are kept for backwards compatibility.
        terra: {
          50: '#FAF6F1',
          100: '#f9e8d8',
          200: '#f2cfb0',
          300: '#e9b07f',
          400: '#df8d4d',
          500: '#d4742c',
          600: '#A0603A',
          700: '#8b4c2a',
          800: '#723f28',
          900: '#5f3624',
        },
        butter: {
          50: '#FFFCF8',
          100: '#FAF6F1',
          200: '#f9e8d8',
          300: '#e9b07f',
          400: '#d4742c',
          500: '#A0603A',
          600: '#8b4c2a',
          700: '#723f28',
          800: '#5f3624',
        },
        cocoa: {
          400: '#A0603A',
          500: '#8b4c2a',
          600: '#723f28',
          700: '#5f3624',
          800: '#3D2B1F',
          900: '#2A1D16',
        },
        cream: {
          50: '#FFFCF8',
          100: '#FAF6F1',
          200: '#E8DDD0',
          300: '#D4C8BA',
          400: '#C4B5A0',
        },
      },
      minHeight: {
        dvh: '100dvh',
      },
      height: {
        dvh: '100dvh',
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      backgroundImage: {
        'cocoa-rich': 'radial-gradient(ellipse at top left, #A0603A 0%, #8b4c2a 45%, #723f28 100%)',
        'butter-glow': 'radial-gradient(ellipse at center, #df8d4d 0%, #d4742c 55%, #A0603A 100%)',
        'cream-warm': 'linear-gradient(180deg, #FFFCF8 0%, #FAF6F1 100%)',
      },
      boxShadow: {
        'butter': '0 6px 20px -8px rgba(160, 96, 58, 0.5), 0 2px 4px rgba(61, 43, 31, 0.12)',
        'cocoa': '0 8px 24px -10px rgba(61, 43, 31, 0.35), 0 2px 6px rgba(61, 43, 31, 0.08)',
        'card-warm': '0 1px 2px rgba(61, 43, 31, 0.05), 0 8px 24px -12px rgba(61, 43, 31, 0.14)',
      },
      keyframes: {
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'float': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-4px)' },
        },
        'pulse-ring': {
          '0%': { transform: 'scale(1)', opacity: '0.4' },
          '100%': { transform: 'scale(1.8)', opacity: '0' },
        },
        'butter-shimmer': {
          '0%, 100%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
        },
      },
      animation: {
        'fade-up': 'fade-up 0.4s ease-out',
        'float': 'float 3s ease-in-out infinite',
        'pulse-ring': 'pulse-ring 2s ease-out infinite',
        'butter-shimmer': 'butter-shimmer 6s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};

export default config;

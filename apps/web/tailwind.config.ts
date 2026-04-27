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
        // Brand palette: "terra" kept as semantic alias for backward compat, now warm cocoa + butter scale
        terra: {
          50: '#FDF7E3',
          100: '#F5EBC9',
          200: '#EAD8A0',
          300: '#D4B878',
          400: '#E8B421',
          500: '#B88920',
          600: '#6B3E14',
          700: '#4A2810',
          800: '#3D1F0A',
          900: '#2A1508',
        },
        // Butter yellow — primary brand accent
        butter: {
          50: '#FFFBE8',
          100: '#FFF4C2',
          200: '#FFE886',
          300: '#FFD953',
          400: '#F5C518',
          500: '#E6B000',
          600: '#C99500',
          700: '#A67900',
          800: '#805D00',
        },
        // Cocoa brown — primary dark
        cocoa: {
          400: '#8A5628',
          500: '#6B3E14',
          600: '#4A2810',
          700: '#3D1F0A',
          800: '#2A1508',
          900: '#1A0C04',
        },
        // Cream — surfaces
        cream: {
          50: '#FFFCEF',
          100: '#FBF6E9',
          200: '#F5EBC9',
          300: '#EEDFA8',
          400: '#E4CC82',
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
        'cocoa-rich': 'radial-gradient(ellipse at top left, #5C3511 0%, #4A2810 45%, #3D1F0A 100%)',
        'butter-glow': 'radial-gradient(ellipse at center, #FFD953 0%, #F5C518 55%, #E6B000 100%)',
        'cream-warm': 'linear-gradient(180deg, #FFFCEF 0%, #FDF7E3 100%)',
      },
      boxShadow: {
        'butter': '0 6px 20px -8px rgba(245, 197, 24, 0.55), 0 2px 4px rgba(74, 40, 16, 0.15)',
        'cocoa': '0 8px 24px -10px rgba(42, 21, 8, 0.45), 0 2px 6px rgba(42, 21, 8, 0.1)',
        'card-warm': '0 1px 2px rgba(74, 40, 16, 0.05), 0 8px 24px -12px rgba(74, 40, 16, 0.18)',
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

import tailwindTypography from '@tailwindcss/typography';
import tailwindcssAnimate from 'tailwindcss-animate';
import { fontFamily } from 'tailwindcss/defaultTheme';
import plugin from 'tailwindcss/plugin';





/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './src/app/**/*.{ts,tsx}',
    './src/components/**/*.{ts,tsx}',
    './src/ui/**/*.{ts,tsx}',
    './src/content/**/*.{md,mdx}',
  ],
  darkMode: ['class'],
  theme: {
    container: {
      center: true,
      padding: '2rem',
      screens: {
        '2xl': '1400px',
      },
    },
    extend: {
      colors: {
        'neutral-dark': 'hsl(220 5% 15%)',
        'neutral-light': 'hsl(220 5% 96%)',
        'neutral-lighter': 'hsl(220 5% 90%)',
        'neutral-gray': 'hsl(220 5% 85%)',
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
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
      },
      borderRadius: {
        lg: `var(--radius)`,
        md: `calc(var(--radius) - 2px)`,
        sm: 'calc(var(--radius) - 4px)',
      },
      fontFamily: {
        sans: ['var(--font-sans)', ...fontFamily.sans],
        heading: ['var(--font-heading)', ...fontFamily.sans],
      },
      keyframes: {
        'accordion-down': {
          from: { height: 0 },
          to: { height: 'var(--radix-accordion-content-height)' },
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: 0 },
        },
        gradient: {
          '0%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
          '100%': { backgroundPosition: '0% 50%' },
        },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
        gradient: 'gradient 8s linear infinite',
        'ping-3': 'ping 1s ease-in-out 3',
      },
    },
  },
  plugins: [
    tailwindcssAnimate,
    tailwindTypography,
    plugin(({ addUtilities }) => {
      addUtilities({
        '.container-bg': {
          '@apply backdrop-blur-md backdrop-invert-0 backdrop-saturate-200 bg-white/70 dark:bg-neutral-900/70 appearance-none':
            {},
        },
        '.gradient-bg': {
          '@apply backdrop-blur-md backdrop-invert-0 backdrop-saturate-200 shadow-lg shadow-indigo-500/50':
            {},
        },
        '.article-text': {
          '@apply leading-relaxed text-justify tracking-normal break-safe': {},
        },
      });
    }),
    plugin(({ addUtilities }) => {
      addUtilities({
        '.all-\\[unset\\]': {
          all: 'unset',
        },
      });
    }),
  ],
  corePlugins: {
    hyphens: true,
  },
};

import tailwindTypography from '@tailwindcss/typography';
import { fontFamily } from 'tailwindcss/defaultTheme';
import plugin from 'tailwindcss/plugin';
import tailwindcssAnimate from 'tailwindcss-animate';


/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './src/**/*.{ts,tsx}',
    '../../packages/ui/src/**/*.{ts,tsx}',
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
        chart: {
          '1': 'hsl(var(--chart-1))',
          '2': 'hsl(var(--chart-2))',
          '3': 'hsl(var(--chart-3))',
          '4': 'hsl(var(--chart-4))',
          '5': 'hsl(var(--chart-5))',
        },
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      fontFamily: {
        sans: ['var(--font-sans)', ...fontFamily.sans],
        heading: ['var(--font-heading)', ...fontFamily.sans],
      },
      keyframes: {
        'accordion-down': {
          from: {
            height: 0,
          },
          to: {
            height: 'var(--radix-accordion-content-height)',
          },
        },
        'accordion-up': {
          from: {
            height: 'var(--radix-accordion-content-height)',
          },
          to: {
            height: 0,
          },
        },
        // Deliberately not a height animation. Radix measures
        // `--radix-collapsible-content-height` the moment the content mounts,
        // but this content holds a Tiptap editor that renders one tick later
        // (`immediatelyRender: false`) — the measurement lands ~180px while the
        // real content is ~610px, so a height tween would run to the wrong
        // target and snap. Opacity and a short lift need no measurement and
        // stay correct however the content grows.
        'collapsible-down': {
          from: {
            opacity: 0,
            transform: 'translateY(-4px)',
          },
          to: {
            opacity: 1,
            transform: 'translateY(0)',
          },
        },
        'collapsible-up': {
          from: {
            opacity: 1,
          },
          to: {
            opacity: 0,
          },
        },
        gradient: {
          '0%': {
            backgroundPosition: '0% 50%',
          },
          '50%': {
            backgroundPosition: '100% 50%',
          },
          '100%': {
            backgroundPosition: '0% 50%',
          },
        },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
        // Enter eases out, exit eases in and runs shorter — collapsing should
        // get out of the way rather than linger.
        'collapsible-down': 'collapsible-down 0.18s ease-out',
        'collapsible-up': 'collapsible-up 0.12s ease-in',
        gradient: 'gradient 8s linear infinite',
        'ping-3': 'ping 1s ease-in-out 3',
      },
      typography: {
        DEFAULT: {
          css: {
            'code::before': {
              content: '',
            },
            'code::after': {
              content: '',
            },
            code: {
              background: '#f3f3f3',
              wordWrap: 'break-word',
              padding: '.1rem .2rem',
              borderRadius: '.2rem',
            },
          },
        },
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
        // The one label style shared by every list surface — post dates, project
        // date ranges, stats, timeline years. It is what makes the blog grid and
        // the project timeline read as the same system despite different shapes.
        // Deliberately not uppercased: abbreviated Vietnamese months ("thg 4")
        // look broken in caps.
        '.meta-label': {
          '@apply text-[11px] font-medium tracking-[0.08em] text-muted-foreground':
            {},
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

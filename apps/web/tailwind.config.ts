import tailwindTypography from '@tailwindcss/typography';
import { fontFamily } from 'tailwindcss/defaultTheme';
import plugin from 'tailwindcss/plugin';
import tailwindcssAnimate from 'tailwindcss-animate';

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{ts,tsx}', '../../packages/ui/src/**/*.{ts,tsx}'],
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
          // Readable error TEXT (`text-destructive-text`). DEFAULT is a fill.
          text: 'hsl(var(--destructive-text))',
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
        brand: {
          '50': 'hsl(var(--brand-50))',
          '100': 'hsl(var(--brand-100))',
          '200': 'hsl(var(--brand-200))',
          '300': 'hsl(var(--brand-300))',
          '400': 'hsl(var(--brand-400))',
          '500': 'hsl(var(--brand-500))',
          '600': 'hsl(var(--brand-600))',
          '700': 'hsl(var(--brand-700))',
          '800': 'hsl(var(--brand-800))',
          '900': 'hsl(var(--brand-900))',
          '950': 'hsl(var(--brand-950))',
        },
      },
      // `motionEase.sleek` (packages/ui/src/motion/tokens.ts) for the CSS-only
      // motion; named tokens keep `animate-in` + `ease-*` unambiguous.
      transitionTimingFunction: {
        sleek: 'cubic-bezier(0.21, 0.47, 0.32, 0.98)',
      },
      transitionDuration: {
        '250': '250ms',
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
        // The boot splash's icon: a restrained scale-and-fade entrance. Under
        // `motion-reduce`, callers pair this with `motion-reduce:animate-none`
        // rather than relying on the keyframe itself, per AGENTS §14 — a raw
        // CSS animation isn't covered by `MotionConfig reducedMotion="user"`.
        'splash-in': {
          from: {
            opacity: 0,
            transform: 'scale(0.94)',
          },
          to: {
            opacity: 1,
            transform: 'scale(1)',
          },
        },
        // The boot splash's optional progress hairline: an indeterminate bar
        // sweeping across its track.
        'splash-hairline': {
          '0%': {
            transform: 'translateX(-100%)',
          },
          '100%': {
            transform: 'translateX(300%)',
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
        'splash-in': 'splash-in 0.5s ease-out both',
        'splash-hairline': 'splash-hairline 1.4s ease-in-out infinite',
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
        // A solid surface, not frosted glass: `backdrop-filter` re-samples what is
        // behind it every frame, which is the costliest effect a scrolling page can
        // carry. The header islands and every popover share this one fill.
        '.container-bg': {
          '@apply bg-card appearance-none': {},
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
